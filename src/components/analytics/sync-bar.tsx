"use client";

import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useRefreshInsights, useSyncStatus } from "@/hooks/use-analytics-insights";
import { cn } from "@/lib/utils";

function timeAgo(iso?: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms)) return "never";
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  return `${Math.round(mins / 1440)} d ago`;
}

/**
 * When this data last updated, and the one control that updates it.
 *
 * Reads `meta_runs` under the `meta_insights` kind — the same run history
 * the Page Health and Campaigns screens already read — rather than the old
 * `meta_syncs` collection the previous Analytics screen used, so a stale
 * run reads consistently everywhere in the app instead of each screen
 * tracking its own idea of "last updated."
 */
export function SyncBar({ brand }: { brand: string }) {
  const { data, isLoading } = useSyncStatus(brand);
  const refresh = useRefreshInsights();

  const running = Boolean(data?.running);
  const latest = data?.latest_run;
  const failed = latest?.status === "failed";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs">
      {isLoading ? (
        <span className="text-faint">Checking sync status…</span>
      ) : running ? (
        <span className="flex items-center gap-1.5 text-accent">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Reading {brand}&apos;s data from Meta…
        </span>
      ) : failed ? (
        <span className="flex items-center gap-1.5 text-danger" title={latest?.error ?? undefined}>
          <AlertTriangle className="h-3.5 w-3.5" />
          Last refresh failed {timeAgo(latest?.finished_at)}
        </span>
      ) : latest ? (
        <span className="flex items-center gap-1.5 text-muted">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          Updated {timeAgo(latest.finished_at)}
          {typeof latest.cli_result?.rows_fetched === "number" && (
            <span className="text-faint">· {latest.cli_result.rows_fetched.toLocaleString()} rows</span>
          )}
        </span>
      ) : (
        <span className="text-faint">Never refreshed for this brand.</span>
      )}

      <button
        type="button"
        onClick={() => refresh.mutate({ brand })}
        disabled={running || refresh.isPending}
        title="Read the latest performance data from Meta"
        className={cn(
          "ml-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-semibold transition-colors",
          running || refresh.isPending
            ? "cursor-not-allowed text-faint"
            : "text-muted hover:bg-white/5 hover:text-foreground",
        )}
      >
        <RefreshCw className={cn("h-3.5 w-3.5", (running || refresh.isPending) && "animate-spin")} />
        Refresh from Meta
      </button>
    </div>
  );
}
