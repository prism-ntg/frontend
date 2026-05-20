import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_for_development_only"
);

// Define paths that do not require authentication
const publicPaths = ['/login', '/register'];
const apiAuthPaths = ['/api/auth/login', '/api/auth/signup'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Let Next.js handle static files, images, etc.
  if (
    path.startsWith('/_next') ||
    path.startsWith('/favicon.ico') ||
    path.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  const isPublicPath = publicPaths.includes(path);
  const isApiAuthPath = apiAuthPaths.includes(path);

  // If it's an API auth path, allow it
  if (isApiAuthPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value || '';

  // Validate token if it exists
  let isValidToken = false;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isValidToken = true;
    } catch (error) {
      isValidToken = false;
    }
  }

  // If the path is not public and token is invalid, redirect to /login
  if (!isPublicPath && !isValidToken) {
    return NextResponse.redirect(new URL('/login', request.nextUrl));
  }

  // If the path is public (like /login) and token is valid, redirect to /dashboard
  if (isPublicPath && isValidToken) {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl));
  }

  return NextResponse.next();
}

// Ensure middleware runs only for relevant paths
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
