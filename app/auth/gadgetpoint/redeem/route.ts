import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';
const GADGETPOINT_REDEEM_ENDPOINT = 'https://gadgetpoint.ng/api/workflowos/redeem';
const CODE_RE = /^[0-9a-f]{64}$/i;

function loginError(request: Request, message: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', message);
  const response = NextResponse.redirect(url, 303);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = String(requestUrl.searchParams.get('code') ?? '').trim();
  if (!CODE_RE.test(code)) {
    return loginError(request, 'The GadgetPoint owner sign-in code is invalid or expired.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let redeemed: { owner?: { email?: unknown; full_name?: unknown; role?: unknown } } | null = null;
  try {
    const response = await fetch(GADGETPOINT_REDEEM_ENDPOINT, {
      method: 'POST',
      redirect: 'error',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
      cache: 'no-store',
      signal: controller.signal,
    });
    redeemed = await response.json().catch(() => null);
    if (!response.ok) {
      return loginError(request, 'The GadgetPoint owner sign-in code is invalid or expired.');
    }
  } catch {
    return loginError(request, 'WorkflowOS could not verify the GadgetPoint owner handoff. Please try again.');
  } finally {
    clearTimeout(timeout);
  }

  const email = String(redeemed?.owner?.email ?? '').trim().toLowerCase();
  const role = String(redeemed?.owner?.role ?? '').trim().toLowerCase();
  const fullName = String(redeemed?.owner?.full_name ?? 'GadgetPoint Owner').trim() || 'GadgetPoint Owner';
  if (email !== OWNER_EMAIL || role !== 'owner') {
    return loginError(request, 'The GadgetPoint owner identity is not authorized for WorkflowOS.');
  }

  const admin = createAdminClient();
  const { data: integration } = await admin
    .from('external_integrations')
    .select('id,organization_id,status')
    .eq('slug', 'gadgetpoint')
    .eq('base_url', 'https://gadgetpoint.ng')
    .maybeSingle();

  if (!integration || !['active', 'connected'].includes(String(integration.status ?? '').toLowerCase())) {
    return loginError(request, 'The GadgetPoint integration is not active in WorkflowOS.');
  }

  const { data: ownerProfile } = await admin
    .from('profiles')
    .select('id,organization_id,email,role,active')
    .eq('organization_id', integration.organization_id)
    .eq('email', OWNER_EMAIL)
    .eq('role', 'owner')
    .maybeSingle();

  if (!ownerProfile || ownerProfile.active === false) {
    return loginError(request, 'The authorized WorkflowOS owner profile is not active.');
  }

  const workflowCode = crypto.randomBytes(32).toString('base64url');
  const workflowCodeHash = crypto.createHash('sha256').update(workflowCode).digest('hex');
  const sourceFingerprint = crypto.createHash('sha256').update(code).digest('hex').slice(0, 12);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 2 * 60 * 1000);

  const { error: eventError } = await admin.from('integration_events').insert([
    {
      organization_id: integration.organization_id,
      integration_id: integration.id,
      source: 'gadgetpoint',
      event_type: 'auth.owner_code_redeemed',
      external_id: `gadgetpoint-owner-code:${sourceFingerprint}`,
      entity_type: 'auth_nonce',
      entity_id: sourceFingerprint,
      payload: {
        version: 1,
        expires_at: expiresAt.toISOString(),
        identity_source: 'gadgetpoint-owner-authorization-code',
      },
      processed_at: now.toISOString(),
    },
    {
      organization_id: integration.organization_id,
      integration_id: integration.id,
      source: 'gadgetpoint',
      event_type: 'owner.sso',
      entity_type: 'owner_sso',
      entity_id: workflowCodeHash,
      payload: {
        version: 4,
        expires_at: expiresAt.toISOString(),
        owner: {
          external_owner_id: OWNER_EMAIL,
          email: OWNER_EMAIL,
          full_name: fullName,
          role: 'owner',
          identity_source: 'gadgetpoint-owner-authorization-code',
        },
      },
      processed_at: now.toISOString(),
    },
  ]);

  if (eventError) {
    return loginError(request, 'WorkflowOS could not create the one-time owner session handoff.');
  }

  await admin.from('activity_logs').insert({
    organization_id: integration.organization_id,
    actor_id: ownerProfile.id,
    action: 'auth.gadgetpoint.owner_code.accepted',
    entity_type: 'profile',
    entity_id: ownerProfile.id,
    metadata: {
      request_fingerprint: sourceFingerprint,
      identity_source: 'gadgetpoint-owner-authorization-code',
    },
  });

  const destination = new URL('/auth/gadgetpoint/owner', request.url);
  destination.searchParams.set('code', workflowCode);
  const response = NextResponse.redirect(destination, 303);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
