"use client";

import { Loader2, Upload, Rocket } from "lucide-react";
import { useMetaProgress } from "@/hooks/use-meta-progress";
import { formatRunTime, formatDuration } from "@/hooks/use-concept-run";
import { RunSteps, RunError, type AnyRun } from "./generation-steps";
import type { MetaRun } from "@/lib/api/types";

/**
 * Live progress and errors for a Meta upload or launch.
 *
 * The same treatment copywriting already gets, and for the same reason: the
 * only thing on screen during an upload used to be a spinner, so a run that
 * had created the ad set but failed on the creative looked identical to one
 * that had not started. The steps come from the run document the API writes
 * as the Meta CLI reports each object.
 *
 * `durationMs` is converted here rather than in the shared components: a
 * copywriting run is minutes and reports seconds, an upload is seconds and
 * reports milliseconds, and the renderer should not have to know which it
 * is looking at.
 */
function toAnyRun(run: MetaRun): AnyRun {
  return {
    status: run.status,
    progress: run.progress,
    error: run.error,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    durationSeconds: run.durationMs != null ? run.durationMs / 1000 : null,
    retryable: run.safeRetry,
  };
}

const KIND_LABEL: Record<MetaRun["kind"], string> = {
  upload: "Upload",
  launch: "Launch",
};

function KindIcon({ kind }: { kind: MetaRun["kind"] }) {
  return kind === "launch" ? (
    <Rocket className="h-3.5 w-3.5 shrink-0" />
  ) : (
    <Upload className="h-3.5 w-3.5 shrink-0" />
  );
}

export function MetaRunPanel({
  conceptId,
  active = false,
}: {
  conceptId: string;
  /** True right after the button is pressed, before the server has a run. */
  active?: boolean;
}) {
  const { data } = useMetaProgress(conceptId, { active });
  const run = data?.run ?? null;

  // Nothing has ever been uploaded, and nothing is happening now. An empty
  // panel is worse than no panel.
  if (!run && !active && !data?.meta_error) return null;

  if (!run) {
    return (
      <div className="rounded-lg border border-border bg-panel p-3">
        <p className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
          Starting…
        </p>
      </div>
    );
  }

  const anyRun = toAnyRun(run);
  const running = run.status === "running";

  return (
    <div className="rounded-lg border border-border bg-panel p-3">
      <p className="flex items-center gap-2 text-xs font-medium text-foreground">
        <KindIcon kind={run.kind} />
        <span>{KIND_LABEL[run.kind]}</span>
        {running ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
        ) : null}
        <span className="ml-auto text-[11px] font-normal text-muted">
          {running
            ? `started ${formatRunTime(run.startedAt)}`
            : `${formatRunTime(run.finishedAt ?? run.startedAt)}${
                run.durationMs != null
                  ? ` · ${formatDuration(run.durationMs / 1000)}`
                  : ""
              }`}
        </span>
      </p>

      <RunSteps run={anyRun} />

      {run.status === "failed" ? (
        <div className="mt-3">
          <RunError run={anyRun} />
          {run.errorDetails ? (
            // The CLI's own stderr. Collapsed, because it is long and only
            // matters once the one-line message is not enough.
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-muted hover:text-foreground">
                Meta CLI output
              </summary>
              <pre className="mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-black/30 p-2 text-[10px] leading-relaxed text-muted">
                {run.errorDetails}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}

      {run.status === "ok" && Object.keys(run.ids).length > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-border/60 pt-2 text-[10px]">
          {Object.entries(run.ids).map(([key, value]) => (
            <div key={key} className="flex min-w-0 items-baseline gap-1.5">
              <dt className="shrink-0 uppercase tracking-wide text-faint">
                {key.replace(/_/g, " ").replace("meta creative", "creative")}
              </dt>
              <dd className="truncate tabular-nums text-muted">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
