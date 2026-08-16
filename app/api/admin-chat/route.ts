import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ADMIN_MESSAGES_URL = process.env.GADGETPOINT_ADMIN_MESSAGES_URL?.trim() || 'https://gadgetpoint.ng/api/workflowos/messages';
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' };

function bridgeCredentials() {
  const bridgeId = process.env.GADGETPOINT_ADMIN_BRIDGE_ID?.trim() || process.env.WORKFLOWOS_GADGETPOINT_BRIDGE_ID?.trim();
  const bridgeSecret = process.env.GADGETPOINT_ADMIN_BRIDGE_SECRET?.trim() || process.env.WORKFLOWOS_GADGETPOINT_BRIDGE_SECRET?.trim();
  return bridgeId && bridgeSecret ? { bridgeId, bridgeSecret } : null;
}

function staffEmail(profile: Record<string, unknown>) {
  return String(profile.email ?? '').trim().toLowerCase();
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE_HEADERS });
}

async function callAdmin(path: string, init?: RequestInit) {
  const credentials = bridgeCredentials();
  if (!credentials) {
    return { response: null, error: json({ error: 'Admin chat bridge is not configured yet.' }, 503) };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${ADMIN_MESSAGES_URL}${path}`, {
      ...init,
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${credentials.bridgeSecret}`,
        'x-gadgetpoint-bridge-id': credentials.bridgeId,
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    return { response, error: null };
  } catch {
    return { response: null, error: json({ error: 'GadgetPoint Admin messenger is temporarily unreachable.' }, 502) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const { user, profile } = await requireUser();
  if (!user || !profile) return json({ error: 'Unauthorized' }, 401);
  const email = staffEmail(profile as Record<string, unknown>);
  if (!email) return json({ error: 'This WorkflowOS profile is not linked to a GadgetPoint staff email.' }, 409);

  const { response, error } = await callAdmin(`?staffEmail=${encodeURIComponent(email)}`);
  if (error || !response) return error!;
  const data = await response.json().catch(() => ({ error: 'Invalid Admin response' }));
  return json(data, response.status);
}

export async function POST(request: Request) {
  const { user, profile } = await requireUser();
  if (!user || !profile) return json({ error: 'Unauthorized' }, 401);
  const email = staffEmail(profile as Record<string, unknown>);
  if (!email) return json({ error: 'This WorkflowOS profile is not linked to a GadgetPoint staff email.' }, 409);

  const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(payload.action ?? 'send');
  if (action !== 'send' && action !== 'read') return json({ error: 'Unsupported chat action' }, 400);
  const body = String(payload.body ?? '').trim().slice(0, 1200);
  if (action === 'send' && !body) return json({ error: 'Message is required' }, 400);

  const { response, error } = await callAdmin('', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ staffEmail: email, action, body }),
  });
  if (error || !response) return error!;
  const data = await response.json().catch(() => ({ error: 'Invalid Admin response' }));
  return json(data, response.status);
}
