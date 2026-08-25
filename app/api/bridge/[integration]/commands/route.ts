import { NextResponse } from 'next/server';
import { authenticateBridge } from '@/lib/integrations/bridge';
import { canReceiveCommands } from '@/lib/integrations/capabilities';

export async function GET(request: Request, context: { params: Promise<{ integration: string }> }) {
  const { integration: slug } = await context.params;
  const auth = await authenticateBridge(request, slug);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, integration } = auth;
  if (!canReceiveCommands(integration.capabilities)) return NextResponse.json({ error: 'Integration is not permitted to receive commands' }, { status: 403 });
  const { data: pending, error } = await supabase.from('integration_commands')
    .select('id,command_type,target_entity_type,target_entity_id,payload,created_at,attempt_count')
    .eq('integration_id', integration.id)
    .eq('organization_id', integration.organization_id)
    .eq('status', 'approved')
    .order('created_at', { ascending: true })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const claimed: any[] = [];
  for (const row of pending ?? []) {
    const now = new Date().toISOString();
    const { data: leased } = await supabase.from('integration_commands')
      .update({ status:'dispatched', dispatched_at:now, updated_at:now, attempt_count:Number(row.attempt_count ?? 0)+1 })
      .eq('id', row.id)
      .eq('integration_id', integration.id)
      .eq('organization_id', integration.organization_id)
      .eq('status','approved')
      .select('id,command_type,target_entity_type,target_entity_id,payload,created_at,attempt_count')
      .maybeSingle();
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
    .select('id,command_type,target_entity_type,target_entity_id,payload,status')
    .eq('id', body.id)
    .eq('integration_id', auth.integration.id)
    .eq('organization_id', auth.integration.organization_id)
    .maybeSingle();
  if (commandError || !command) return NextResponse.json({ error: commandError?.message || 'Command not found' }, { status: 404 });

  const patch = body.status === 'acknowledged'
    ? { status: 'acknowledged', acknowledged_at: new Date().toISOString(), result: body.result ?? {}, updated_at: new Date().toISOString() }
    : { status: 'failed', failed_at: new Date().toISOString(), result: body.result ?? {}, last_error: String(body.error ?? body.result?.error ?? 'External command failed'), updated_at: new Date().toISOString() };
  const { data, error } = await auth.supabase.from('integration_commands').update(patch)
    .eq('id', body.id).eq('integration_id', auth.integration.id).eq('organization_id', auth.integration.organization_id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (command.command_type === 'order.create') {
    const externalOrderId = String(body.result?.order_id ?? body.result?.external_order_id ?? body.result?.id ?? '').trim() || null;
    const { data: intents } = await auth.supabase.from('buyer_intents')
      .select('id,evidence,assigned_to,product_query')
      .eq('organization_id', auth.integration.organization_id)
      .contains('evidence', { commerce_command_id: command.id })
      .limit(50);

    for (const intent of intents ?? []) {
      const evidence = intent.evidence && typeof intent.evidence === 'object' && !Array.isArray(intent.evidence) ? intent.evidence : {};
      const stage = body.status === 'acknowledged' ? 'awaiting_payment' : 'order_request_failed';
      await auth.supabase.from('buyer_intents').update({
        evidence: {
          ...evidence,
          workflow_stage: stage,
          commerce_command_status: body.status,
          ...(externalOrderId ? { commerce_order_id: externalOrderId } : {}),
          commerce_command_result: body.result ?? {},
        },
        updated_at: new Date().toISOString(),
      }).eq('id', intent.id);

      if (intent.assigned_to) {
        await auth.supabase.from('notifications').insert({
          organization_id: auth.integration.organization_id,
          recipient_id: intent.assigned_to,
          title: body.status === 'acknowledged' ? 'GadgetPoint order created' : 'GadgetPoint order request failed',
          body: body.status === 'acknowledged'
            ? `${intent.product_query} is now waiting for payment confirmation.`
            : `${intent.product_query} needs attention before the order can continue.`,
          type: body.status === 'acknowledged' ? 'buyer_order_created' : 'buyer_order_failed',
        });
      }
    }

    await auth.supabase.from('activity_logs').insert({
      organization_id: auth.integration.organization_id,
      actor_id: null,
      action: body.status === 'acknowledged' ? 'commerce.order_request_acknowledged' : 'commerce.order_request_failed',
      entity_type: command.target_entity_type || 'integration_command',
      entity_id: command.target_entity_id || command.id,
      metadata: { command_id: command.id, external_order_id: externalOrderId, result: body.result ?? {} },
    });
  }

  return NextResponse.json({ data });
}
