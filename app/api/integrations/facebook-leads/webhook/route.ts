import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ingestFacebookLead, verifyMetaSignature } from '@/lib/integrations/facebook-leads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function verifyToken(url: URL) {
  const envToken = process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || '';
  if (envToken) return envToken;

  const admin = createAdminClient();
  const workspace = String(url.searchParams.get('workspace') ?? '').trim();
  if (workspace) {
    const { data: integration } = await admin
      .from('external_integrations')
      .select('settings')
      .eq('organization_id', workspace)
      .eq('slug', 'facebook-leads')
      .maybeSingle();
    return String(integration?.settings?.webhook_verify_token ?? '').trim();
  }

  // The production project currently serves a single GadgetPoint workspace.
  // Let Meta use the canonical callback URL without requiring a workspace query string.
  const { data: integrations } = await admin
    .from('external_integrations')
    .select('settings,status')
    .eq('slug', 'facebook-leads')
    .neq('status', 'disabled')
    .limit(2);
  if ((integrations ?? []).length !== 1) return '';
  return String(integrations?.[0]?.settings?.webhook_verify_token ?? '').trim();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = await verifyToken(url);

  if (!mode && token === null && challenge === null) {
    return NextResponse.json({
      ok: true,
      webhook: 'facebook-leads',
      verificationConfigured: Boolean(expected),
      message: expected
        ? 'Webhook endpoint is online and ready for Meta verification.'
        : 'Webhook endpoint is online, but the workspace verify token is not configured yet.',
    }, {
      status: expected ? 200 : 503,
      headers: { 'cache-control': 'no-store' },
    });
  }

  if (!expected) {
    console.error('Facebook webhook verification attempted without a configured verify token');
    return NextResponse.json({ error: 'Webhook verify token is not configured for this workspace' }, { status: 503 });
  }

  if (mode !== 'subscribe') {
    return NextResponse.json({ error: 'Invalid webhook verification mode' }, { status: 400 });
  }
  if (!challenge) {
    return NextResponse.json({ error: 'Missing webhook challenge' }, { status: 400 });
  }
  if (token !== expected) {
    console.warn('Facebook webhook verification token mismatch');
    return NextResponse.json({ error: 'Webhook verify token does not match workspace configuration' }, { status: 403 });
  }

  return new Response(challenge, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
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
