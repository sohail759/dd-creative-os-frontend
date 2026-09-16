"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Loader2, MinusCircle, XCircle } from "lucide-react";

import {
  Badge,
  BrandTabs,
  DEFAULT_PAGE_SIZE,
  Pagination,
  TimeAgo,
  type Tone,
} from "@/components/pages/shared";
import type { JobRun, RunPage, RunQuery, RunStatusFilter, RunStep } from "@/lib/api/runs";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: { value: RunStatusFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "running", label: "Running" },
  { value: "ok", label: "Succeeded" },
  { value: "failed", label: "Failed" },
];

function runTone(status: string): Tone {
  if (status === "ok") return "good";
  if (status === "failed") return "bad";
  return "warn";
}

function runLabel(status: string): string {
  if (status === "ok") return "Succeeded";
  if (status === "failed") return "Failed";
  return "Running";
}

/** A finished run's wall time, said the way someone reading a table wants it. */
function duration(run: JobRun): string {
  const ms = run.duration_ms;
  if (typeof ms !== "number" || ms <= 0) return run.status === "running" ? "in progress" : "—";
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 90) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
}

function StepIcon({ status }: { status: RunStep["status"] }) {
  const common = "h-3.5 w-3.5 shrink-0";
  if (status === "done") return <CheckCircle2 className={cn(common, "text-success")} />;
  if (status === "failed") return <XCircle className={cn(common, "text-danger")} />;
  if (status === "in_progress") return <Loader2 className={cn(common, "animate-spin text-warning")} />;
  if (status === "skipped") return <MinusCircle className={cn(common, "text-faint")} />;
  return <div className={cn(common, "rounded-full border border-border")} />;
}

/**
 * The steps of one run.
 *
 * Shown as a row of stages rather than a progress bar: a run that failed did
 * so at a particular stage, and which stage it was is the first thing an
 * operator needs. A bar can only say how far it got.
 */
