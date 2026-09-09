import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UsersTable } from "@/components/auth/users-table";
import { fetchCurrentUser } from "@/lib/api/auth";

const SESSION_COOKIE = "cos_session";

/**
 * User administration.
 *
 * Gated here as well as in the API. The server check keeps a non-admin from
 * ever receiving the page, and the API check is what actually protects the
 * data — a page is a convenience, never a control.
 */
export default async function UsersPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  const user = sessionCookie
    ? await fetchCurrentUser(`${sessionCookie.name}=${sessionCookie.value}`)
    : null;
  if (!user) redirect("/sign-in");
  if (user.role !== "admin") redirect("/creatives");

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Users</h1>
      <p className="mt-1 text-sm text-muted">
        New sign-ups arrive as Pending and can reach nothing until approved.
      </p>
      <UsersTable currentUserId={user.id} />
    </div>
  );
}
