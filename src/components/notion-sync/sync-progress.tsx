"use client";

import { Loader2, Check, AlertTriangle, Clock } from "lucide-react";
import { isRunning } from "@/hooks/use-notion-sync";
import type { SyncRun } from "@/lib/api/notion-sync";
import { cn } from "@/lib/utils";

/**
 * The phase names the sync writes, as something a person reads.
 *
 * The backend names them after what the code is doing ("reading copy"); this
 * names them after what is happening to the user's data.
 */
const PHASE_LABEL: Record<string, string> = {
  "reading rows": "Reading Notion Records",
  "saving rows": "Syncing Notion → DB",
  "reading copy": "Syncing Copy Notion → DB",
  "filling gaps": "Filling Missing Data",
};

export function phaseLabel(phase: string): string {
  return (
    PHASE_LABEL[phase]
    // Anything unmapped still reads properly rather than showing a raw key.
    ?? phase.replace(/\b[a-z]/g, (c) => c.toUpperCase())
  );
}

/** `{batches: 3, concepts: 9}` -> "3 Batches, 9 Concepts". */
export function describeWritten(written?: Record<string, number> | null): string {
  const parts = Object.entries(written ?? {})
    .filter(([, n]) => typeof n === "number" && n > 0)
    .map(([k, n]) => {
      const label = k.replaceAll("_", " ").replace(/\b[a-z]/g, (c) => c.toUpperCase());
      return `${n.toLocaleString()} ${label}`;
    });
  return parts.length ? parts.join(", ") : "nothing changed";
}

export function formatDuration(seconds?: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  return `${m}m ${Math.round(seconds - m * 60)}s`;
}

/**
 * A stored instant, shown in the viewer's own timezone.
 *
 * Mongo returns these without a zone marker, and `new Date("...")` on a bare
 * string is parsed as LOCAL time by the browser — so a UTC timestamp silently
 * shifted by the viewer's offset. Appending `Z` says what the value is; the
 * browser then converts it for display.
 */
export function formatWhen(iso?: string | null): string {
  if (!iso) return "—";
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(iso);
  const d = new Date(hasZone ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString(undefined, {
        day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit",
        timeZoneName: "short",
      });
}

/**
 * How far through the current phase a running sync is.
 *
 * A brand sync spends most of its time reading page bodies one by one, so
 * without a count the card shows the same word for tens of minutes and looks
 * stuck. The sync writes its position as it goes; this renders it.
 */
function RunningProgress({ run }: { run: SyncRun }) {
  const p = run.counters?.progress;
  if (!p) {
    return <p className="text-accent">{run.stage || "Starting…"}</p>;
  }
  // A sync has several phases; each one fills its own bar. Saying which step
  // this is stops a full bar reading as a finished sync — the complaint that
  // "progress hits 100% but it keeps running".
  const step =
    p.step && p.steps ? `Step ${p.step} of ${p.steps} · ` : "";
  if (!p.total) {
    // Reading rows: Notion does not say how many there are until the last
    // page arrives, so there is a count but no bar to fill.
    return (
      <p className="flex items-baseline justify-between gap-2 text-accent">
        <span className="truncate">{step}{phaseLabel(p.phase)}</span>
        <span className="shrink-0 tabular-nums text-muted">
          {p.done ? `${p.done.toLocaleString()} so far` : "working…"}
        </span>
      </p>
    );
  }
  const pct = Math.min(100, Math.round((p.done / p.total) * 100));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-accent">{step}{phaseLabel(p.phase)}</span>
        <span className="shrink-0 tabular-nums text-muted">
          {p.done.toLocaleString()} / {p.total.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** The most recent sync for one brand: running, succeeded, or failed. */
export function SyncProgressCard({
  brandLabel,
  run,
}: {
  brandLabel: string;
  run?: SyncRun;
}) {
  const running = isRunning(run);
  const failed = run?.status === "failed";
  const partial = run?.status === "partial";

  const tone = running
    ? "border-accent/40 bg-accent-dim/40"
    : failed
      ? "border-danger/30 bg-danger/[0.06]"
      : partial
        ? "border-warning/30 bg-warning/[0.06]"
        : "border-border bg-panel";

  return (
    <div className={cn("min-w-0 rounded-2xl border p-5", tone)}>
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-bold text-foreground">{brandLabel}</p>
        {running ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent/40 bg-accent-dim px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
            <Loader2 className="h-3 w-3 animate-spin" /> Running
          </span>
        ) : failed ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-danger/35 bg-danger/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-danger">
            <AlertTriangle className="h-3 w-3" /> Failed
          </span>
        ) : run ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-success/35 bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
            <Check className="h-3 w-3" /> {partial ? "Partial" : "Succeeded"}
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-faint">
            <Clock className="h-3 w-3" /> Never synced
          </span>
        )}
      </div>

      {!run ? (
        <p className="mt-3 text-xs text-faint">
          No sync has been run for this brand yet.
        </p>
      ) : (
        <dl className="mt-4 flex flex-col gap-1.5 text-xs">
          {running ? <RunningProgress run={run} /> : null}
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-faint">Started</dt>
            <dd className="text-muted">{formatWhen(run.started_at)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-faint">Duration</dt>
            <dd className="tabular-nums text-muted">
              {running ? "running…" : formatDuration(run.duration_seconds)}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-faint">Records</dt>
            <dd className="min-w-0 break-words text-muted">
              {describeWritten(run.written)}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-faint">By</dt>
            <dd className="truncate text-muted">{run.triggered_by || "—"}</dd>
          </div>
          {run.failure?.message ? (
            <p className="mt-1 break-words text-danger">{run.failure.message}</p>
          ) : null}
        </dl>
      )}
    </div>
  );
}
