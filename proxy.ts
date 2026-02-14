import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { i18n } from './i18n/config';
import { auth } from './auth';

// Public routes that don't require authentication
const publicRoutes = ['/', '/login', '/register', '/landing'];
const publicApiRoutes = ['/api/auth', '/api/register', '/api/webhooks', '/api/contact'];

function isPublicRoute(path: string): boolean {
  return publicRoutes.some(route => path === route || path.startsWith(route + '/'));
}

function isPublicApiRoute(path: string): boolean {
  return publicApiRoutes.some(route => path.startsWith(route));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and _next
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/logo') ||
    (pathname.includes('.') && !pathname.includes('/api/'))
  ) {
    return NextResponse.next();
  }

  // API routes: just check auth
  if (pathname.startsWith('/api')) {
    if (!isPublicApiRoute(pathname)) {
      const session = await auth();
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    return NextResponse.next();
  }

  // Redirect /el/... to /... (Greek is default, no prefix needed)
  if (pathname.startsWith('/el/') || pathname === '/el') {
    return NextResponse.redirect(new URL(pathname.replace(/^\/el/, '') || '/', request.url));
  }

  // Determine locale and path without prefix
  const isEnglish = pathname.startsWith('/en/') || pathname === '/en';
  const pathWithoutLocale = isEnglish ? pathname.replace(/^\/en/, '') || '/' : pathname;

  // Check authentication for protected routes
  if (!isPublicRoute(pathWithoutLocale)) {
    const session = await auth();
    if (!session) {
      const loginPath = isEnglish ? '/en/login' : '/login';
      const loginUrl = new URL(loginPath, request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // For Greek (default): rewrite internally to /el/...
  if (!isEnglish) {
    return NextResponse.rewrite(
      new URL(`/${i18n.defaultLocale}${pathname === '/' ? '' : pathname}`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo).*)'],
};
