import { NextResponse } from 'next/server';
import { authenticateBridge, recordIntegrationEvent, type BridgeEvent } from '@/lib/integrations/bridge';
import { canPublishEvents } from '@/lib/integrations/capabilities';
import { advanceBuyerWorkflowFromOrder, advanceBuyerWorkflowFromPayment } from '@/lib/integrations/commerce-workflow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowed = new Set(['order.created','order.updated','payment.updated']);

export async function POST(request: Request, context: { params: Promise<{ integration: string }> }) {
  const { integration: slug } = await context.params;
  const auth = await authenticateBridge(request, slug);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!canPublishEvents(auth.integration.capabilities)) return NextResponse.json({ error: 'Integration is not permitted to publish events' }, { status: 403 });

  let event: BridgeEvent;
  try { event = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!allowed.has(String(event.type || ''))) return NextResponse.json({ error: 'Supported commerce events: order.created, order.updated, payment.updated' }, { status: 400 });

  const eventId = String(event.id || '').trim();
  if (!eventId) return NextResponse.json({ error: 'Commerce events require a stable event id for idempotency' }, { status: 400 });
  event.id = eventId;

  const data = event.data ?? {};
  if ((event.type === 'order.created' || event.type === 'order.updated') && !data.id && !data.order_id && !data.external_order_id) {
    return NextResponse.json({ error: `${event.type} requires an order id` }, { status: 400 });
  }
  if (event.type === 'payment.updated' && !data.order_id && !data.external_order_id && !data.workflow_quote_id && !data.metadata?.workflow_quote_id) {
    return NextResponse.json({ error: 'payment.updated requires order_id/external_order_id or workflow_quote_id correlation' }, { status: 400 });
  }

  const tracked = await recordIntegrationEvent({
    supabase: auth.supabase,
    organizationId: auth.integration.organization_id,
    integrationId: auth.integration.id,
    source: slug,
    event,
  });
  if (tracked.duplicate) return NextResponse.json({ ok: true, duplicate: true, event_id: tracked.eventId });

  const workflow = event.type === 'payment.updated'
    ? await advanceBuyerWorkflowFromPayment(auth.supabase, auth.integration.organization_id, data)
    : await advanceBuyerWorkflowFromOrder(auth.supabase, auth.integration.organization_id, data);

  await auth.supabase.from('activity_logs').insert({
    organization_id: auth.integration.organization_id,
    actor_id: null,
    action: `commerce.${event.type}`,
    entity_type: 'integration_event',
    entity_id: tracked.eventId,
    metadata: { source: slug, workflow },
  });
  await auth.supabase.from('external_integrations').update({
    last_synced_at: new Date().toISOString(),
    status: 'connected',
    updated_at: new Date().toISOString(),
  }).eq('id', auth.integration.id);

  return NextResponse.json({ ok: true, event_id: tracked.eventId, workflow });
}
