import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchCurrentUser } from "@/lib/api/auth";

const SESSION_COOKIE = "cos_session";

/**
 * Server-side admin gate for a page.
 *
 * Wraps a client page so the check runs before any of it is sent. The API
 * enforces the same rule — this stops a non-admin receiving the markup at
 * all, it is not the thing protecting the data.
 */
export async function AdminOnly({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  const user = sessionCookie
    ? await fetchCurrentUser(`${sessionCookie.name}=${sessionCookie.value}`)
    : null;
  if (!user) redirect("/sign-in");
  if (user.role !== "admin") redirect("/creatives");
  return <>{children}</>;
}
