import type { BridgeEvent } from '@/lib/integrations/bridge';

type StorefrontSignalType = 'storefront.search' | 'product.view' | 'cart.added';

type IntelligenceInput = {
  supabase: any;
  organizationId: string;
  source: string;
  event: BridgeEvent;
  integrationEventId: string;
};

type RecommendationDraft = {
  key: string;
  type: string;
  title: string;
  rationale: string;
  score: number;
  action: string;
  evidence: Record<string, unknown>;
};

const WINDOW_HOURS = 24;

function observeReadFailure(operation: string, error: any) {
  if (!error) return;
  console.error('Storefront intelligence read failed', { operation, code: error.code });
}

function normalizeSearch(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 160);
}

function productLabel(data: Record<string, any>) {
  return String(data.name ?? data.title ?? data.product_name ?? data.product_id ?? 'product').trim();
}

async function recommendSalesAssignee(supabase: any, organizationId: string) {
  const { data: capabilities, error: capabilitiesError } = await supabase
    .from('staff_capabilities')
    .select('profile_id,proficiency,profiles(active)')
    .eq('organization_id', organizationId)
    .eq('capability', 'sales')
    .eq('active', true)
    .order('proficiency', { ascending: false })
    .limit(20);
  observeReadFailure('staff_capabilities.select.sales_assignee', capabilitiesError);

  const ids = (capabilities ?? [])
    .filter((item: any) => item.profiles?.active !== false)
    .map((item: any) => item.profile_id)
    .filter(Boolean);

  if (!ids.length) return null;

  const { data: openTasks, error: openTasksError } = await supabase
    .from('tasks')
    .select('assignee_id,status')
    .eq('organization_id', organizationId)
    .in('assignee_id', ids)
    .not('status', 'in', '("completed","cancelled")');
  observeReadFailure('tasks.select.sales_assignee_load', openTasksError);

  const load = new Map<string, number>();
  for (const task of openTasks ?? []) {
    if (!task.assignee_id) continue;
    load.set(task.assignee_id, (load.get(task.assignee_id) ?? 0) + 1);
  }

  return [...ids].sort((a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0))[0] ?? null;
}

async function recentProductSignalCount(
  supabase: any,
  organizationId: string,
  source: string,
  signalType: string,
  productRef: string,
  since: string,
) {
  const { count, error } = await supabase
    .from('commerce_signals')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('source', source)
    .eq('signal_type', signalType)
    .eq('product_ref', productRef)
    .gte('observed_at', since);
  observeReadFailure('commerce_signals.count.product_signal', error);

  return count ?? 0;
}

async function recentSearchCount(
  supabase: any,
  organizationId: string,
  source: string,
  normalizedQuery: string,
  since: string,
) {
  const { data, error } = await supabase
    .from('commerce_signals')
    .select('search_query')
    .eq('organization_id', organizationId)
    .eq('source', source)
    .eq('signal_type', 'storefront_search')
    .gte('observed_at', since)
    .order('observed_at', { ascending: false })
    .limit(500);
  observeReadFailure('commerce_signals.select.search_history', error);

  return (data ?? []).filter((row: any) => normalizeSearch(row.search_query) === normalizedQuery).length;
}

async function saveRecommendation(
  supabase: any,
  organizationId: string,
  source: string,
  draft: RecommendationDraft,
  assigneeId: string | null,
) {
  const { data: existing, error: existingError } = await supabase
    .from('growth_recommendations')
    .select('id,status,score')
    .eq('organization_id', organizationId)
    .eq('recommendation_type', draft.type)
    .in('status', ['new', 'accepted'])
    .contains('evidence', { signal_key: draft.key })
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  observeReadFailure('growth_recommendations.select.existing', existingError);

  const payload = {
    organization_id: organizationId,
    recommendation_type: draft.type,
    title: draft.title,
    rationale: draft.rationale,
    score: draft.score,
    recommended_assignee: assigneeId,
    action_payload: {
      source,
      recommended_action: draft.action,
    },
    evidence: {
      ...draft.evidence,
      signal_key: draft.key,
      source,
      window_hours: WINDOW_HOURS,
    },
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from('growth_recommendations')
      .update(payload)
      .eq('id', existing.id)
      .select('id,recommendation_type,title,score,status,recommended_assignee')
      .single();

    if (error) throw error;
    return { recommendation: data, updated: true };
  }

  const { data, error } = await supabase
    .from('growth_recommendations')
    .insert({ ...payload, status: 'new' })
    .select('id,recommendation_type,title,score,status,recommended_assignee')
    .single();

  if (error) throw error;
  return { recommendation: data, updated: false };
}

