"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Brain, Loader2, AlertTriangle } from "lucide-react";

import { useIntelligenceAds } from "@/hooks/use-intelligence";
import type { IntelligenceAd } from "@/lib/api/types";

function statusColor(s: string) {
  if (s === "ACTIVE") return "text-emerald-400";
  if (s === "PAUSED") return "text-yellow-400";
  return "text-muted";
}

export default function IntelligencePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const brand = searchParams.get("brand") ?? "numy";
  const [offset, setOffset] = useState(0);
  const { data, isLoading, error } = useIntelligenceAds(
    brand,
    30,
    offset,
  );

  function setBrand(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("brand", slug);
    setOffset(0);
    router.push(`?${params.toString()}`);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="mt-3 text-sm text-muted">Loading intelligence...</p>
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

  const ads: IntelligenceAd[] = data?.ads ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 30;
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
            Cached Meta ads for{" "}
            <span className="font-medium text-foreground">{brand}</span>.
            Select an ad for Value Blocks and Learnings.
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

      <div className="mt-6 rounded-2xl border border-border bg-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-faint">
                <th className="p-2 pl-4 pr-4">Ad</th>
                <th className="p-2 pr-4">Status</th>
                <th className="p-2 pr-4">Campaign</th>
                <th className="p-2 pr-4">Ad Set</th>
                <th className="p-2 pr-4 text-right">Creative ID</th>
              </tr>
            </thead>
            <tbody>
              {ads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-muted">
                    No cached ads found for this brand. Fetch analytics from the
                    Analytics page first.
                  </td>
                </tr>
              ) : (
                ads.map((ad) => (
                  <tr
                    key={ad.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2.5 pl-4 pr-4">
                      <Link
                        href={`/intelligence/${encodeURIComponent(ad.id)}?brand=${brand}`}
                        className="font-medium text-foreground hover:text-accent"
                      >
                        {ad.name}
                      </Link>
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
                    <td className="py-2.5 pr-4 text-right text-muted max-w-[160px] truncate">
                      {ad.creative_id || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
          <span className="text-xs text-muted">
            {total} ad{total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
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
      </div>
    </div>
  );
}
