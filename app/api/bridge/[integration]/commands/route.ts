import { NextResponse } from 'next/server';
import { authenticateBridge } from '@/lib/integrations/bridge';
import { canReceiveCommands } from '@/lib/integrations/capabilities';
import { COMMAND_DISPATCH_RETRY_AFTER_MS } from '@/lib/integrations/command-dispatch';
import { deterministicUuid } from '@/lib/integrations/idempotency';

export async function GET(request: Request, context: { params: Promise<{ integration: string }> }) {
  const { integration: slug } = await context.params;
  const auth = await authenticateBridge(request, slug);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, integration } = auth;
  if (!canReceiveCommands(integration.capabilities)) return NextResponse.json({ error: 'Integration is not permitted to receive commands' }, { status: 403 });

  const staleBefore = new Date(Date.now() - COMMAND_DISPATCH_RETRY_AFTER_MS).toISOString();
  const commandSelection = 'id,command_type,target_entity_type,target_entity_id,payload,created_at,attempt_count,status,updated_at,dispatched_at';
  const { data: approved, error: approvedError } = await supabase.from('integration_commands')
    .select(commandSelection)
    .eq('integration_id', integration.id)
    .eq('organization_id', integration.organization_id)
    .eq('status', 'approved')
    .order('created_at', { ascending: true })
    .limit(50);
  if (approvedError) {
    console.error('Could not load approved integration commands', approvedError);
    return NextResponse.json({ error: 'Could not load integration commands' }, { status: 500 });
  }

  const { data: staleDispatched, error: staleError } = await supabase.from('integration_commands')
    .select(commandSelection)
    .eq('integration_id', integration.id)
    .eq('organization_id', integration.organization_id)
    .eq('status', 'dispatched')
    .lt('dispatched_at', staleBefore)
    .order('dispatched_at', { ascending: true })
    .limit(50);
  if (staleError) {
    console.error('Could not load stale dispatched integration commands', staleError);
    return NextResponse.json({ error: 'Could not load integration commands' }, { status: 500 });
  }

  const candidates = [...(staleDispatched ?? []), ...(approved ?? [])]
    .sort((a: any, b: any) => String(a.created_at).localeCompare(String(b.created_at)))
    .slice(0, 50);
  const claimed: any[] = [];
  for (const row of candidates) {
    const now = new Date().toISOString();
    let leaseQuery = supabase.from('integration_commands')
      .update({ status:'dispatched', dispatched_at:now, updated_at:now, attempt_count:Number(row.attempt_count ?? 0)+1 })
      .eq('id', row.id)
      .eq('integration_id', integration.id)
      .eq('organization_id', integration.organization_id)
      .eq('status', row.status)
      .eq('updated_at', row.updated_at);
    if (row.status === 'dispatched') leaseQuery = leaseQuery.lt('dispatched_at', staleBefore);

    const { data: leased, error: leaseError } = await leaseQuery
      .select('id,command_type,target_entity_type,target_entity_id,payload,created_at,attempt_count')
      .maybeSingle();
    if (leaseError) {
      console.error('Could not lease integration command for dispatch', leaseError);
      return NextResponse.json({ error: 'Could not dispatch integration commands', retry: true }, { status: 500 });
    }
    if (leased) claimed.push(leased);
  }
  return NextResponse.json({ commands: claimed });
}

