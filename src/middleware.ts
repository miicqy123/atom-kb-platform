import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/trpc", "/api/upload"];

export async function middleware(req: NextRequest) {
  // For development purposes, bypass authentication if there's no database connection
  // In production, always enforce authentication
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Add a special header for dev environment to bypass auth
  if (isDevelopment) {
    const hasDevAuth = req.cookies.get('devAuthToken');

    // Allow access to main page if dev auth token exists
    if (req.nextUrl.pathname === '/' && hasDevAuth) {
      return NextResponse.next();
    }
  }

  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  if (!token) {
    // Check if this is a dev environment and if the dev login button was pressed
    if (isDevelopment) {
      // Allow access to home page if dev auth token exists in cookies
      if (req.nextUrl.pathname === '/' && req.cookies.get('devAuthToken')) {
        return NextResponse.next();
      }
    }

    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };