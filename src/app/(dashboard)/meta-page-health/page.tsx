"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Clock,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { usePageHealth, useRefreshPageHealth } from "@/hooks/use-page-health";
import type {
  MetaPageHealthPage,
  MetaPageHealthSummary,
} from "@/lib/api/types";

const BRANDS = ["numy", "holy-mouthwash"] as const;

function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm whitespace-pre-line text-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Fetching...
              </span>
            ) : (
              "Fetch"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function suppressBadge(status: string) {
  switch (status) {
    case "active":
      return {
        label: "Active",
        cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      };
    case "excluded_manual":
      return {
        label: "Excluded",
        cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
      };
    case "no_ads":
      return {
        label: "No Ads",
        cls: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      };
    case "not_found":
      return {
        label: "Not Found",
        cls: "bg-red-500/10 text-red-400 border-red-500/30",
      };
    default:
      return {
        label: status || "—",
        cls: "bg-white/5 text-muted border-border",
      };
  }
}

function StatusCards({ summary }: { summary: MetaPageHealthSummary }) {
  const count = Number(summary.page_count ?? 0);
  const active = Number(summary.active_launch_eligible_count ?? 0);
  const excluded = Number(summary.excluded_count ?? 0);
  const accountRunning = Number(summary.account_running_ads ?? 0);

  const items = [
    { label: "Total Pages", value: count, cls: "text-foreground" },
    { label: "Eligible", value: active, cls: "text-emerald-400" },
    { label: "Excluded", value: excluded, cls: "text-yellow-400" },
    { label: "Account Running Ads", value: accountRunning, cls: "text-accent" },
  ];

  return (
    <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-border bg-panel p-4"
        >
          <p className="text-[10px] font-medium uppercase tracking-wider text-faint">
            {item.label}
          </p>
          <p className={`mt-2 text-xl font-bold tabular-nums ${item.cls}`}>
            {item.value}
          </p>
        </div>
      ))}
    </section>
  );
}

