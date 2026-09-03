"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, RefreshCw, Search, Table2 } from "lucide-react";
import { CREATIVE_PHASES } from "@/lib/api/types";
import {
  useProducts,
} from "@/hooks/use-products";
import { useGenerateProduct } from "@/hooks/use-generate";
import { BatchCard } from "@/components/creatives/batch-card";
import { BatchTable } from "@/components/creatives/batch-table";
import {
  PhaseFilter,
  type PhaseFilterValue,
} from "@/components/creatives/phase-filter";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function CreativesPage() {
  const searchParams = useSearchParams();
  const currentBrand = searchParams.get("brand") ?? "numy";
  const currentPhase = searchParams.get("phase") ?? "";
  const currentSearch = searchParams.get("q") ?? "";

  const initialPhase = (CREATIVE_PHASES as readonly string[]).includes(currentPhase)
    ? (currentPhase as PhaseFilterValue)
    : "Write";

  const [phaseFilter, setPhaseFilter] = useState<PhaseFilterValue>(initialPhase);
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [searchFilter, setSearchFilter] = useState(currentSearch);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

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
    undefined,
    currentBrand,
    phaseFilter === "all" ? undefined : phaseFilter,
    searchFilter || undefined
  );
  const autoTrigger = useGenerateProduct();
  const triggeredRef = useRef<Set<string>>(new Set());

  function handlePhaseChange(value: PhaseFilterValue) {
    setPhaseFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "all") {
      params.set("phase", value);
    } else {
      params.delete("phase");
    }
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/creatives?${query}` : "/creatives");
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const value = searchInput.trim();
      setSearchFilter(value);

      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("q", value);
      } else {
        params.delete("q");
      }
      const query = params.toString();
      window.history.replaceState(null, "", query ? `/creatives?${query}` : "/creatives");
    }, 300);

    return () => window.clearTimeout(handle);
  }, [searchInput, searchParams]);

  // First 100 items of the current filter, most recently edited first.
  const items = useMemo(() => data?.pages.flat() ?? [], [data]);

  // The batch UI renders top-level batches only (no Parent item relation).
  // Concepts live inline inside each BatchCard.
  const batches = useMemo(
    () => items.filter((p) => (p.parentItem?.length ?? 0) === 0),
    [items],
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
          className="inline-flex items-center gap-2 self-start rounded-lg border border-accent/40 bg-accent-dim px-3 py-2 text-sm font-medium text-accent transition-colors hover:border-accent hover:bg-accent hover:text-black disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <PhaseFilter value={phaseFilter} onChange={handlePhaseChange} />

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 items-center gap-2 rounded-lg border border-accent/40 bg-surface px-3">
            <Search className="h-4 w-4 text-muted" />
            <input
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search creatives…"
              className="w-40 bg-transparent text-sm text-foreground placeholder:text-faint focus:outline-none sm:w-52"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchFilter("");
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("q");
                  const query = params.toString();
                  window.history.replaceState(null, "", query ? `/creatives?${query}` : "/creatives");
                }}
                className="text-faint transition-colors hover:text-muted"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </label>
          <div className="flex items-center rounded-lg border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              title="Grid view"
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "grid"
                  ? "bg-accent-dim text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-label="Table view"
              aria-pressed={viewMode === "table"}
              title="Table view"
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "table"
                  ? "bg-accent-dim text-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Table2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className={`grid grid-cols-1 gap-4 ${viewMode === "grid" ? "lg:grid-cols-2" : ""}`}>
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
        ) : items.length === 0 || batches.length === 0 ? (
          <EmptyState
            icon={<LayoutGrid className="h-6 w-6" />}
            title={
              batches.length === 0 && items.length > 0
                ? "No batches found"
                : searchFilter
                  ? "No batches match your search"
                  : `No ${phaseFilter === "all" ? "batches" : phaseFilter} creatives yet`
            }
            description={
              searchFilter
                ? 'Try a different search term or clear the search box.'
                : "Try a different phase filter."
            }
          />
        ) : (
          viewMode === "table" ? (
            <BatchTable batches={batches} />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {batches.map((p) => (
                <BatchCard key={p.id} id={p.id} />
              ))}
            </div>
          )
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
