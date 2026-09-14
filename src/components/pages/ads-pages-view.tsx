"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { useAdsPages, usePageHealth } from "@/hooks/use-pages";
import {
  BRANDS, Badge, BrandTabs, CapacityBar, DEFAULT_PAGE_SIZE, DRIFT_LABELS,
  DriftBadge, Pagination, TimeAgo,
} from "./shared";
import { cn } from "@/lib/utils";

const PAGE_TYPE_LABELS: Record<string, string> = {
  editorial: "Editorial",
  first_person: "First person",
  brand: "Brand",
};

/**
 * Every Facebook page a brand can reach, usable or not.
 *
 * Deliberately not filtered to the usable ones by default. The blocked half
 * is the interesting half: it is where an operator finds out that a page is
 * restricted, that another lost write access, and that the page the uploader
 * has been posting from is not one Meta will keep accepting ads on.
 */
export function AdsPagesView() {
  const [brand, setBrand] = useState<string>(BRANDS[0].slug);
  const [search, setSearch] = useState("");
  const [drift, setDrift] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const params = useMemo(
    () => ({
      brand: brand || undefined,
      q: search.trim() || undefined,
      drift_state: drift || undefined,
      limit: pageSize,
      offset: page * pageSize,
    }),
    [brand, search, drift, page, pageSize],
  );

  const { data, isLoading, error } = useAdsPages(params);
  const { data: health } = usePageHealth(brand);
  const summary = health?.brands?.[0];

  const total = data?.total ?? 0;

  function change<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(0);
    };
  }

  /**
   * Changing brand clears the state filter.
   *
   * Every brand has a different set of states in play: Numy has restricted
   * pages and Holy has none, so "Restricted by Meta" carried across shows an
   * empty table for a brand that simply has no page in that state. The counts
   * in the dropdown belong to the new brand while the selection belonged to
   * the old one, which is the confusing part.
   */
  function changeBrand(next: string) {
    setBrand(next);
    setDrift("");
    setPage(0);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Facebook Pages</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        The Meta pages an ad posts from. Only the usable ones are offered in
        the upload picker; the rest are here with the reason they are held
        back.
      </p>

      {summary && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-surface px-4 py-3 text-xs">
          <span className="text-muted">
            <span className="tabular-nums font-semibold text-success">{summary.eligible}</span>
            {" of "}
            <span className="tabular-nums font-semibold text-foreground">{summary.known}</span>
            {" usable"}
          </span>
          <span className={cn("text-muted", summary.stale && "text-warning")}>
            Last checked <TimeAgo at={summary.last_refreshed_at} />
            {summary.stale && " — out of date"}
          </span>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3">
        <BrandTabs value={brand} onChange={changeBrand} />

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={search}
              onChange={(e) => change(setSearch)(e.target.value)}
              placeholder="Search by page name or ID"
              className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </label>

          <select
            value={drift}
            onChange={(e) => change(setDrift)(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            <option value="">Every state</option>
            {Object.entries(DRIFT_LABELS).map(([key, entry]) => (
              <option key={key} value={key}>
                {entry.label}
                {summary?.drift_states?.[key] ? ` (${summary.drift_states[key]})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="mt-6 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {(error as Error).message}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-faint">
              <th className="px-4 py-2.5 text-left font-semibold">Page</th>
              <th className="px-4 py-2.5 text-left font-semibold">Kind</th>
              <th className="px-4 py-2.5 text-left font-semibold">State</th>
              <th className="px-4 py-2.5 text-left font-semibold">Ads in use</th>
              <th className="px-4 py-2.5 text-left font-semibold">Why held back</th>
              <th className="px-4 py-2.5 text-left font-semibold">Checked</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            )}
            {!isLoading && (data?.items ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                  No pages yet for this brand. Run a refresh on the Page Health
                  screen to read them from Meta.
                </td>
              </tr>
            )}
            {(data?.items ?? []).map((row) => (
              <tr key={row.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{row.canonical_name}</span>
                    {row.page_url && (
                      <a
                        href={row.page_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-faint hover:text-accent"
                        title="Open on Facebook"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <span className="text-[10px] tabular-nums text-faint">{row.page_id}</span>
                </td>
                <td className="px-4 py-2.5">
                  {row.page_type && row.page_type !== "unknown" ? (
                    <Badge tone="muted" title={row.declared_page_type ?? undefined}>
                      {PAGE_TYPE_LABELS[row.page_type] ?? row.page_type}
                    </Badge>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <DriftBadge state={row.drift_state} />
                </td>
                <td className="px-4 py-2.5">
                  <CapacityBar used={row.ads_running_or_in_review} limit={row.page_limit} />
                </td>
                <td className="max-w-[280px] px-4 py-2.5">
                  {row.final_launch_eligible ? (
                    <span className="text-faint">—</span>
                  ) : (
                    <span
                      title={row.suppression_reason ?? undefined}
                      className="block truncate text-xs text-muted"
                    >
                      {row.suppression_reason || DRIFT_LABELS[row.drift_state]?.why || "Held back"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted">
                  <TimeAgo at={row.last_verified_at || row.last_refreshed_at} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
        label="pages"
      />
    </div>
  );
}
