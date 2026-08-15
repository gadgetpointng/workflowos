import { NextResponse } from 'next/server';
import { ingestFacebookLead, verifyMetaSignature } from '@/lib/integrations/facebook-leads';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return new Response(challenge, { status: 200, headers: { 'content-type': 'text/plain' } });
  }
  return NextResponse.json({ error: 'Webhook verification failed' }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyMetaSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'Invalid Meta signature' }, { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body?.object !== 'page' || !Array.isArray(body?.entry)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const jobs: Array<Promise<unknown>> = [];
  for (const entry of body.entry) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      if (change?.field !== 'leadgen') continue;
      const value = { ...(change?.value ?? {}) };
      if (!value.page_id && entry?.id) value.page_id = String(entry.id);
      jobs.push(ingestFacebookLead(value, { entry_id: entry?.id ?? null, entry_time: entry?.time ?? null, change }));
    }
  }

  if (!jobs.length) return NextResponse.json({ ok: true, processed: 0 });
  const results = await Promise.allSettled(jobs);
  const failures = results.filter(result => result.status === 'rejected');
  if (failures.length) {
    console.error('Facebook lead ingestion failures', failures.map(failure => failure.status === 'rejected' ? String(failure.reason) : ''));
    return NextResponse.json({ error: 'One or more Facebook leads could not be ingested', processed: results.length - failures.length, failed: failures.length }, { status: 500 });
  }
  return NextResponse.json({ ok: true, processed: results.length });
}
