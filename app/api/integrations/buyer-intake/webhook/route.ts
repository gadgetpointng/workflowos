import { NextResponse } from 'next/server';
import { captureInboundBuyer, verifyInboundSignature } from '@/lib/buyers/inbound';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedSources = new Set(['facebook','facebook_marketplace','instagram','whatsapp','tiktok','jiji','jumia','konga','google','website','phone','referral','walk_in','other']);
const allowedConsentStatuses = new Set(['unknown','opted_in','public_signal','do_not_contact']);

export async function GET() {
  const configured = Boolean(process.env.BUYER_INTAKE_WEBHOOK_SECRET && process.env.GADGETPOINT_WORKSPACE_ID);
  return NextResponse.json({
    ok: true,
    webhook: 'buyer-intake',
    configured,
    sources: [...allowedSources],
  }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyInboundSignature(rawBody, request.headers.get('x-workflowos-signature'))) {
    return NextResponse.json({ error: 'Invalid buyer intake signature' }, { status: 401 });
  }

  const configuredWorkspaceId = String(process.env.GADGETPOINT_WORKSPACE_ID || '').trim();
  if (!configuredWorkspaceId) {
    return NextResponse.json({ error: 'Buyer intake workspace is not configured' }, { status: 503 });
  }

  let body: any;
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const source = String(body?.source || '').trim().toLowerCase();
  const organizationId = String(body?.organization_id || '').trim();
  const externalId = String(body?.external_id || '').trim();
  const consentStatus = String(body?.consent_status || 'unknown').trim().toLowerCase();
  const budgetMax = body?.budget_max == null || body?.budget_max === '' ? null : Number(body.budget_max);
  if (!allowedSources.has(source)) return NextResponse.json({ error: 'Unsupported buyer source' }, { status: 400 });
  if (!organizationId || !String(body?.product_query || '').trim()) return NextResponse.json({ error: 'organization_id and product_query are required' }, { status: 400 });
  if (!externalId) return NextResponse.json({ error: 'external_id is required for idempotent buyer intake' }, { status: 400 });
  if (!allowedConsentStatuses.has(consentStatus)) return NextResponse.json({ error: 'Unsupported consent_status' }, { status: 400 });
  if (budgetMax != null && (!Number.isFinite(budgetMax) || budgetMax < 0)) return NextResponse.json({ error: 'budget_max must be a non-negative number' }, { status: 400 });
  if (organizationId !== configuredWorkspaceId) {
    return NextResponse.json({ error: 'Buyer intake workspace mismatch' }, { status: 403 });
  }

  try {
    const result = await captureInboundBuyer({
      organizationId: configuredWorkspaceId,
      source,
      externalId,
      buyerName: body.buyer_name ? String(body.buyer_name) : null,
      phone: body.phone ? String(body.phone) : null,
      email: body.email ? String(body.email) : null,
      productQuery: String(body.product_query),
      category: body.category ? String(body.category) : null,
      brand: body.brand ? String(body.brand) : null,
      model: body.model ? String(body.model) : null,
      budgetMax,
      city: body.city ? String(body.city) : null,
      state: body.state ? String(body.state) : null,
      urgency: body.urgency ? String(body.urgency) : 'normal',
      consentStatus: consentStatus as 'unknown' | 'opted_in' | 'public_signal' | 'do_not_contact',
      evidence: body.evidence && typeof body.evidence === 'object' ? body.evidence : {},
      assignedTo: body.assigned_to ? String(body.assigned_to) : null,
      autoCreateTask: body.auto_create_task !== false,
    });
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    console.error('Buyer intake webhook failed', error);
    return NextResponse.json({ error: 'Buyer intake failed' }, { status: 500 });
  }
}
