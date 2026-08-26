import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl } from '@/lib/supabase/config';

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Missing Supabase admin environment variables');
  return createClient(getSupabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
