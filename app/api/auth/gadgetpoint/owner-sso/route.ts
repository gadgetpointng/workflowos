import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { authenticateBridge } from '@/lib/integrations/bridge';
import { canPublishEvents } from '@/lib/integrations/capabilities';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';

export async function POST(request: Request) {
  const auth = await authenticateBridge(request, 'gadgetpoint');

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, integration } = auth;

  if (!canPublishEvents(integration.capabilities)) {
    return NextResponse.json(
      { error: 'Integration is not permitted to publish owner identity events' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = String((body as any).email ?? '').trim().toLowerCase();
  const role = String((body as any).role ?? '').trim().toLowerCase();

  if (email !== OWNER_EMAIL || role !== 'owner') {
    return NextResponse.json(
      { error: 'Only the verified GadgetPoint owner identity may use this route' },
      { status: 403 }
    );
  }

  if ((body as any).active === false || String((body as any).status ?? '').toLowerCase() === 'inactive') {
    return NextResponse.json({ error: 'The GadgetPoint owner identity is inactive' }, { status: 403 });
  }

  const externalOwnerId = String(
    (body as any).id ?? (body as any).owner_id ?? OWNER_EMAIL
  ).trim();
  const fullName = String(
    (body as any).full_name ?? (body as any).name ?? 'GadgetPoint Owner'
  ).trim();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 2 * 60 * 1000);
  const code = crypto.randomBytes(32).toString('base64url');
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');

  const { error: eventError } = await supabase.from('integration_events').insert({
    organization_id: integration.organization_id,
    integration_id: integration.id,
    source: 'gadgetpoint',
    event_type: 'owner.sso',
    entity_type: 'owner_sso',
    entity_id: codeHash,
    payload: {
      version: 1,
      expires_at: expiresAt.toISOString(),
      owner: {
        external_owner_id: externalOwnerId || OWNER_EMAIL,
        email: OWNER_EMAIL,
        full_name: fullName || 'GadgetPoint Owner',
        role: 'owner',
        identity_source: 'gadgetpoint-owner-chatgpt',
      },
    },
    processed_at: now.toISOString(),
  });

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 400 });
  }

  await supabase
    .from('external_integrations')
    .update({
      status: 'connected',
      last_synced_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', integration.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  return NextResponse.json({
    ok: true,
    login_url: `${appUrl}/auth/gadgetpoint/owner?code=${encodeURIComponent(code)}`,
    expires_at: expiresAt.toISOString(),
    expires_in_seconds: 120,
  });
}
