"use client";

import {
  Loader2,
  CheckCircle2,
  XCircle,
  Circle,
  MinusCircle,
  AlertTriangle,
} from "lucide-react";
import {
  useConceptRun,
  formatRunTime,
  formatDuration,
} from "@/hooks/use-concept-run";
import type { CopyRun, RunStep } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * The real per-step progress of a copywriting run.
 *
 * This used to be five captions advanced by a 1.8s timer, with a comment
 * admitting the backend exposed no per-stage events. It does now: the worker
 * writes each step's state into the run row as it happens, and this renders
 * exactly that — including which step a failed run died on.
 */

function StepIcon({ status }: { status: RunStep["status"] }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />;
    case "in_progress":
      return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" />;
    case "failed":
      return <XCircle className="h-3.5 w-3.5 shrink-0 text-danger" />;
    case "skipped":
      return <MinusCircle className="h-3.5 w-3.5 shrink-0 text-faint" />;
    default:
      return <Circle className="h-3.5 w-3.5 shrink-0 text-border-strong" />;
  }
}

export function RunSteps({ run }: { run: CopyRun }) {
  if (!run.progress.length) return null;
  return (
    <ul className="mt-3 space-y-1.5">
      {run.progress.map((step) => (
        <li key={step.key} className="flex items-start gap-2 text-xs">
          <span className="mt-0.5">
            <StepIcon status={step.status} />
          </span>
          <span className="min-w-0">
            <span
              className={cn(
                "transition-colors",
                step.status === "done" && "text-muted",
                step.status === "in_progress" && "font-medium text-foreground",
                step.status === "failed" && "font-medium text-danger",
                step.status === "skipped" && "text-faint line-through",
                step.status === "pending" && "text-faint",
              )}
            >
              {step.step}
            </span>
            {step.status === "skipped" ? (
              // Labelled, not just greyed: a skipped step sitting between two
              // ticks otherwise reads as one that has not run yet.
              <span className="ml-1.5 rounded bg-white/5 px-1 py-0.5 text-[10px] uppercase tracking-wide text-faint">
                skipped
              </span>
            ) : null}
            {step.error ? (
              <span className="mt-0.5 block break-words text-[11px] text-danger/80">
                {step.error}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Failure banner for the most recent run, with when it ran. */
export function RunError({ run }: { run: CopyRun }) {
  if (!run.error) return null;
  return (
    <div className="rounded-lg border border-danger/30 bg-danger/10 p-3">
      <p className="flex items-start gap-2 text-xs font-semibold text-danger">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span className="break-words">{run.error}</span>
      </p>
      <p className="mt-1.5 pl-5 text-[11px] text-muted">
        {run.status === "blocked" ? "Blocked" : "Failed"} ·{" "}
        {formatRunTime(run.finishedAt ?? run.startedAt)}
        {run.durationSeconds
          ? ` · took ${formatDuration(run.durationSeconds)}`
          : ""}
        {run.retryable === false ? " · not retryable" : ""}
      </p>
    </div>
  );
}

/** When the run started or last finished, in the viewer's timezone. */
export function RunTiming({ run }: { run: CopyRun }) {
  if (run.status === "none") return null;
  const running = run.status === "running";
  return (
    <p className="text-[11px] text-muted">
      {running ? "Started" : "Last run"} {formatRunTime(run.startedAt)}
      {!running && run.durationSeconds
        ? ` · took ${formatDuration(run.durationSeconds)}`
        : ""}
    </p>
  );
}

/** One-line summary of a finished run's step tally. */
function RunSummary({ run }: { run: CopyRun }) {
  const done = run.progress.filter((s) => s.status === "done").length;
  const skipped = run.progress.filter((s) => s.status === "skipped").length;
  const failed = run.progress.find((s) => s.status === "failed");
  const ran = run.progress.length - skipped;

  if (failed) {
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-danger">
        <XCircle className="h-4 w-4 shrink-0" />
        Stopped at &ldquo;{failed.step}&rdquo;
      </p>
    );
  }
  return (
    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
      Completed {done} of {ran} steps
      {skipped ? ` · ${skipped} skipped` : ""}
    </p>
  );
}

/**
 * The latest run for a concept, in EVERY state.
 *
 * Progress used to be visible only while a run was in flight: the moment it
 * finished or failed the step list vanished, taking with it the one view that
 * says WHERE a failure happened. A finished run keeps its steps on screen —
 * which step ran, which were skipped, which one stopped it, and when.
 */
export function RunPanel({ conceptId }: { conceptId: string }) {
  const { data: run } = useConceptRun(conceptId);

  if (!run || run.status === "none" || !run.progress.length) return null;
  if (run.status === "running") return <GenerationSteps conceptId={conceptId} />;

  const failed = run.status === "blocked" || run.status === "failed";
  return (
    <div
      className={cn(
        "rounded-2xl border p-6",
        failed ? "border-danger/30 bg-danger/5" : "border-border bg-panel",
      )}
    >
      <RunSummary run={run} />
      {run.error ? (
        <div className="mt-3">
          <RunError run={run} />
        </div>
      ) : null}
      <RunSteps run={run} />
      <div className="mt-3">
        <RunTiming run={run} />
      </div>
    </div>
  );
}

/**
 * Live progress for one concept. Fetches and polls the run itself, so a
 * caller only has to know the concept id.
 */
export function GenerationSteps({ conceptId }: { conceptId: string }) {
  const { data: run } = useConceptRun(conceptId, { active: true });

  if (!run || run.status === "none" || !run.progress.length) {
    // The row is written when a worker PICKS UP the task, not when it is
    // dispatched. Until then the honest state is "queued", not "starting".
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
        Queued — waiting for a worker...
      </p>
    );
  }

  const active = run.progress.find((s) => s.status === "in_progress");

  return (
    <div className="w-full">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
        {active ? active.step : "Generating creative..."}
      </p>
      <RunSteps run={run} />
      <div className="mt-2">
        <RunTiming run={run} />
      </div>
    </div>
  );
}
