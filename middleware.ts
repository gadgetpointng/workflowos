import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  canGadgetPointStaffAccessPath,
  protectedWorkspacePrefixes,
  requiredWorkflowOSScope,
} from '@/lib/workflow-access';

const CANONICAL_SUPABASE_URL = 'https://hasnhivdrpeqytgdnkzo.supabase.co';
const OWNER_EMAIL = 'gadgetpoint.ng@gmail.com';

function validHttpUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

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
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = validHttpUrl(configuredUrl) ? configuredUrl! : CANONICAL_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = request.nextUrl.pathname;
  const protectedPath = protectedWorkspacePrefixes.some(prefix => path === prefix || path.startsWith(prefix + '/'));

  // Keep authentication available even if a malformed public Supabase URL is injected in deployment config.
  // The project URL is not secret; the canonical WorkflowOS Supabase URL is used as a safe fallback.
  if (!anon) {
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
    // Every authenticated workspace session must resolve to an active profile.
    // This also makes legacy/compatibility GadgetPoint staff handoffs fail closed:
    // non-owner sessions cannot bypass the owner's WorkflowOS access flag/scopes
    // simply because their identity source predates the current one-time-code flow.
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

    // No non-exact owner profile is ever allowed to inherit owner privileges.
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
