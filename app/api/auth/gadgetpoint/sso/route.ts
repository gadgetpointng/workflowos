import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { authenticateBridge } from '@/lib/integrations/bridge';
import { canPublishEvents } from '@/lib/integrations/capabilities';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';
const GADGETPOINT_HOSTS = new Set(['gadgetpoint.ng', 'www.gadgetpoint.ng']);

const allowedStaffRoles = new Set([
  'admin',
  'manager',
  'marketing',
  'sales',
  'staff',
]);

const gadgetPointRoleAliases: Record<string, string> = {
  administrator: 'admin',
  'store manager': 'manager',
  'sales staff': 'sales',
  'marketing staff': 'marketing',
  employee: 'staff',
};

type JwtHeader = {
  alg?: string;
  kid?: string;
};

type JwtClaims = {
  iss?: string;
  sub?: string;
  email?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

function normalizeStaffRole(role: unknown) {
  const value = String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  const normalized = gadgetPointRoleAliases[value] ?? value;
  return allowedStaffRoles.has(normalized) ? normalized : 'staff';
}

function staffIdentityEmail(externalStaffId: string, username: string) {
  const label = String(username || 'staff')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 32) || 'staff';
  const digest = crypto
    .createHash('sha256')
    .update(externalStaffId)
    .digest('hex')
    .slice(0, 16);

  return `${label}.${digest}@staff.workflowos.invalid`;
}

function legacyLoginError(request: Request, message: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', message);
  const response = NextResponse.redirect(url);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

function decodeBase64UrlJson<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

function parseExternalJwt(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const header = decodeBase64UrlJson<JwtHeader>(parts[0]);
  const claims = decodeBase64UrlJson<JwtClaims>(parts[1]);
  if (!header || !claims) return null;

  return {
    header,
    claims,
    signingInput: new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    signature: Buffer.from(parts[2], 'base64url'),
  };
}

function normalizeIssuer(value: unknown) {
  try {
    const url = new URL(String(value ?? '').trim());
    if (url.protocol !== 'https:') return null;
    const pathname = url.pathname.replace(/\/+$/, '');
    if (!pathname.endsWith('/auth/v1')) return null;
    return `${url.origin}${pathname}`;
  } catch {
    return null;
  }
}

function requestCameFromGadgetPoint(request: Request) {
  const referer = request.headers.get('referer');
  if (!referer) return false;
  try {
    return GADGETPOINT_HOSTS.has(new URL(referer).hostname.toLowerCase());
  } catch {
    return false;
  }
}

async function verifyExternalJwt(token: string, expectedIssuer: string) {
  const parsed = parseExternalJwt(token);
  if (!parsed?.header.kid || !parsed.header.alg) return null;

  const issuer = normalizeIssuer(parsed.claims.iss);
  if (!issuer || issuer !== expectedIssuer) return null;

  const now = Math.floor(Date.now() / 1000);
  if (!parsed.claims.exp || parsed.claims.exp <= now) return null;
  if (parsed.claims.nbf && parsed.claims.nbf > now + 30) return null;
  const audience = Array.isArray(parsed.claims.aud) ? parsed.claims.aud : [parsed.claims.aud];
  if (!audience.includes('authenticated')) return null;

  const jwksResponse = await fetch(`${expectedIssuer}/.well-known/jwks.json`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  }).catch(() => null);

  if (!jwksResponse?.ok) return null;
  const jwks = (await jwksResponse.json().catch(() => null)) as
    | { keys?: Array<JsonWebKey & { kid?: string }> }
    | null;
  const jwk = jwks?.keys?.find((candidate) => candidate.kid === parsed.header.kid);
  if (!jwk) return null;

  const subtle = crypto.webcrypto.subtle;
  let verified = false;

  if (parsed.header.alg === 'RS256') {
    const key = await subtle
      .importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify']
      )
      .catch(() => null);
    if (key) {
      verified = await subtle.verify(
        'RSASSA-PKCS1-v1_5',
        key,
        parsed.signature,
        parsed.signingInput
      );
    }
  } else if (parsed.header.alg === 'ES256') {
    const key = await subtle
      .importKey(
        'jwk',
        jwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify']
      )
      .catch(() => null);
    if (key) {
      verified = await subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        key,
        parsed.signature,
        parsed.signingInput
      );
    }
  }

  return verified ? parsed.claims : null;
}

