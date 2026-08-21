/**
 * Authentication API client.
 *
 * The session lives in an HttpOnly cookie set by the backend, so requests
 * must include credentials and no token material is ever exposed to JS.
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  auth_provider: "email" | "google";
  role: string;
  employee_type: string | null;
  email_verified: boolean;
  created_at: string | null;
  last_login_at: string | null;
}

function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!base) throw new Error("NEXT_PUBLIC_API_URL is not configured");
  return `${base}${path}`;
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.detail) {
      return typeof body.detail === "string"
        ? body.detail
        : JSON.stringify(body.detail);
    }
  } catch {
    /* ignore parse errors */
  }
  return `Request failed with ${res.status}`;
}

export class AuthApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthUser> {
  const res = await fetch(apiUrl("/v1/auth/signup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AuthApiError(await parseError(res), res.status);
  return (await res.json()) as AuthUser;
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  const res = await fetch(apiUrl("/v1/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AuthApiError(await parseError(res), res.status);
  return (await res.json()) as AuthUser;
}

export async function signOut(): Promise<void> {
  await fetch(apiUrl("/v1/auth/logout"), {
    method: "POST",
    credentials: "include",
  });
}

/**
 * Validate the session cookie against the backend. Used by the dashboard
 * layout as the authoritative server-side check before rendering any
 * protected UI. Returns null when unauthenticated or unreachable.
 */
export async function fetchCurrentUser(
  cookieHeader?: string,
): Promise<AuthUser | null> {
  const headers: Record<string, string> = {};
  if (cookieHeader) headers.cookie = cookieHeader;
  try {
    const res = await fetch(apiUrl("/v1/auth/me"), {
      headers,
      cache: "no-store",
      credentials: cookieHeader ? undefined : "include",
    });
    if (!res.ok) return null;
    return (await res.json()) as AuthUser;
  } catch {
    return null;
  }
}

/** URL that starts the Google OAuth flow on the backend. */
export function googleLoginUrl(nextPath?: string): string {
  const params = new URLSearchParams();
  if (nextPath) params.set("next", nextPath);
  const qs = params.toString();
  return apiUrl(`/v1/auth/google/login${qs ? `?${qs}` : ""}`);
}
