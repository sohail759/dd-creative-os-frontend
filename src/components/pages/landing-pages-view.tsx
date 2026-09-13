"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { useLandingPageFilters, useLandingPages } from "@/hooks/use-pages";
import { BrandTabs, DEFAULT_PAGE_SIZE, Pagination } from "./shared";
import { cn } from "@/lib/utils";

/**
 * The landing pages an ad points at.
 *
 * These were only ever visible through a concept that referenced one, so
 * questions like "which landers does Holy have" and "what is at this URL"
 * had no answer short of opening Notion. Search covers the name and the URL,
 * because the URL is often what someone has in hand: they have a link out of
 * Meta and want to know which lander it is.
 */
export function LandingPagesView() {
  const [brand, setBrand] = useState("");
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("");
  const [angle, setAngle] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const params = useMemo(
    () => ({
      brand: brand || undefined,
      q: search.trim() || undefined,
      language: language || undefined,
      angle: angle || undefined,
      limit: pageSize,
      offset: page * pageSize,
    }),
    [brand, search, language, angle, page, pageSize],
  );

  const { data, isLoading, error } = useLandingPages(params);
  const { data: filters } = useLandingPageFilters(brand || undefined);

  const total = data?.total ?? 0;

  /** Any filter change puts you back on the first page of the new result. */
  function change<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(0);
    };
  }

  /**
   * Changing brand clears the filters that belong to the old one.
   *
   * Angle and language are a brand's own vocabulary: "Stress relief" is a
   * Numy angle and Holy has nothing like it. Carrying the selection across
   * asked for Holy landers with a Numy angle, which matches nothing — so the
   * screen went empty and stayed empty, and the only way out was to go back,
   * clear it, and return. Both dropdowns had also already reloaded with the
   * new brand's values, so the filter doing the damage was not even visible
   * in them.
   */
  function changeBrand(next: string) {
    setBrand(next);
    setLanguage("");
    setAngle("");
    setPage(0);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Landing Pages</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Where an ad sends people. Mirrored from each brand&apos;s Notion
        Landers table, and the source of the destination URL every upload uses.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <BrandTabs value={brand} onChange={changeBrand} allowAll />

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={search}
              onChange={(e) => change(setSearch)(e.target.value)}
              placeholder="Search by name or URL"
              className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </label>

          <select
            value={language}
            onChange={(e) => change(setLanguage)(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            <option value="">All languages</option>
            {(filters?.languages ?? []).map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <select
            value={angle}
            onChange={(e) => change(setAngle)(e.target.value)}
            className="max-w-[220px] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            <option value="">All angles</option>
            {(filters?.angles ?? []).map((a) => (
              <option key={a} value={a}>{a}</option>
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
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-faint">
              <th className="px-4 py-2.5 text-left font-semibold">Name</th>
              <th className="px-4 py-2.5 text-left font-semibold">Brand</th>
              <th className="px-4 py-2.5 text-left font-semibold">Language</th>
              <th className="px-4 py-2.5 text-left font-semibold">Angle</th>
              <th className="px-4 py-2.5 text-left font-semibold">Destination URL</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            )}
            {!isLoading && (data?.items ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                  No landing pages match these filters.
                </td>
              </tr>
            )}
            {(data?.items ?? []).map((row) => (
              <tr key={row.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2.5 font-medium text-foreground">
                  {row.notion_url ? (
                    <a
                      href={row.notion_url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-accent"
                    >
                      {row.name}
                    </a>
                  ) : (
                    row.name
                  )}
                </td>
                <td className="px-4 py-2.5 text-muted">{row.brand}</td>
                <td className="px-4 py-2.5 text-muted">{row.language || "—"}</td>
                <td className="px-4 py-2.5 text-muted">{row.angle || "—"}</td>
                <td className="max-w-[380px] px-4 py-2.5">
                  {row.url ? (
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                      title={row.url}
                      className="flex items-center gap-1.5 truncate text-accent hover:underline"
                    >
                      <span className="truncate">{row.url}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-faint">No URL</span>
                  )}
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
        label="landing pages"
      />
    </div>
  );
}
