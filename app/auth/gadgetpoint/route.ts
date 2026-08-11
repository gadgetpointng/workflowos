import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

function loginError(request: Request, message: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url);
}

function createInternalAuthEmail(externalStaffId: string, username?: unknown) {
  const safeUsername = String(username ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const stableHash = crypto.createHash('sha256').update(externalStaffId).digest('hex').slice(0, 16);
  const localPart = safeUsername || `staff-${stableHash}`;
  return `${localPart}.${stableHash}@staff.workflowos.invalid`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = String(requestUrl.searchParams.get('code') ?? '').trim();

  if (!code) {
    return loginError(request, 'Missing GadgetPoint sign-in code.');
  }

  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  const admin = createAdminClient();

  const { data: event, error: eventError } = await admin
    .from('integration_events')
    .select('id,organization_id,integration_id,entity_id,payload,created_at')
    .eq('event_type', 'staff.sso')
    .eq('entity_type', 'staff_sso')
    .eq('entity_id', codeHash)
    .maybeSingle();

  if (eventError || !event) {
    return loginError(request, 'This GadgetPoint sign-in link is invalid or has already been used.');
  }

  const expiresAt = event.payload?.expires_at
    ? new Date(String(event.payload.expires_at))
    : new Date(new Date(event.created_at).getTime() + 2 * 60 * 1000);

  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    return loginError(request, 'This GadgetPoint sign-in link has expired. Please sign in again.');
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
    return loginError(request, 'This GadgetPoint sign-in link has already been used.');
  }

  const staff = event.payload?.staff ?? {};
  const externalStaffId = String(staff.external_staff_id ?? '').trim();

  if (!externalStaffId) {
    return loginError(request, 'GadgetPoint staff identity is incomplete.');
  }

  const { data: connectedStaff, error: staffError } = await admin
    .from('connected_staff')
    .select('id,profile_id,email,full_name,role,department,status')
    .eq('integration_id', event.integration_id)
    .eq('external_staff_id', externalStaffId)
    .maybeSingle();

  if (staffError || !connectedStaff || connectedStaff.status === 'inactive') {
    return loginError(request, 'This GadgetPoint staff account cannot access WorkflowOS.');
  }

  let email = String(connectedStaff.email ?? staff.email ?? '').trim().toLowerCase();

  if (!email.includes('@')) {
    email = createInternalAuthEmail(externalStaffId, staff.username);
  }

  let existingProfile: any = null;

  if (connectedStaff.profile_id) {
    const { data: profile } = await admin
      .from('profiles')
      .select('id,organization_id,email,active')
      .eq('id', connectedStaff.profile_id)
      .maybeSingle();

    if (!profile || profile.organization_id !== event.organization_id || profile.active === false) {
      return loginError(request, 'This GadgetPoint staff identity is not linked to this workspace.');
    }

    existingProfile = profile;
    if (profile.email?.includes('@')) email = String(profile.email).toLowerCase();
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  if (linkError || !linkData?.user || !linkData.properties?.hashed_token) {
    return loginError(request, 'WorkflowOS could not create a secure staff session.');
  }

  if (existingProfile && linkData.user.id !== existingProfile.id) {
    return loginError(request, 'The GadgetPoint staff identity is linked to a different WorkflowOS account.');
  }

  const { data: profileForAuthUser } = await admin
    .from('profiles')
    .select('id,organization_id')
    .eq('id', linkData.user.id)
    .maybeSingle();

  if (
    profileForAuthUser &&
    profileForAuthUser.organization_id !== event.organization_id
  ) {
    return loginError(request, 'This account already belongs to another WorkflowOS workspace.');
  }

  const fullName = String(
    connectedStaff.full_name ?? staff.full_name ?? staff.username ?? email
  ).trim();
  const role = String(connectedStaff.role ?? staff.role ?? 'staff');
  const department = connectedStaff.department ?? staff.department ?? null;

  const { error: profileError } = await admin
    .from('profiles')
    .upsert(
      {
        id: linkData.user.id,
        organization_id: event.organization_id,
        full_name: fullName || email.split('@')[0],
        email,
        role,
        department,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (profileError) {
    return loginError(request, 'WorkflowOS could not provision this GadgetPoint staff profile.');
  }

  await admin
    .from('connected_staff')
    .update({
      profile_id: linkData.user.id,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectedStaff.id);

  await admin
    .from('shared_identity_links')
    .upsert(
      {
        organization_id: event.organization_id,
        profile_id: linkData.user.id,
        integration_id: event.integration_id,
        external_staff_id: externalStaffId,
        external_email: staff.external_email ?? null,
        verified_at: new Date().toISOString(),
        metadata: {
          username: staff.username ?? null,
          identity_source: 'gadgetpoint-staff-login',
          password_owner: 'gadgetpoint',
          auth_identity: connectedStaff.email || staff.email ? 'email' : 'internal-shadow-email',
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'integration_id,external_staff_id' }
    );

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'email',
  });

  if (verifyError) {
    return loginError(request, 'WorkflowOS could not finish the GadgetPoint staff sign-in.');
  }

  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
