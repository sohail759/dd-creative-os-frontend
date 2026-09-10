"use client";

import { useState } from "react";
import { signOut } from "@/lib/api/auth";

/**
 * The only action available on the pending and blocked screens.
 *
 * Someone stuck on either page needs a way out — most often to sign in as a
 * different account — and without this the app is a dead end with a live
 * session cookie and no visible controls.
 */
export function SignOutLink() {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await signOut();
        } finally {
          // Full navigation, so no client cache survives into the next session.
          window.location.assign("/sign-in");
        }
      }}
      className="cursor-pointer text-sm font-semibold text-accent hover:underline disabled:opacity-60"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
