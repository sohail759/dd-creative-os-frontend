"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Gauge } from "lucide-react";
import { useRateLimitStatus } from "@/hooks/use-meta-limits";
import type { BrandLimit } from "@/lib/api/meta-limits";
import { cn } from "@/lib/utils";

/**
 * Meta's rate limit, always on screen, in words rather than numbers.
 *
 * The first version showed "294%" beside three unlabelled percentages and the
 * word "Tier". Every figure was correct and none of it said what was wrong,
 * what caused it, or what it meant for the person reading — so it reported a
 * problem without communicating one.
 *
 * Each number now carries what it measures, the worst one is named as the
 * cause, and the consequence is stated as a sentence.
 */

/** Our own grades, since Meta reports a raw percentage that can exceed 100. */
type Grade = "ok" | "busy" | "high" | "over" | "cooling" | "unknown";

const GRADES: Record<Grade, { bar: string; text: string; headline: string }> = {
  ok: { bar: "bg-success", text: "text-success", headline: "Meta connection healthy" },
  busy: { bar: "bg-success", text: "text-success", headline: "Meta connection busy" },
  high: { bar: "bg-warning", text: "text-warning", headline: "Close to Meta's limit" },
  over: { bar: "bg-danger", text: "text-danger", headline: "Over Meta's limit" },
  cooling: { bar: "bg-danger", text: "text-danger", headline: "Meta has paused us" },
  unknown: { bar: "bg-muted", text: "text-muted", headline: "Meta usage not measured yet" },
};

function gradeOf(limit: BrandLimit): Grade {
  if (limit.cooling) return "cooling";
  if (limit.usage_percent == null) return "unknown";
  if (limit.usage_percent > 100) return "over";
  if (limit.usage_percent >= limit.snapshot_ceiling) return "high";
  if (limit.usage_percent >= 40) return "busy";
  return "ok";
}

const RANK: Record<Grade, number> = {
  cooling: 5, over: 4, high: 3, busy: 1, ok: 0, unknown: 0,
};

/** What each of Meta's three figures actually measures. */
const METRICS = [
  {
    key: "call_count_percent" as const,
    label: "Requests sent",
    meaning: "how many calls we've made",
  },
  {
    key: "cputime_percent" as const,
    label: "Processing used",
    meaning: "how much of Meta's computing we've used",
  },
  {
    key: "total_time_percent" as const,
    label: "Time used",
    meaning: "how long our requests took Meta to run",
  },
];

function minutes(seconds: number): string {
  if (seconds <= 0) return "under a minute";
  const m = Math.round(seconds / 60);
  if (m < 60) return `about ${m} minute${m === 1 ? "" : "s"}`;
  const h = Math.floor(m / 60);
  return `about ${h} hour${h === 1 ? "" : "s"}`;
}

