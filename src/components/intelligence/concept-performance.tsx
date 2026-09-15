"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, ChevronRight, Loader2, TrendingUp } from "lucide-react";

import { Badge, type Tone } from "@/components/pages/shared";
import { TrendChart } from "@/components/analytics/trend-chart";
import type { TrendPoint } from "@/lib/api/analytics-insights";
import {
  getConceptPerformance,
  type ConceptAd,
  type PerfMetrics,
} from "@/lib/api/concept-performance";

const money = (n: number) =>
  n > 0 ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
const count = (n: number) => (n > 0 ? n.toLocaleString() : "—");
const pct = (fraction: number) => (fraction > 0 ? `${(fraction * 100).toFixed(2)}%` : "—");
const ratio = (n: number) => (n > 0 ? n.toFixed(2) : "—");

/** CPP carries a sentinel for "no purchases", which must not render as $999. */
const cpp = (value: number, purchases: number) =>
  purchases > 0 ? money(value) : "no purchases";

function statusTone(status: string): Tone {
  const s = status.toUpperCase();
  if (s === "ACTIVE") return "good";
  if (s === "PAUSED") return "warn";
  return "muted";
}

/**
 * Lifetime beside recent, for one figure.
 *
 * Both are shown because they answer different questions and a single number
 * cannot serve both: a concept that spent everything eight months ago and one
 * spending steadily have the same lifetime total.
 */
function Figure({
  label,
  lifetime,
  recent,
  windowDays,
}: {
  label: string;
  lifetime: string;
  recent?: string;
  windowDays: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-panel p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-1.5 text-xl font-bold tabular-nums text-foreground">{lifetime}</p>
      {recent !== undefined && (
        <p className="mt-0.5 text-xs tabular-nums text-muted">
          {recent} <span className="text-faint">in {windowDays}d</span>
        </p>
      )}
    </div>
  );
}

