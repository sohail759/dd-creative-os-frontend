"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

/**
 * Landing page after a successful Google OAuth round-trip.
 *
 * The backend performed the code exchange and set the HttpOnly session
 * cookie before redirecting here; this page just forwards the user into the
 * app. OAuth failures never land here - the backend sends those directly to
 * /sign-in?error=...
 */
function GoogleCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");

  useEffect(() => {
    const destination =
      nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
        ? nextPath
        : "/creatives";
    router.replace(destination);
    router.refresh();
  }, [nextPath, router]);

  return (
    <div className="flex flex-col items-center gap-3 text-muted">
      <Loader2 className="h-5 w-5 animate-spin text-accent" />
      <p className="text-sm">Completing sign-in…</p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={null}>
      <GoogleCallback />
    </Suspense>
  );
}
