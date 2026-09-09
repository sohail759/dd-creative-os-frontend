"use client";

import { Loader2, Upload, Rocket } from "lucide-react";
import { useMetaProgress, useMetaRuns } from "@/hooks/use-meta-progress";
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
  kind,
  active = false,
  alwaysShow = false,
}: {
  conceptId: string;
  /** Show only this half. Omitted means "whichever ran most recently". */
  kind?: MetaRun["kind"];
  /** True right after the button is pressed, before the server has a run. */
  active?: boolean;
  /** Render an empty state rather than nothing, for a fixed layout slot. */
  alwaysShow?: boolean;
}) {
  const { data } = useMetaProgress(conceptId, { active });
  // The latest run overall covers the common case with one request. A panel
  // pinned to one half needs the history, because the newest run may be the
  // other kind — an upload panel must not go blank the moment a launch runs.
  const { data: runs } = useMetaRuns(conceptId, Boolean(kind));
  const run = kind
    ? (runs ?? []).find((r) => r.kind === kind) ?? null
    : data?.run ?? null;

  if (!run && !active && !data?.meta_error) {
    if (!alwaysShow) return null;
    return (
      <div className="rounded-lg border border-dashed border-border bg-panel/50 p-3">
        <p className="text-xs text-faint">
          {kind === "launch"
            ? "Not launched yet."
            : kind === "upload"
              ? "Not uploaded yet."
              : "Nothing has run yet."}
        </p>
      </div>
    );
  }

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

      {/* The Meta object ids used to be listed here. They are not any more:
          this panel is rendered twice on the concept page (upload and
          launch), and a launch creates no new objects — it activates the ones
          the upload made — so the same four ids appeared in both panels and
          again in the target list below, three times over.

          `MetaTargetList` owns them now. It is the same component the batch
          views use, and it adds what this block could not: the page and
          campaign NAMES, and a copy button per value. */}
    </div>
  );
}
