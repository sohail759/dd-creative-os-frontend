import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { fetchCurrentUser } from "@/lib/api/auth";
import { destinationFor } from "@/lib/auth-routing";

const SESSION_COOKIE = "cos_session";

/**
 * The pending and blocked screens.
 *
 * They live in their own route group rather than under `(auth)` because a
 * server layout cannot see which page it is rendering — so the auth layout
 * could only ever say "you are signed in, go to the app", which would bounce
 * a pending user off the very page explaining their state.
 *
 * Access still requires a real session: these pages name the visitor's
 * account status, so a stranger has no business reading them. Anyone whose
 * status does not match the page they asked for is redirected to the one
 * that does, which also stops an approved user from lingering here.
 */
export default async function StatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  const user = sessionCookie
    ? await fetchCurrentUser(`${sessionCookie.name}=${sessionCookie.value}`)
    : null;

  // Fail closed, exactly as the dashboard does.
  if (!user) redirect("/sign-in");
  if (destinationFor(user) === "/creatives") redirect("/creatives");

  return <AuthShell>{children}</AuthShell>;
}
