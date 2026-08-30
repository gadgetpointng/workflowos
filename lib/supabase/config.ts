export const WORKFLOWOS_SUPABASE_PROJECT_REF = 'hasnhivdrpeqytgdnkzo';
export const WORKFLOWOS_SUPABASE_URL = `https://${WORKFLOWOS_SUPABASE_PROJECT_REF}.supabase.co`;

// Supabase publishable keys are intentionally safe for browser use. Keep one verified
// canonical key in source so a malformed/mismatched deployment variable cannot take
// authentication offline. Server-only service-role credentials remain environment-only.
const WORKFLOWOS_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_WKi2bBi_tIIYDFia3R-kLQ_81Fo2FDk';

function legacyJwtMatchesProject(key: string) {
  if (!key.startsWith('eyJ')) return false;
  try {
    const [, payload] = key.split('.');
    if (!payload) return false;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const parsed = JSON.parse(globalThis.atob(padded)) as { ref?: string; role?: string };
    return parsed.ref === WORKFLOWOS_SUPABASE_PROJECT_REF && parsed.role === 'anon';
  } catch {
    return false;
  }
}

export function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (value === WORKFLOWOS_SUPABASE_URL) return value;
  return WORKFLOWOS_SUPABASE_URL;
}

export function getSupabasePublicKey() {
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (publishable === WORKFLOWOS_SUPABASE_PUBLISHABLE_KEY) return publishable;

  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (anon === WORKFLOWOS_SUPABASE_PUBLISHABLE_KEY || (anon && legacyJwtMatchesProject(anon))) return anon;

  return WORKFLOWOS_SUPABASE_PUBLISHABLE_KEY;
}

export function hasMismatchedSupabaseEnvironment() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const configuredKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  const urlMismatch = Boolean(configuredUrl && configuredUrl !== WORKFLOWOS_SUPABASE_URL);
  const keyMismatch = Boolean(configuredKey && configuredKey !== WORKFLOWOS_SUPABASE_PUBLISHABLE_KEY && !legacyJwtMatchesProject(configuredKey));
  return urlMismatch || keyMismatch;
}
