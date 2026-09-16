"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MinusCircle,
  Brain,
  ChevronLeft,
  DollarSign,
  Layers,
  Loader2,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import {
  useConceptRunStatus,
  useIntelligenceConcept,
  useRunIntelligenceConcept,
} from "@/hooks/use-intelligence";
import { ConceptPerformancePanel } from "@/components/intelligence/concept-performance";
import { cn } from "@/lib/utils";
import type {
  ConceptDetail,
  AnalystPayload,
  IntelligenceAd,
  ConceptRunRecord,
  ConceptRunState,
} from "@/lib/api/types";


function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted whitespace-pre-line">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Running analyst...
              </span>
            ) : (
              "Run analysis"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof DollarSign;
}) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-faint">
          {label}
        </span>
        <Icon className="h-3.5 w-3.5 text-muted" />
      </div>
      <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function formatFieldLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function stringifyValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (!value.length) return "—";
    return value
      .map((item) => (typeof item === "string" ? item : stringifyValue(item)))
      .join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${formatFieldLabel(k)}: ${stringifyValue(v)}`)
      .join(" • ");
  }
  return String(value);
}

function normalizeNextTests(nextTests: string[] | undefined): string[] {
  if (!nextTests || !nextTests.length) return [];
  const out: string[] = [];
  for (const item of nextTests) {
    const text = (item || "").trim();
    if (!text) continue;

    if (text.startsWith("{") && text.endsWith("}")) {
      const matches = [...text.matchAll(/'([^']+)'\s*:\s*'([^']*)'/g)];
      if (matches.length) {
        for (const match of matches) {
          const key = formatFieldLabel(match[1]);
          const value = match[2];
          if (value) out.push(`${key}: ${value}`);
        }
        continue;
      }
    }

    out.push(text.replace(/[{}']/g, ""));
  }
  return out;
}

function adIdentityKey(ad: IntelligenceAd): string {
  const id = (ad.id || "").trim();
  if (id) return `id:${id}`;
  const name = (ad.name || "").trim().toLowerCase();
  const campaign = (ad.campaign_id || "").trim();
  const adset = (ad.adset_id || "").trim();
  const creative = (ad.creative_id || "").trim();
  return `fallback:${name}|${campaign}|${adset}|${creative}`;
}

function isPlaceholderAd(ad: IntelligenceAd): boolean {
  const campaign = (ad.campaign_id || "").trim();
  const adset = (ad.adset_id || "").trim();
  const creative = (ad.creative_id || "").trim();
  const status = String(ad.status || "").trim().toUpperCase();
  const name = (ad.name || "").trim();
  return !campaign && !adset && !creative && status === "PAUSED" && !!name;
}

/**
 * The last Analyst pass over this concept, running or finished.
 *
 * Driven by the recorded run rather than by the mutation, so it is still
 * here after navigating away and back. A pass takes minutes; the answer has
 * to outlive the tab that started it.
 */
/** A span of milliseconds, said the way someone reading a run wants it. */
function millis(ms?: number | null): string {
  if (typeof ms !== "number" || ms <= 0) return "";
  const seconds = ms / 1000;
  if (seconds < 90) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const minutes = seconds / 60;
  if (minutes < 90) return `${minutes.toFixed(0)}m`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function RunStatusPanel({
  run,
  concept,
  waiting,
}: {
  run?: ConceptRunRecord | null;
  concept?: ConceptRunState | null;
  waiting?: boolean;
}) {
  // What this concept is doing comes first; the pass around it is context.
  // A weekly pass covers the whole brand, so its own status says nothing
  // about whether THIS concept has been analysed yet.
  // `skipped` is finished, not in flight.
  //
  // Only `done` was treated as finished, so a concept the pass had SKIPPED —
  // nothing to analyse, no ads — sat under "Analysing this concept" for ever,
  // with its blocker printed underneath. It reads as a run that never ends.
  if (concept && concept.status === "skipped") {
    return (
      <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <MinusCircle className="h-4 w-4 text-muted" />
          <p className="text-sm font-semibold text-foreground">Nothing to analyse</p>
          <span className="text-xs text-muted">
            {concept.error || "this concept has no Meta ads"}
          </span>
        </div>
      </div>
    );
  }

  if (concept && concept.status !== "done") {
    const queued = concept.status === "pending";
    const failed = concept.status === "failed";
    const counts = run?.concept_counts;
    const done = counts?.done ?? 0;
    const total =
      (counts?.done ?? 0) + (counts?.running ?? 0) +
      (counts?.pending ?? 0) + (counts?.failed ?? 0);
    return (
      <div
        className={cn(
          "mt-4 rounded-2xl border p-4",
          failed
            ? "border-danger/30 bg-danger/10"
            : "border-amber-500/30 bg-amber-500/10",
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          {failed ? (
            <AlertTriangle className="h-4 w-4 text-danger" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
          )}
          <p className="text-sm font-semibold text-foreground">
            {failed
              ? "Analysis failed for this concept"
              : queued
                ? "Queued in the brand-wide pass"
                : "Analysing this concept"}
          </p>
          {total > 0 && (
            <span className="text-xs tabular-nums text-muted">
              {done.toLocaleString()} of {total.toLocaleString()} concepts done
            </span>
          )}
          {/* What this one took, once it has a duration of its own. */}
          {millis(concept.duration_ms) && (
            <span className="text-xs tabular-nums text-muted">
              took {millis(concept.duration_ms)}
            </span>
          )}
        </div>
        {concept.error && (
          <p className="mt-2 text-xs text-danger">{concept.error}</p>
        )}
      </div>
    );
  }
  // Dispatched, not yet picked up. Showing the previous run here would read
  // as "already finished" for something that has not started.
  if (waiting) {
    return (
      <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
          <p className="text-sm font-semibold text-foreground">Analysis queued</p>
          <span className="text-xs text-muted">waiting for a worker to pick it up</span>
        </div>
      </div>
    );
  }
  // This concept is finished, even if the pass around it is not. Showing the
  // run's "Analysis running" here is what made a completed concept look
  // unfinished.
  if (concept?.status === "done") {
    const took = millis(concept.duration_ms);
    return (
      <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <p className="text-sm font-semibold text-foreground">Analysis complete</p>
          {concept.classification && (
            <span className="text-xs text-muted">{concept.classification}</span>
          )}
          {took && (
            <span className="text-xs tabular-nums text-muted">took {took}</span>
          )}
          {run?.status === "running" && (
            <span className="text-xs text-muted">
              · the brand-wide pass is still going
            </span>
          )}
        </div>
      </div>
    );
  }

  if (!run) return null;

  const running = run.status === "running";
  const ok = run.status === "ok";
  const tone = running
    ? "border-amber-500/30 bg-amber-500/10"
    : ok
      ? "border-emerald-500/30 bg-emerald-500/10"
      : "border-red-500/30 bg-red-500/10";
  const heading = running
    ? "Analysis running"
    : ok
      ? "Analysis complete"
      : "Analysis needs review";

  const seconds = Math.round((run.duration_ms ?? 0) / 1000);
  const took =
    !running && seconds > 0
      ? seconds < 90
        ? `${seconds}s`
        : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
      : "";

  return (
    <div className={`mt-4 rounded-2xl border p-4 ${tone}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {running ? (
          <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
        ) : ok ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        ) : (
          <ShieldAlert className="h-4 w-4 text-red-400" />
        )}
        <p className="text-sm font-semibold text-foreground">{heading}</p>
        {run.started_at && (
          <span className="text-xs text-muted">
            started {new Date(run.started_at).toLocaleString()}
          </span>
        )}
        {took && <span className="text-xs text-muted">took {took}</span>}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {(run.progress ?? []).map((step) => (
          <span
            key={step.key}
            className="flex items-center gap-1.5 text-xs"
            title={step.error || undefined}
          >
            {step.status === "done" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : step.status === "failed" ? (
              <XCircle className="h-3.5 w-3.5 text-red-400" />
            ) : step.status === "in_progress" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
            ) : (
              <span className="h-3.5 w-3.5 rounded-full border border-border" />
            )}
            <span
              className={
                step.status === "done" ? "text-foreground" : "text-muted"
              }
            >
              {step.step}
            </span>
          </span>
        ))}
      </div>

      {run.error && (
        <p className="mt-2 whitespace-pre-wrap text-xs text-red-300">{run.error}</p>
      )}
    </div>
  );
}

