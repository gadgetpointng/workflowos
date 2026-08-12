import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { normalizeStaffUsername, WORKFLOWOS_OWNER_EMAIL, WORKFLOWOS_STAFF_ROLES } from '@/lib/auth/staff-credentials';

function loginError(request: Request, message: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const username = normalizeStaffUsername(form?.get('username'));
  const password = String(form?.get('password') ?? '');

  if (!username || !password) {
    return loginError(request, 'Enter your staff username and password.');
  }

  const admin = createAdminClient();
  const { data: integration } = await admin
    .from('external_integrations')
    .select('id,organization_id,status')
    .eq('slug', 'gadgetpoint')
    .maybeSingle();

  if (!integration || !['connected', 'active'].includes(String(integration.status ?? '').toLowerCase())) {
    return loginError(request, 'WorkflowOS staff access is temporarily unavailable.');
  }

  const { data: staff } = await admin
    .from('connected_staff')
    .select('id,profile_id,email,role,status')
    .eq('integration_id', integration.id)
    .eq('external_staff_id', username)
    .maybeSingle();

  if (!staff || staff.status === 'inactive' || !String(staff.email ?? '').includes('@')) {
    return loginError(request, 'Invalid staff username or password.');
  }

  const role = String(staff.role ?? 'staff').toLowerCase();
  if (!WORKFLOWOS_STAFF_ROLES.has(role) || String(staff.email).toLowerCase() === WORKFLOWOS_OWNER_EMAIL) {
    return loginError(request, 'Invalid staff username or password.');
  }

  const supabase = await createClient();
  const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({
    email: String(staff.email).trim().toLowerCase(),
    password,
  });

  if (signInError || !signedIn.user) {
    return loginError(request, 'Invalid staff username or password.');
  }

  if (staff.profile_id && signedIn.user.id !== staff.profile_id) {
    await supabase.auth.signOut();
    return loginError(request, 'This staff login is not linked correctly. Ask the owner to reset the staff access.');
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id,organization_id,email,role,active')
    .eq('id', signedIn.user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.active === false ||
    profile.organization_id !== integration.organization_id ||
    String(profile.role ?? '').toLowerCase() === 'owner' ||
    String(profile.email ?? '').trim().toLowerCase() === WORKFLOWOS_OWNER_EMAIL
  ) {
    await supabase.auth.signOut();
    return loginError(request, 'This staff account is not active. Ask the owner to update it.');
  }

  const response = NextResponse.redirect(new URL('/dashboard', request.url), 303);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
