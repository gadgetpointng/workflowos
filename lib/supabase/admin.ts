import { createClient } from '@supabase/supabase-js';

const WORKFLOWOS_SUPABASE_URL = 'https://hasnhivdrpeqytgdnkzo.supabase.co';

function supabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (value) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return value;
    } catch {}
  }
  return WORKFLOWOS_SUPABASE_URL;
}

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Missing Supabase admin environment variables');
  return createClient(supabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
