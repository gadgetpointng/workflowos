import crypto from 'crypto';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';
const CANONICAL_SUPABASE_URL = 'https://hasnhivdrpeqytgdnkzo.supabase.co';

function configuredSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (value) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return value;
    } catch {}
  }
  return CANONICAL_SUPABASE_URL;
}

function loginError(request: Request, message: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url);
}

function isWorkflowAuthCookie(name: string) {
  return name.startsWith('sb-') && name.includes('-auth-token');
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = String(requestUrl.searchParams.get('code') ?? '').trim();

  if (!code) {
    return loginError(request, 'Missing GadgetPoint owner sign-in code.');
  }

  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anon) {
    return loginError(request, 'WorkflowOS authentication is not configured.');
  }

  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  const admin = createAdminClient();

  const { data: event, error: eventError } = await admin
    .from('integration_events')
    .select('id,organization_id,integration_id,entity_id,payload,created_at')
    .eq('event_type', 'owner.sso')
    .eq('entity_type', 'owner_sso')
    .eq('entity_id', codeHash)
    .maybeSingle();

  if (eventError || !event) {
    return loginError(request, 'This GadgetPoint owner sign-in link is invalid or has already been used.');
  }

  const expiresAt = event.payload?.expires_at
    ? new Date(String(event.payload.expires_at))
    : new Date(new Date(event.created_at).getTime() + 2 * 60 * 1000);

  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    return loginError(request, 'This GadgetPoint owner sign-in link has expired. Please sign in again.');
  }

  const { data: claimed, error: claimError } = await admin
    .from('integration_events')
    .update({
      entity_id: `consumed:${codeHash}`,
      processed_at: new Date().toISOString(),
    })
    .eq('id', event.id)
    .eq('entity_id', codeHash)
    .select('id')
    .maybeSingle();

  if (claimError || !claimed) {
    return loginError(request, 'This GadgetPoint owner sign-in link has already been used.');
  }

  const owner = event.payload?.owner ?? {};
  const email = String(owner.email ?? '').trim().toLowerCase();

  if (email !== OWNER_EMAIL || String(owner.role ?? '').toLowerCase() !== 'owner') {
    return loginError(request, 'The GadgetPoint owner identity is not authorized for WorkflowOS.');
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: OWNER_EMAIL,
  });

  if (linkError || !linkData?.user || !linkData.properties?.hashed_token) {
    return loginError(request, 'WorkflowOS could not create a secure owner session.');
  }

  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id,organization_id')
    .eq('id', linkData.user.id)
    .maybeSingle();

  if (existingProfile && existingProfile.organization_id !== event.organization_id) {
    return loginError(request, 'The authorized GadgetPoint owner email belongs to a different WorkflowOS workspace.');
  }

  const fullName = String(owner.full_name ?? 'GadgetPoint Owner').trim() || 'GadgetPoint Owner';
  const now = new Date().toISOString();

  const { error: profileError } = await admin
    .from('profiles')
    .upsert(
      {
        id: linkData.user.id,
        organization_id: event.organization_id,
        full_name: fullName,
        email: OWNER_EMAIL,
        role: 'owner',
        department: null,
        active: true,
        updated_at: now,
      },
      { onConflict: 'id' }
    );

  if (profileError) {
    return loginError(request, 'WorkflowOS could not provision the GadgetPoint owner profile.');
  }

  await admin
    .from('profiles')
    .update({
      role: 'admin',
      active: false,
      updated_at: now,
    })
    .eq('organization_id', event.organization_id)
    .eq('role', 'owner')
    .neq('id', linkData.user.id);

  await admin.from('activity_logs').insert({
    organization_id: event.organization_id,
    actor_id: linkData.user.id,
    action: 'owner.identity.verified',
    entity_type: 'profile',
    entity_id: linkData.user.id,
    metadata: {
      email: OWNER_EMAIL,
      identity_source: 'gadgetpoint-owner-chatgpt',
    },
  });

  const pendingCookies: Array<{ name: string; value: string; options?: Parameters<NextResponse['cookies']['set']>[2] }> = [];
  const supabase = createServerClient(configuredSupabaseUrl(), anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        pendingCookies.splice(0, pendingCookies.length, ...cookiesToSet);
      },
    },
  });

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'email',
  });

  if (verifyError) {
    return loginError(request, 'WorkflowOS could not finish the GadgetPoint owner sign-in.');
  }

  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  const freshNames = new Set(pendingCookies.map(cookie => cookie.name));

  // Supabase may split auth sessions across multiple cookie chunks. Remove any old chunks
  // that are not part of this fresh session so a previous login cannot corrupt the new one.
  for (const cookie of request.cookies.getAll()) {
    if (isWorkflowAuthCookie(cookie.name) && !freshNames.has(cookie.name)) {
      response.cookies.set(cookie.name, '', {
        path: '/',
        expires: new Date(0),
        maxAge: 0,
        sameSite: 'lax',
        secure: true,
      });
    }
  }

  for (const cookie of pendingCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options as any);
  }
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
