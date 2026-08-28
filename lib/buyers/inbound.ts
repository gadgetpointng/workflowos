import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { matchProducts, scoreBuyerIntent } from '@/lib/buyers/intelligence';

export type InboundBuyerRequest = {
  organizationId: string;
  source: string;
  externalId?: string | null;
  buyerName?: string | null;
  phone?: string | null;
  email?: string | null;
  productQuery: string;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  budgetMax?: number | null;
  city?: string | null;
  state?: string | null;
  urgency?: string | null;
  consentStatus?: 'unknown' | 'opted_in' | 'public_signal' | 'do_not_contact';
  evidence?: Record<string, unknown>;
  assignedTo?: string | null;
  autoCreateTask?: boolean;
};

export function verifyInboundSignature(rawBody: string, signature: string | null) {
  const secret = process.env.BUYER_INTAKE_WEBHOOK_SECRET || '';
  if (!secret || !signature?.startsWith('sha256=')) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function captureInboundBuyer(input: InboundBuyerRequest) {
  const admin = createAdminClient();
  const source = String(input.source || 'other').trim().toLowerCase();
  const externalId = input.externalId ? String(input.externalId).trim() : null;
  const productQuery = String(input.productQuery || '').trim();
  if (!input.organizationId || !productQuery) throw new Error('organizationId and productQuery are required');

  let assignedTo = input.assignedTo ? String(input.assignedTo).trim() : null;
  if (assignedTo) {
    const { data: assignee } = await admin
      .from('profiles')
      .select('id')
      .eq('id', assignedTo)
      .eq('organization_id', input.organizationId)
      .eq('active', true)
      .limit(1)
      .maybeSingle();
    assignedTo = assignee?.id || null;
  }

  if (externalId) {
    const { data: duplicate } = await admin
      .from('buyer_intents')
      .select('id')
      .eq('organization_id', input.organizationId)
      .eq('source', source)
      .eq('external_ref', externalId)
      .limit(1)
      .maybeSingle();
    if (duplicate) return { ok: true, duplicate: true, buyerIntentId: duplicate.id };
  }

  const { data: products } = await admin
    .from('connected_products')
    .select('id,external_product_id,name,category,price,stock_quantity,active,sku,metadata')
    .eq('organization_id', input.organizationId)
    .eq('active', true)
    .limit(500);

  const scoringInput = {
    product_query: productQuery,
    category: input.category || null,
    brand: input.brand || null,
    model: input.model || null,
    budget_max: input.budgetMax ?? null,
    city: input.city || null,
    state: input.state || null,
    urgency: input.urgency || 'normal',
    source,
    consent_status: input.consentStatus || 'unknown',
  };
  const matches = matchProducts(scoringInput, products ?? []);
  const score = scoreBuyerIntent(scoringInput);
  const stage = matches.length ? 'product_search' : 'sourcing_required';
  const evidence = {
    ...(input.evidence || {}),
    capture: 'integration',
    external_id: externalId,
    workflow_stage: stage,
  };

  const { data: intent, error } = await admin.from('buyer_intents').insert({
    organization_id: input.organizationId,
    source,
    external_ref: externalId,
    buyer_name: input.buyerName || null,
    phone: input.phone || null,
    email: input.email || null,
    product_query: productQuery,
    category: input.category || null,
    brand: input.brand || null,
    model: input.model || null,
    budget_max: input.budgetMax ?? null,
    city: input.city || null,
    state: input.state || null,
    urgency: input.urgency || 'normal',
    consent_status: input.consentStatus || 'unknown',
    intent_score: score,
    matched_products: matches,
    assigned_to: assignedTo,
    status: matches.length ? 'matched' : 'new',
    evidence,
  }).select('id').single();

  if (error?.code === '23505' && externalId) {
    const { data: racedDuplicate } = await admin
      .from('buyer_intents')
      .select('id')
      .eq('organization_id', input.organizationId)
      .eq('source', source)
      .eq('external_ref', externalId)
      .limit(1)
      .maybeSingle();
    if (racedDuplicate) return { ok: true, duplicate: true, buyerIntentId: racedDuplicate.id };
  }
  if (error || !intent) throw error || new Error('Could not create buyer request');

  let taskId: string | null = null;
  if (input.autoCreateTask !== false) {
    let creatorId = assignedTo;
    if (!creatorId) {
      const { data: owner } = await admin.from('profiles').select('id').eq('organization_id', input.organizationId).eq('role', 'owner').eq('active', true).limit(1).maybeSingle();
      creatorId = owner?.id || null;
    }
    if (creatorId) {
      const location = [input.city, input.state].filter(Boolean).join(', ');
      const title = matches.length ? `Find for buyer: ${productQuery}` : `Source for buyer: ${productQuery}`;
      const description = [
        `Automatically captured from ${source}.`,
        input.buyerName ? `Buyer: ${input.buyerName}.` : null,
        location ? `Location: ${location}.` : null,
        input.budgetMax ? `Budget up to ₦${Number(input.budgetMax).toLocaleString()}.` : null,
        `Request: ${productQuery}.`,
        matches.length ? 'Check the matched GadgetPoint inventory and confirm availability.' : 'No strong live inventory match was found. Check approved suppliers and record sourcing options.',
      ].filter(Boolean).join(' ');
      const { data: task } = await admin.from('tasks').insert({
        organization_id: input.organizationId,
        title,
        description,
        creator_id: creatorId,
        assignee_id: assignedTo,
        department: 'Sales',
        priority: ['high', 'immediate'].includes(String(input.urgency || '').toLowerCase()) || score >= 70 ? 'high' : 'medium',
        status: assignedTo ? 'assigned' : 'draft',
      }).select('id').single();
      taskId = task?.id || null;
      if (taskId) {
        await admin.from('buyer_intents').update({ evidence: { ...evidence, workflow_task_id: taskId, workflow_task_created_at: new Date().toISOString() } }).eq('id', intent.id);
      }
    }
  }

  const recipientId = assignedTo || (await admin.from('profiles').select('id').eq('organization_id', input.organizationId).eq('role', 'owner').eq('active', true).limit(1).maybeSingle()).data?.id || null;
  if (recipientId) await admin.from('notifications').insert({ organization_id: input.organizationId, recipient_id: recipientId, title: `New ${source} buyer request`, body: `${input.buyerName || 'Buyer'} · ${productQuery}`, type: 'buyer_request' });

  await admin.from('activity_logs').insert({ organization_id: input.organizationId, actor_id: creatorIdForLog(assignedTo), action: 'buyer_intent.integration_captured', entity_type: 'buyer_intent', entity_id: intent.id, metadata: { source, external_id: externalId, score, match_count: matches.length, task_id: taskId } });
  return { ok: true, buyerIntentId: intent.id, taskId, score, matchCount: matches.length, stage };
}

function creatorIdForLog(id?: string | null) {
  return id || null;
}
