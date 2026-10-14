import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const publicRoutes = ['/', '/login', '/signup', '/forgot-password'];
const authRoutes = ['/login', '/signup', '/forgot-password'];

// Routes that don't require auth (matched by prefix)
const publicPrefixes = ['/invite/', '/reset-password/'];

// API routes that don't require auth
const publicApiPrefixes = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/invites/accept',
  '/api/billing/webhook',
];

// Next 16 calls this file `proxy` (formerly `middleware`); it runs on the Node runtime.
// It is an optimistic gate: every protected API route still checks the session itself.
export async function proxy(req) {
  const { pathname } = req.nextUrl;
  
  // Exclude static files, images
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/mcp') || pathname.startsWith('/api/oauth') || pathname.startsWith('/.well-known') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.includes(pathname) || publicPrefixes.some(p => pathname.startsWith(p));
  const isAuthRoute = authRoutes.includes(pathname);
  const isApiRoute = pathname.startsWith('/api');

  const token = req.cookies.get('auth_token')?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session && !isPublicRoute) {
    if (isApiRoute) {
      if (publicApiPrefixes.some(p => pathname.startsWith(p))) {
        return NextResponse.next();
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
