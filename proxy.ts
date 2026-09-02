import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value || request.cookies.get('interiorAccessToken')?.value;
  const industryType = request.cookies.get('industryType')?.value;
  const { pathname } = request.nextUrl;

  // Define public routes (superadmin routes handle their own auth)
  const isPublicRoute =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/onboarding' ||
    pathname === '/' ||
    pathname.startsWith('/superadmin');

  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && (pathname === '/login' || pathname === '/register') && !pathname.startsWith('/superadmin')) {
    const target = industryType === 'interior' ? '/interior-new' : '/dashboard';
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (token && industryType === 'interior' && pathname === '/dashboard') {
    return NextResponse.redirect(new URL('/interior-new', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
