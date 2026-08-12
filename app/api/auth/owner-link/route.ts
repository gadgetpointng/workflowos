import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';

function loginRedirect(request: Request, key: 'error' | 'message', message: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set(key, message);
  const response = NextResponse.redirect(url, 303);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const callbackUrl = new URL('/auth/callback', request.url).toString();

  const { error } = await supabase.auth.signInWithOtp({
    email: OWNER_EMAIL,
    options: {
      emailRedirectTo: callbackUrl,
      shouldCreateUser: false,
    },
  });

  if (error) {
    console.error('Owner email-link request failed', {
      code: error.code,
      status: error.status,
    });
    return loginRedirect(
      request,
      'error',
      'WorkflowOS could not send the owner sign-in email. Try again in a moment.'
    );
  }

  return loginRedirect(
    request,
    'message',
    `A secure WorkflowOS sign-in link was sent to ${OWNER_EMAIL}. Open that email and use the link to continue.`
  );
}
