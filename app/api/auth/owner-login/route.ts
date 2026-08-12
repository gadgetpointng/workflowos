import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { WORKFLOWOS_OWNER_EMAIL } from '@/lib/auth/staff-credentials';

function loginError(request: Request, message: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const password = String(form?.get('password') ?? '');
  const returnTo = String(form?.get('return_to') ?? '/dashboard');

  if (!password) return loginError(request, 'Enter the owner password.');

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: WORKFLOWOS_OWNER_EMAIL,
    password,
  });

  if (error || !data.user) {
    return loginError(request, 'The owner password is incorrect.');
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id,email,role,active')
    .eq('id', data.user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.active === false ||
    String(profile.role ?? '').toLowerCase() !== 'owner' ||
    String(profile.email ?? '').trim().toLowerCase() !== WORKFLOWOS_OWNER_EMAIL ||
    String(data.user.email ?? '').trim().toLowerCase() !== WORKFLOWOS_OWNER_EMAIL
  ) {
    await supabase.auth.signOut();
    return loginError(request, 'This account is not authorized as the WorkflowOS owner.');
  }

  const safeReturn = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/dashboard';
  const response = NextResponse.redirect(new URL(safeReturn, request.url), 303);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