function Steps({ steps }: { steps: RunStep[] }) {
  if (!steps.length) return <span className="text-xs text-faint">No stages recorded</span>;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {steps.map((step) => (
        <div key={step.key} className="flex items-center gap-1.5" title={step.error || undefined}>
          <StepIcon status={step.status} />
          <span
            className={cn(
              "text-xs",
              step.status === "failed" ? "text-danger"
                : step.status === "done" ? "text-foreground"
                : step.status === "skipped" ? "text-faint"
                : "text-muted",
            )}
          >
            {step.step}
          </span>
          {/* The number is the whole point on a long step: it separates slow
              from stuck, which a spinner alone cannot. */}
          {typeof step.total === "number" && step.total > 0 && (
            <span className="text-[10px] tabular-nums text-faint">
              {(step.done ?? 0).toLocaleString()}/{step.total.toLocaleString()}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * How far through the brand's concepts a pass is.
 *
 * A weekly pass covers every concept in the brand, so the three stages above
 * spend nearly all their time on one of them. This is the number that moves.
 */
/** A span of milliseconds, said the way someone watching a run wants it. */
function millis(ms?: number | null): string {
  if (typeof ms !== "number" || ms <= 0) return "—";
  const seconds = ms / 1000;
  if (seconds < 90) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const minutes = seconds / 60;
  if (minutes < 90) return `${minutes.toFixed(0)}m`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function ConceptCounts({
  counts,
  timing,
}: {
  counts?: JobRun["concept_counts"];
  timing?: JobRun["concept_timing"];
}) {
  if (!counts) return null;
  const done = counts.done ?? 0;
  const failed = counts.failed ?? 0;
  const running = counts.running ?? 0;
  const pending = counts.pending ?? 0;
  const total = done + failed + running + pending;
  if (!total) return null;
  return (
    <div className="mt-1.5 flex items-center gap-3 text-[10px] tabular-nums text-faint">
      <span className="text-foreground">{done.toLocaleString()} done</span>
      {running > 0 && <span className="text-warning">{running.toLocaleString()} running</span>}
      {pending > 0 && <span>{pending.toLocaleString()} to go</span>}
      {failed > 0 && <span className="text-danger">{failed.toLocaleString()} failed</span>}
      <span>of {total.toLocaleString()}</span>
      {/* Pace, and what it implies for the time left. A six-hour pass with no
          estimate cannot be told from one that has hung. */}
      {timing?.average_ms ? (
        <span title={
          timing.slowest
            ? `Slowest: ${timing.slowest.name} (${millis(timing.slowest.duration_ms)})`
            : undefined
        }>
          · {millis(timing.average_ms)}/concept
          {timing.eta_ms ? ` · ~${millis(timing.eta_ms)} left` : ""}
        </span>
      ) : null}
    </div>
  );
}

/** Key/value pairs from a run's payload or result, rendered without guessing. */
function Facts({ title, data }: { title: string; data: Record<string, unknown> }) {
  const entries = Object.entries(data ?? {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );
  if (!entries.length) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">{title}</p>
      <dl className="mt-1.5 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-muted">{key.replace(/_/g, " ")}</dt>
            <dd className="truncate text-xs font-medium tabular-nums text-foreground">
              {typeof value === "object" ? JSON.stringify(value) : String(value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function RunRow({ run }: { run: JobRun }) {
  const [open, setOpen] = useState(false);
  const hasDetail =
    Boolean(run.error) ||
    Object.keys(run.payload ?? {}).length > 0 ||
    Object.keys(run.result ?? {}).length > 0;

  return (
    <>
      <tr className="border-b border-border/50 last:border-0">
        <td className="py-2.5 pl-4 pr-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            disabled={!hasDetail}
            className="flex items-center gap-1.5 text-left disabled:cursor-default"
          >
            {hasDetail ? (
              open ? <ChevronDown className="h-3.5 w-3.5 text-muted" />
                   : <ChevronRight className="h-3.5 w-3.5 text-muted" />
            ) : (
              <span className="w-3.5" />
            )}
            <span className="font-medium text-foreground">{run.brand || "—"}</span>
          </button>
        </td>
        <td className="py-2.5 pr-3">
          <Badge tone={runTone(run.status)}>{runLabel(run.status)}</Badge>
        </td>
        <td className="py-2.5 pr-3 text-muted">
          <TimeAgo at={run.started_at} fallback="—" />
        </td>
        <td className="py-2.5 pr-3 tabular-nums text-muted">{duration(run)}</td>
        <td className="py-2.5 pr-4">
          <Steps steps={run.progress ?? []} />
          <ConceptCounts counts={run.concept_counts} timing={run.concept_timing} />
        </td>
      </tr>
      {open && hasDetail && (
        <tr className="border-b border-border/50 bg-surface/40 last:border-0">
          <td colSpan={5} className="px-4 py-3">
            <div className="flex flex-col gap-3">
              {run.error && (
                <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-2.5">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
                  <p className="whitespace-pre-wrap text-xs text-danger">{run.error}</p>
                </div>
              )}
              <Facts title="Asked to do" data={run.payload} />
              <Facts title="Reported back" data={run.result} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * One runs screen, parameterised by which job it lists.
 *
 * The two screens are the same table because the two jobs record the same
 * way. Keeping one component means a change to how a failure reads cannot
 * apply to one screen and not the other.
 */
export function RunsView({
  title,
  description,
  icon: Icon,
  fetcher,
  queryKey,
  emptyHint,
}: {
  title: string;
  description: React.ReactNode;
  icon: typeof AlertTriangle;
  fetcher: (params: RunQuery) => Promise<RunPage>;
  queryKey: string;
  emptyHint: string;
}) {
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState<RunStatusFilter>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // Changing what is being asked for invalidates where you were in the
  // answer. Without this, narrowing to "failed" while on page 4 shows an
  // empty table that looks like "no failures".
  useEffect(() => {
    setPage(1);
  }, [brand, status, pageSize]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: [queryKey, brand, status, page, pageSize],
    queryFn: () =>
      fetcher({ brand, status, limit: pageSize, offset: (page - 1) * pageSize }),
    // The global 60s staleTime is for lists nobody is watching. This one is
    // watched, so navigating to it must show the current state rather than
    // whatever was cached on the last visit.
    staleTime: 0,
    refetchOnMount: "always",
    // Fast while something is in flight, slow when nothing is.
    refetchInterval: (query) =>
      (query.state.data?.items ?? []).some((r) => r.status === "running")
        ? 4_000
        : 20_000,
  });

  const runs = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="animate-fade-in-up">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Icon className="h-5 w-5 text-accent" />
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
        </div>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          <BrandTabs value={brand} onChange={setBrand} allowAll />
          <div className="flex rounded-lg border border-border bg-surface p-0.5">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option.value || "all"}
                type="button"
                onClick={() => setStatus(option.value)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  status === option.value
                    ? "bg-accent text-black"
                    : "text-muted hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-danger/30 bg-danger/10 p-4">
          <AlertTriangle className="h-4 w-4 text-danger" />
          <p className="text-sm text-danger">{(error as Error).message}</p>
        </div>
      )}

      <section className="mt-4 rounded-2xl border border-border bg-panel">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Runs</h2>
          {isFetching && !isLoading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
          )}
          <span className="ml-auto text-xs text-muted">{total}</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="mt-3 text-sm text-muted">Loading runs…</p>
          </div>
        ) : runs.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted">{emptyHint}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-faint">
                  <th className="p-2 pl-4 pr-3">Brand</th>
                  <th className="p-2 pr-3">Status</th>
                  <th className="p-2 pr-3">Started</th>
                  <th className="p-2 pr-3">Took</th>
                  <th className="p-2 pr-4">Stages</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <RunRow key={run.id} run={run} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 && (
          <div className="border-t border-border/50 px-4 py-3">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              label="runs"
            />
          </div>
        )}
      </section>
    </div>
  );
}