function AdCapacityPanel({ summary }: { summary: MetaPageHealthSummary }) {
  const accountTotal = Number(summary.account_total_ads ?? 0);
  const accountRunning = Number(summary.account_running_ads ?? 0);
  const accountRemaining = Number(summary.account_ads_remaining ?? 0);
  const limit = Number(summary.account_ad_limit ?? 250);

  const adItems = [
    { label: "Total Ads", value: accountTotal, cls: "text-foreground" },
    { label: "Running Ads", value: accountRunning, cls: "text-accent" },
    { label: "Remaining (cap)", value: accountRemaining, cls: "text-emerald-400" },
    { label: "Ad Cap", value: limit, cls: "text-muted" },
  ];

  return (
    <section className="mt-4 rounded-2xl border border-border bg-panel p-5">
      <h2 className="text-sm font-semibold text-foreground">Ad Capacity</h2>
      <p className="mt-0.5 text-xs text-muted">
        Account-wide ad totals from Meta (per-page attribution unavailable via
        CLI).
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {adItems.map((item) => (
          <div key={item.label}>
            <p className="text-[10px] font-medium uppercase tracking-wider text-faint">
              {item.label}
            </p>
            <p className={`mt-1 text-lg font-bold tabular-nums ${item.cls}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
      {Array.isArray(summary.campaigns) && summary.campaigns.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-faint">
                <th className="pb-2 pr-4">Campaign</th>
                <th className="pb-2 pr-4 text-right">Running</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {summary.campaigns.map((c) => (
                <tr
                  key={c.campaign_id}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="py-2 pr-4 text-foreground max-w-[280px]">
                    <span className="truncate">{c.campaign_name || c.campaign_id}</span>
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-foreground">
                    {c.running_ads}
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted">
                    {c.total_ads}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PagesTable({ pages }: { pages: MetaPageHealthPage[] }) {
  if (pages.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-panel p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Activity className="h-4 w-4 text-accent" />
          Pages
        </h2>
        <p className="mt-4 text-sm text-muted">
          No page health data yet. Click &quot;Fetch Latest Data&quot; to
          retrieve it from Meta.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-panel p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Activity className="h-4 w-4 text-accent" />
        Pages
        <span className="ml-auto text-xs font-normal text-muted">
          {pages.length}
        </span>
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-faint">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4 text-right">Running</th>
              <th className="pb-2 pr-4 text-right">Followers</th>
              <th className="pb-2 pr-4 text-right">Talking</th>
              <th className="pb-2 pr-4">Scope</th>
              <th className="pb-2">Block Reason</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => {
              const badge = suppressBadge(p.suppression_status);
              return (
                <tr
                  key={p.id || p.name}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="py-2.5 pr-4 text-foreground max-w-[240px] truncate">
                    {p.name || p.canonical_name}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-muted">
                    {p.running_or_in_review_ads}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-muted">
                    {p.followers != null
                      ? p.followers.toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-muted">
                    {p.talking_about != null
                      ? p.talking_about.toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-muted">{p.brand_scope}</td>
                  <td className="py-2.5 text-muted max-w-[220px] truncate">
                    {p.launch_block_reason || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MetaPageHealthPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const brand = searchParams.get("brand") ?? "numy";
  const { data, isLoading, error } = usePageHealth(brand);
  const refreshMutation = useRefreshPageHealth();
  const [showFetchDialog, setShowFetchDialog] = useState(false);

  function setBrand(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("brand", slug);
    router.push(`?${params.toString()}`);
  }

  function handleFetchConfirm() {
    refreshMutation.mutate(brand, {
      onSettled: () => setShowFetchDialog(false),
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="mt-3 text-sm text-muted">Loading page health...</p>
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

  const pages = data?.pages ?? [];
  const summary: MetaPageHealthSummary = data?.summary ?? {
    page_count: 0,
    active_launch_eligible_count: 0,
    excluded_count: 0,
    total_running_ads: 0,
  };
  const lastFetched = data?.last_fetched_at;
  const hasData = pages.length > 0;

  return (
    <div className="animate-fade-in-up">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ShieldCheck className="h-5 w-5 text-accent" />
            Meta Pages Health
          </h1>
          <p className="mt-1 text-sm text-muted">
            Ad capacity and suppression status for{" "}
            <span className="font-medium text-foreground">{brand}</span> pages.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border bg-panel p-0.5">
            {BRANDS.map((slug) => (
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
          {lastFetched && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Clock className="h-3 w-3" />
              Last fetched: {new Date(lastFetched).toLocaleString()}
            </span>
          )}
          <button
            onClick={() => setShowFetchDialog(true)}
            disabled={refreshMutation.isPending}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-50"
          >
            {refreshMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {refreshMutation.isPending ? "Fetching..." : "Fetch Latest Data"}
          </button>
        </div>
      </header>

      {!hasData && (
        <div className="mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-yellow-400" />
            <p className="text-sm text-yellow-400">
              No page health data yet. Click &quot;Fetch Latest Data&quot; to
              retrieve it from Meta.
            </p>
          </div>
        </div>
      )}

      {data?.errors && data.errors.length > 0 && (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <p className="text-sm text-red-400">
              {data.errors.length} partial error(s) during last fetch. Data may
              be incomplete.
            </p>
          </div>
        </div>
      )}

      <StatusCards summary={summary} />

      <section className="mt-4">
        <PagesTable pages={pages} />
      </section>

      <AdCapacityPanel summary={summary} />

      <ConfirmDialog
        open={showFetchDialog}
        title="Fetch Latest Meta Page Health?"
        message={
          "This will contact Meta and fetch the latest page health data for all pages.\n\nThis may consume Meta API rate limit.\n\nContinue?"
        }
        onConfirm={handleFetchConfirm}
        onCancel={() => setShowFetchDialog(false)}
        loading={refreshMutation.isPending}
      />
    </div>
  );
}
