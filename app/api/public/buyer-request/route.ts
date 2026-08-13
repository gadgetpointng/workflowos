import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { matchProducts, scoreBuyerIntent } from '@/lib/buyers/intelligence';

export const runtime = 'nodejs';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';
const MAX_BODY_BYTES = 16_384;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

function clean(value: unknown, max = 120) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanAttribution(value: unknown, fallback = 'direct') {
  const normalized = clean(value, 60).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

function optionalMoney(value: unknown) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100_000_000) return null;
  return Math.round(number * 100) / 100;
}

function validEmail(email: string) {
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPhone(phone: string) {
  if (!phone) return true;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 16;
}

function requestIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function signingKey() {
  return process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'workflowos-public-intake';
}

function hmac(value: string) {
  return crypto.createHmac('sha256', signingKey()).update(value).digest('hex');
}

function referrerSummary(request: Request) {
  const raw = request.headers.get('referer');
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return `${url.hostname}${url.pathname}`.slice(0, 180);
  } catch {
    return null;
  }
}

function publicMatches(matches: any[]) {
  return matches.slice(0, 3).map((match: any) => ({
    external_product_id: match.external_product_id ?? null,
    name: match.name,
    category: match.category ?? null,
    price: match.price ?? null,
    available: match.available ?? null,
  }));
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'cache-control': 'no-store, max-age=0',
      'x-content-type-options': 'nosniff',
    },
  });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) return json({ error: 'Request is too large.' }, 413);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  // Honeypot: bots often fill fields that real users never see.
  if (clean(body.website, 120)) {
    return json({ ok: true, request_id: 'received', matches: [] }, 201);
  }

  const productQuery = clean(body.product_query, 140);
  const buyerName = clean(body.buyer_name, 100);
  const phone = clean(body.phone, 40);
  const email = clean(body.email, 160).toLowerCase();
  const category = clean(body.category, 80) || null;
  const brand = clean(body.brand, 80) || null;
  const model = clean(body.model, 100) || null;
  const city = clean(body.city, 80) || null;
  const state = clean(body.state, 80) || null;
  const budgetMax = optionalMoney(body.budget_max);
  const urgency = ['normal', 'high', 'immediate'].includes(clean(body.urgency, 20)) ? clean(body.urgency, 20) : 'normal';
  const attributionSource = cleanAttribution(body.attribution_source);
  const campaign = cleanAttribution(body.campaign, 'none');
  const consent = body.contact_consent === true;

  if (productQuery.length < 2) return json({ error: 'Tell us what product you need.' }, 400);
  if (buyerName.length < 2) return json({ error: 'Your name is required.' }, 400);
  if (!phone && !email) return json({ error: 'Add a phone/WhatsApp number or email so GadgetPoint can respond.' }, 400);
  if (!validPhone(phone)) return json({ error: 'Check the phone/WhatsApp number.' }, 400);
  if (!validEmail(email)) return json({ error: 'Check the email address.' }, 400);
  if (!consent) return json({ error: 'Please confirm that GadgetPoint may contact you about this request.' }, 400);

  const admin = createAdminClient();
  const { data: integration, error: integrationError } = await admin
    .from('external_integrations')
    .select('id,organization_id,status')
    .eq('slug', 'gadgetpoint')
    .maybeSingle();

  if (integrationError || !integration?.organization_id || integration.status === 'disabled') {
    return json({ error: 'Buyer requests are temporarily unavailable.' }, 503);
  }

  const organizationId = integration.organization_id;
  const fingerprint = hmac(`${requestIp(request)}|${request.headers.get('user-agent') || 'unknown'}`).slice(0, 32);
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count: recentCount } = await admin
    .from('buyer_intents')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('source', 'buyer_request')
    .gte('created_at', since)
    .contains('evidence', { intake_fingerprint: fingerprint });

  if ((recentCount || 0) >= RATE_LIMIT_MAX) {
    return json({ error: 'Too many requests from this device. Please try again in a few minutes.' }, 429);
  }

  const contactKey = (phone || email).toLowerCase().replace(/\s+/g, '');
  const day = new Date().toISOString().slice(0, 10);
  const externalRef = `public:${hmac(`${day}|${contactKey}|${productQuery.toLowerCase()}`).slice(0, 36)}`;

  const { data: existing } = await admin
    .from('buyer_intents')
    .select('id,matched_products')
    .eq('organization_id', organizationId)
    .eq('source', 'buyer_request')
    .eq('external_ref', externalRef)
    .maybeSingle();

  if (existing) {
    return json({
      ok: true,
      duplicate: true,
      request_id: String(existing.id).slice(0, 8).toUpperCase(),
      matches: publicMatches(Array.isArray(existing.matched_products) ? existing.matched_products : []),
    });
  }

  const input = {
    product_query: productQuery,
    category,
    brand,
    model,
    budget_max: budgetMax,
    city,
    state,
    urgency,
    source: 'buyer_request',
    consent_status: 'opted_in',
  };

  const { data: products } = await admin
    .from('connected_products')
    .select('id,external_product_id,name,category,price,stock_quantity,active,sku,metadata')
    .eq('organization_id', organizationId)
    .eq('active', true)
    .limit(500);

  const matches = matchProducts(input, products ?? [], 6);
  const score = scoreBuyerIntent(input);
  const evidence = {
    capture: 'public_buyer_request',
    intake_fingerprint: fingerprint,
    attribution_source: attributionSource,
    campaign,
    referrer: referrerSummary(request),
    contact_permission: true,
    consent_version: 'gadgetpoint-buyer-request-v1',
    live_catalog_match_count: matches.length,
  };

  const { data: intent, error: insertError } = await admin
    .from('buyer_intents')
    .insert({
      organization_id: organizationId,
      source: 'buyer_request',
      external_ref: externalRef,
      buyer_name: buyerName,
      phone: phone || null,
      email: email || null,
      product_query: productQuery,
      category,
      brand,
      model,
      budget_max: budgetMax,
      state,
      city,
      urgency,
      consent_status: 'opted_in',
      intent_score: score,
      status: matches.length ? 'matched' : 'new',
      matched_products: matches,
      evidence,
      observed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError || !intent) {
    return json({ error: 'We could not save your request. Please try again.' }, 500);
  }

  await admin.from('activity_logs').insert({
    organization_id: organizationId,
    actor_id: null,
    action: 'buyer_intent.public_submitted',
    entity_type: 'buyer_intent',
    entity_id: intent.id,
    metadata: {
      score,
      attribution_source: attributionSource,
      campaign,
      match_count: matches.length,
    },
  });

  const { data: owner } = await admin
    .from('profiles')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('email', OWNER_EMAIL)
    .eq('role', 'owner')
    .eq('active', true)
    .maybeSingle();

  const { data: salesCapabilities } = await admin
    .from('staff_capabilities')
    .select('profile_id,proficiency,profiles!inner(active)')
    .eq('organization_id', organizationId)
    .eq('capability', 'sales')
    .eq('active', true)
    .order('proficiency', { ascending: false })
    .limit(10);

  const salesAssignee = (salesCapabilities ?? []).find((item: any) => item.profiles?.active !== false)?.profile_id ?? owner?.id ?? null;
  const followupPriority = urgency === 'immediate' || score >= 85 ? 'urgent' : urgency === 'high' || score >= 65 ? 'high' : 'medium';
  const dueMinutes = followupPriority === 'urgent' ? 30 : followupPriority === 'high' ? 120 : 480;
  const followupDueAt = new Date(Date.now() + dueMinutes * 60_000).toISOString();

  const { data: followupTask } = await admin
    .from('tasks')
    .insert({
      organization_id: organizationId,
      title: `Buyer follow-up: ${productQuery}`.slice(0, 180),
      description: `Genuine opted-in buyer request. Source: ${attributionSource}. Campaign: ${campaign}. Intent score: ${Math.round(score)}/100. Open Buyer Intelligence to review contact details, location and live catalog matches.`,
      creator_id: owner?.id ?? null,
      assignee_id: salesAssignee,
      department: 'sales',
      priority: followupPriority,
      status: salesAssignee ? 'assigned' : 'draft',
      due_at: followupDueAt,
      completion_notes: `buyer-intent:${intent.id}`,
    })
    .select('id')
    .single();

  if (followupTask?.id) {
    await admin.from('activity_logs').insert({
      organization_id: organizationId,
      actor_id: null,
      action: 'buyer_intent.followup_task_created',
      entity_type: 'buyer_intent',
      entity_id: intent.id,
      metadata: {
        task_id: followupTask.id,
        assignee_id: salesAssignee,
        priority: followupPriority,
        attribution_source: attributionSource,
        campaign,
      },
    });

    if (salesAssignee && salesAssignee !== owner?.id) {
      await admin.from('notifications').insert({
        organization_id: organizationId,
        recipient_id: salesAssignee,
        title: 'New buyer follow-up assigned',
        body: `${productQuery} · ${followupPriority} priority · open Buyers for details`.slice(0, 240),
        type: 'buyer_request',
      });
    }
  }

  if (owner?.id) {
    const location = [city, state].filter(Boolean).join(', ') || 'Location not supplied';
    const budgetText = budgetMax ? ` · Budget ₦${Math.round(budgetMax).toLocaleString('en-NG')}` : '';
    await admin.from('notifications').insert({
      organization_id: organizationId,
      recipient_id: owner.id,
      title: `New buyer request: ${productQuery}`.slice(0, 140),
      body: `${location}${budgetText} · Intent ${Math.round(score)}/100 · ${matches.length} live match${matches.length === 1 ? '' : 'es'}`,
      type: 'buyer_request',
    });
  }

  return json({
    ok: true,
    request_id: String(intent.id).slice(0, 8).toUpperCase(),
    matches: publicMatches(matches),
  }, 201);
}
