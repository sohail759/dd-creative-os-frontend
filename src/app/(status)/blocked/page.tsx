import { Ban } from "lucide-react";
import { SignOutLink } from "@/components/auth/sign-out-link";

/**
 * Where a blocked account lands.
 *
 * Kept deliberately plain: it says the account is blocked and who to ask,
 * and nothing about why. The reason is between the user and their admin, and
 * guessing at it here would be worse than silence.
 */
export default function BlockedPage() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-8 text-center">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-danger/30 bg-danger/10">
        <Ban className="h-6 w-6 text-danger" />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-foreground">
        Your account is blocked
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        You no longer have access to Creative OS. If you think this is a
        mistake, contact an administrator.
      </p>
      <div className="mt-6 border-t border-border pt-5">
        <SignOutLink />
      </div>
    </div>
  );
}
