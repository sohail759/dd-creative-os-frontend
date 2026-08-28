"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Brain, Loader2, AlertTriangle, Search, Layers } from "lucide-react";

import { useIntelligenceConcepts } from "@/hooks/use-intelligence";
import type { ConceptGroup } from "@/lib/api/types";

function fmt(n: number | undefined | null) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function money(n: number | undefined | null) {
  if (n == null || Number.isNaN(n)) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatConceptName(name: string) {
  const cleaned = name.replace(/^\.+\s*/, "").trim();
  return cleaned
    .split(/([\s-]+)/)
    .map((part) =>
      /[\s-]+/.test(part)
        ? part
        : part.length > 0
          ? part[0].toUpperCase() + part.slice(1)
          : part,
    )
    .join("");
}

export default function IntelligencePage() {
  const searchParams = useSearchParams();
  const brand = searchParams.get("brand") ?? "numy";
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const { data, isLoading, isFetching, error } = useIntelligenceConcepts(
    brand,
    query || undefined,
    24,
    offset,
  );

  function applySearch(value = search) {
    setOffset(0);
    setQuery(value.trim());
  }

  function setBrand(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("brand", slug);
    setOffset(0);
    setQuery("");
    setSearch("");
    window.history.pushState(null, "", `?${params.toString()}`);
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="mt-3 text-sm text-red-400">{error.message}</p>
      </div>
    );
  }

  const concepts: ConceptGroup[] = data?.concepts ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 24;
  const hasMore = data?.has_more ?? false;

  return (
    <div className="animate-fade-in-up">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Brain className="h-5 w-5 text-accent" />
            Intelligence
          </h1>
          <p className="mt-1 text-sm text-muted">
            Rate cards for{" "}
            <span className="font-medium text-foreground">{brand}</span>,
            grouped by concept. Variants like{" "}
            <span className="font-mono text-[11px]">B321 C1 - ENG</span> and{" "}
            <span className="font-mono text-[11px]">B321 C1 - v2</span> are
            combined into one concept.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border bg-panel p-0.5">
            {["numy", "holy-mouthwash"].map((slug) => (
              <button
                key={slug}
                onClick={() => setBrand(slug)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  brand === slug
                    ? "bg-accent text-black"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {slug === "numy" ? "Numy" : "Holy Mouthwash"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          // onSubmit={(e) => {
          //   e.preventDefault();
          //   applySearch();
          // }}
          className="flex w-full max-w-md items-center gap-2 rounded-xl border border-border bg-panel px-3 py-2"
        >
          <Search className="h-4 w-4 shrink-0 text-faint" />
          <input
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value);
              applySearch(value);
            }}
            placeholder="Search concepts (e.g. B321)"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-faint"
          />
        </form>
        <div className="flex items-center gap-2">
          {query && (
            <button
              onClick={() => {
                setSearch("");
                setQuery("");
                setOffset(0);
              }}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              Clear search
            </button>
          )}
          <span className="text-xs text-muted">
            {total} concept{total === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="mt-3 text-sm text-muted">Loading concepts...</p>
        </div>
      ) : concepts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-panel py-16 text-center">
          <Layers className="mx-auto h-8 w-8 text-faint" />
          <p className="mt-3 text-sm text-muted">
            No concepts found. Fetch analytics from the Analytics page first, or
            try a different search.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          {isFetching ? (
            <div className="mb-4 flex items-center justify-center gap-2 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating concepts...
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {concepts.map((c) => (
            <Link
              key={c.concept_name}
              href={`/intelligence/${encodeURIComponent(c.concept_name)}?brand=${brand}`}
              className="group rounded-2xl border border-border bg-panel p-4 transition-all hover:border-accent/50 hover:shadow-lg"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate whitespace-nowrap text-sm font-semibold text-foreground group-hover:text-accent">
                  {formatConceptName(c.concept_name)}
                </span>
                <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-muted">
                  {c.ad_count} ad{c.ad_count === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-faint">Spend</span>
                  <span className="font-medium text-foreground">
                    {money(c.kpis?.spend)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-faint">ROAS</span>
                  <span className="font-medium text-foreground">
                    {fmt(c.kpis?.roas)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-faint">CTR</span>
                  <span className="font-medium text-foreground">
                    {fmt(c.kpis?.ctr)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-faint">Purchases</span>
                  <span className="font-medium text-foreground">
                    {fmt(c.kpis?.purchases)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-2">
        <button
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-40"
        >
          Prev
        </button>
        <button
          onClick={() => setOffset(offset + limit)}
          disabled={!hasMore}
          className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
