import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const host = request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto');

  // Backup redirect when host nginx still proxies HTTP to the container.
  if (process.env.NODE_ENV === 'production' && host && proto === 'http') {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.host = host;
    return NextResponse.redirect(url, 308);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(ar|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
