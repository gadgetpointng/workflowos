import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const configured = Boolean(process.env.BUYER_INTAKE_WEBHOOK_SECRET);
  return NextResponse.json({
    ok: configured,
    integration: 'buyer-intake',
    signature: 'hmac-sha256',
    configured,
  }, { status: configured ? 200 : 503, headers: { 'cache-control': 'no-store' } });
}
