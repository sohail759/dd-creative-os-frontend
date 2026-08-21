import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-level route protection.
 *
 * Runs BEFORE any page renders, so an unauthenticated visitor to a protected
 * URL is redirected to /sign-in without ever seeing application content
 * (no flash / blink). This checks only "is there a session cookie" - the
 * authoritative validation happens in the dashboard layout (server-side
 * /v1/auth/me call) and on every backend API request.
 *
 * Role/employee checks are intentionally NOT done here; authorization is a
 * later feature.
 */

const SESSION_COOKIE = "cos_session";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/auth/google/callback"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!isPublic(pathname) && !hasSessionCookie) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.search = "";
    // Preserve the intended destination so sign-in can return the user there
    // (searchParams.set performs the URL encoding).
    if (pathname !== "/") {
      signInUrl.searchParams.set("next", `${pathname}${search}`);
    }
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Skip static assets and API routes served by Next itself.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
