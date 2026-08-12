import { NextResponse } from 'next/server';
import { GET as completeGadgetPointSso } from '@/app/api/auth/gadgetpoint/sso/route';

const ALLOWED_ORIGINS = new Set([
  'https://gadgetpoint.ng',
  'https://www.gadgetpoint.ng',
]);

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return NextResponse.json({ error: 'Untrusted GadgetPoint handoff origin' }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const token = String(form?.get('token') ?? '').trim();

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'GadgetPoint did not provide an authenticated session.');
    return NextResponse.redirect(loginUrl, 303);
  }

  // Complete the existing, fully verified SSO flow server-side so the access
  // token never appears in the browser URL, history, or a client-side redirect.
  const internalUrl = new URL('/api/auth/gadgetpoint/sso', request.url);
  internalUrl.searchParams.set('token', token);

  const headers = new Headers(request.headers);
  headers.set('referer', `${origin}/workflowos-connect`);
  headers.delete('content-length');
  headers.delete('content-type');

  const internalRequest = new Request(internalUrl, {
    method: 'GET',
    headers,
  });

  const response = await completeGadgetPointSso(internalRequest);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
