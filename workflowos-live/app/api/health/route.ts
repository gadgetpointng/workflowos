import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLaunchChecks } from '@/lib/launch-readiness';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, boolean> = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    openaiKey: Boolean(process.env.OPENAI_API_KEY)
  };

  let database = false;
  if (checks.supabaseUrl && checks.serviceRoleKey) {
    try {
      const admin = createAdminClient();
      const { error } = await admin.from('organizations').select('id').limit(1);
      database = !error;
    } catch {
      database = false;
    }
  }

  const launchChecks = getLaunchChecks(database);
  const coreReady = launchChecks.filter((c) => c.required).every((c) => c.ok);
  return NextResponse.json({
    ok: coreReady,
    service: 'workflowos',
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
    checks: { ...checks, database },
    launch: launchChecks,
    optional: { ai: checks.openaiKey }
  }, { status: coreReady ? 200 : 503 });
}
