import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  internalStaffEmail,
  normalizeStaffUsername,
  WORKFLOWOS_OWNER_EMAIL,
  WORKFLOWOS_STAFF_ROLES,
} from '@/lib/auth/staff-credentials';

function back(request: Request, key: 'error' | 'message', value: string) {
  const url = new URL('/staff-access', request.url);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: session } = await supabase.auth.getUser();
  const currentUser = session.user;

  if (!currentUser) {
    const url = new URL('/login', request.url);
    url.searchParams.set('message', 'Sign in as the WorkflowOS owner to manage staff access.');
    return NextResponse.redirect(url, 303);
  }

  const admin = createAdminClient();
  const { data: ownerProfile } = await admin
    .from('profiles')
    .select('id,organization_id,email,role,active')
    .eq('id', currentUser.id)
    .maybeSingle();

  if (
    !ownerProfile ||
    ownerProfile.active === false ||
    String(ownerProfile.role ?? '').toLowerCase() !== 'owner' ||
    String(ownerProfile.email ?? '').trim().toLowerCase() !== WORKFLOWOS_OWNER_EMAIL ||
    String(currentUser.email ?? '').trim().toLowerCase() !== WORKFLOWOS_OWNER_EMAIL
  ) {
    return back(request, 'error', 'Only the authorized GadgetPoint owner can manage staff credentials.');
  }

  const form = await request.formData().catch(() => null);
  const username = normalizeStaffUsername(form?.get('username'));
  const password = String(form?.get('password') ?? '');
  const fullName = String(form?.get('full_name') ?? '').trim();
  const requestedRole = String(form?.get('role') ?? 'staff').trim().toLowerCase();
  const department = String(form?.get('department') ?? '').trim() || null;

  if (username.length < 3) {
    return back(request, 'error', 'Staff username must contain at least 3 letters or numbers.');
  }
  if (password.length < 8) {
    return back(request, 'error', 'Staff password must be at least 8 characters.');
  }
  if (!WORKFLOWOS_STAFF_ROLES.has(requestedRole)) {
    return back(request, 'error', 'Choose a valid staff role.');
  }

  const { data: integration } = await admin
    .from('external_integrations')
    .select('id,organization_id,status')
    .eq('slug', 'gadgetpoint')
    .maybeSingle();

  if (!integration || integration.organization_id !== ownerProfile.organization_id) {
    return back(request, 'error', 'The GadgetPoint workspace connection could not be found.');
  }

  const { data: existingStaff } = await admin
    .from('connected_staff')
    .select('id,profile_id,email,metadata')
    .eq('integration_id', integration.id)
    .eq('external_staff_id', username)
    .maybeSingle();

  const email = String(existingStaff?.email ?? '').includes('@')
    ? String(existingStaff?.email).trim().toLowerCase()
    : internalStaffEmail(integration.id, username);

  let userId = existingStaff?.profile_id ? String(existingStaff.profile_id) : '';

  if (userId) {
    const { error: updateAuthError } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: {
        username,
        full_name: fullName || username,
        department,
        credential_source: 'workflowos-owner-managed',
      },
    });

    if (updateAuthError) {
      return back(request, 'error', 'Could not update the staff password. Please try again.');
    }
  } else {
    const { data: created, error: createAuthError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        full_name: fullName || username,
        department,
        credential_source: 'workflowos-owner-managed',
      },
      app_metadata: {
        role: requestedRole,
        staff_role: requestedRole,
        department,
        source: 'workflowos-direct-staff-access',
      },
    });

    if (createAuthError || !created.user) {
      return back(request, 'error', 'Could not create this staff login. If the username already exists, use the same username to reset it.');
    }
    userId = created.user.id;
  }

  const now = new Date().toISOString();
  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      organization_id: integration.organization_id,
      full_name: fullName || username,
      email,
      role: requestedRole,
      department,
      active: true,
      updated_at: now,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    return back(request, 'error', 'The staff account was created, but its workspace profile could not be saved.');
  }

  const { error: staffError } = await admin.from('connected_staff').upsert(
    {
      organization_id: integration.organization_id,
      integration_id: integration.id,
      external_staff_id: username,
      profile_id: userId,
      email,
      full_name: fullName || username,
      role: requestedRole,
      department,
      status: 'active',
      metadata: {
        ...(existingStaff?.metadata ?? {}),
        username,
        identity_source: 'workflowos-owner-managed',
        password_owner: 'workflowos-auth',
        intended_gadgetpoint_username: username,
        workflowos_identity_kind: 'non_delivery_staff_identity',
      },
      last_synced_at: now,
      updated_at: now,
    },
    { onConflict: 'integration_id,external_staff_id' }
  );

  if (staffError) {
    return back(request, 'error', 'The login was created, but the staff directory link could not be saved.');
  }

  await admin.from('activity_logs').insert({
    organization_id: integration.organization_id,
    actor_id: ownerProfile.id,
    action: existingStaff ? 'staff.direct_access.updated' : 'staff.direct_access.created',
    entity_type: 'profile',
    entity_id: userId,
    metadata: {
      username,
      role: requestedRole,
      password_changed: true,
      source: 'owner-staff-access',
    },
  });

  return back(
    request,
    'message',
    existingStaff
      ? `Access updated for ${username}. The new password is active now.`
      : `Access created for ${username}. Staff can sign in now.`
  );
}
