import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const signatureConfigured = Boolean(process.env.BUYER_INTAKE_WEBHOOK_SECRET);
  const workspaceConfigured = Boolean(String(process.env.GADGETPOINT_WORKSPACE_ID || '').trim());
  const configured = signatureConfigured && workspaceConfigured;

  return NextResponse.json({
    ok: configured,
    integration: 'buyer-intake',
    signature: 'hmac-sha256',
    configured,
    checks: {
      signatureConfigured,
      workspaceConfigured,
    },
  }, { status: configured ? 200 : 503, headers: { 'cache-control': 'no-store' } });
}