async function mintWorkflowSession(
  request: Request,
  email: string,
  expectedProfileId?: string | null
) {
  const admin = createAdminClient();
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  if (
    linkError ||
    !linkData?.user ||
    !linkData.properties?.hashed_token ||
    (expectedProfileId && linkData.user.id !== expectedProfileId)
  ) {
    return { ok: false as const, response: legacyLoginError(request, 'WorkflowOS could not create a fresh secure session for this identity.') };
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'email',
  });

  if (verifyError) {
    return { ok: false as const, response: legacyLoginError(request, 'WorkflowOS could not finish the GadgetPoint Admin sign-in.') };
  }

  return { ok: true as const, userId: linkData.user.id };
}

async function completeTrustedExternalLogin(
  request: Request,
  tokenFingerprint: string,
  claims: JwtClaims,
  integration: {
    id: string;
    organization_id: string;
    settings: Record<string, unknown> | null;
  },
  issuer: string
) {
  const admin = createAdminClient();
  const appMetadata = claims.app_metadata ?? {};
  const userMetadata = claims.user_metadata ?? {};
  const externalStaffId = String(
    appMetadata.staff_id ?? userMetadata.staff_id ?? claims.sub ?? ''
  ).trim();
  const suppliedEmail = String(claims.email ?? '').trim().toLowerCase();

  if (!externalStaffId) {
    return legacyLoginError(request, 'The GadgetPoint Admin identity is missing its staff identifier.');
  }

  if (suppliedEmail === OWNER_EMAIL) {
    const { data: ownerProfile } = await admin
      .from('profiles')
      .select('id,organization_id,email,role,active')
      .eq('organization_id', integration.organization_id)
      .eq('email', OWNER_EMAIL)
      .eq('role', 'owner')
      .maybeSingle();

    if (!ownerProfile || ownerProfile.active === false) {
      return legacyLoginError(request, 'The authorized WorkflowOS owner profile is not active.');
    }

    const session = await mintWorkflowSession(request, OWNER_EMAIL, ownerProfile.id);
    if (!session.ok) return session.response;

    await admin.from('activity_logs').insert({
      organization_id: integration.organization_id,
      actor_id: ownerProfile.id,
      action: 'auth.gadgetpoint.external_owner_sso.accepted',
      entity_type: 'profile',
      entity_id: ownerProfile.id,
      metadata: {
        token_fingerprint: tokenFingerprint,
        issuer,
        identity_source: 'gadgetpoint-admin',
      },
    });

    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  }

  const username = String(
    userMetadata.username ??
      userMetadata.user_name ??
      appMetadata.username ??
      (suppliedEmail.includes('@') ? suppliedEmail.split('@')[0] : '') ??
      externalStaffId
  ).trim() || externalStaffId;
  const fullName = String(
    userMetadata.full_name ?? userMetadata.name ?? username
  ).trim() || username;
  const role = normalizeStaffRole(
    appMetadata.role ?? appMetadata.user_role ?? appMetadata.staff_role ?? 'staff'
  );
  const departmentValue = appMetadata.department ?? userMetadata.department;
  const department = departmentValue ? String(departmentValue).trim() : null;

  if (appMetadata.active === false || String(appMetadata.status ?? '').toLowerCase() === 'inactive') {
    return legacyLoginError(request, 'This GadgetPoint staff account is inactive.');
  }

  const { data: existingStaff } = await admin
    .from('connected_staff')
    .select('id,profile_id,email,status,metadata')
    .eq('integration_id', integration.id)
    .eq('external_staff_id', externalStaffId)
    .maybeSingle();

  if (existingStaff?.status === 'inactive') {
    return legacyLoginError(request, 'This GadgetPoint staff account is inactive in WorkflowOS.');
  }

  const hasExternalEmail = suppliedEmail.includes('@');
  const email = String(existingStaff?.email ?? '').includes('@')
    ? String(existingStaff?.email).trim().toLowerCase()
    : hasExternalEmail
      ? suppliedEmail
      : staffIdentityEmail(externalStaffId, username);

  if (email === OWNER_EMAIL) {
    return legacyLoginError(request, 'The GadgetPoint owner identity must use the owner sign-in route.');
  }

  const now = new Date().toISOString();
  const { data: connectedStaff, error: connectedStaffError } = await admin
    .from('connected_staff')
    .upsert(
      {
        organization_id: integration.organization_id,
        integration_id: integration.id,
        external_staff_id: externalStaffId,
        email,
        full_name: fullName,
        role,
        department,
        status: 'active',
        metadata: {
          ...(existingStaff?.metadata ?? {}),
          username,
          identity_source: 'gadgetpoint-admin-external-token',
          workflowos_identity_kind: hasExternalEmail ? 'external_email' : 'non_delivery_staff_identity',
          external_email: hasExternalEmail ? suppliedEmail : null,
          password_owner: 'gadgetpoint',
          trusted_auth_issuer: issuer,
        },
        last_synced_at: now,
        updated_at: now,
      },
      { onConflict: 'integration_id,external_staff_id' }
    )
    .select('id,profile_id')
    .single();

  if (connectedStaffError || !connectedStaff) {
    return legacyLoginError(request, 'WorkflowOS could not register this verified GadgetPoint staff identity.');
  }

  const session = await mintWorkflowSession(request, email, connectedStaff.profile_id);
  if (!session.ok) return session.response;

  const { data: profileForAuthUser } = await admin
    .from('profiles')
    .select('id,organization_id,email,role')
    .eq('id', session.userId)
    .maybeSingle();

  if (profileForAuthUser && profileForAuthUser.organization_id !== integration.organization_id) {
    return legacyLoginError(request, 'This account already belongs to another WorkflowOS workspace.');
  }

  if (
    profileForAuthUser &&
    (String(profileForAuthUser.role ?? '').toLowerCase() === 'owner' ||
      String(profileForAuthUser.email ?? '').trim().toLowerCase() === OWNER_EMAIL)
  ) {
    return legacyLoginError(request, 'The owner account cannot be provisioned from a staff sign-in.');
  }

  const { error: profileError } = await admin
    .from('profiles')
    .upsert(
      {
        id: session.userId,
        organization_id: integration.organization_id,
        full_name: fullName,
        email,
        role,
        department,
        active: true,
        updated_at: now,
      },
      { onConflict: 'id' }
    );

  if (profileError) {
    return legacyLoginError(request, 'WorkflowOS could not provision this GadgetPoint staff profile.');
  }

  await admin
    .from('connected_staff')
    .update({
      profile_id: session.userId,
      last_synced_at: now,
      updated_at: now,
    })
    .eq('id', connectedStaff.id);

  await admin
    .from('shared_identity_links')
    .upsert(
      {
        organization_id: integration.organization_id,
        profile_id: session.userId,
        integration_id: integration.id,
        external_staff_id: externalStaffId,
        external_email: hasExternalEmail ? suppliedEmail : null,
        verified_at: now,
        metadata: {
          username,
          identity_source: 'gadgetpoint-admin-external-token',
          password_owner: 'gadgetpoint',
          workflowos_session_identity: email,
          workflowos_identity_kind: hasExternalEmail ? 'external_email' : 'non_delivery_staff_identity',
          trusted_auth_issuer: issuer,
        },
        updated_at: now,
      },
      { onConflict: 'integration_id,external_staff_id' }
    );

  await admin.from('activity_logs').insert({
    organization_id: integration.organization_id,
    actor_id: session.userId,
    action: 'auth.gadgetpoint.external_staff_sso.accepted',
    entity_type: 'profile',
    entity_id: session.userId,
    metadata: {
      token_fingerprint: tokenFingerprint,
      issuer,
      external_staff_id: externalStaffId,
      username,
      role,
    },
  });

  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

/**
 * Backward-compatible browser handoff for GadgetPoint Admin builds that pass
 * the signed GadgetPoint access token in the URL. Tokens are never trusted by
 * decoding alone: WorkflowOS verifies their public signing key, pins the
 * trusted issuer through an authenticated owner handoff, and then creates its
 * own independent session.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = String(requestUrl.searchParams.get('token') ?? '').trim();

  if (!token) {
    return legacyLoginError(request, 'Missing GadgetPoint Admin sign-in token.');
  }

  const tokenFingerprint = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')
    .slice(0, 12);

  const admin = createAdminClient();
  const { data: verified } = await admin.auth.getUser(token);
  const verifiedUser = verified?.user;

  if (verifiedUser) {
    const email = String(verifiedUser.email ?? '').trim().toLowerCase();
    if (!email.includes('@')) {
      return legacyLoginError(request, 'The verified GadgetPoint identity has no usable login email.');
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id,organization_id,email,role,active')
      .eq('id', verifiedUser.id)
      .maybeSingle();

    if (profileError || !profile) {
      return legacyLoginError(request, 'This GadgetPoint identity is verified but is not linked to a WorkflowOS profile yet.');
    }

    const profileEmail = String(profile.email ?? '').trim().toLowerCase();
    const role = String(profile.role ?? '').trim().toLowerCase();
    if (profile.active === false || profileEmail !== email) {
      return legacyLoginError(request, 'This GadgetPoint sign-in identity is not active or does not match its WorkflowOS profile.');
    }

    const isOwner = role === 'owner' || profileEmail === OWNER_EMAIL;
    if (isOwner) {
      if (role !== 'owner' || profileEmail !== OWNER_EMAIL) {
        return legacyLoginError(request, `WorkflowOS owner access is restricted to ${OWNER_EMAIL}.`);
      }
    } else if (!allowedStaffRoles.has(role)) {
      return legacyLoginError(request, 'This GadgetPoint identity is not a permitted WorkflowOS staff role.');
    }

    const session = await mintWorkflowSession(request, profileEmail, profile.id);
    if (!session.ok) return session.response;

    await admin.from('activity_logs').insert({
      organization_id: profile.organization_id,
      actor_id: profile.id,
      action: 'auth.gadgetpoint.legacy_sso.accepted',
      entity_type: 'profile',
      entity_id: profile.id,
      metadata: {
        token_fingerprint: tokenFingerprint,
        compatibility_path: 'workflowos_supabase_access_token',
        role,
      },
    });

    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  }

  const parsed = parseExternalJwt(token);
  const candidateIssuer = normalizeIssuer(parsed?.claims.iss);
  if (!parsed || !candidateIssuer) {
    console.warn('Rejected GadgetPoint Admin SSO token', {
      tokenFingerprint,
      reason: 'unsupported_external_token',
    });
    return legacyLoginError(request, 'GadgetPoint Admin sent an unsupported sign-in token. Please sign in again from GadgetPoint Admin.');
  }

  const { data: integration } = await admin
    .from('external_integrations')
    .select('id,organization_id,settings,status')
    .eq('slug', 'gadgetpoint')
    .eq('base_url', 'https://gadgetpoint.ng')
    .maybeSingle();

  if (!integration || !['active', 'connected'].includes(String(integration.status ?? '').toLowerCase())) {
    return legacyLoginError(request, 'The GadgetPoint integration is not active in WorkflowOS.');
  }

  const settings = (integration.settings ?? {}) as Record<string, unknown>;
  const trustedIssuer = normalizeIssuer(settings.trusted_auth_issuer);

  if (trustedIssuer && trustedIssuer !== candidateIssuer) {
    console.warn('Rejected GadgetPoint Admin token from unexpected issuer', {
      tokenFingerprint,
      candidateIssuer,
      trustedIssuer,
    });
    return legacyLoginError(request, 'GadgetPoint Admin used an identity issuer that is not trusted by this WorkflowOS workspace.');
  }

  const claims = await verifyExternalJwt(token, candidateIssuer);
  if (!claims) {
    console.warn('Rejected GadgetPoint Admin token after signature verification', {
      tokenFingerprint,
      candidateIssuer,
      alg: parsed.header.alg,
    });
    return legacyLoginError(request, 'WorkflowOS could not verify the GadgetPoint Admin sign-in token. Please sign in again.');
  }

  if (!trustedIssuer) {
    const supabase = await createClient();
    const { data: currentSession } = await supabase.auth.getUser();
    const currentUser = currentSession?.user;

    if (!currentUser || !requestCameFromGadgetPoint(request)) {
      console.warn('GadgetPoint external issuer awaits owner verification', {
        tokenFingerprint,
        candidateIssuer,
        reason: currentUser ? 'missing_gadgetpoint_referrer' : 'missing_owner_session',
      });
      return legacyLoginError(
        request,
        'WorkflowOS has detected the GadgetPoint identity provider, but the owner must verify this connection once from an active WorkflowOS owner session.'
      );
    }

    const { data: ownerProfile } = await admin
      .from('profiles')
      .select('id,organization_id,email,role,active')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (
      !ownerProfile ||
      ownerProfile.active === false ||
      ownerProfile.organization_id !== integration.organization_id ||
      String(ownerProfile.role ?? '').toLowerCase() !== 'owner' ||
      String(ownerProfile.email ?? '').trim().toLowerCase() !== OWNER_EMAIL ||
      String(currentUser.email ?? '').trim().toLowerCase() !== OWNER_EMAIL
    ) {
      return legacyLoginError(request, 'Only the authorized WorkflowOS owner can verify the GadgetPoint identity provider.');
    }

    const nextSettings = {
      ...settings,
      identity_source: 'gadgetpoint-admin',
      shared_identity_status: 'verified',
      trusted_auth_issuer: candidateIssuer,
      identity_verified_at: new Date().toISOString(),
    };

    const { error: issuerError } = await admin
      .from('external_integrations')
      .update({ settings: nextSettings, updated_at: new Date().toISOString() })
      .eq('id', integration.id);

    if (issuerError) {
      return legacyLoginError(request, 'WorkflowOS could not save the verified GadgetPoint identity provider.');
    }

    await admin.from('activity_logs').insert({
      organization_id: integration.organization_id,
      actor_id: ownerProfile.id,
      action: 'integration.gadgetpoint.identity_issuer.verified',
      entity_type: 'external_integration',
      entity_id: integration.id,
      metadata: {
        issuer: candidateIssuer,
        token_fingerprint: tokenFingerprint,
        verification_method: 'owner_session_plus_gadgetpoint_referrer_plus_jwks',
      },
    });
  }

  return completeTrustedExternalLogin(
    request,
    tokenFingerprint,
    claims,
    {
      id: integration.id,
      organization_id: integration.organization_id,
      settings,
    },
    candidateIssuer
  );
}

async function acceptSignedOwnerHandoff(request: Request, token: string) {
  const parsed = parseExternalJwt(token);
  const candidateIssuer = normalizeIssuer(parsed?.claims.iss);
  const tokenFingerprint = crypto.createHash('sha256').update(token).digest('hex').slice(0, 12);
  if (!parsed || !candidateIssuer) {
    return NextResponse.json({ error: 'Unsupported GadgetPoint identity token' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: integration } = await admin
    .from('external_integrations')
    .select('id,organization_id,settings,status')
    .eq('slug', 'gadgetpoint')
    .eq('base_url', 'https://gadgetpoint.ng')
    .maybeSingle();
  if (!integration || !['active', 'connected'].includes(String(integration.status ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'The GadgetPoint integration is not active' }, { status: 403 });
  }

  const settings = (integration.settings ?? {}) as Record<string, unknown>;
  const trustedIssuer = normalizeIssuer(settings.trusted_auth_issuer);
  if (trustedIssuer && trustedIssuer !== candidateIssuer) {
    console.warn('Rejected GadgetPoint owner SSO issuer', { tokenFingerprint, candidateIssuer });
    return NextResponse.json({ error: 'Untrusted GadgetPoint identity issuer' }, { status: 401 });
  }

  const claims = await verifyExternalJwt(token, candidateIssuer);
  const now = Math.floor(Date.now() / 1000);
  const jti = String(claims?.jti ?? '').trim();
  const email = String(claims?.email ?? '').trim().toLowerCase();
  const role = String(claims?.app_metadata?.role ?? '').trim().toLowerCase();
  if (!claims || !jti || !claims.iat || claims.iat > now + 30 || now - claims.iat > 120 ||
      claims.sub !== OWNER_EMAIL || email !== OWNER_EMAIL || role !== 'owner' ||
      claims.app_metadata?.active === false || String(claims.app_metadata?.status ?? '').toLowerCase() === 'inactive') {
    console.warn('Rejected GadgetPoint owner SSO claims', { tokenFingerprint, candidateIssuer });
    return NextResponse.json({ error: 'Invalid GadgetPoint owner identity' }, { status: 403 });
  }

  const replayKey = `gadgetpoint-sso:${jti}`;
  const { data: existingReplay } = await admin.from('integration_events')
    .select('id').eq('integration_id', integration.id).eq('external_id', replayKey).maybeSingle();
  if (existingReplay) return NextResponse.json({ error: 'This sign-in handoff has already been used' }, { status: 409 });

  const code = crypto.randomBytes(32).toString('base64url');
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
  const fullName = String(claims.user_metadata?.full_name ?? 'GadgetPoint Owner').trim() || 'GadgetPoint Owner';
  const { error: eventError } = await admin.from('integration_events').insert([
    {
      organization_id: integration.organization_id, integration_id: integration.id,
      source: 'gadgetpoint', event_type: 'auth.sso_jti', external_id: replayKey,
      entity_type: 'auth_nonce', entity_id: tokenFingerprint,
      payload: { issuer: candidateIssuer, expires_at: new Date((claims.exp ?? now) * 1000).toISOString() },
      processed_at: new Date().toISOString(),
    },
    {
      organization_id: integration.organization_id, integration_id: integration.id,
      source: 'gadgetpoint', event_type: 'owner.sso', entity_type: 'owner_sso', entity_id: codeHash,
      payload: { version: 2, expires_at: expiresAt.toISOString(), owner: {
        external_owner_id: claims.sub, email: OWNER_EMAIL, full_name: fullName, role: 'owner',
        identity_source: 'gadgetpoint-owner-signed-jwt',
      }}, processed_at: new Date().toISOString(),
    },
  ]);
  if (eventError) {
    console.warn('Failed to claim GadgetPoint owner SSO handoff', { tokenFingerprint });
    return NextResponse.json({ error: 'Could not create the one-time WorkflowOS session handoff' }, { status: 409 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  return NextResponse.json({
    ok: true,
    login_url: `${appUrl}/auth/gadgetpoint/owner?code=${encodeURIComponent(code)}`,
    expires_at: expiresAt.toISOString(),
    expires_in_seconds: 120,
  }, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}

export async function POST(request: Request) {
  if ((request.headers.get('content-type') || '').toLowerCase().startsWith('application/jwt')) {
    const authorization = request.headers.get('authorization') || '';
    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    if (!token) return NextResponse.json({ error: 'Missing signed GadgetPoint identity token' }, { status: 401 });
    return acceptSignedOwnerHandoff(request, token);
  }

  const auth = await authenticateBridge(request, 'gadgetpoint');

  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const { supabase, integration } = auth;

  if (!canPublishEvents(integration.capabilities)) {
    return NextResponse.json(
      { error: 'Integration is not permitted to publish staff identity events' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const externalStaffId = String(
    body.id ?? body.staff_id ?? body.username ?? ''
  ).trim();
  const username = String(body.username ?? externalStaffId).trim();

  if (!externalStaffId) {
    return NextResponse.json(
      { error: 'A GadgetPoint staff id or username is required' },
      { status: 400 }
    );
  }

  if (body.active === false || String(body.status ?? '').toLowerCase() === 'inactive') {
    return NextResponse.json(
      { error: 'This GadgetPoint staff account is inactive' },
      { status: 403 }
    );
  }

  const suppliedEmail = String(body.email ?? '').trim().toLowerCase();
  const ownerIdentityAttempt = [
    suppliedEmail,
    externalStaffId.toLowerCase(),
    username.toLowerCase(),
  ].includes(OWNER_EMAIL);

  if (ownerIdentityAttempt) {
    return NextResponse.json(
      { error: 'The GadgetPoint owner identity must use the owner sign-in route' },
      { status: 403 }
    );
  }

  const { data: existingStaff } = await supabase
    .from('connected_staff')
    .select('id,status')
    .eq('integration_id', integration.id)
    .eq('external_staff_id', externalStaffId)
    .maybeSingle();

  if (existingStaff?.status === 'inactive') {
    return NextResponse.json(
      { error: 'This GadgetPoint staff account is inactive' },
      { status: 403 }
    );
  }

  const hasExternalEmail = suppliedEmail.includes('@');
  const email = hasExternalEmail
    ? suppliedEmail
    : staffIdentityEmail(externalStaffId, username);
  const fullName = String(
    body.full_name ?? body.name ?? username ?? externalStaffId
  ).trim();
  const role = normalizeStaffRole(body.role);
  const department = body.department
    ? String(body.department).trim()
    : null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 2 * 60 * 1000);
  const code = crypto.randomBytes(32).toString('base64url');
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');

  const { error: staffError } = await supabase
    .from('connected_staff')
    .upsert(
      {
        organization_id: integration.organization_id,
        integration_id: integration.id,
        external_staff_id: externalStaffId,
        email,
        full_name: fullName || username || externalStaffId,
        role,
        department,
        status: 'active',
        metadata: {
          ...(body.metadata ?? {}),
          username: username || null,
          identity_source: 'gadgetpoint-staff-login',
          workflowos_identity_kind: hasExternalEmail ? 'external_email' : 'non_delivery_staff_identity',
          external_email: hasExternalEmail ? suppliedEmail : null,
          password_owner: 'gadgetpoint',
        },
        last_synced_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: 'integration_id,external_staff_id' }
    );

  if (staffError) {
    return NextResponse.json(
      { error: staffError.message },
      { status: 400 }
    );
  }

  const { error: eventError } = await supabase
    .from('integration_events')
    .insert({
      organization_id: integration.organization_id,
      integration_id: integration.id,
      source: 'gadgetpoint',
      event_type: 'staff.sso',
      entity_type: 'staff_sso',
      entity_id: codeHash,
      payload: {
        version: 2,
        expires_at: expiresAt.toISOString(),
        staff: {
          external_staff_id: externalStaffId,
          username: username || null,
          email,
          external_email: hasExternalEmail ? suppliedEmail : null,
          full_name: fullName || username || externalStaffId,
          role,
          department,
          workflowos_identity_kind: hasExternalEmail ? 'external_email' : 'non_delivery_staff_identity',
        },
      },
      processed_at: now.toISOString(),
    });

  if (eventError) {
    return NextResponse.json(
      { error: eventError.message },
      { status: 400 }
    );
  }

  await supabase
    .from('external_integrations')
    .update({
      status: 'connected',
      last_synced_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', integration.id);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  return NextResponse.json({
    ok: true,
    login_url: `${appUrl}/auth/gadgetpoint?code=${encodeURIComponent(code)}`,
    expires_at: expiresAt.toISOString(),
    expires_in_seconds: 120,
  });
}
