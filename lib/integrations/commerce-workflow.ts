type SupabaseLike = any;

type IntentRow = {
  id: string;
  evidence: Record<string, any> | null;
  assigned_to?: string | null;
  product_query?: string | null;
};

function evidenceFor(intent: IntentRow) {
  return intent.evidence && typeof intent.evidence === 'object' && !Array.isArray(intent.evidence) ? intent.evidence : {};
}

async function resolveBuyerIntents(supabase: SupabaseLike, organizationId: string, data: any): Promise<IntentRow[]> {
  const metadata = data?.metadata && typeof data.metadata === 'object' ? data.metadata : {};
  const buyerIntentIds = Array.isArray(data?.buyer_intent_ids)
    ? data.buyer_intent_ids.map(String)
    : Array.isArray(metadata?.buyer_intent_ids)
      ? metadata.buyer_intent_ids.map(String)
      : [];
  if (buyerIntentIds.length) {
    const { data: intents, error } = await supabase.from('buyer_intents')
      .select('id,evidence,assigned_to,product_query')
      .eq('organization_id', organizationId)
      .in('id', buyerIntentIds)
      .limit(100);
    if (error) throw new Error('Could not resolve buyer intents for commerce workflow');
    return intents ?? [];
  }

  const quoteId = String(data?.workflow_quote_id ?? metadata?.workflow_quote_id ?? '').trim();
  if (quoteId) {
    const { data: intents, error } = await supabase.from('buyer_intents')
      .select('id,evidence,assigned_to,product_query')
      .eq('organization_id', organizationId)
      .contains('evidence', { workflow_quote_id: quoteId })
      .limit(100);
    if (error) throw new Error('Could not resolve buyer intents for commerce workflow');
    return intents ?? [];
  }

  const externalOrderId = String(data?.order_id ?? data?.external_order_id ?? data?.id ?? '').trim();
  if (externalOrderId) {
    const { data: intents, error } = await supabase.from('buyer_intents')
      .select('id,evidence,assigned_to,product_query')
      .eq('organization_id', organizationId)
      .contains('evidence', { commerce_order_id: externalOrderId })
      .limit(100);
    if (error) throw new Error('Could not resolve buyer intents for commerce workflow');
    return intents ?? [];
  }

  return [];
}

function orderStage(statusValue: unknown) {
  const status = String(statusValue ?? '').trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
  if (['cancelled','canceled'].includes(status)) return 'cancelled';
  if (['returned','refunded'].includes(status)) return 'returned';
  if (['delivered','completed','complete','fulfilled'].includes(status)) return 'completed';
  if (['shipped','out_for_delivery','in_transit','delivery'].includes(status)) return 'delivery';
  if (['ready','ready_for_pickup','ready_for_delivery'].includes(status)) return 'ready_for_pickup';
  if (['processing','confirmed','preparing','preparing_order','packing','packed'].includes(status)) return 'preparing_order';
  return 'awaiting_payment';
}

function paymentStage(statusValue: unknown) {
  const status = String(statusValue ?? '').trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
  if (['paid','confirmed','successful','success','completed','complete'].includes(status)) return 'preparing_order';
  if (['failed','declined'].includes(status)) return 'payment_failed';
  if (['cancelled','canceled','void','voided'].includes(status)) return 'payment_cancelled';
  if (['refunded','reversed'].includes(status)) return 'returned';
  return 'awaiting_payment';
}

async function notifyStage(supabase: SupabaseLike, organizationId: string, intent: IntentRow, stage: string) {
  if (!intent.assigned_to) return;
  const labels: Record<string, [string, string]> = {
    preparing_order: ['Payment confirmed', `Prepare ${intent.product_query || 'the buyer order'} for fulfillment.`],
    ready_for_pickup: ['Order ready', `${intent.product_query || 'Buyer order'} is ready for pickup or delivery.`],
    delivery: ['Delivery in progress', `${intent.product_query || 'Buyer order'} is now in delivery.`],
    completed: ['Buyer order completed', `${intent.product_query || 'Buyer order'} has been completed.`],
    payment_failed: ['Payment failed', `Follow up payment for ${intent.product_query || 'the buyer order'}.`],
    payment_cancelled: ['Payment cancelled', `Payment was cancelled for ${intent.product_query || 'the buyer order'}.`],
    cancelled: ['Order cancelled', `${intent.product_query || 'Buyer order'} was cancelled.`],
    returned: ['Order returned/refunded', `${intent.product_query || 'Buyer order'} moved into return/refund handling.`],
  };
  const message = labels[stage];
  if (!message) return;
  const { error } = await supabase.from('notifications').insert({
    organization_id: organizationId,
    recipient_id: intent.assigned_to,
    title: message[0],
    body: message[1],
    type: 'buyer_request',
  });
  if (error) throw new Error('Could not create commerce workflow notification');
}

export async function advanceBuyerWorkflowFromOrder(supabase: SupabaseLike, organizationId: string, data: any) {
  const intents = await resolveBuyerIntents(supabase, organizationId, data);
  if (!intents.length) return { updated: 0 };
  const externalOrderId = String(data?.id ?? data?.order_id ?? data?.external_order_id ?? '').trim() || null;
  const stage = orderStage(data?.status);
  for (const intent of intents) {
    const evidence = evidenceFor(intent);
    const previousStage = String(evidence.workflow_stage ?? '');
    const update:any = {
      evidence: {
        ...evidence,
        workflow_stage: stage,
        commerce_order_status: data?.status ?? null,
        ...(externalOrderId ? { commerce_order_id: externalOrderId } : {}),
        commerce_order_updated_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    };
    if (stage === 'completed') update.status = 'closed';
    const { error } = await supabase.from('buyer_intents').update(update).eq('id', intent.id);
    if (error) throw new Error('Could not update buyer intent from commerce order');
    if (stage !== previousStage) await notifyStage(supabase, organizationId, intent, stage);
  }
  return { updated: intents.length, stage, externalOrderId };
}

export async function advanceBuyerWorkflowFromPayment(supabase: SupabaseLike, organizationId: string, data: any) {
  const intents = await resolveBuyerIntents(supabase, organizationId, data);
  if (!intents.length) return { updated: 0 };
  const externalOrderId = String(data?.order_id ?? data?.external_order_id ?? data?.order?.id ?? '').trim() || null;
  const stage = paymentStage(data?.status);
  for (const intent of intents) {
    const evidence = evidenceFor(intent);
    const previousStage = String(evidence.workflow_stage ?? '');
    const { error } = await supabase.from('buyer_intents').update({
      evidence: {
        ...evidence,
        workflow_stage: stage,
        payment_status: data?.status ?? null,
        payment_reference: data?.reference ?? data?.payment_reference ?? data?.id ?? null,
        ...(externalOrderId ? { commerce_order_id: externalOrderId } : {}),
        payment_updated_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    }).eq('id', intent.id);
    if (error) throw new Error('Could not update buyer intent from commerce payment');
    if (stage !== previousStage) await notifyStage(supabase, organizationId, intent, stage);
  }
  return { updated: intents.length, stage, externalOrderId };
}
