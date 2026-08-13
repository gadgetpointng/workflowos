import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { authenticateBridge } from '@/lib/integrations/bridge';
import { canPublishEvents } from '@/lib/integrations/capabilities';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';
const REQUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const auth = await authenticateBridge(request, 'gadgetpoint');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, integration, credential } = auth;
  if (!canPublishEvents(integration.capabilities)) {
    return NextResponse.json(
      { error: 'Integration is not permitted to publish owner identity events' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const externalOwnerId = String(body.id ?? '').trim().toLowerCase();
  const username = String(body.username ?? '').trim().toLowerCase();
  const email = String(body.email ?? '').trim().toLowerCase();
  const role = String(body.role ?? '').trim().toLowerCase();
  const status = String(body.status ?? '').trim().toLowerCase();
  const requestId = String(body.request_id ?? '').trim();
  const fullName = String(body.full_name ?? 'GadgetPoint Owner').trim() || 'GadgetPoint Owner';

  if (
    externalOwnerId !== OWNER_EMAIL ||
    username !== OWNER_EMAIL ||
    email !== OWNER_EMAIL ||
    role !== 'owner' ||
    body.active === false ||
    status === 'inactive' ||
    !REQUEST_ID_RE.test(requestId)
  ) {
    return NextResponse.json({ error: 'Invalid GadgetPoint owner identity' }, { status: 403 });
  }

  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('id,organization_id,email,role,active')
    .eq('organization_id', integration.organization_id)
    .eq('email', OWNER_EMAIL)
    .eq('role', 'owner')
    .maybeSingle();

  if (!ownerProfile || ownerProfile.active === false) {
    return NextResponse.json({ error: 'The authorized WorkflowOS owner profile is not active' }, { status: 403 });
  }

  const replayKey = `gadgetpoint-owner-bridge:${requestId}`;
  const { data: existingReplay } = await supabase
    .from('integration_events')
    .select('id')
    .eq('integration_id', integration.id)
    .eq('external_id', replayKey)
    .maybeSingle();

  if (existingReplay) {
    return NextResponse.json({ error: 'This owner sign-in request has already been used' }, { status: 409 });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 2 * 60 * 1000);
  const code = crypto.randomBytes(32).toString('base64url');
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  const requestFingerprint = crypto.createHash('sha256').update(requestId).digest('hex').slice(0, 12);

  const { error: eventError } = await supabase.from('integration_events').insert([
    {
      organization_id: integration.organization_id,
      integration_id: integration.id,
      source: 'gadgetpoint',
      event_type: 'auth.bridge_owner_nonce',
      external_id: replayKey,
      entity_type: 'auth_nonce',
      entity_id: requestFingerprint,
      payload: {
        version: 1,
        expires_at: expiresAt.toISOString(),
        credential_id: credential.id,
      },
      processed_at: now.toISOString(),
    },
    {
      organization_id: integration.organization_id,
      integration_id: integration.id,
      source: 'gadgetpoint',
      event_type: 'owner.sso',
      entity_type: 'owner_sso',
      entity_id: codeHash,
      payload: {
        version: 3,
        expires_at: expiresAt.toISOString(),
        owner: {
          external_owner_id: OWNER_EMAIL,
          email: OWNER_EMAIL,
          full_name: fullName,
          role: 'owner',
          identity_source: 'gadgetpoint-owner-authenticated-bridge',
        },
      },
      processed_at: now.toISOString(),
    },
  ]);

  if (eventError) {
    return NextResponse.json({ error: 'Could not create the one-time WorkflowOS owner session handoff' }, { status: 409 });
  }

  await supabase.from('activity_logs').insert({
    organization_id: integration.organization_id,
    actor_id: ownerProfile.id,
    action: 'auth.gadgetpoint.owner_bridge.accepted',
    entity_type: 'profile',
    entity_id: ownerProfile.id,
    metadata: {
      request_fingerprint: requestFingerprint,
      identity_source: 'gadgetpoint-owner-authenticated-bridge',
      credential_id: credential.id,
    },
  });

  await supabase
    .from('external_integrations')
    .update({
      status: 'connected',
      last_synced_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', integration.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  return NextResponse.json(
    {
      ok: true,
      login_url: `${appUrl}/auth/gadgetpoint/owner?code=${encodeURIComponent(code)}`,
      expires_at: expiresAt.toISOString(),
      expires_in_seconds: 120,
    },
    { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } }
  );
}
