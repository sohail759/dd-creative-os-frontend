"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, RefreshCw, Filter, Search } from "lucide-react";
import { CREATIVE_STATUSES } from "@/lib/api/types";
import {
  useProductCounts,
  useProducts,
} from "@/hooks/use-products";
import { useGenerateProduct } from "@/hooks/use-generate";
import { ProductCard } from "@/components/creatives/product-card";
import {
  StatusFilter,
  type StatusFilterValue,
} from "@/components/creatives/status-filter";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function CreativesPage() {
  const searchParams = useSearchParams();
  const currentBrand = searchParams.get("brand") ?? "numy";
  const currentPhase = searchParams.get("phase") ?? "";
  const currentSearch = searchParams.get("q") ?? "";

  const initialFilter = (() => {
    const status = searchParams.get("status");
    if (
      status &&
      (status === "all" || (CREATIVE_STATUSES as readonly string[]).includes(status))
    ) {
      return status as StatusFilterValue;
    }
    return "in_progress";
  })();

  const [filter, setFilter] = useState<StatusFilterValue>(initialFilter);
  const [phaseFilter, setPhaseFilter] = useState(currentPhase);
  const [searchFilter, setSearchFilter] = useState(currentSearch);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useProducts(
    searchFilter ? undefined : filter === "all" ? undefined : filter,
    currentBrand,
    searchFilter ? undefined : phaseFilter || undefined,
    searchFilter || undefined
  );
  const { data: counts } = useProductCounts(currentBrand, phaseFilter || undefined);
  const autoTrigger = useGenerateProduct();
  const triggeredRef = useRef<Set<string>>(new Set());

  function handleFilterChange(value: StatusFilterValue) {
    setFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("status", value);
    if (phaseFilter) params.set("phase", phaseFilter);
    window.history.replaceState(null, "", `/creatives?${params.toString()}`);
  }

  function handlePhaseChange(value: string) {
    setPhaseFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("phase", value);
    } else {
      params.delete("phase");
    }
    window.history.replaceState(null, "", `/creatives?${params.toString()}`);
  }

  function handleSearchChange(value: string) {
    setSearchFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    window.history.replaceState(null, "", `/creatives?${params.toString()}`);
  }

  // First 100 items of the current filter, most recently edited first.
  const items = useMemo(
    () => data?.pages.flat() ?? [],
    [data],
  );

  // Existing in-progress creatives without copy yet: the backend webhook may
  // already have started generation. Trigger it and poll for the result.
  useEffect(() => {
    const pending =
      items?.filter(
        (p) =>
          (p.parentItem?.length ?? 0) > 0 &&
          p.phase === "Write" &&
          p.status === "in_progress" &&
          (p.generationStatus ?? "idle") === "idle" &&
          p.headlines.length === 0 &&
          !triggeredRef.current.has(p.id),
      ) ?? [];
    for (const p of pending) {
      triggeredRef.current.add(p.id);
      autoTrigger.mutate({ id: p.id, showErrorToast: false });
    }
  }, [items, autoTrigger]);

  return (
    <div className="animate-fade-in-up">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <LayoutGrid className="h-5 w-5 text-accent" />
            Creatives
          </h1>
          <p className="mt-1 text-sm text-muted">
            Products and their generated ad copy — sequenced by most recently
            edited on Notion.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <StatusFilter value={filter} onChange={handleFilterChange} counts={counts} />

        {/* Search + phase filter */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3">
            <Search className="h-4 w-4 text-muted" />
            <input
              value={searchFilter}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search creatives…"
              className="w-40 bg-transparent text-sm text-foreground placeholder:text-faint focus:outline-none sm:w-52"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="text-faint transition-colors hover:text-muted"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </label>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted" />
            <select
              value={phaseFilter}
              onChange={(e) => handlePhaseChange(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground"
            >
              <option value="">All Phases</option>
              <option value="Testing">Testing</option>
              <option value="Active">Active</option>
              <option value="Launch">Launch</option>
              <option value="Editing">Editing</option>
              <option value="Iterate">Iterate</option>
              <option value="Write">Write</option>
              <option value="Archived">Archived</option>
              <option value="Upload">Upload</option>
              <option value="Filming">Filming</option>
              <option value="Not started">Not started</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={<RefreshCw className="h-6 w-6" />}
            title="Couldn't load creatives"
            description={(error as Error)?.message ?? "Please try again."}
            action={
              <button
                onClick={() => refetch()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-accent-hover"
              >
                Retry
              </button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<LayoutGrid className="h-6 w-6" />}
            title={
              searchFilter
                ? "No creatives match your search"
                : counts?.all === 0
                  ? "No creatives found"
                  : `No ${filter === "all" ? "creatives" : filter.replace("_", " ")} yet`
            }
            description={
              searchFilter
                ? 'Try a different search term or clear the search box.'
                : counts?.all === 0
                  ? "Connect the backend or switch the filter to see your products."
                  : "Try a different status filter."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {items.map((p) => (
              <ProductCard key={p.id} creative={p} statusParam={filter} />
            ))}
          </div>
        )}
      </div>

      {hasNextPage && !isError && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-6 py-2.5 text-sm font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-60"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
