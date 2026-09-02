import { NextResponse } from 'next/server';
import { authenticateBridge, markIntegrationEventProcessed, recordIntegrationEvent, type BridgeEvent } from '@/lib/integrations/bridge';
import { canPublishEvents } from '@/lib/integrations/capabilities';
import { advanceBuyerWorkflowFromOrder, advanceBuyerWorkflowFromPayment } from '@/lib/integrations/commerce-workflow';
import { deterministicUuid } from '@/lib/integrations/idempotency';

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
  if (event.type === 'payment.updated' && !data.order_id && !data.external_order_id && !data.order?.id && !data.workflow_quote_id && !data.metadata?.workflow_quote_id && !data.buyer_intent_ids?.length && !data.metadata?.buyer_intent_ids?.length) {
    return NextResponse.json({ error: 'payment.updated requires order, quote, or buyer-intent correlation' }, { status: 400 });
  }

  let tracked;
  try {
    tracked = await recordIntegrationEvent({
      supabase: auth.supabase,
      organizationId: auth.integration.organization_id,
      integrationId: auth.integration.id,
      source: slug,
      event,
      deferProcessed: true,
    });
  } catch (error) {
    console.error('Could not record commerce event', error);
    return NextResponse.json({ error: 'Could not record commerce event' }, { status: 500 });
  }

  if (tracked.conflict) {
    return NextResponse.json({ ok: false, retry: false, error: 'Commerce event id payload conflicts with the recorded event', event_id: tracked.eventId }, { status: 409 });
  }
  if (tracked.duplicate) return NextResponse.json({ ok: true, duplicate: true, event_id: tracked.eventId });
  if (tracked.inProgress) {
    return NextResponse.json({ ok: false, retry: true, error: 'Commerce event is already processing', event_id: tracked.eventId }, { status: 409 });
  }

  try {
    const workflow = event.type === 'payment.updated'
      ? await advanceBuyerWorkflowFromPayment(auth.supabase, auth.integration.organization_id, data, tracked.eventId)
      : await advanceBuyerWorkflowFromOrder(auth.supabase, auth.integration.organization_id, data, tracked.eventId);

    const { error: activityError } = await auth.supabase.from('activity_logs').insert({
      id: deterministicUuid(`commerce-event-activity:${tracked.eventId}:${event.type}`),
      organization_id: auth.integration.organization_id,
      actor_id: null,
      action: `commerce.${event.type}`,
      entity_type: 'integration_event',
      entity_id: tracked.eventId,
      metadata: { source: slug, workflow },
    });
    if (activityError && activityError.code !== '23505') throw activityError;

    const { error: syncError } = await auth.supabase.from('external_integrations').update({
      last_synced_at: new Date().toISOString(),
      status: 'connected',
      updated_at: new Date().toISOString(),
    })
      .eq('id', auth.integration.id)
      .eq('organization_id', auth.integration.organization_id);
    if (syncError) throw syncError;

    await markIntegrationEventProcessed({
      supabase: auth.supabase,
      organizationId: auth.integration.organization_id,
      integrationId: auth.integration.id,
      eventId: tracked.eventId,
    });

    return NextResponse.json({ ok: true, event_id: tracked.eventId, workflow, retry: tracked.retry });
  } catch (error) {
    console.error('Commerce event processing failed', error);
    return NextResponse.json({ error: 'Commerce event processing failed', retry: true, event_id: tracked.eventId }, { status: 500 });
  }
}
