"use client";

import { Loader2, Check, AlertTriangle, Clock } from "lucide-react";
import { timeAgo, isMetaSyncRunning } from "@/hooks/use-meta-sync";
import type { MetaSync } from "@/lib/api/meta-sync";
import { cn } from "@/lib/utils";

/**
 * How the last Meta pull went, and whether one is running now.
 *
 * The page previously showed only a timestamp, so a pull in progress looked
 * identical to no pull at all — and a failed one looked like success with
 * stale numbers. This reads the sync record, which is written whether the
 * pull was started by a person or by the weekly schedule.
 */
export function MetaSyncStatus({ sync }: { sync: MetaSync | null }) {
  if (!sync) return null;

  const running = isMetaSyncRunning(sync);
  const failed = sync.status === "failed";
  const partial = sync.status === "partial";

  const tone = running
    ? "border-accent/40 bg-accent-dim/40"
    : failed
      ? "border-danger/30 bg-danger/[0.06]"
      : partial
        ? "border-warning/30 bg-warning/[0.06]"
        : "border-border bg-panel";

  // "weekly" is the schedule; anything else is the person who pressed it.
  const by = sync.trigger
    ? sync.trigger === "weekly" || sync.trigger === "manual"
      ? sync.trigger === "weekly" ? "the weekly schedule" : "a manual run"
      : sync.trigger
    : null;

  return (
    <div className={cn("mb-5 rounded-xl border px-4 py-3", tone)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="flex items-center gap-2 text-sm">
          {running ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
              <span className="font-semibold text-accent">
                Fetching from Meta…
              </span>
            </>
          ) : failed ? (
            <>
              <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />
              <span className="font-semibold text-danger">Last fetch failed</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4 shrink-0 text-success" />
              <span className="font-semibold text-success">
                {partial ? "Last fetch partly succeeded" : "Data is up to date"}
              </span>
            </>
          )}
          <span className="flex items-center gap-1 text-xs text-muted">
            <Clock className="h-3 w-3" />
            {running
              ? `started ${timeAgo(sync.started_at)}`
              : timeAgo(sync.finished_at ?? sync.started_at)}
          </span>
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          {by ? <span>by {by}</span> : null}
          {sync.campaigns != null ? (
            <span className="tabular-nums">
              {sync.campaigns.toLocaleString()} campaigns
            </span>
          ) : null}
          {sync.ads != null ? (
            <span className="tabular-nums">{sync.ads.toLocaleString()} ads</span>
          ) : null}
          {!running && sync.duration_ms != null ? (
            <span className="tabular-nums">
              took {Math.round(sync.duration_ms / 1000)}s
            </span>
          ) : null}
          {sync.rate_limited ? (
            <span className="text-warning">Meta rate-limited this run</span>
          ) : null}
        </div>
      </div>

      {sync.error ? (
        <p className="mt-2 break-words text-xs text-danger">{sync.error}</p>
      ) : null}
    </div>
  );
}
