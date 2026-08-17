import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  canGadgetPointStaffAccessPath,
  isGadgetPointStaffAppMetadata,
  protectedWorkspacePrefixes,
  requiredWorkflowOSScope,
} from '@/lib/workflow-access';

function validHttpUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = request.nextUrl.pathname;
  const protectedPath = protectedWorkspacePrefixes.some(prefix => path === prefix || path.startsWith(prefix + '/'));

  // Never let malformed deployment configuration crash Routing Middleware.
  // Public routes remain reachable so health/setup pages can diagnose the issue.
  // Protected routes fail closed to login until authentication configuration is valid.
  if (!validHttpUrl(url) || !anon) {
    if (protectedPath) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.search = '';
      redirectUrl.searchParams.set('next', path);
      redirectUrl.searchParams.set('error', 'Authentication is temporarily unavailable.');
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  const supabase = createServerClient(url!, anon, {
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

  if (protectedPath && user && isGadgetPointStaffAppMetadata(user.app_metadata as Record<string, unknown>)) {
    if (!canGadgetPointStaffAccessPath(path, user.app_metadata as Record<string, unknown>)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/access-denied';
      redirectUrl.search = '';
      const required = requiredWorkflowOSScope(path);
      redirectUrl.searchParams.set('from', path);
      redirectUrl.searchParams.set('reason', user.app_metadata?.workflowos_access_enabled === true ? 'permission' : 'disabled');
      if (required && required !== 'owner') redirectUrl.searchParams.set('area', required);
      return NextResponse.redirect(redirectUrl);
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
