"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Search } from "lucide-react";
import { useCampaignAdsTable, useCampaignsTable } from "@/hooks/use-analytics-insights";
import type { Window } from "@/lib/api/analytics-insights";
import { Badge, DEFAULT_PAGE_SIZE, Pagination } from "@/components/pages/shared";
import { AdKpiRow, SortHeader, StatusBadge } from "./table-bits";
import { cn } from "@/lib/utils";

/**
 * Campaigns, ranked by spend by default, expanding to the ads inside one on
 * click — the same expand-in-place pattern the Campaigns & Ad Sets screen
 * uses, so a click never navigates away from the table it came from.
 */
export function CampaignsTable({ brand, window }: { brand: string; window: Window }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("spend");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, error } = useCampaignsTable({
    brand, window, q: search.trim() || undefined, status: status || undefined,
    sort, limit: pageSize, offset: page * pageSize,
  });
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;

  function changeSort(key: string) {
    setSort(key);
    setPage(0);
  }

  return (
    <div className="rounded-2xl border border-border bg-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Campaigns</h2>
        <div className="flex items-center gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search campaigns"
              className="w-48 rounded-lg border border-border bg-surface py-1.5 pl-8 pr-2.5 text-xs text-foreground placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
          >
            <option value="">Any status</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
          {(error as Error).message}
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-faint">
              <th className="w-6 pb-2 pr-1" />
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4 text-right">Ads</th>
              <SortHeader label="Spend" sortKey="spend" current={sort} onSort={changeSort} align="right" />
              <SortHeader label="Revenue" sortKey="revenue" current={sort} onSort={changeSort} align="right" />
              <SortHeader label="ROAS" sortKey="roas" current={sort} onSort={changeSort} align="right" />
              <SortHeader label="CTR" sortKey="ctr" current={sort} onSort={changeSort} align="right" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted" /></td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={8} className="py-10 text-center text-sm text-muted">No campaigns in this window.</td></tr>
            )}
            {rows.map((c) => {
              const isExpanded = expanded === c.campaign_id;
              return (
                <Fragment key={c.campaign_id}>
                  <tr
                    className="cursor-pointer select-none border-b border-border/50 last:border-0 hover:bg-white/[0.02]"
                    onClick={() => setExpanded(isExpanded ? null : c.campaign_id)}
                  >
                    <td className="py-2.5 pr-1 text-muted">
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </td>
                    <td className="max-w-[280px] truncate py-2.5 pr-4 text-foreground">{c.name}</td>
                    <td className="py-2.5 pr-4"><StatusBadge status={c.status} /></td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-muted">{c.ad_count}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-foreground">${Math.round(c.kpis.spend).toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-muted">${Math.round(c.kpis.revenue).toLocaleString()}</td>
                    <td className={cn("py-2.5 pr-4 text-right tabular-nums", c.kpis.roas >= 2 ? "text-success" : "text-muted")}>
                      {c.kpis.roas > 0 ? `${c.kpis.roas.toFixed(2)}x` : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-muted">{c.kpis.ctr > 0 ? `${c.kpis.ctr.toFixed(2)}%` : "—"}</td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-border/50 bg-black/10 last:border-0">
                      <td colSpan={8} className="p-0">
                        <CampaignAdsPanel brand={brand} campaignId={c.campaign_id} window={window} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page} pageSize={pageSize} total={total}
        onPageChange={(next) => { setPage(next); setExpanded(null); }}
        onPageSizeChange={(size) => { setPageSize(size); setPage(0); setExpanded(null); }}
        label="campaigns"
      />
    </div>
  );
}

function CampaignAdsPanel({ brand, campaignId, window }: { brand: string; campaignId: string; window: Window }) {
  const { data, isLoading } = useCampaignAdsTable({ brand, campaignId, window, limit: 100 });
  const ads = data?.items ?? [];

  if (isLoading) {
    return <div className="px-8 py-4"><Loader2 className="h-4 w-4 animate-spin text-muted" /></div>;
  }
  if (ads.length === 0) {
    return <p className="px-8 py-4 text-xs text-muted">No ads with activity in this window.</p>;
  }
  return (
    <div className="flex flex-col gap-2 px-8 py-4">
      {ads.map((ad) => (
        <div key={ad.ad_id} className="rounded-xl border border-border/60 bg-panel p-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="max-w-[320px] truncate text-sm font-medium text-foreground">{ad.name}</span>
            <StatusBadge status={ad.status} />
          </div>
          <AdKpiRow kpis={ad.kpis} />
        </div>
      ))}
    </div>
  );
}
