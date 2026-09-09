"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Ban, Clock, Loader2, ShieldCheck } from "lucide-react";
import { listUsers, setUserStatus, type AuthUser } from "@/lib/api/auth";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Status = "approved" | "blocked" | "pending";

const STATUS_STYLE: Record<string, { label: string; className: string; Icon: typeof Check }> = {
  approved: {
    label: "Approved",
    className: "border-success/35 bg-success/10 text-success",
    Icon: Check,
  },
  pending: {
    label: "Pending",
    className: "border-warning/35 bg-warning/10 text-warning",
    Icon: Clock,
  },
  blocked: {
    label: "Blocked",
    className: "border-danger/35 bg-danger/10 text-danger",
    Icon: Ban,
  },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLE[status] ?? {
    label: status || "Unknown",
    className: "border-border bg-surface text-muted",
    Icon: Clock,
  };
  const { Icon } = style;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        style.className,
      )}
    >
      <Icon className="h-3 w-3" />
      {style.label}
    </span>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function UsersTable({ currentUserId }: { currentUserId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
    staleTime: 15_000,
    refetchOnMount: "always",
  });

  const update = useMutation({
    mutationFn: (vars: { id: string; status: Status }) =>
      setUserStatus(vars.id, vars.status),
    onSuccess: (user) => {
      queryClient.setQueryData<AuthUser[]>(["users"], (rows) =>
        rows?.map((r) => (r.id === user.id ? user : r)),
      );
      toast("success", "User updated", `${user.email} is now ${user.status}.`);
    },
    onError: (err: Error) => toast("error", "Could not update user", err.message),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  if (isLoading) {
    return (
      <p className="mt-8 flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
      </p>
    );
  }
  if (error) {
    return (
      <p className="mt-8 rounded-lg border border-danger/25 bg-danger/[0.07] px-4 py-3 text-sm text-danger">
        {(error as Error).message}
      </p>
    );
  }

  const rows = users ?? [];
  const pendingCount = rows.filter((u) => u.status === "pending").length;

  return (
    <div className="mt-6">
      {pendingCount > 0 && (
        <p className="mb-4 rounded-lg border border-warning/25 bg-warning/[0.07] px-4 py-2.5 text-sm text-warning">
          {pendingCount} account{pendingCount === 1 ? "" : "s"} waiting for approval.
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-panel">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-widest text-faint">
              <th className="px-5 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Sign-in</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => {
              const isSelf = user.id === currentUserId;
              const busy = update.isPending && update.variables?.id === user.id;
              return (
                <tr key={user.id} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {user.name || user.email.split("@")[0]}
                      </span>
                      {user.role === "admin" && (
                        <span
                          title="Administrator"
                          className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent-dim px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent"
                        >
                          <ShieldCheck className="h-2.5 w-2.5" /> Admin
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">{user.email}</p>
                  </td>
                  <td className="px-4 py-4 text-xs capitalize text-muted">
                    {user.auth_provider}
                  </td>
                  <td className="px-4 py-4 text-xs tabular-nums text-muted">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />}
                      {user.status !== "approved" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => update.mutate({ id: user.id, status: "approved" })}
                          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-success/40 bg-success/10 px-3 text-xs font-semibold text-success hover:bg-success/20 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" /> Approve
                        </button>
                      )}
                      {user.status !== "blocked" && (
                        <button
                          type="button"
                          disabled={busy || isSelf}
                          title={
                            isSelf
                              ? "You cannot block your own account"
                              : "Block this account and end its sessions"
                          }
                          onClick={() => update.mutate({ id: user.id, status: "blocked" })}
                          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-3 text-xs font-semibold text-danger hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Ban className="h-3.5 w-3.5" /> Block
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
