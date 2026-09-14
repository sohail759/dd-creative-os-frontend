import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LandingPagesView } from "@/components/pages/landing-pages-view";
import { fetchCurrentUser } from "@/lib/api/auth";

const SESSION_COOKIE = "cos_session";

export default async function Page() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  const user = sessionCookie
    ? await fetchCurrentUser(`${sessionCookie.name}=${sessionCookie.value}`)
    : null;
  if (!user) redirect("/sign-in");


  return <LandingPagesView />;
}
