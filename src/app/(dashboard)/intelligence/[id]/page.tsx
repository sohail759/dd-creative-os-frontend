"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Brain,
  ChevronLeft,
  DollarSign,
  Eye,
  MousePointerClick,
  ShoppingCart,
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
  useIntelligenceConcept,
  useRunIntelligenceConcept,
} from "@/hooks/use-intelligence";
import type {
  ConceptDetail,
  AnalyticsKpis,
  AnalystPayload,
  IntelligenceAd,
  ConceptRunResult,
} from "@/lib/api/types";

const WINDOWS = [
  { value: "last_7d", label: "Last 7 days" },
  { value: "last_14d", label: "Last 14 days" },
  { value: "last_30d", label: "Last 30 days" },
  { value: "last_90d", label: "Last 90 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
];

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

function KpiCards({ kpis }: { kpis: AnalyticsKpis }) {
  const money = (n: number) =>
    n > 0
      ? `$${n.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : "—";
  const num = (n: number) => (n > 0 ? n.toLocaleString() : "—");
  const pct = (n: number) => (n > 0 ? `${n.toFixed(2)}%` : "—");
  const items = [
    { label: "Spend", value: money(kpis.spend), icon: DollarSign },
    { label: "Impressions", value: num(kpis.impressions), icon: Eye },
    { label: "Clicks", value: num(kpis.clicks), icon: MousePointerClick },
    { label: "Purchases", value: num(kpis.purchases), icon: ShoppingCart },
    { label: "CTR", value: pct(kpis.ctr), icon: MousePointerClick },
    { label: "ROAS", value: kpis.roas > 0 ? kpis.roas.toFixed(2) : "—", icon: DollarSign },
  ];
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((k) => (
        <KpiCard key={k.label} label={k.label} value={k.value} icon={k.icon} />
      ))}
    </section>
  );
}

function statusColor(s: string) {
  if (s === "ACTIVE") return "text-emerald-400";
  if (s === "PAUSED") return "text-yellow-400";
  return "text-muted";
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

function RunResultPanel({
  result,
  error,
}: {
  result?: ConceptRunResult | null;
  error?: Error | null;
}) {
  if (result && result.ok) return null;

  const hardStops = result?.hard_stops ?? [];
  const failedChecks = (result?.audit?.checks ?? []).filter((c) => !c.ok);

  return (
    <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-300">
            {result?.gated
              ? "Analyst disabled for this concept"
              : result
                ? "Analysis did not complete — validation issues"
                : "Analysis failed"}
          </p>

          {(error || (result && !result.ok)) && (
            <p className="mt-1.5 whitespace-pre-line text-sm text-amber-200/90">
              {result?.gate_message || result?.message || error?.message}
            </p>
          )}

          {hardStops.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-400/80">
                Hard stops
              </p>
              <ul className="mt-1 space-y-1">
                {hardStops.map((stop, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-amber-200/90">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                    {stop}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {failedChecks.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-400/80">
                Failed audit checks
              </p>
              <ul className="mt-1 space-y-1">
                {failedChecks.map((check) => (
                  <li key={check.key} className="flex items-start gap-2 text-sm text-amber-200/90">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                    <span>
                      <span className="font-medium">{check.label}</span>
                      {check.detail ? ` — ${check.detail}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result?.audit?.passed === false && result?.audit?.checks?.length > 0 && failedChecks.length === 0 && (
            <div className="mt-3 rounded-lg border border-amber-500/20 bg-black/10 p-3">
              <p className="flex items-center gap-2 text-sm text-amber-200/90">
                <CheckCircle2 className="h-4 w-4 text-amber-300" />
                Audit ran but the analysis was still flagged. Review the message above.
              </p>
            </div>
          )}
        </div>
      </div>
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
  const [window, setWindow] = useState("last_30d");
  const [offset, setOffset] = useState(0);
  const [showRunDialog, setShowRunDialog] = useState(false);

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
    runMutation.mutate(
      { conceptName, brand, datePreset: window },
      {
        onSuccess: () => setShowRunDialog(false),
      },
    );
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
  const filteredOutCount = Math.max(0, rawAds.length - ads.length);
  const analystByAd = detail?.analyst_by_ad ?? {};
  const total = ads.length;
  const limit = detail?.limit ?? 200;
  const hasMore = detail?.has_more ?? false;
  const kpis = (detail?.kpis ?? {}) as AnalyticsKpis;
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
            href={`/intelligence?brand=${brand}`}
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
            disabled={runMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            <Sparkles
              className={`h-3.5 w-3.5 ${runMutation.isPending ? "animate-pulse" : ""}`}
            />
            {runMutation.isPending ? "Running..." : "Run Analytics"}
          </button>
        </div>
      </header>

      {!runMutation.isPending && (runMutation.data || runMutation.error) && (
        <RunResultPanel result={runMutation.data} error={runMutation.error} />
      )}

      <div className="mt-6">
        <KpiCards kpis={kpis} />
      </div>

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

      <div className="mt-6 rounded-2xl border border-border bg-panel">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Layers className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">
            Ads in this concept
          </h3>
          <span className="ml-auto text-xs text-muted">{total}</span>
        </div>
        {filteredOutCount > 0 && (
          <p className="border-b border-border/50 px-4 py-2 text-[11px] text-faint">
            Filtered {filteredOutCount} duplicate/placeholder ad
            {filteredOutCount === 1 ? "" : "s"}.
          </p>
        )}
        {ads.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            No ads match this concept yet. Run analytics to pull fresh data.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-faint">
                  <th className="p-2 pl-4 pr-4">Ad</th>
                  <th className="p-2 pr-4">Status</th>
                  <th className="p-2 pr-4">Campaign</th>
                  <th className="p-2 pr-4">Ad Set</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => (
                  <tr
                    key={ad.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2.5 pl-4 pr-4 font-medium text-foreground">
                      {ad.name}
                    </td>
                    <td
                      className={`py-2.5 pr-4 font-medium ${statusColor(ad.status)}`}
                    >
                      {ad.status}
                    </td>
                    <td className="py-2.5 pr-4 text-muted">
                      {ad.campaign_name || ad.campaign_id || "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-muted max-w-[200px] truncate">
                      {ad.adset_id || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hasMore && (
          <div className="flex items-center justify-end border-t border-border/50 px-4 py-3">
            <button
              onClick={() => setOffset(offset + limit)}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground"
            >
              Load more
            </button>
          </div>
        )}
      </div>

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
          "This runs the full Analyst Agent pipeline for " +
          `${conceptName.toUpperCase()} over "${(
            WINDOWS.find((w) => w.value === window)?.label ?? window
          ).toLowerCase()}". It pulls Meta metrics, classifies each ad, and ` +
            "writes value blocks and learnings to Notion. Continue?"
        }
        onConfirm={handleRunConfirm}
        onCancel={() => setShowRunDialog(false)}
        loading={runMutation.isPending}
      />
    </div>
  );
}