export function MetaLimitBar() {
  const { data, isLoading, dataUpdatedAt } = useRateLimitStatus();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const anyCooling = Boolean(data?.brands.some((b) => b.cooling));
  useEffect(() => {
    if (!anyCooling) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [anyCooling]);

  if (isLoading || !data || data.brands.length === 0) return null;

  // They share one limit per ad account, so the account under most pressure
  // is what will refuse the next call — that is the one worth leading with.
  const graded = data.brands.map((b) => ({ limit: b, grade: gradeOf(b) }));
  const lead = [...graded].sort((a, b) => RANK[b.grade] - RANK[a.grade])[0];
  const tone = GRADES[lead.grade];

  const waiting = data.brands
    .filter((b) => b.cooling)
    .map((b) => b.cooldown_seconds_remaining - (now - dataUpdatedAt) / 1000);
  const longestWait = waiting.length ? Math.max(...waiting) : 0;

  const percent = lead.limit.usage_percent;
  const width = percent == null ? 8 : Math.min(100, Math.max(4, percent));

  return (
    <div className="border-t border-border px-3 py-2.5 text-[11px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={open}
      >
        {lead.grade === "over" || lead.grade === "cooling" ? (
          <AlertTriangle className={cn("h-3.5 w-3.5 shrink-0", tone.text)} />
        ) : (
          <Gauge className={cn("h-3.5 w-3.5 shrink-0", tone.text)} />
        )}
        <span className={cn("font-semibold", tone.text)}>{tone.headline}</span>
        {open
          ? <ChevronUp className="ml-auto h-3 w-3 shrink-0 text-faint" />
          : <ChevronDown className="ml-auto h-3 w-3 shrink-0 text-faint" />}
      </button>

      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div className={cn("h-full rounded-full transition-all", tone.bar)}
             style={{ width: `${width}%` }} />
      </div>

      {/* One sentence anyone can act on, without opening the panel. */}
      <p className="mt-1.5 leading-relaxed text-muted">
        {lead.grade === "cooling"
          ? `Meta stopped accepting our requests. Refreshes and ad builds resume in ${minutes(longestWait)}.`
          : lead.grade === "over"
          ? `We have used more than Meta allows this app per hour. Refreshes will be slow or refused until it resets.`
          : lead.grade === "high"
          ? `Nearly at Meta's hourly allowance. Scheduled refreshes pause so ad builds keep working.`
          : lead.grade === "unknown"
          ? `Waiting for Meta to report usage. It does so on the next request.`
          : `Meta is accepting our requests normally.`}
      </p>

      {open && (
        <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto custom-scrollbar">
          {graded.map(({ limit, grade }) => (
            <BrandCard key={limit.brand} limit={limit} grade={grade} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BrandCard({ limit, grade }: { limit: BrandLimit; grade: Grade }) {
  const tone = GRADES[grade];
  const measured = limit.usage_percent != null;
  const limited = limit.access_tier === "development_access";

  // Naming the worst figure is the difference between "something is at 294%"
  // and knowing which thing, and therefore what is actually constrained.
  const worst = measured
    ? METRICS.reduce((a, b) =>
        (limit[b.key] ?? 0) > (limit[a.key] ?? 0) ? b : a)
    : null;

  return (
    <li className="rounded-lg bg-white/5 p-2.5">
      <div className="flex items-baseline gap-2">
        <span className="font-semibold capitalize">
          {limit.brand.replace(/-/g, " ")}
        </span>
        <span className={cn("ml-auto font-semibold", tone.text)}>
          {limit.cooling
            ? "Paused by Meta"
            : measured
            ? `${Math.round(limit.usage_percent as number)}% of allowance`
            : "Not measured yet"}
        </span>
      </div>

      {measured ? (
        <>
          <dl className="mt-2 space-y-1.5">
            {METRICS.map((metric) => {
              const value = limit[metric.key];
              if (value == null) return null;
              const isWorst = worst?.key === metric.key;
              return (
                <div key={metric.key}>
                  <div className="flex items-baseline gap-2">
                    <dt className={cn(isWorst && "font-semibold")}>{metric.label}</dt>
                    <dd className={cn(
                      "ml-auto tabular-nums",
                      value > 100 ? "text-danger font-semibold"
                        : value >= 80 ? "text-warning" : "text-muted",
                    )}>
                      {Math.round(value)}%
                    </dd>
                  </div>
                  <p className="text-faint">{metric.meaning}</p>
                </div>
              );
            })}
          </dl>

          {worst && (limit[worst.key] ?? 0) > 100 && (
            <p className="mt-2 rounded bg-danger/10 px-2 py-1.5 text-danger">
              <span className="font-semibold">{worst.label.toLowerCase()}</span> is
              what is over — {Math.round(limit[worst.key] as number)}% of the hour&apos;s
              allowance. Other work on this ad account waits behind it.
            </p>
          )}
        </>
      ) : (
        <p className="mt-1.5 text-faint">
          Meta has not reported usage for this account recently. Our own rough
          estimate is {Math.round(limit.calls_remaining)} of{" "}
          {limit.calls_per_hour} requests left this hour — Meta replaces it
          with its real figure on the next request.
        </p>
      )}

      {limit.cooling && (
        <p className="mt-2 rounded bg-danger/10 px-2 py-1.5 text-danger">
          Meta is refusing requests for{" "}
          {minutes(limit.cooldown_seconds_remaining)} more. Nothing is lost —
          refreshes continue from where they stopped.
        </p>
      )}

      {limited && (
        <p className="mt-2 rounded bg-warning/10 px-2 py-1.5 text-warning">
          <span className="font-semibold">This is the cause.</span> The app has
          Meta&apos;s development access, which Meta describes as heavily
          rate-limited and not for live ad accounts. Upgrading to Full Access
          removes most of these pauses.
        </p>
      )}
    </li>
  );
}
