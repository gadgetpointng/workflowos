import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { captureInboundBuyer } from '@/lib/buyers/inbound';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validMetaSignature(rawBody: string, signature: string | null) {
  const secret = process.env.META_APP_SECRET || '';
  if (!secret || !signature?.startsWith('sha256=')) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  try { return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)); } catch { return false; }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || process.env.META_WEBHOOK_VERIFY_TOKEN || '';
  if (!mode && token === null && challenge === null) return NextResponse.json({ ok: true, webhook: 'instagram', verificationConfigured: Boolean(expected) }, { status: expected ? 200 : 503, headers: { 'cache-control': 'no-store' } });
  if (!expected) return NextResponse.json({ error: 'Instagram webhook verify token is not configured' }, { status: 503 });
  if (mode !== 'subscribe' || token !== expected || !challenge) return NextResponse.json({ error: 'Webhook verification failed' }, { status: 403 });
  return new Response(challenge, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!validMetaSignature(rawBody, request.headers.get('x-hub-signature-256'))) return NextResponse.json({ error: 'Invalid Meta signature' }, { status: 401 });
  let body: any;
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const organizationId = process.env.GADGETPOINT_WORKSPACE_ID || '';
  if (!organizationId) return NextResponse.json({ error: 'GadgetPoint workspace is not configured' }, { status: 503 });
  const jobs: Array<Promise<unknown>> = [];
  for (const entry of Array.isArray(body?.entry) ? body.entry : []) {
    for (const event of Array.isArray(entry?.messaging) ? entry.messaging : []) {
      const text = String(event?.message?.text || event?.postback?.title || '').trim();
      if (!text || event?.message?.is_echo) continue;
      const senderId = String(event?.sender?.id || '').trim();
      const externalId = event?.message?.mid ? String(event.message.mid) : `${entry?.id || 'ig'}:${senderId}:${event?.timestamp || ''}`;
      jobs.push(captureInboundBuyer({
        organizationId,
        source: 'instagram',
        externalId,
        buyerName: null,
        phone: null,
        email: null,
        productQuery: text,
        category: null,
        brand: null,
        model: null,
        budgetMax: null,
        city: null,
        state: null,
        urgency: 'normal',
        consentStatus: 'unknown',
        evidence: { channel: 'instagram_business', instagram_account_id: entry?.id ?? null, sender_id: senderId || null, timestamp: event?.timestamp ?? null },
        assignedTo: null,
        autoCreateTask: true,
      }));
    }
  }
  if (!jobs.length) return NextResponse.json({ ok: true, processed: 0 });
  const results = await Promise.allSettled(jobs);
  const failed = results.filter(result => result.status === 'rejected');
  if (failed.length) {
    console.error('Instagram buyer intake failures', failed.map(result => result.status === 'rejected' ? String(result.reason) : ''));
    return NextResponse.json({ error: 'One or more Instagram messages could not be ingested', processed: results.length - failed.length, failed: failed.length }, { status: 500 });
  }
  return NextResponse.json({ ok: true, processed: results.length });
}
