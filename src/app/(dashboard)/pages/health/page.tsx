import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageHealthView } from "@/components/pages/page-health-view";
import { fetchCurrentUser } from "@/lib/api/auth";

const SESSION_COOKIE = "cos_session";

export default async function Page() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  const user = sessionCookie
    ? await fetchCurrentUser(`${sessionCookie.name}=${sessionCookie.value}`)
    : null;
  if (!user) redirect("/sign-in");
  // Admin-gated here as well as in the API: a refresh spends Meta API quota
  // and rewrites which pages every upload may use.
  if (user.role !== "admin") redirect("/creatives");

  return <PageHealthView />;
}
