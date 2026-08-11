'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';

async function ensureGadgetPointIntegration(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .maybeSingle();

    if (!profile?.organization_id) return;

    const { data: existing } = await supabase
      .from('external_integrations')
      .select('id,kind,base_url,capabilities,settings')
      .eq('organization_id', profile.organization_id)
      .eq('slug', 'gadgetpoint')
      .maybeSingle();

    const capabilities = Array.from(
      new Set([...(existing?.capabilities ?? []), 'events', 'commands'])
    );

    const settings = {
      ...(existing?.settings ?? {}),
      storefront_url: 'https://gadgetpoint.ng',
      domain: 'gadgetpoint.ng',
      identity_source: 'gadgetpoint-admin',
      shared_identity_status: 'pending-verification',
    };

    if (existing) {
      await supabase
        .from('external_integrations')
        .update({
          name: 'GadgetPoint',
          kind: 'commerce',
          base_url: 'https://gadgetpoint.ng',
          capabilities,
          settings,
        })
        .eq('id', existing.id)
        .eq('organization_id', profile.organization_id);
      return;
    }

    await supabase.from('external_integrations').insert({
      organization_id: profile.organization_id,
      name: 'GadgetPoint',
      slug: 'gadgetpoint',
      kind: 'commerce',
      status: 'pending',
      base_url: 'https://gadgetpoint.ng',
      capabilities: ['events', 'commands'],
      settings,
    });
  } catch {
    // Bridge registration is best-effort and must never prevent a valid sign-in.
  }
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');

  if (email !== OWNER_EMAIL) {
    redirect('/login?error=' + encodeURIComponent('Only gadgetpoint.ng@gmail.com can use direct owner sign-in. Staff must sign in through GadgetPoint.'));
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    redirect('/login?error=' + encodeURIComponent(error?.message || 'Could not sign in'));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email,role,active')
    .eq('id', data.user.id)
    .maybeSingle();

  const profileEmail = String(profile?.email ?? data.user.email ?? '').trim().toLowerCase();

  if (!profile || profile.active === false || profile.role !== 'owner' || profileEmail !== OWNER_EMAIL) {
    await supabase.auth.signOut();
    redirect('/login?error=' + encodeURIComponent('This account is not the authorized GadgetPoint owner identity.'));
  }

  await ensureGadgetPointIntegration(supabase, data.user.id);
  redirect('/dashboard');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
