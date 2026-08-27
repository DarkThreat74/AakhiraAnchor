import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy (formerly Middleware in Next.js 15 and earlier).
 *
 * Used for optimistic auth checks — redirect unauthenticated users
 * away from app routes. Full session verification happens server-side
 * in each route/action (defense in depth).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('waqt-session')?.value;

  const protectedPaths = ['/calendar', '/settings', '/onboarding', '/prayer', '/goals'];
  const authPaths = ['/login', '/signup'];

  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthPage = authPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Redirect to login if accessing protected route without session
  if (isProtected && !sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to calendar if accessing auth pages while already logged in
  if (isAuthPage && sessionCookie) {
    return NextResponse.redirect(new URL('/calendar/day', request.url));
  }

  // Redirect to calendar if accessing the marketing page while already logged in
  if (pathname === '/' && sessionCookie) {
    return NextResponse.redirect(new URL('/calendar/day', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (static assets)
     * - favicon.ico, robots.txt, manifest, sw.js
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.webmanifest|sw.js|api).*)',
  ],
};