export default function ConceptDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const conceptName = decodeURIComponent((params.id as string) ?? "");
  const brand = searchParams.get("brand") ?? "numy";

  const { data, isLoading, error } = useIntelligenceConcept(conceptName, brand);
  const runMutation = useRunIntelligenceConcept();
  // When we last asked for a run, so the status hook keeps polling through
  // the gap between the task being queued and the worker opening its run.
  const [dispatchedAt, setDispatchedAt] = useState<number | undefined>();
  const runStatus = useConceptRunStatus(conceptName, brand, dispatchedAt);
  const [showRunDialog, setShowRunDialog] = useState(false);

  // This concept's own place in the pass. A brand-wide run stays "running"
  // long after it has finished with this concept, and reporting the run's
  // status here told people their analysis was still going when it was done.
  const conceptState = runStatus.data?.concept ?? null;
  const conceptBusy =
    conceptState?.status === "pending" || conceptState?.status === "running";

  // Dispatched, but the worker has not opened its run record yet. Without
  // this the page shows the PREVIOUS run's outcome and reads as finished.
  const latestStart = runStatus.data?.run?.started_at
    ? Date.parse(runStatus.data.run.started_at)
    : 0;
  const waitingForWorker = Boolean(dispatchedAt && latestStart < dispatchedAt);

  // A worker that picked the task up makes `waitingForWorker` false on its
  // own, since the run it opened started after we asked. This timer is only
  // for the other case: nothing ever picks it up, and the page would otherwise
  // sit on "queued" for ever.
  useEffect(() => {
    if (!dispatchedAt) return;
    const timer = setTimeout(
      () => setDispatchedAt(undefined),
      Math.max(0, dispatchedAt + 120_000 - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [dispatchedAt]);

  const detail: ConceptDetail | undefined = data;
  const displayConceptName = (() => {
    const cleaned = conceptName.replace(/^\.+\s*/, "").trim();
    const [head, ...rest] = cleaned.split(" - ");
    const upperHead = head.toUpperCase();
    const formattedRest = rest.map((segment) =>
      segment
        .split(" ")
        .map((word) => {
          if (!word) return word;
          const atPrefix = word.startsWith("@");
          const core = atPrefix ? word.slice(1) : word;
          if (!core) return word;

          const normalized =
            core.length <= 3
              ? core.toUpperCase()
              : core[0].toUpperCase() + core.slice(1).toLowerCase();

          return atPrefix ? `@${normalized}` : normalized;
        })
        .join(" "),
    );
    return formattedRest.length > 0
      ? `${upperHead} - ${formattedRest.join(" - ")}`
      : upperHead;
  })();

  function handleRunConfirm() {
    // Window deliberately omitted: the server decides, and it decides
    // lifetime. See `useRunIntelligenceConcept`.
    setDispatchedAt(Date.now());
    runMutation.mutate({ conceptName, brand });
    // Closed on dispatch, not on completion. A pass takes minutes and runs
    // without this page; holding the dialog open for it only trapped the
    // operator in front of a spinner.
    setShowRunDialog(false);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="mt-3 text-sm text-muted">Loading concept...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="mt-3 text-sm text-red-400">{error.message}</p>
      </div>
    );
  }

  const rawAds = detail?.ads ?? [];
  const ads: IntelligenceAd[] = (() => {
    const seen = new Set<string>();
    const out: IntelligenceAd[] = [];
    for (const ad of rawAds) {
      if (isPlaceholderAd(ad)) continue;
      const key = adIdentityKey(ad);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(ad);
    }
    return out;
  })();
  const analystByAd = detail?.analyst_by_ad ?? {};
  const analystPayloads: AnalystPayload[] = (() => {
    const fromMap = Object.values(analystByAd ?? {});
    if (fromMap.length > 0) return fromMap;
    return ads
      .map((ad) => ad.analyst)
      .filter((value): value is AnalystPayload => Boolean(value));
  })();
  const analyst = analystPayloads[0];
  const analystClassification = analyst?.classification?.label || "—";
  const analystLearnings = analyst?.learnings?.length ?? 0;
  const analystValueBlocks = analyst?.value_blocks?.card_count ?? 0;
  const analystDecision = analyst?.decided
    ? "Completed"
    : analyst?.blocked_code
      ? "Needs Review"
      : "Pending";
  const analystDecisionTone = analyst?.decided
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : analyst?.blocked_code
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : "bg-slate-500/15 text-slate-300 border-slate-500/30";
  const valueCards = analyst?.value_blocks?.cards ?? [];

  return (
    <div className="animate-fade-in-up">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/concepts-analysis?brand=${brand}`}
            className="text-muted transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h1 className="flex min-w-0 items-center gap-2 text-base font-semibold tracking-tight text-foreground md:text-lg">
            <Brain className="h-5 w-5 text-accent" />
            <span
              title={displayConceptName}
              className="block max-w-[70vw] whitespace-normal break-words md:max-w-[30rem]"
            >
              {displayConceptName}
            </span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {detail?.last_fetched_at && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Clock className="h-3 w-3" />
              Analytics fetched: {new Date(detail.last_fetched_at).toLocaleString()}
            </span>
          )}
          {/*
          <select
            value={window}
            onChange={(e) => setWindow(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-foreground"
          >
            {WINDOWS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
          */}
          <button
            onClick={() => setShowRunDialog(true)}
            disabled={runMutation.isPending || waitingForWorker || conceptBusy}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            <Sparkles
              className={`h-3.5 w-3.5 ${runMutation.isPending ? "animate-pulse" : ""}`}
            />
            {conceptBusy || runMutation.isPending || waitingForWorker
              ? "Running..."
              : "Run Analysis"}
          </button>
        </div>
      </header>

      <RunStatusPanel
        run={runStatus.data?.run}
        concept={conceptState}
        waiting={waitingForWorker}
      />

      <ConceptPerformancePanel conceptName={conceptName} brand={brand} />

      <div className="mt-6 rounded-2xl border border-border bg-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Analyst Output</h3>
          {analyst && (
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${analystDecisionTone}`}
            >
              {analystDecision}
            </span>
          )}
        </div>
        {!analyst ? (
          <p className="mt-2 text-sm text-muted">
            No analyst payload available for this concept yet.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
            <KpiCard label="Classification" value={analystClassification} icon={Brain} />
            <KpiCard label="Learnings" value={String(analystLearnings)} icon={Sparkles} />
            <KpiCard label="Value Blocks" value={String(analystValueBlocks)} icon={Layers} />
            <KpiCard label="Decided" value={analyst.decided ? "Yes" : "No"} icon={Clock} />
          </div>
        )}
      </div>

      {analyst && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-panel p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-foreground">Learnings</h3>
            {analyst.learnings && analyst.learnings.length > 0 ? (
              <div className="mt-3 space-y-3">
                {analyst.learnings.map((learning, index) => {
                  const tests = normalizeNextTests(learning.next_tests);
                  return (
                    <article
                      key={`${analyst.run_id ?? "run"}-learning-${index}`}
                      className="rounded-xl border border-border/80 bg-surface p-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                        Learning {index + 1}
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {learning.verdict || "No verdict provided"}
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-muted">
                        {learning.why_it_worked && (
                          <p>Why it worked: {learning.why_it_worked}</p>
                        )}
                        {learning.weak_point && (
                          <p>Weak point: {learning.weak_point}</p>
                        )}
                        {learning.benchmark_comparison && (
                          <p>Benchmark: {learning.benchmark_comparison}</p>
                        )}
                        {learning.hypothesis_closure && (
                          <p>Hypothesis closure: {learning.hypothesis_closure}</p>
                        )}
                        {learning.feedback_loop && (
                          <p>Feedback loop: {learning.feedback_loop}</p>
                        )}
                      </div>
                      {tests.length > 0 && (
                        <div className="mt-2 rounded-lg border border-border/70 bg-panel px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">
                            Next tests
                          </p>
                          <div className="mt-1 space-y-1 text-xs text-muted">
                            {tests.map((test, testIndex) => (
                              <p key={`${index}-${testIndex}`}>• {test}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">No learning notes available.</p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-panel p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-foreground">Value Blocks</h3>
            {valueCards.length > 0 ? (
              <div className="mt-3 space-y-3">
                {valueCards.map((card, idx) => {
                  const entries = Object.entries(card);
                  return (
                    <article
                      key={`${analyst.run_id ?? "run"}-value-${idx}`}
                      className="rounded-xl border border-border/80 bg-surface p-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                        Card {idx + 1}
                      </p>
                      <div className="mt-2 space-y-1.5 text-sm">
                        {entries.length === 0 ? (
                          <p className="text-muted">No card details available.</p>
                        ) : (
                          entries.map(([key, value]) => (
                            <p key={key} className="text-muted">
                              <span className="font-medium text-foreground">
                                {formatFieldLabel(key)}:
                              </span>{" "}
                              {stringifyValue(value)}
                            </p>
                          ))
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">No value-block cards available.</p>
            )}
          </section>
        </div>
      )}

      {analyst && (
        <div className="mt-6 rounded-2xl border border-border bg-panel p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground">Stored Analyst Data</h3>
          <div className="mt-3 grid gap-2 rounded-xl border border-border/70 bg-surface p-3 text-sm text-muted md:grid-cols-2">
            <p>
              <span className="font-medium text-foreground">Run ID:</span>{" "}
              {analyst.run_id || "—"}
            </p>
            <p>
              <span className="font-medium text-foreground">Creative:</span>{" "}
              {analyst.creative_name || "—"}
            </p>
            <p>
              <span className="font-medium text-foreground">Decision:</span>{" "}
              {analyst.decided ? "Decided" : analyst.blocked_code || "Pending"}
            </p>
            <p>
              <span className="font-medium text-foreground">Matching Method:</span>{" "}
              {analyst.matching_method || "—"}
            </p>
            <p>
              <span className="font-medium text-foreground">Date Preset:</span>{" "}
              {analyst.date_preset || "—"}
            </p>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showRunDialog}
        title="Run analyst for this concept?"
        message={
          `This runs the full Analyst Agent pipeline for ${conceptName.toUpperCase()} ` +
          "on its LIFETIME totals across every ad whose name resolves to it. " +
          "It classifies the concept, diagnoses where it breaks, and writes " +
          "learnings and value blocks. Continue?"
        }
        onConfirm={handleRunConfirm}
        onCancel={() => setShowRunDialog(false)}
        loading={runMutation.isPending}
      />
    </div>
  );
}
