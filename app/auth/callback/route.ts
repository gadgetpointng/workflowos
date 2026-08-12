import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const requestedNext = url.searchParams.get('next') || '/dashboard';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/dashboard';

  if (!code) {
    const login = new URL('/login', url.origin);
    login.searchParams.set('error', 'The sign-in link is incomplete or expired. Request a fresh owner link.');
    return NextResponse.redirect(login, 303);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const login = new URL('/login', url.origin);
    login.searchParams.set('error', 'The sign-in link could not be verified. Request a fresh owner link.');
    return NextResponse.redirect(login, 303);
  }

  const response = NextResponse.redirect(new URL(next, url.origin), 303);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
