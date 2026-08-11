import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';

function loginError(request: Request, message: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url);
}

async function resolveOwnerOrganization(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle();

  if (existingProfile?.organization_id) {
    return existingProfile.organization_id as string;
  }

  const { data: integrations } = await admin
    .from('external_integrations')
    .select('organization_id')
    .eq('slug', 'gadgetpoint')
    .eq('base_url', 'https://gadgetpoint.ng')
    .limit(3);

  const integrationOrgs = Array.from(
    new Set((integrations ?? []).map((row: any) => row.organization_id).filter(Boolean))
  );

  if (integrationOrgs.length === 1) {
    return String(integrationOrgs[0]);
  }

  const { data: owners } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('role', 'owner')
    .eq('active', true)
    .limit(3);

  const ownerOrgs = Array.from(
    new Set((owners ?? []).map((row: any) => row.organization_id).filter(Boolean))
  );

  return ownerOrgs.length === 1 ? String(ownerOrgs[0]) : null;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = String(requestUrl.searchParams.get('code') ?? '').trim();

  if (!code) {
    return loginError(request, 'Missing owner sign-in code. Please request a new email link.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return loginError(request, 'This owner sign-in link is invalid or has expired. Please request a new one.');
  }

  const email = String(data.user.email ?? '').trim().toLowerCase();

  if (email !== OWNER_EMAIL) {
    await supabase.auth.signOut();
    return loginError(request, 'This email is not authorized for GadgetPoint owner access.');
  }

  const admin = createAdminClient();
  const organizationId = await resolveOwnerOrganization(admin, data.user.id);

  if (!organizationId) {
    await supabase.auth.signOut();
    return loginError(request, 'WorkflowOS could not safely identify the GadgetPoint workspace for this owner email.');
  }

  const now = new Date().toISOString();
  const { data: currentProfile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', data.user.id)
    .maybeSingle();

  const fullName = String(currentProfile?.full_name ?? '').trim() || 'Owner';

  const { error: profileError } = await admin
    .from('profiles')
    .upsert(
      {
        id: data.user.id,
        organization_id: organizationId,
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
    await supabase.auth.signOut();
    return loginError(request, 'WorkflowOS could not finish linking the authorized owner email.');
  }

  // Retire any older mistaken owner identity only after the authorized email is active.
  await admin
    .from('profiles')
    .update({
      role: 'admin',
      active: false,
      updated_at: now,
    })
    .eq('organization_id', organizationId)
    .eq('role', 'owner')
    .neq('id', data.user.id);

  try {
    await admin.from('activity_logs').insert({
      organization_id: organizationId,
      actor_id: data.user.id,
      action: 'owner.email_identity.verified',
      entity_type: 'profile',
      entity_id: data.user.id,
      metadata: {
        email: OWNER_EMAIL,
        identity_source: 'workflowos-owner-email-link',
      },
    });
  } catch {
    // Audit logging must not block a valid verified owner sign-in.
  }

  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
