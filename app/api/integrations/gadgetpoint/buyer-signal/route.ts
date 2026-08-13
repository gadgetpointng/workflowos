import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { matchProducts, scoreBuyerIntent } from '@/lib/buyers/intelligence';

const GADGETPOINT_REDEEM_ENDPOINT = 'https://gadgetpoint.ng/api/workflowos/buyer-redeem';
const CODE_RE = /^[0-9a-f]{64}$/i;

type RedeemedBuyer = {
  external_ref?: unknown;
  buyer_name?: unknown;
  email?: unknown;
  phone?: unknown;
  product_url?: unknown;
  product_description?: unknown;
  quantity?: unknown;
  preferred_branch?: unknown;
  created_at?: unknown;
  source?: unknown;
  request_kind?: unknown;
};

function locationFor(branch: string) {
  if (branch === 'Enugu') return { city: 'Enugu', state: 'Enugu' };
  if (branch === 'Mowe') return { city: 'Mowe', state: 'Ogun' };
  return { city: null, state: null };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { code?: unknown } | null;
  const code = String(body?.code ?? '').trim();
  if (!CODE_RE.test(code)) return NextResponse.json({ error: 'Invalid buyer signal' }, { status: 401 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  let redeemed: { buyer?: RedeemedBuyer } | null = null;
  try {
    const response = await fetch(GADGETPOINT_REDEEM_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
    });
    redeemed = await response.json().catch(() => null);
    if (!response.ok) return NextResponse.json({ error: 'Invalid buyer signal' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Buyer signal verification unavailable' }, { status: 503 });
  } finally {
    clearTimeout(timeout);
  }

  const buyer = redeemed?.buyer ?? {};
  const externalRef = String(buyer.external_ref ?? '').trim().slice(0, 120);
  const buyerName = String(buyer.buyer_name ?? '').trim().slice(0, 120);
  const email = String(buyer.email ?? '').trim().toLowerCase().slice(0, 180);
  const phone = String(buyer.phone ?? '').trim().slice(0, 40);
  const productUrl = String(buyer.product_url ?? '').trim().slice(0, 1000);
  const productDescription = String(buyer.product_description ?? '').trim().slice(0, 500);
  const quantity = Math.max(1, Math.min(20, Math.floor(Number(buyer.quantity) || 1)));
  const preferredBranch = String(buyer.preferred_branch ?? '').trim().slice(0, 80);
  const source = String(buyer.source ?? '').trim();
  const requestKind = String(buyer.request_kind ?? '').trim();
  const observed = new Date(String(buyer.created_at ?? ''));

  if (
    !externalRef || !buyerName || !email.includes('@') || phone.length < 7 ||
    source !== 'gadgetpoint_temu_preorder' || requestKind !== 'quote_request'
  ) {
    return NextResponse.json({ error: 'Incomplete buyer signal' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: integration } = await admin
    .from('external_integrations')
    .select('id,organization_id,status,settings')
    .eq('slug', 'gadgetpoint')
    .eq('base_url', 'https://gadgetpoint.ng')
    .maybeSingle();

  if (!integration || !['active', 'connected'].includes(String(integration.status ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'GadgetPoint integration is not active' }, { status: 503 });
  }

  const { data: products } = await admin
    .from('connected_products')
    .select('id,external_product_id,name,category,price,stock_quantity,active,sku,metadata')
    .eq('organization_id', integration.organization_id)
    .eq('active', true)
    .limit(500);

  const location = locationFor(preferredBranch);
  const intentInput = {
    product_query: productDescription || 'Temu preorder request',
    category: null,
    brand: null,
    model: null,
    budget_min: null,
    budget_max: null,
    state: location.state,
    city: location.city,
    urgency: 'normal',
    source,
    consent_status: 'requested_contact',
  };
  const matches = matchProducts(intentInput, products ?? []);
  const intentScore = scoreBuyerIntent(intentInput);
  const now = new Date().toISOString();
  const observedAt = Number.isFinite(observed.getTime()) ? observed.toISOString() : now;

  const { data: intent, error } = await admin
    .from('buyer_intents')
    .upsert(
      {
        organization_id: integration.organization_id,
        source,
        external_ref: externalRef,
        buyer_name: buyerName,
        phone,
        email,
        product_query: intentInput.product_query,
        category: null,
        brand: null,
        model: null,
        budget_min: null,
        budget_max: null,
        state: location.state,
        city: location.city,
        urgency: 'normal',
        consent_status: 'requested_contact',
        intent_score: intentScore,
        status: matches.length ? 'matched' : 'qualified',
        matched_products: matches,
        evidence: {
          capture: 'gadgetpoint_temu_preorder',
          request_kind: 'quote_request',
          product_url: productUrl || null,
          quantity,
          preferred_branch: preferredBranch || null,
          verified_by: 'gadgetpoint-one-time-code',
        },
        observed_at: observedAt,
        updated_at: now,
      },
      { onConflict: 'organization_id,source,external_ref' }
    )
    .select('id,status,intent_score,external_ref')
    .single();

  if (error || !intent) return NextResponse.json({ error: 'Buyer signal could not be recorded' }, { status: 500 });

  await admin
    .from('external_integrations')
    .update({
      status: 'connected',
      last_synced_at: now,
      updated_at: now,
      settings: {
        ...(integration.settings ?? {}),
        buyer_intake_status: 'live',
        buyer_last_received_at: now,
        buyer_source: 'gadgetpoint_temu_preorder',
      },
    })
    .eq('id', integration.id);

  return NextResponse.json(
    { ok: true, buyer_intent_id: intent.id, status: intent.status, score: intent.intent_score },
    { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } }
  );
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } });
}
