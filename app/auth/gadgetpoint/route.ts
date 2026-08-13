import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { normalizeWorkflowOSPermissions, type WorkflowOSStaffScope } from '@/lib/workflow-access';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';
const STAFF_ROLES = new Set(['admin', 'manager', 'marketing', 'sales', 'staff']);

function loginError(request: Request, message: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url);
}

function landingPath(permissions: WorkflowOSStaffScope[]) {
  if (permissions.includes('work')) return '/today';
  if (permissions.includes('operations')) return '/schedule';
  if (permissions.includes('sales')) return '/opportunities';
  if (permissions.includes('marketing')) return '/campaigns';
  if (permissions.includes('commerce')) return '/catalog';
  if (permissions.includes('intelligence')) return '/analytics';
  return '/dashboard';
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
  const externalStaffId = String(staff.external_staff_id ?? '').trim().toLowerCase();

  if (!externalStaffId) {
    return loginError(request, 'GadgetPoint staff identity is incomplete.');
  }

  const { data: connectedStaff, error: staffError } = await admin
    .from('connected_staff')
    .select('id,profile_id,email,full_name,role,department,status,metadata')
    .eq('integration_id', event.integration_id)
    .eq('external_staff_id', externalStaffId)
    .maybeSingle();

  if (staffError || !connectedStaff || connectedStaff.status === 'inactive') {
    return loginError(request, 'This GadgetPoint staff account cannot access WorkflowOS.');
  }

  const handoffPermissions = normalizeWorkflowOSPermissions(staff.workflowos_permissions);
  const metadataPermissions = normalizeWorkflowOSPermissions(connectedStaff.metadata?.workflowos_permissions);
  const metadataEnabled = connectedStaff.metadata?.workflowos_access_enabled;
  const accessEnabled = metadataEnabled === false ? false : staff.workflowos_access_enabled === true;
  const workflowPermissions = metadataEnabled === true && metadataPermissions.length ? metadataPermissions : handoffPermissions;
  if (!accessEnabled || workflowPermissions.length === 0) {
    return loginError(request, 'The GadgetPoint owner has not granted this staff member WorkflowOS access.');
  }

  const role = String(connectedStaff.role ?? staff.role ?? 'staff').trim().toLowerCase();
  if (!STAFF_ROLES.has(role)) {
    return loginError(request, 'This GadgetPoint identity is not a permitted staff role.');
  }

  let email = String(connectedStaff.email ?? staff.email ?? '').trim().toLowerCase();
  if (!email.includes('@')) {
    return loginError(request, 'WorkflowOS could not establish the internal staff session identity.');
  }

  if (email === OWNER_EMAIL) {
    return loginError(request, 'The GadgetPoint owner identity must use the owner sign-in route.');
  }

  let existingProfile: any = null;

  if (connectedStaff.profile_id) {
    const { data: profile } = await admin
      .from('profiles')
      .select('id,organization_id,email,role,active')
      .eq('id', connectedStaff.profile_id)
      .maybeSingle();

    if (!profile || profile.organization_id !== event.organization_id || profile.active === false) {
      return loginError(request, 'This GadgetPoint staff identity is not linked to this workspace.');
    }

    if (String(profile.role ?? '').toLowerCase() === 'owner' || String(profile.email ?? '').trim().toLowerCase() === OWNER_EMAIL) {
      return loginError(request, 'The GadgetPoint owner identity cannot be opened through the staff route.');
    }

    existingProfile = profile;
    if (profile.email?.includes('@')) email = String(profile.email).trim().toLowerCase();
  }

  if (email === OWNER_EMAIL) {
    return loginError(request, 'The GadgetPoint owner identity must use the owner sign-in route.');
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  if (linkError || !linkData?.user || !linkData.properties?.hashed_token) {
    return loginError(request, 'WorkflowOS could not create a secure staff session.');
  }

  if (existingProfile && linkData.user.id !== existingProfile.id) {
    return loginError(request, 'The GadgetPoint staff identity is linked to a different WorkflowOS session identity.');
  }

  const { data: profileForAuthUser } = await admin
    .from('profiles')
    .select('id,organization_id,email,role')
    .eq('id', linkData.user.id)
    .maybeSingle();

  if (
    profileForAuthUser &&
    profileForAuthUser.organization_id !== event.organization_id
  ) {
    return loginError(request, 'This account already belongs to another WorkflowOS workspace.');
  }

  if (
    profileForAuthUser &&
    (String(profileForAuthUser.role ?? '').toLowerCase() === 'owner' ||
      String(profileForAuthUser.email ?? '').trim().toLowerCase() === OWNER_EMAIL)
  ) {
    return loginError(request, 'The owner account cannot be provisioned from a staff sign-in.');
  }

  const fullName = String(
    connectedStaff.full_name ?? staff.full_name ?? staff.username ?? externalStaffId
  ).trim();
  const department = connectedStaff.department ?? staff.department ?? null;
  const now = new Date().toISOString();

  const { error: profileError } = await admin
    .from('profiles')
    .upsert(
      {
        id: linkData.user.id,
        organization_id: event.organization_id,
        full_name: fullName || String(staff.username ?? externalStaffId),
        email,
        role,
        department,
        active: true,
        updated_at: now,
      },
      { onConflict: 'id' }
    );

  if (profileError) {
    return loginError(request, 'WorkflowOS could not provision this GadgetPoint staff profile.');
  }

  const currentAppMetadata = (linkData.user.app_metadata ?? {}) as Record<string, unknown>;
  const { error: authMetadataError } = await admin.auth.admin.updateUserById(linkData.user.id, {
    app_metadata: {
      ...currentAppMetadata,
      workflowos_identity_source: 'gadgetpoint-staff-authorization-code',
      workflowos_access_enabled: true,
      workflowos_permissions: workflowPermissions,
      gadgetpoint_external_staff_id: externalStaffId,
    },
  });
  if (authMetadataError) {
    return loginError(request, 'WorkflowOS could not apply the staff access policy.');
  }

  await admin
    .from('connected_staff')
    .update({
      profile_id: linkData.user.id,
      metadata: {
        ...(connectedStaff.metadata ?? {}),
        workflowos_access_enabled: true,
        workflowos_permissions: workflowPermissions,
        workflowos_access_source: 'gadgetpoint-owner-control',
      },
      last_synced_at: now,
      updated_at: now,
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
        verified_at: now,
        metadata: {
          username: staff.username ?? null,
          identity_source: 'gadgetpoint-staff-login',
          password_owner: 'gadgetpoint',
          workflowos_session_identity: email,
          workflowos_identity_kind: staff.workflowos_identity_kind ?? connectedStaff.metadata?.workflowos_identity_kind ?? null,
          workflowos_access_enabled: true,
          workflowos_permissions: workflowPermissions,
        },
        updated_at: now,
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

  await admin.from('activity_logs').insert({
    organization_id: event.organization_id,
    actor_id: linkData.user.id,
    action: 'auth.gadgetpoint.staff_session.scoped',
    entity_type: 'profile',
    entity_id: linkData.user.id,
    metadata: {
      external_staff_id: externalStaffId,
      workflowos_permissions: workflowPermissions,
      identity_source: 'gadgetpoint-staff-authorization-code',
    },
  });

  const response = NextResponse.redirect(new URL(landingPath(workflowPermissions), request.url));
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
