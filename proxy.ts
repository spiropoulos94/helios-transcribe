import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { i18n } from './i18n/config';
import { auth } from './auth';

// Public routes that don't require authentication
const publicRoutes = ['/', '/login', '/register', '/landing'];
const publicApiRoutes = ['/api/auth', '/api/register', '/api/webhooks', '/api/contact'];

function getLocale(request: NextRequest): string {
  const pathname = request.nextUrl.pathname;
  const pathnameLocale = i18n.locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameLocale) return pathnameLocale;

  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (localeCookie && i18n.locales.includes(localeCookie as typeof i18n.locales[number])) {
    return localeCookie;
  }

  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const browserLocale = acceptLanguage.split(',')[0].split('-')[0];
    if (i18n.locales.includes(browserLocale as typeof i18n.locales[number])) {
      return browserLocale;
    }
  }

  return i18n.defaultLocale;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip proxy for static files and _next
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/logo') ||
    pathname.includes('.') && !pathname.includes('/api/')
  ) {
    return NextResponse.next();
  }

  // Remove language prefix for route matching
  const pathWithoutLang = pathname.replace(/^\/(en|el)/, '') || '/';

  // Check if it's a public route
  const isPublicRoute = publicRoutes.some(
    (route) => pathWithoutLang === route || pathWithoutLang.startsWith(route + '/')
  );

  // Check if it's a public API route
  const isPublicApiRoute = publicApiRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check authentication for protected routes
  if (!isPublicRoute && !isPublicApiRoute) {
    const session = await auth();

    if (!session) {
      // For API routes, return 401
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // For page routes, redirect to login
      const lang = pathname.match(/^\/(en|el)/)?.[1] || getLocale(request);
      const loginUrl = new URL(`/${lang}/login`, request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Handle locale routing for non-API routes
  if (!pathname.startsWith('/api')) {
    const pathnameHasLocale = i18n.locales.some(
      (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    if (!pathnameHasLocale) {
      const locale = getLocale(request);
      const newUrl = new URL(`/${locale}${pathname}`, request.url);
      const response = NextResponse.redirect(newUrl);
      response.cookies.set('NEXT_LOCALE', locale);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo).*)',
  ],
};
