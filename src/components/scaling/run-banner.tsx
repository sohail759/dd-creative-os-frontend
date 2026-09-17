"use client";

import { AlertTriangle, CheckCircle2, Clock, Info, XCircle } from "lucide-react";
import { useScalingRuns } from "@/hooks/use-scaling";
import type { ScalingRun } from "@/lib/api/scaling";
import { TimeAgo } from "@/components/pages/shared";
import { cn } from "@/lib/utils";

/**
 * What the last planning pass did, and why, in plain words.
 *
 * Before this, a pass that proposed nothing said nothing: the screen showed
 * an empty list whether the planner had never run, had run and found no
 * winners, or had been stopped dead by a full campaign. Those need three
 * different responses and looked identical.
 */

/** Why a pass produced nothing, said the way a person would say it. */
function explain(run: ScalingRun): { tone: "info" | "warn" | "bad" | "good"; title: string; body: string } {
  if (run.status === "running") {
    return { tone: "info", title: "Looking for winners…", body: "This usually takes a few seconds." };
  }
  if (run.status === "failed") {
    return {
      tone: "bad",
      title: "The last run could not finish",
      body: run.error || "Something went wrong before it could decide anything.",
    };
  }
  if (run.status === "blocked") {
    return {
      tone: "warn",
      title: "Nothing could be proposed",
      body: run.skipped || "The planner was stopped before it could propose anything.",
    };
  }
  if (run.proposals > 0) {
    return {
      tone: "good",
      title: `${run.proposals} proposal${run.proposals === 1 ? "" : "s"} from the last run`,
      body: run.capped_at
        ? `Stopped at the limit of ${run.capped_at} for one run.`
        : "Every winner that qualified has been proposed.",
    };
  }
  return {
    tone: "info",
    title: "No ads qualified this time",
    body: run.skipped || "Nothing reached the purchase threshold in the lookback window.",
  };
}

/** The counts worth showing a person, in words rather than field names. */
const COUNT_LABELS: Array<{ key: string; label: string; explain: string }> = [
  { key: "winners", label: "ads good enough to scale",
    explain: "reached the purchase threshold in the lookback window" },
  { key: "below_threshold", label: "not enough purchases yet",
    explain: "live ads that have not earned enough to justify a copy" },
  { key: "campaign_full", label: "in a campaign that is full",
    explain: "Meta caps some campaigns at 150 ads" },
  { key: "campaign_out_of_scope", label: "in a campaign we do not scale from",
    explain: "the policy names which campaigns winners may come from" },
  { key: "not_live", label: "not running",
    explain: "paused, archived or rejected — only a live ad is worth copying" },
  { key: "no_creative", label: "missing their creative",
    explain: "the creative is what gets copied, so these cannot be" },
  { key: "angle_mismatch", label: "wrong angle for the page",
    explain: "a stress ad does not belong on a pelvic-strength page" },
  { key: "already_covered", label: "already on that page",
    explain: "this concept is running there already" },
  { key: "inactive_source_adset", label: "in a paused ad set",
    explain: "not delivering, so recent numbers are not evidence" },
];

const TONES = {
  good: { box: "border-success/30 bg-success/5", text: "text-success", Icon: CheckCircle2 },
  info: { box: "border-border bg-surface", text: "text-muted", Icon: Info },
  warn: { box: "border-warning/30 bg-warning/5", text: "text-warning", Icon: AlertTriangle },
  bad: { box: "border-danger/30 bg-danger/5", text: "text-danger", Icon: XCircle },
};

export function RunBanner({ brand }: { brand: string }) {
  const { data } = useScalingRuns(brand);
  const run = data?.runs?.[0];

  if (!run) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-xs text-muted">
        <p className="font-semibold text-foreground">No plan has been run yet</p>
        <p className="mt-0.5">
          Use <span className="font-semibold">Run a plan</span> above to look for
          ads worth copying onto another page.
        </p>
      </div>
    );
  }

  const { tone, title, body } = explain(run);
  const { box, text, Icon } = TONES[tone];
  const counts = COUNT_LABELS
    .map((c) => ({ ...c, value: run.counts?.[c.key] ?? 0 }))
    .filter((c) => c.value > 0);

  return (
    <div className={cn("rounded-xl border p-4 text-xs", box)}>
      <div className="flex items-start gap-2">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", text)} />
        <div className="min-w-0 flex-1">
          <p className={cn("font-semibold", text)}>{title}</p>
          <p className="mt-0.5 leading-relaxed text-muted">{body}</p>

          {counts.length > 0 && (
            <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {counts.map((c) => (
                <div key={c.key} className="flex items-baseline gap-2">
                  <dt className="tabular-nums font-semibold text-foreground">
                    {c.value.toLocaleString()}
                  </dt>
                  <dd className="min-w-0">
                    <span className="text-muted">{c.label}</span>
                    <span className="block text-faint">{c.explain}</span>
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <p className="mt-3 flex items-center gap-1.5 text-faint">
            <Clock className="h-3 w-3" />
            Last run <TimeAgo at={run.started_at} />
            {run.dry_run && <span className="ml-1">· preview only, nothing saved</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
