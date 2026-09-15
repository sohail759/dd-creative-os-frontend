"use client";

import { Fragment, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useAdsTable } from "@/hooks/use-analytics-insights";
import type { Window } from "@/lib/api/analytics-insights";
import { DEFAULT_PAGE_SIZE, Pagination } from "@/components/pages/shared";
import { SortHeader, StatusBadge } from "./table-bits";
import { AdDetailPanel } from "./ad-detail-panel";
import { cn } from "@/lib/utils";

/**
 * Every ad in the brand, ranked by spend by default. A row expands to the
 * ad's ledger history rather than navigating away — the table is the
 * working surface, not a launchpad to somewhere else.
 */
export function AdsTable({ brand, window }: { brand: string; window: Window }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("spend");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, error } = useAdsTable({
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
        <h2 className="text-sm font-semibold text-foreground">Ads</h2>
        <div className="flex items-center gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search ads"
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
            <option value="DISAPPROVED">Disapproved</option>
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
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Campaign</th>
              <SortHeader label="Spend" sortKey="spend" current={sort} onSort={changeSort} align="right" />
              <SortHeader label="Revenue" sortKey="revenue" current={sort} onSort={changeSort} align="right" />
              <SortHeader label="ROAS" sortKey="roas" current={sort} onSort={changeSort} align="right" />
              <SortHeader label="CTR" sortKey="ctr" current={sort} onSort={changeSort} align="right" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted" /></td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-sm text-muted">No ads in this window.</td></tr>
            )}
            {rows.map((ad) => {
              const isExpanded = expanded === ad.ad_id;
              return (
                <Fragment key={ad.ad_id}>
                  <tr
                    className="cursor-pointer select-none border-b border-border/50 last:border-0 hover:bg-white/[0.02]"
                    onClick={() => setExpanded(isExpanded ? null : ad.ad_id)}
                  >
                    <td className="max-w-[320px] truncate py-2.5 pr-4 text-foreground">{ad.name}</td>
                    <td className="py-2.5 pr-4"><StatusBadge status={ad.status} /></td>
                    <td className="max-w-[220px] truncate py-2.5 pr-4 text-muted">{ad.campaign_name || "—"}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-foreground">${Math.round(ad.kpis.spend).toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-muted">${Math.round(ad.kpis.revenue).toLocaleString()}</td>
                    <td className={cn("py-2.5 pr-4 text-right tabular-nums", ad.kpis.roas >= 2 ? "text-success" : "text-muted")}>
                      {ad.kpis.roas > 0 ? `${ad.kpis.roas.toFixed(2)}x` : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-muted">{ad.kpis.ctr > 0 ? `${ad.kpis.ctr.toFixed(2)}%` : "—"}</td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-border/50 bg-black/10 last:border-0">
                      <td colSpan={7} className="p-0">
                        <AdDetailPanel brand={brand} adId={ad.ad_id} />
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
        label="ads"
      />
    </div>
  );
}
