import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return { supabase, user, profile };
});

export function canManage(role?: string | null) {
  return ['owner','admin','manager'].includes(role ?? '');
}
