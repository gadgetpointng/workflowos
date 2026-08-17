export type LaunchCheck = {
  key: string;
  label: string;
  ok: boolean;
  required: boolean;
  detail: string;
};

const CANONICAL_APP_URL = 'https://workflow.gadgetpoint.ng';
const CANONICAL_SUPABASE_URL = 'https://hasnhivdrpeqytgdnkzo.supabase.co';

function validHttpsUrl(value: string | undefined) {
  if (!value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function getLaunchChecks(databaseOk: boolean): LaunchCheck[] {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const appUrl = validHttpsUrl(configuredAppUrl) ? configuredAppUrl! : CANONICAL_APP_URL;
  const supabaseUrl = validHttpsUrl(configuredSupabaseUrl) ? configuredSupabaseUrl! : CANONICAL_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cron = process.env.CRON_SECRET;
  const openai = process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

  return [
    { key: 'appUrl', label: 'Production app URL', ok: validHttpsUrl(appUrl), required: true, detail: configuredAppUrl === appUrl ? 'Configured' : 'Canonical WorkflowOS URL active' },
    { key: 'supabaseUrl', label: 'Supabase project URL', ok: validHttpsUrl(supabaseUrl), required: true, detail: configuredSupabaseUrl === supabaseUrl ? 'Configured' : 'Canonical WorkflowOS Supabase URL active' },
    { key: 'anon', label: 'Supabase anonymous key', ok: Boolean(anon), required: true, detail: anon ? 'Configured' : 'Set NEXT_PUBLIC_SUPABASE_ANON_KEY' },
    { key: 'serviceRole', label: 'Supabase service role', ok: Boolean(serviceRole), required: true, detail: serviceRole ? 'Configured server-side' : 'Set SUPABASE_SERVICE_ROLE_KEY' },
    { key: 'database', label: 'Database connectivity', ok: databaseOk, required: true, detail: databaseOk ? 'Organizations table reachable' : 'Apply schema/RLS and verify connectivity' },
    { key: 'cron', label: 'Scheduled operations secret', ok: Boolean(cron && cron.length >= 24), required: true, detail: cron ? 'Configured' : 'Set a long CRON_SECRET' },
    { key: 'openai', label: 'WorkflowOS Copilot', ok: Boolean(openai), required: false, detail: openai ? 'Enabled' : 'Optional — configure server-side AI authentication to enable Copilot' },
  ];
}
