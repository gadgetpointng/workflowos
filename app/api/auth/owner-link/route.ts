import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WORKFLOWOS_OWNER_EMAIL } from '@/lib/auth/staff-credentials';

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
  const redirectTo = 'https://workflow.gadgetpoint.ng/auth/callback?next=/staff-access';

  const { error } = await supabase.auth.signInWithOtp({
    email: WORKFLOWOS_OWNER_EMAIL,
    options: {
      emailRedirectTo: redirectTo,
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
    `A secure owner sign-in link was sent to ${WORKFLOWOS_OWNER_EMAIL}. Open that email and use the link to continue.`
  );
}