function AdRow({ ad, windowDays }: { ad: ConceptAd; windowDays: number }) {
  const [open, setOpen] = useState(false);
  const l = ad.lifetime;
  const w = ad.window;
  return (
    <>
      <tr className="border-b border-border/50 last:border-0">
        <td className="py-2.5 pl-4 pr-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-start gap-1.5 text-left"
          >
            {open ? (
              <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
            ) : (
              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
            )}
            <span className="text-foreground">{ad.ad_name || ad.ad_id}</span>
          </button>
        </td>
        <td className="py-2.5 pr-3">
          <Badge tone={statusTone(ad.status)}>{ad.status || "—"}</Badge>
        </td>
        <td className="py-2.5 pr-3 text-right tabular-nums text-foreground">{money(l.spend)}</td>
        <td className="py-2.5 pr-3 text-right tabular-nums text-muted">{money(w.spend)}</td>
        <td className="py-2.5 pr-3 text-right tabular-nums text-muted">{count(l.purchases)}</td>
        <td className="py-2.5 pr-4 text-right tabular-nums text-muted">
          {cpp(l.cpp, l.purchases)}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-border/50 bg-surface/40 last:border-0">
          <td colSpan={6} className="px-4 py-3">
            <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Impressions", count(l.impressions), count(w.impressions)],
                ["Clicks", count(l.clicks), count(w.clicks)],
                ["CTR", pct(l.ctr), pct(w.ctr)],
                ["ROAS", ratio(l.roas), ratio(w.roas)],
                ["Hook rate", pct(l.hook_rate), pct(w.hook_rate)],
                ["Hold rate", pct(l.hold_rate), pct(w.hold_rate)],
              ].map(([label, life, recent]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <span className="text-xs text-muted">{label}</span>
                  <span className="text-xs tabular-nums text-foreground">
                    {life}
                    <span className="ml-2 text-faint">{recent} / {windowDays}d</span>
                  </span>
                </div>
              ))}
              {ad.campaign_name && (
                <div className="flex items-baseline justify-between gap-3 sm:col-span-2 lg:col-span-3">
                  <span className="text-xs text-muted">Campaign</span>
                  <span className="truncate text-xs text-foreground">{ad.campaign_name}</span>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * The concept's own Meta performance, lifetime first.
 *
 * Lifetime leads because that is what the Analyst classifies on: its
 * thresholds are lifetime-scale, so a verdict drawn from a 30-day window
 * would be measured against a bar ten times too high.
 */
export function ConceptPerformancePanel({
  conceptName,
  brand,
}: {
  conceptName: string;
  brand: string;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["concept-performance", conceptName, brand],
    queryFn: () => getConceptPerformance(conceptName, brand),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(conceptName),
  });

  // The shared chart draws spend against revenue; this concept's rows call
  // that `conversion_value`.
  const trend: TrendPoint[] = useMemo(
    () =>
      (data?.trend ?? []).map((p) => ({
        date: p.date,
        spend: p.spend,
        revenue: p.conversion_value,
        impressions: p.impressions,
        reach: 0,
        clicks: p.clicks,
        inline_link_clicks: 0,
        purchases: p.purchases,
        initiated_checkouts: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        roas: 0,
        cost_per_purchase: 0,
        frequency: 0,
      })) as TrendPoint[],
    [data?.trend],
  );

  if (isLoading) {
    return (
      <section className="mt-6 flex items-center justify-center rounded-2xl border border-border bg-panel py-12">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <span className="ml-2 text-sm text-muted">Loading performance…</span>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-6 flex items-center gap-2 rounded-2xl border border-danger/30 bg-danger/10 p-4">
        <AlertTriangle className="h-4 w-4 text-danger" />
        <p className="text-sm text-danger">{(error as Error).message}</p>
      </section>
    );
  }

  if (!data || data.ad_count === 0) {
    return (
      <section className="mt-6 rounded-2xl border border-dashed border-border bg-panel px-4 py-10 text-center">
        <p className="text-sm text-muted">
          No Meta ads resolve to this concept yet, so there is nothing to total.
        </p>
      </section>
    );
  }

  const l: PerfMetrics = data.lifetime;
  const w: PerfMetrics = data.last_month;
  const days = data.window_days;

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-foreground">Meta Performance</h2>
        <p className="text-xs text-muted">
          Lifetime across {data.ad_count} ad{data.ad_count === 1 ? "" : "s"}, with the
          last {days} days beside it. This is the same set of ads the Analyst
          classifies on.
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Figure label="Total spend" lifetime={money(l.spend)} recent={money(w.spend)} windowDays={days} />
        <Figure label="Purchases" lifetime={count(l.purchases)} recent={count(w.purchases)} windowDays={days} />
        <Figure label="CPP" lifetime={cpp(l.cpp, l.purchases)} recent={cpp(w.cpp, w.purchases)} windowDays={days} />
        <Figure label="ROAS" lifetime={ratio(l.roas)} recent={ratio(w.roas)} windowDays={days} />
        <Figure label="CTR" lifetime={pct(l.ctr)} recent={pct(w.ctr)} windowDays={days} />
        <Figure label="Hook rate" lifetime={pct(l.hook_rate)} recent={pct(w.hook_rate)} windowDays={days} />
      </div>

      {trend.length > 0 && (
        <div className="mt-4 rounded-2xl border border-border bg-panel p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <TrendingUp className="h-4 w-4 text-accent" />
              Spend &amp; Revenue
            </h3>
            <span className="text-xs text-faint">
              {trend.length} day{trend.length === 1 ? "" : "s"} of daily detail
            </span>
          </div>
          <div className="mt-3">
            <TrendChart trend={trend} />
          </div>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-border bg-panel">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Ads in this concept</h3>
          <span className="ml-auto text-xs text-muted">{data.ads.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-faint">
                <th className="p-2 pl-4 pr-3">Ad</th>
                <th className="p-2 pr-3">Status</th>
                <th className="p-2 pr-3 text-right">Spend</th>
                <th className="p-2 pr-3 text-right">Last {days}d</th>
                <th className="p-2 pr-3 text-right">Purchases</th>
                <th className="p-2 pr-4 text-right">CPP</th>
              </tr>
            </thead>
            <tbody>
              {data.ads.map((ad) => (
                <AdRow key={ad.ad_id} ad={ad} windowDays={days} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border/50 px-4 py-2 text-[11px] text-faint">
          Spend and CPP are lifetime. Open a row for its impressions, CTR, ROAS
          and video rates, each shown lifetime then over the last {days} days.
        </p>
      </div>
    </section>
  );
}
