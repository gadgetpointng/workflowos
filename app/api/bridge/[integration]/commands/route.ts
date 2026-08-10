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
  const patch = body.status === 'acknowledged'
    ? { status: 'acknowledged', acknowledged_at: new Date().toISOString(), result: body.result ?? {}, updated_at: new Date().toISOString() }
    : { status: 'failed', failed_at: new Date().toISOString(), result: body.result ?? {}, last_error: String(body.error ?? body.result?.error ?? 'External command failed'), updated_at: new Date().toISOString() };
  const { data, error } = await auth.supabase.from('integration_commands').update(patch)
    .eq('id', body.id).eq('integration_id', auth.integration.id).eq('organization_id', auth.integration.organization_id).select().single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ data });
}
