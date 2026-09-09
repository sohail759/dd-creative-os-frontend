import { Clock } from "lucide-react";
import { SignOutLink } from "@/components/auth/sign-out-link";

/**
 * Where a newly signed-up account waits.
 *
 * Signing up creates the account but grants nothing: the backend answers
 * every data endpoint with `account_pending` until an admin approves it. This
 * page exists so that state reads as a step in a process rather than as the
 * app being broken.
 */
export default function PendingApprovalPage() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-8 text-center">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-warning/30 bg-warning/10">
        <Clock className="h-6 w-6 text-warning" />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-foreground">
        Waiting for admin approval
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Your account has been created. An administrator needs to approve it
        before you can use Creative OS.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        You will not be emailed automatically — check back, or ask an
        administrator to approve you.
      </p>
      <div className="mt-6 border-t border-border pt-5">
        <SignOutLink />
      </div>
    </div>
  );
}
