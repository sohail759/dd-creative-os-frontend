import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { fetchCurrentUser, type AuthUser } from "@/lib/api/auth";

const SESSION_COOKIE = "cos_session";

/**
 * Server-side gate for every protected page.
 *
 * Runs during RSC rendering - BEFORE any client component or data hook
 * executes - so an unauthenticated visitor (direct URL, refresh, bookmark)
 * is redirected to /sign-in without ever receiving protected markup.
 *
 * Authentication only: this check intentionally does NOT look at roles or
 * employee types; authorization comes later.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Legacy local-dev escape hatch: when the UI runs against in-repo mock
  // data there is no backend to validate against.
  const useMock =
    process.env.NEXT_PUBLIC_USE_MOCK === "true" &&
    !process.env.NEXT_PUBLIC_API_URL;

  let user: AuthUser | null = null;
  if (!useMock) {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);
    user = sessionCookie
      ? await fetchCurrentUser(`${sessionCookie.name}=${sessionCookie.value}`)
      : null;
    if (!user) {
      // Fail closed: no validated session -> no protected UI, ever.
      redirect("/sign-in");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Suspense>
        <Sidebar user={user} />
      </Suspense>
      <main className="md:pl-60">
        <div className="mx-auto px-4 pb-16 pt-16 md:px-8 md:pt-8">
          <Suspense>{children}</Suspense>
        </div>
      </main>
    </div>
  );
}
