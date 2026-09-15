"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { BarChart3, AlertTriangle, Loader2 } from "lucide-react";
import { useOverview } from "@/hooks/use-analytics-insights";
import type { Window } from "@/lib/api/analytics-insights";
import { BrandTabs } from "@/components/pages/shared";
import { KpiRow } from "@/components/analytics/kpi-row";
import { TrendChart } from "@/components/analytics/trend-chart";
import { SyncBar } from "@/components/analytics/sync-bar";
import { WindowTabs } from "@/components/analytics/window-tabs";
import { CampaignsTable } from "@/components/analytics/campaigns-table";
import { AdsTable } from "@/components/analytics/ads-table";

const WINDOW_VALUES: Window[] = ["7d", "14d", "30d", "90d", "lifetime"];

function isWindow(value: string | null): value is Window {
  return WINDOW_VALUES.includes(value as Window);
}

export function BrandsAnalyticsPageView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const brand = searchParams.get("brand") ?? "numy";
  const windowParam = searchParams.get("window");
  const window: Window = isWindow(windowParam) ? windowParam : "30d";

  const { data, isLoading, error } = useOverview(brand, window);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="animate-fade-in-up">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <BarChart3 className="h-5 w-5 text-accent" />
            Brands Analytics
          </h1>
          <p className="mt-1 text-sm text-muted">
            Meta Ads performance for <span className="font-medium text-foreground">{brand}</span>,
            read from the database — nothing here calls Meta directly.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <BrandTabs value={brand} onChange={(slug) => setParam("brand", slug)} />
          <WindowTabs value={window} onChange={(w) => setParam("window", w)} />
        </div>
      </header>

      <div className="mt-4">
        <SyncBar brand={brand} />
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-danger/30 bg-danger/10 p-4">
          <AlertTriangle className="h-4 w-4 text-danger" />
          <p className="text-sm text-danger">{(error as Error).message}</p>
        </div>
      )}

      {isLoading && !data ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="mt-3 text-sm text-muted">Loading analytics…</p>
        </div>
      ) : (
        <>
          {data && data.ad_count === 0 && (
            <div className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 p-4">
              <p className="text-sm text-warning">
                No data for {brand} in this window yet. Use &quot;Refresh from Meta&quot; above,
                or try a wider window — the daily fetch only covers a rolling period.
              </p>
            </div>
          )}

          <section className="mt-4">
            <KpiRow kpis={data?.kpis ?? EMPTY_KPIS} />
          </section>

          {window !== "lifetime" && (
            <section className="mt-4 rounded-2xl border border-border bg-panel p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Spend &amp; Revenue</h2>
                {data && (
                  <span className="text-xs text-faint">
                    {data.days_available} of {WINDOW_LABEL[window]} days fetched
                  </span>
                )}
              </div>
              <div className="mt-3">
                <TrendChart trend={data?.trend ?? []} />
              </div>
            </section>
          )}

          <section className="mt-4">
            <CampaignsTable brand={brand} window={window} />
          </section>

          <section className="mt-4">
            <AdsTable brand={brand} window={window} />
          </section>
        </>
      )}
    </div>
  );
}

const WINDOW_LABEL: Record<Window, number> = { "7d": 7, "14d": 14, "30d": 30, "90d": 90, lifetime: 0 };

const EMPTY_KPIS = {
  spend: 0, impressions: 0, reach: 0, clicks: 0, inline_link_clicks: 0,
  purchases: 0, initiated_checkouts: 0, revenue: 0, ctr: 0, cpc: 0, cpm: 0,
  roas: 0, cost_per_purchase: 0, frequency: 0,
};
