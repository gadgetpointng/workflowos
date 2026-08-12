import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL('/login', request.url);
  url.searchParams.set(
    'message',
    'Direct WorkflowOS owner email-link access has been retired. Use the GadgetPoint owner sign-in or the owner-only ChatGPT route.'
  );
  const response = NextResponse.redirect(url);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