export async function POST(request: Request, context: { params: Promise<{ integration: string }> }) {
  const { integration: slug } = await context.params;
  const auth = await authenticateBridge(request, slug);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!canReceiveCommands(auth.integration.capabilities)) return NextResponse.json({ error: 'Integration is not permitted to receive commands' }, { status: 403 });
  const body = await request.json();
  if (!body.id || !['acknowledged','failed'].includes(body.status)) return NextResponse.json({ error: 'id and status (acknowledged|failed) are required' }, { status: 400 });

  const { data: command, error: commandError } = await auth.supabase.from('integration_commands')
    .select('id,command_type,target_entity_type,target_entity_id,payload,status,updated_at')
    .eq('id', body.id)
    .eq('integration_id', auth.integration.id)
    .eq('organization_id', auth.integration.organization_id)
    .maybeSingle();
  if (commandError) {
    console.error('Could not load integration command', commandError);
    return NextResponse.json({ error: 'Could not load integration command' }, { status: 500 });
  }
  if (!command) return NextResponse.json({ error: 'Command not found' }, { status: 404 });
  if (command.status !== 'dispatched' && command.status !== body.status) {
    return NextResponse.json({ error: 'Command status conflicts with this acknowledgement' }, { status: 409 });
  }

  const processingAt = new Date().toISOString();
  const { data: lease, error: leaseError } = await auth.supabase.from('integration_commands')
    .update({ updated_at: processingAt })
    .eq('id', command.id)
    .eq('integration_id', auth.integration.id)
    .eq('organization_id', auth.integration.organization_id)
    .eq('status', command.status)
    .eq('updated_at', command.updated_at)
    .select('id')
    .maybeSingle();
  if (leaseError) {
    console.error('Could not lease integration command acknowledgement', leaseError);
    return NextResponse.json({ error: 'Could not process integration command acknowledgement' }, { status: 500 });
  }
  if (!lease) return NextResponse.json({ error: 'Command acknowledgement is already processing', retry: true }, { status: 409 });

  try {
    if (command.command_type === 'order.create') {
      const externalOrderId = String(body.result?.order_id ?? body.result?.external_order_id ?? body.result?.id ?? '').trim() || null;
      const { data: intents, error: intentsError } = await auth.supabase.from('buyer_intents')
        .select('id,evidence,assigned_to,product_query')
        .eq('organization_id', auth.integration.organization_id)
        .contains('evidence', { commerce_command_id: command.id })
        .limit(50);
      if (intentsError) throw new Error('Could not resolve buyer intents for commerce command');

      for (const intent of intents ?? []) {
        const evidence = intent.evidence && typeof intent.evidence === 'object' && !Array.isArray(intent.evidence) ? intent.evidence : {};
        const stage = body.status === 'acknowledged' ? 'awaiting_payment' : 'order_request_failed';
        const { error: intentUpdateError } = await auth.supabase.from('buyer_intents').update({
          evidence: {
            ...evidence,
            workflow_stage: stage,
            commerce_command_status: body.status,
            ...(externalOrderId ? { commerce_order_id: externalOrderId } : {}),
            commerce_command_result: body.result ?? {},
          },
          updated_at: new Date().toISOString(),
        })
          .eq('id', intent.id)
          .eq('organization_id', auth.integration.organization_id);
        if (intentUpdateError) throw new Error('Could not update buyer intent from commerce command');

        if (intent.assigned_to) {
          const { error: notificationError } = await auth.supabase.from('notifications').insert({
            id: deterministicUuid(`commerce-command-notification:${command.id}:${intent.id}:${body.status}`),
            organization_id: auth.integration.organization_id,
            recipient_id: intent.assigned_to,
            title: body.status === 'acknowledged' ? 'GadgetPoint order created' : 'GadgetPoint order request failed',
            body: body.status === 'acknowledged'
              ? `${intent.product_query} is now waiting for payment confirmation.`
              : `${intent.product_query} needs attention before the order can continue.`,
            type: 'buyer_request',
          });
          if (notificationError && notificationError.code !== '23505') throw new Error('Could not create commerce command notification');
        }
      }

      const { error: activityError } = await auth.supabase.from('activity_logs').insert({
        id: deterministicUuid(`commerce-command-activity:${command.id}:${body.status}`),
        organization_id: auth.integration.organization_id,
        actor_id: null,
        action: body.status === 'acknowledged' ? 'commerce.order_request_acknowledged' : 'commerce.order_request_failed',
        entity_type: command.target_entity_type || 'integration_command',
        entity_id: command.target_entity_id || command.id,
        metadata: { command_id: command.id, external_order_id: externalOrderId, result: body.result ?? {} },
      });
      if (activityError && activityError.code !== '23505') throw new Error('Could not record commerce command activity');
    }

    const patch = body.status === 'acknowledged'
      ? { status: 'acknowledged', acknowledged_at: new Date().toISOString(), result: body.result ?? {}, updated_at: new Date().toISOString() }
      : { status: 'failed', failed_at: new Date().toISOString(), result: body.result ?? {}, last_error: String(body.error ?? body.result?.error ?? 'External command failed'), updated_at: new Date().toISOString() };
    const { data, error } = await auth.supabase.from('integration_commands').update(patch)
      .eq('id', body.id)
      .eq('integration_id', auth.integration.id)
      .eq('organization_id', auth.integration.organization_id)
      .eq('updated_at', processingAt)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ data, replayed: command.status === body.status });
  } catch (error) {
    console.error('Could not finalize integration command acknowledgement', error);
    return NextResponse.json({ error: 'Could not finalize integration command acknowledgement', retry: true }, { status: 500 });
  }
}
