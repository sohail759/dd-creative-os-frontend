"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import {
  usePageHealth,
  usePageHealthRuns,
  useRefreshPageHealth,
} from "@/hooks/use-pages";
import type { PageHealthBrand, PageHealthRun } from "@/lib/api/pages";
import { BRANDS, Badge, DRIFT_LABELS, TimeAgo } from "./shared";
import { cn } from "@/lib/utils";

/**
 * Page health: read Meta, decide which pages may be used, and say when.
 *
 * The staleness line is the reason this screen exists. The same data used to
 * live in a JSON file per brand which went thirty-eight days out of date
 * without anything noticing, against a rule that called it stale after one
 * hour. Here the age is the first thing on the card.
 */
export function PageHealthView() {
  const { data, isLoading, error } = usePageHealth();
  const refresh = useRefreshPageHealth();
  const [openBrand, setOpenBrand] = useState<string | null>(BRANDS[0].slug);

  const brands = data?.brands ?? [];
  // A brand with no row yet has never been refreshed, and is exactly the one
  // someone needs the button for — so it is listed, not hidden.
  const known = new Set(brands.map((b) => b.brand));
  const missing = BRANDS.filter((b) => !known.has(b.slug)).map((b) => ({
    brand: b.slug,
    known: 0,
    eligible: 0,
    drift_states: {},
    last_refreshed_at: null,
    stale: true,
    stale_after_hours: 0,
    running_run_id: null,
  } satisfies PageHealthBrand));

  const all = [...brands, ...missing];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Page Health</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Re-read each brand&apos;s Facebook pages from Meta: who can still write
        to them, how many ads they are carrying against their limit, and
        whether Meta has restricted them. A refresh takes about a minute and
        runs in the background.
      </p>

      {error && (
        <p className="mt-6 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {(error as Error).message}
        </p>
      )}

      {isLoading && (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {all.map((brand) => (
          <BrandCard
            key={brand.brand}
            brand={brand}
            busy={refresh.isPending && refresh.variables === brand.brand}
            onRefresh={() => refresh.mutate(brand.brand)}
            open={openBrand === brand.brand}
            onOpen={() => setOpenBrand(brand.brand)}
          />
        ))}
      </div>

      {openBrand && <RunHistory brand={openBrand} />}
    </div>
  );
}

function BrandCard({
  brand,
  busy,
  onRefresh,
  open,
  onOpen,
}: {
  brand: PageHealthBrand;
  busy: boolean;
  onRefresh: () => void;
  open: boolean;
  onOpen: () => void;
}) {
  const running = Boolean(brand.running_run_id);
  const label = BRANDS.find((b) => b.slug === brand.brand)?.label ?? brand.brand;
  const blocked = brand.known - brand.eligible;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-surface p-4 text-left transition-colors",
        open ? "border-accent/50" : "border-border hover:border-border-strong",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className={cn("mt-0.5 text-[11px]", brand.stale ? "text-warning" : "text-muted")}>
            {brand.last_refreshed_at ? (
              <>
                Checked <TimeAgo at={brand.last_refreshed_at} />
                {brand.stale && " — out of date"}
              </>
            ) : (
              "Never checked"
            )}
          </p>
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            if (!running && !busy) onRefresh();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              if (!running && !busy) onRefresh();
            }
          }}
          title={running ? "A refresh is already running" : "Refresh from Meta"}
          className={cn(
            "shrink-0 rounded-lg p-1.5 transition-colors",
            running || busy
              ? "cursor-wait text-accent"
              : "cursor-pointer text-muted hover:bg-white/5 hover:text-foreground",
          )}
        >
          <RefreshCw className={cn("h-4 w-4", (running || busy) && "animate-spin")} />
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tabular-nums text-success">{brand.eligible}</span>
        <span className="text-xs text-muted">
          of <span className="tabular-nums">{brand.known}</span> usable
        </span>
      </div>

      {blocked > 0 && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(brand.drift_states)
            .filter(([state, count]) => count > 0 && state !== "active_verified")
            .sort((a, b) => b[1] - a[1])
            .map(([state, count]) => (
              <Badge
                key={state}
                tone={DRIFT_LABELS[state]?.tone ?? "muted"}
                title={DRIFT_LABELS[state]?.why}
              >
                {count} {DRIFT_LABELS[state]?.label ?? state.replace(/_/g, " ")}
              </Badge>
            ))}
        </div>
      )}
    </button>
  );
}

const STEP_ICON = {
  done: CheckCircle2,
  in_progress: Loader2,
  failed: XCircle,
  pending: null,
  skipped: null,
} as const;

function RunHistory({ brand }: { brand: string }) {
  const { data, isLoading } = usePageHealthRuns(brand);
  const runs = data?.runs ?? [];
  const latest = runs[0];

  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-faint">
        {BRANDS.find((b) => b.slug === brand)?.label ?? brand} refresh history
      </h2>

      {isLoading && (
        <div className="mt-4 flex justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted" />
        </div>
      )}

      {!isLoading && runs.length === 0 && (
        <p className="mt-3 rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
          No refresh has run for this brand yet.
        </p>
      )}

      {latest && latest.status === "running" && <RunProgress run={latest} />}

      {runs.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-faint">
                <th className="px-4 py-2.5 text-left font-semibold">Started</th>
                <th className="px-4 py-2.5 text-left font-semibold">Result</th>
                <th className="px-4 py-2.5 text-left font-semibold">Pages</th>
                <th className="px-4 py-2.5 text-left font-semibold">Usable</th>
                <th className="px-4 py-2.5 text-left font-semibold">Took</th>
                <th className="px-4 py-2.5 text-left font-semibold">Started by</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const result = (run.cli_result ?? {}) as Record<string, number>;
                return (
                  <tr key={run.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2.5 text-muted">
                      <TimeAgo at={run.started_at} />
                    </td>
                    <td className="px-4 py-2.5">
                      {run.status === "ok" ? (
                        <Badge tone="good">Succeeded</Badge>
                      ) : run.status === "running" ? (
                        <Badge tone="warn">Running</Badge>
                      ) : (
                        <Badge tone="bad" title={run.error ?? undefined}>Failed</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-muted">
                      {result.page_count ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-muted">
                      {result.final_launch_eligible_count ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-muted">
                      {run.duration_ms ? `${Math.round(run.duration_ms / 1000)}s` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted">
                      {run.payload?.trigger ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RunProgress({ run }: { run: PageHealthRun }) {
  return (
    <div className="mt-4 rounded-xl border border-accent/40 bg-surface p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
        Reading pages from Meta
      </div>
      <ol className="mt-3 flex flex-col gap-1.5">
        {run.progress.map((step) => {
          const Icon = STEP_ICON[step.status as keyof typeof STEP_ICON] ?? null;
          return (
            <li key={step.key} className="flex items-center gap-2 text-xs">
              {Icon ? (
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    step.status === "done" && "text-success",
                    step.status === "in_progress" && "animate-spin text-accent",
                    step.status === "failed" && "text-danger",
                  )}
                />
              ) : (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-border-strong" />
              )}
              <span
                className={cn(
                  step.status === "done" ? "text-muted"
                  : step.status === "in_progress" ? "text-foreground"
                  : "text-faint",
                )}
              >
                {step.step}
              </span>
              {step.error && (
                <span className="text-danger" title={step.error}>
                  <AlertTriangle className="h-3 w-3" />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
