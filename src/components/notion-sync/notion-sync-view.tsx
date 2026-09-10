"use client";

import { useState } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";
import {
  useStartBrandSync, useSyncRuns, useCancelSync, isRunning,
} from "@/hooks/use-notion-sync";
import {
  SyncProgressCard, describeWritten, formatDuration, formatWhen,
} from "./sync-progress";
import { cn } from "@/lib/utils";

const BRANDS = [
  { slug: "numy", label: "NUMY" },
  { slug: "holy-mouthwash", label: "Holy Mouthwash" },
] as const;

/** What one sync brings in line, in the order the sync itself works through. */
const SYNCED = "batches, concepts, concept variations, pages, products and landing pages";

/**
 * How far back to look.
 *
 * Notion can filter a query to rows edited since a given instant, and most of
 * a database has not changed: holy-mouthwash is 5,326 rows and 162 seconds in
 * full, against 773 rows and 14 seconds for the last two days. Narrowing the
 * window is the single biggest thing a user can do to make a sync quick.
 */
const WINDOWS = [
  { label: "Last 24 Hours", hours: 24 },
  { label: "Last 3 Days", hours: 72 },
  { label: "Last 7 Days", hours: 168 },
  { label: "Everything", hours: 0 },
] as const;

function sinceIso(hours: number): string | undefined {
  if (!hours) return undefined;
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

/**
 * The window a past run covered, as a phrase.
 *
 * Stored as the absolute instant the filter resolved to, because "24 hours
 * ago" means something different tomorrow. Rendered back as a duration since
 * that is how it was chosen, with the exact time on hover.
 */
function describeWindow(editedSince?: string | null): React.ReactNode {
  if (!editedSince) return <span className="text-faint">Everything</span>;
  const hours = Math.round((Date.now() - Date.parse(editedSince)) / 3600_000);
  const label =
    hours <= 25 ? "Last 24 hours"
    : hours <= 73 ? "Last 3 days"
    : hours <= 169 ? "Last 7 days"
    : `Since ${new Date(editedSince).toLocaleDateString()}`;
  return <span title={formatWhen(editedSince)}>{label}</span>;
}

export function NotionSyncView() {
  const { data: runs, isLoading, error } = useSyncRuns();
  const start = useStartBrandSync();
  const cancel = useCancelSync();
  const [windowHours, setWindowHours] = useState<number>(24);

  /** The newest run for a brand — what its progress card shows. */
  const latestFor = (slug: string) =>
    (runs ?? []).find((r) => r.brand === slug);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Notion Sync</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Bring the database in line with Notion for one brand: {SYNCED}. A sync
        runs in the background, so you can leave this page.
      </p>

      <div className="mt-6 flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
          Sync Changes From
        </p>
        <div className="flex flex-wrap gap-2">
          {WINDOWS.map((w) => (
            <button
              key={w.label}
              type="button"
              onClick={() => setWindowHours(w.hours)}
              className={cn(
                "cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                windowHours === w.hours
                  ? "border-accent bg-accent-dim text-accent"
                  : "border-border bg-surface text-muted hover:text-foreground",
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-faint">
          {windowHours
            ? "Only rows Notion changed in this window are read. Much faster."
            : "Reads every row. Use this for a first sync or after a long gap."}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {BRANDS.map((b) => {
          const run = latestFor(b.slug);
          const busy =
            isRunning(run)
            || (start.isPending && start.variables?.brand === b.slug);
          return (
            <button
              key={b.slug}
              type="button"
              disabled={busy}
              onClick={() =>
                start.mutate({ brand: b.slug, editedSince: sinceIso(windowHours) })
              }
              className={cn(
                "inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-accent px-5 text-sm font-bold text-black",
                "shadow-[0_0_24px_rgba(204,255,0,0.18)] transition-colors hover:bg-accent-hover",
                "disabled:cursor-not-allowed disabled:bg-accent/40 disabled:text-black/60 disabled:shadow-none",
              )}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {busy ? `Syncing ${b.label}…` : `Sync ${b.label}`}
            </button>
          );
        })}
      </div>

      {/* Side by side on a wide screen, stacked on a narrow one. */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {BRANDS.map((b) => {
          const run = latestFor(b.slug);
          return (
            <div key={b.slug} className="flex min-w-0 flex-col gap-2">
              <SyncProgressCard brandLabel={b.label} run={run} />
              {isRunning(run) && run ? (
                <button
                  type="button"
                  disabled={cancel.isPending || run.cancel_requested}
                  onClick={() => cancel.mutate(run._id)}
                  className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 self-start rounded-lg border border-danger/40 bg-danger/10 px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cancel.isPending || run.cancel_requested ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                  {run.cancel_requested ? "Stopping…" : `Cancel ${b.label} Sync`}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-faint">
        Sync History
      </h2>
      <p className="mt-1 text-xs text-faint">
        Database-wide syncs only. Syncing a single batch from the creatives page
        is a different action and is not listed here.
      </p>

      {isLoading ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
        </p>
      ) : error ? (
        <p className="mt-6 rounded-lg border border-danger/25 bg-danger/[0.07] px-4 py-3 text-sm text-danger">
          {(error as Error).message}
        </p>
      ) : (runs ?? []).length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border bg-panel/50 px-4 py-8 text-center text-sm text-faint">
          No database-wide sync has been run yet.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-panel">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-widest text-faint">
                <th className="px-5 py-3 font-semibold">Brand</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Filter</th>
                <th className="px-4 py-3 font-semibold">Executed</th>
                <th className="px-4 py-3 font-semibold">By</th>
                <th className="px-4 py-3 font-semibold">Records Synced</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
              </tr>
            </thead>
            <tbody>
              {(runs ?? []).map((run) => (
                <tr key={run._id} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-3 text-sm font-semibold text-foreground">
                    {BRANDS.find((b) => b.slug === run.brand)?.label
                      ?? run.brand
                      ?? "All brands"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        run.status === "running"
                          ? "border-accent/40 bg-accent-dim text-accent"
                          : run.status === "ok"
                            ? "border-success/35 bg-success/10 text-success"
                            : run.status === "partial"
                              ? "border-warning/35 bg-warning/10 text-warning"
                              : "border-danger/35 bg-danger/10 text-danger",
                      )}
                    >
                      {run.status === "running" ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : null}
                      {run.status === "ok" ? "Succeeded" : run.status === "running" ? "Running" : run.status === "partial" ? "Partial" : run.failure?.cancelled ? "Cancelled" : "Failed"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {describeWindow(run.edited_since)}
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums text-muted">
                    {formatWhen(run.started_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {run.triggered_by || "—"}
                  </td>
                  <td className="max-w-[280px] px-4 py-3 text-xs text-muted">
                    {describeWritten(run.written)}
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums text-muted">
                    {run.status === "running" ? "…" : formatDuration(run.duration_seconds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
