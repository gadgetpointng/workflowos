export type LaunchCheck = {
  key: string;
  label: string;
  ok: boolean;
  required: boolean;
  detail: string;
};

export function getLaunchChecks(databaseOk: boolean): LaunchCheck[] {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cron = process.env.CRON_SECRET;
  const openai = process.env.OPENAI_API_KEY;

  return [
    { key: 'appUrl', label: 'Production app URL', ok: Boolean(appUrl && /^https:\/\//.test(appUrl)), required: true, detail: appUrl ? 'Configured' : 'Set NEXT_PUBLIC_APP_URL' },
    { key: 'supabaseUrl', label: 'Supabase project URL', ok: Boolean(supabaseUrl), required: true, detail: supabaseUrl ? 'Configured' : 'Set NEXT_PUBLIC_SUPABASE_URL' },
    { key: 'anon', label: 'Supabase anonymous key', ok: Boolean(anon), required: true, detail: anon ? 'Configured' : 'Set NEXT_PUBLIC_SUPABASE_ANON_KEY' },
    { key: 'serviceRole', label: 'Supabase service role', ok: Boolean(serviceRole), required: true, detail: serviceRole ? 'Configured server-side' : 'Set SUPABASE_SERVICE_ROLE_KEY' },
    { key: 'database', label: 'Database connectivity', ok: databaseOk, required: true, detail: databaseOk ? 'Organizations table reachable' : 'Apply schema/RLS and verify connectivity' },
    { key: 'cron', label: 'Scheduled operations secret', ok: Boolean(cron && cron.length >= 24), required: true, detail: cron ? 'Configured' : 'Set a long CRON_SECRET' },
    { key: 'openai', label: 'WorkflowOS Copilot', ok: Boolean(openai), required: false, detail: openai ? 'Enabled' : 'Optional — set OPENAI_API_KEY to enable Copilot' },
  ];
}
