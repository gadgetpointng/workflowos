import { createClient } from '@/lib/supabase/server';

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Never treat a missing, disabled, or tenant-less profile as an authenticated
  // workspace identity. Public storefront access does not depend on this helper.
  if (
    profileError ||
    !profile ||
    profile.active === false ||
    !profile.organization_id
  ) {
    return { supabase, user: null, profile: null };
  }

  return { supabase, user, profile };
}

export function canManage(role?: string | null) {
  return ['owner', 'admin', 'manager'].includes(String(role || '').toLowerCase());
}

export function isOwner(role?: string | null) {
  return String(role || '').toLowerCase() === 'owner';
}
