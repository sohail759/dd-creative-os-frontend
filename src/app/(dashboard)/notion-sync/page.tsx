import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NotionSyncView } from "@/components/notion-sync/notion-sync-view";
import { fetchCurrentUser } from "@/lib/api/auth";

const SESSION_COOKIE = "cos_session";

/**
 * Notion sync administration.
 *
 * Admin-gated here as well as in the API. A sync rewrites the database from
 * Notion, so it is not something every signed-in user should be able to set
 * running.
 */
export default async function NotionSyncPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  const user = sessionCookie
    ? await fetchCurrentUser(`${sessionCookie.name}=${sessionCookie.value}`)
    : null;
  if (!user) redirect("/sign-in");
  if (user.role !== "admin") redirect("/creatives");

  return <NotionSyncView />;
}