export async function evaluateStorefrontSignal(input: IntelligenceInput) {
  if (!['storefront.search', 'product.view', 'cart.added'].includes(input.event.type)) {
    return null;
  }

  const type = input.event.type as StorefrontSignalType;
  const data = (input.event.data ?? {}) as Record<string, any>;
  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  let draft: RecommendationDraft | null = null;

  if (type === 'product.view') {
    const productRef = String(data.product_id ?? '').trim();
    if (!productRef) return null;

    const count = await recentProductSignalCount(
      input.supabase,
      input.organizationId,
      input.source,
      'product_view',
      productRef,
      since,
    );

    if (count < 5) return { qualified: false, reason: 'product_view_threshold', count, threshold: 5 };

    const name = productLabel(data);
    draft = {
      key: `product-view:${productRef}`,
      type: 'storefront_product_interest',
      title: `Rising product interest: ${name}`,
      rationale: `${count} storefront product views were recorded in the last ${WINDOW_HOURS} hours. This is repeated demand, not a single browsing event.`,
      score: Math.min(84, 64 + count * 3),
      action: 'Review availability, pricing and merchandising. Create a sales follow-up task only if the signal is commercially actionable.',
      evidence: {
        integration_event_id: input.integrationEventId,
        product_ref: productRef,
        product_name: name,
        view_count: count,
        category: data.category ?? null,
        brand: data.brand ?? null,
        price: data.price ?? null,
      },
    };
  }

  if (type === 'cart.added') {
    const productRef = String(data.product_id ?? '').trim();
    if (!productRef) return null;

    const count = await recentProductSignalCount(
      input.supabase,
      input.organizationId,
      input.source,
      'cart_added',
      productRef,
      since,
    );

    if (count < 2) return { qualified: false, reason: 'cart_added_threshold', count, threshold: 2 };

    const name = productLabel(data);
    draft = {
      key: `cart-added:${productRef}`,
      type: 'storefront_purchase_intent',
      title: `High purchase intent: ${name}`,
      rationale: `${count} add-to-cart events were recorded for this product in the last ${WINDOW_HOURS} hours. Cart activity is a stronger buying signal than product views alone.`,
      score: Math.min(96, 80 + count * 4),
      action: 'Check stock and price competitiveness, then consider a targeted follow-up or conversion campaign.',
      evidence: {
        integration_event_id: input.integrationEventId,
        product_ref: productRef,
        product_name: name,
        cart_add_count: count,
        category: data.category ?? null,
        brand: data.brand ?? null,
        price: data.price ?? null,
      },
    };
  }

  if (type === 'storefront.search') {
    const query = normalizeSearch(data.query ?? data.search_query);
    if (query.length < 2) return null;

    const count = await recentSearchCount(
      input.supabase,
      input.organizationId,
      input.source,
      query,
      since,
    );

    if (count < 3) return { qualified: false, reason: 'search_threshold', count, threshold: 3 };

    draft = {
      key: `search:${query}`,
      type: 'storefront_search_demand',
      title: `Repeated storefront demand: “${query}”`,
      rationale: `${count} searches for the same demand phrase were recorded in the last ${WINDOW_HOURS} hours. This may indicate unmet inventory, merchandising or campaign demand.`,
      score: Math.min(90, 70 + count * 3),
      action: 'Review whether GadgetPoint has a matching product, then decide whether to stock, source, promote or redirect demand.',
      evidence: {
        integration_event_id: input.integrationEventId,
        normalized_query: query,
        search_count: count,
      },
    };
  }

  if (!draft) return null;

  const assigneeId = await recommendSalesAssignee(input.supabase, input.organizationId);
  const saved = await saveRecommendation(
    input.supabase,
    input.organizationId,
    input.source,
    draft,
    assigneeId,
  );

  await input.supabase.from('activity_logs').insert({
    organization_id: input.organizationId,
    actor_id: null,
    action: saved.updated ? 'storefront.intelligence.updated' : 'storefront.intelligence.created',
    entity_type: 'growth_recommendation',
    entity_id: saved.recommendation?.id ?? null,
    metadata: {
      event_type: type,
      source: input.source,
      score: draft.score,
      signal_key: draft.key,
    },
  });

  return {
    qualified: true,
    updated: saved.updated,
    recommendation: saved.recommendation,
  };
}
