import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { fetchCurrentUser } from "@/lib/api/auth";
import { destinationFor } from "@/lib/auth-routing";

const SESSION_COOKIE = "cos_session";

/**
 * Sign-in and sign-up.
 *
 * The mirror of the dashboard gate: an authenticated visitor has no business
 * on a sign-in form, so they are sent wherever their status belongs — the
 * app if approved, the pending or blocked page otherwise.
 *
 * The session is VALIDATED against the backend rather than inferred from the
 * cookie's presence, and that distinction matters here. A stale cookie —
 * one whose server-side session is gone — would otherwise bounce the visitor
 * onward, be rejected there, and be sent back here forever. Validating means
 * a dead cookie simply shows the form, which is what someone in that state
 * needs.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const useMock =
    process.env.NEXT_PUBLIC_USE_MOCK === "true" &&
    !process.env.NEXT_PUBLIC_API_URL;

  if (!useMock) {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);
    if (sessionCookie) {
      const user = await fetchCurrentUser(
        `${sessionCookie.name}=${sessionCookie.value}`,
      );
      if (user) redirect(destinationFor(user));
    }
  }

  return <AuthShell>{children}</AuthShell>;
}
