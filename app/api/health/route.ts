import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLaunchChecks } from '@/lib/launch-readiness';

export const dynamic = 'force-dynamic';

function validHttpUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function GET() {
  const aiAuth = Boolean(process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
  const checks: Record<string, boolean> = {
    supabaseUrl: validHttpUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    openaiKey: Boolean(process.env.OPENAI_API_KEY),
    aiGatewayKey: Boolean(process.env.AI_GATEWAY_API_KEY),
    vercelOidc: Boolean(process.env.VERCEL_OIDC_TOKEN),
    aiAuth,
  };

  let database = false;
  if (checks.serviceRoleKey) {
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
  const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || null;
  const deployment = process.env.VERCEL_URL || null;

  return NextResponse.json({
    ok: coreReady,
    service: 'workflowos',
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
    release: {
      commit,
      deployment,
      branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    },
    checks: { ...checks, database },
    launch: launchChecks,
    optional: { ai: aiAuth },
  }, {
    status: coreReady ? 200 : 503,
    headers: { 'cache-control': 'no-store, max-age=0' },
  });
}
