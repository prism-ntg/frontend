import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_for_development_only"
);

const publicPaths = ['/login', '/register', '/register/teknisi'];
const apiPublicPaths = ['/api/auth/login', '/api/auth/signup', '/api/auth/signup-teknisi'];

// Paths only accessible by admin
const adminPaths = ['/dashboard', '/assets', '/update_assets', '/reports', '/logs', '/admin'];
// Paths only accessible by teknisi
const teknisiPaths = ['/technician'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (
    path.startsWith('/_next') ||
    path.startsWith('/favicon.ico') ||
    path.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  const isPublicPath = publicPaths.some(p => path === p || path.startsWith(p + '/'));
  const isApiPublicPath = apiPublicPaths.some(p => path === p || path.startsWith(p + '/'));

  if (isApiPublicPath) return NextResponse.next();

  const token = request.cookies.get('token')?.value || '';

  let jwtPayload: { id?: unknown; email?: unknown; role?: unknown } | null = null;
  if (token) {
    try {
      const result = await jwtVerify(token, JWT_SECRET);
      jwtPayload = result.payload as { id?: unknown; email?: unknown; role?: unknown };
    } catch {
      jwtPayload = null;
    }
  }

  const isValidToken = jwtPayload !== null;
  const role = (jwtPayload?.role as string) ?? 'admin';

  if (!isPublicPath && !isValidToken) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.nextUrl));
  }

  if (isPublicPath && isValidToken) {
    const dest = role === 'teknisi' ? '/technician/tickets' : '/dashboard';
    return NextResponse.redirect(new URL(dest, request.nextUrl));
  }

  if (isValidToken) {
    // Teknisi trying to access admin-only pages
    if (role === 'teknisi' && adminPaths.some(p => path === p || path.startsWith(p + '/'))) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/technician/tickets', request.nextUrl));
    }

    // Admin trying to access teknisi-only pages
    if (role === 'admin' && teknisiPaths.some(p => path === p || path.startsWith(p + '/'))) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav|ogg|woff|woff2|ttf)$).*)'],
};
