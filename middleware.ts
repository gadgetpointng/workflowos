import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  canGadgetPointStaffAccessPath,
  protectedWorkspacePrefixes,
  requiredWorkflowOSScope,
} from '@/lib/workflow-access';
import { getSupabasePublicKey, getSupabaseUrl } from '@/lib/supabase/config';

const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';

function accessDenied(request: NextRequest, path: string, reason: 'disabled' | 'permission' | 'identity') {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = '/access-denied';
  redirectUrl.search = '';
  redirectUrl.searchParams.set('from', path);
  redirectUrl.searchParams.set('reason', reason);
  const required = requiredWorkflowOSScope(path);
  if (required && required !== 'owner') redirectUrl.searchParams.set('area', required);
  return NextResponse.redirect(redirectUrl);
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = getSupabaseUrl();
  const anon = getSupabasePublicKey();
  const path = request.nextUrl.pathname;
  const protectedPath = protectedWorkspacePrefixes.some(prefix => path === prefix || path.startsWith(prefix + '/'));

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (protectedPath && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('next', path);
    return NextResponse.redirect(redirectUrl);
  }

  if (protectedPath && user) {
    const { data: accessProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role,email,active')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !accessProfile || accessProfile.active === false) {
      return accessDenied(request, path, 'identity');
    }

    const role = String(accessProfile.role ?? '').trim().toLowerCase();
    const profileEmail = String(accessProfile.email ?? user.email ?? '').trim().toLowerCase();
    const exactOwner = role === 'owner' && profileEmail === OWNER_EMAIL;

    if (role === 'owner' && !exactOwner) {
      return accessDenied(request, path, 'identity');
    }

    if (!exactOwner && !canGadgetPointStaffAccessPath(path, user.app_metadata as Record<string, unknown>)) {
      const enabled = user.app_metadata?.workflowos_access_enabled === true;
      return accessDenied(request, path, enabled ? 'permission' : 'disabled');
    }
  }

  if ((path === '/login' || path === '/signup') && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest).*)']
};
