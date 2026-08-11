import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const protectedPrefixes = [
  '/dashboard','/today','/tasks','/my-work','/approvals','/team','/availability','/workload','/performance','/time',
  '/leads','/sales','/quotes','/customers','/campaigns','/marketing','/inbox','/conversations','/schedule','/recurring-work','/sla',
  '/opportunities','/analytics','/reports','/goals','/ai','/ai-proposals','/automations','/activity','/integrations','/sites',
  '/marketplaces','/marketplace-jobs','/vendors','/catalog','/settlements','/settings','/notifications','/briefing',
  '/revenue-rescue','/follow-up-sla','/branch-radar'
];

function harden(response: NextResponse, isPrivate = false) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  if (isPrivate) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  }
  return response;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = request.nextUrl.pathname;
  const protectedPath = protectedPrefixes.some(prefix => path === prefix || path.startsWith(prefix + '/'));

  // Public storefront and marketing routes remain public. If Supabase is not
  // configured, still apply baseline browser hardening instead of crashing.
  if (!url || !anon) return harden(response, protectedPath);

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
    return harden(NextResponse.redirect(redirectUrl), true);
  }

  if ((path === '/login' || path === '/signup') && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    redirectUrl.search = '';
    return harden(NextResponse.redirect(redirectUrl), true);
  }

  return harden(response, protectedPath);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest).*)']
};
