import { NextResponse } from 'next/server';
import { captureInboundBuyer, verifyInboundSignature } from '@/lib/buyers/inbound';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedSources = new Set(['facebook','facebook_marketplace','instagram','whatsapp','tiktok','jiji','jumia','konga','google','website','phone','referral','walk_in','other']);

export async function GET() {
  return NextResponse.json({
    ok: true,
    webhook: 'buyer-intake',
    configured: Boolean(process.env.BUYER_INTAKE_WEBHOOK_SECRET),
    sources: [...allowedSources],
  }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyInboundSignature(rawBody, request.headers.get('x-workflowos-signature'))) {
    return NextResponse.json({ error: 'Invalid buyer intake signature' }, { status: 401 });
  }

  let body: any;
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const source = String(body?.source || '').trim().toLowerCase();
  if (!allowedSources.has(source)) return NextResponse.json({ error: 'Unsupported buyer source' }, { status: 400 });
  if (!body?.organization_id || !String(body?.product_query || '').trim()) return NextResponse.json({ error: 'organization_id and product_query are required' }, { status: 400 });

  try {
    const result = await captureInboundBuyer({
      organizationId: String(body.organization_id),
      source,
      externalId: body.external_id ? String(body.external_id) : null,
      buyerName: body.buyer_name ? String(body.buyer_name) : null,
      phone: body.phone ? String(body.phone) : null,
      email: body.email ? String(body.email) : null,
      productQuery: String(body.product_query),
      category: body.category ? String(body.category) : null,
      brand: body.brand ? String(body.brand) : null,
      model: body.model ? String(body.model) : null,
      budgetMax: body.budget_max == null ? null : Number(body.budget_max),
      city: body.city ? String(body.city) : null,
      state: body.state ? String(body.state) : null,
      urgency: body.urgency ? String(body.urgency) : 'normal',
      consentStatus: body.consent_status || 'unknown',
      evidence: body.evidence && typeof body.evidence === 'object' ? body.evidence : {},
      assignedTo: body.assigned_to ? String(body.assigned_to) : null,
      autoCreateTask: body.auto_create_task !== false,
    });
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    console.error('Buyer intake webhook failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Buyer intake failed' }, { status: 500 });
  }
}
