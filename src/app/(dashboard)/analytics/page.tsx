"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BarChart3,
  Info,
  DollarSign,
  MousePointerClick,
  ShoppingCart,
  Eye,
  Loader2,
  AlertTriangle,
  Megaphone,
  Target,
  RefreshCw,
  Clock,
} from "lucide-react";

import { useAnalytics, useFetchAllAnalytics } from "@/hooks/use-analytics";
import type { AnalyticsKpis, AnalyticsCampaign, AnalyticsAd } from "@/lib/api/types";

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
        <p className="mt-2 text-sm text-muted whitespace-pre-line">{message}</p>
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

function KpiCards({ kpis }: { kpis: AnalyticsKpis }) {
  const items = [
    { label: "Spend", value: kpis.spend > 0 ? `€${Math.round(kpis.spend).toLocaleString()}` : "—", icon: DollarSign },
    { label: "Impressions", value: kpis.impressions > 0 ? kpis.impressions.toLocaleString() : "—", icon: Eye },
    { label: "Clicks", value: kpis.clicks > 0 ? kpis.clicks.toLocaleString() : "—", icon: MousePointerClick },
    { label: "CTR", value: kpis.ctr > 0 ? `${kpis.ctr.toFixed(2)}%` : "—", icon: Target },
    { label: "CPC", value: kpis.cpc > 0 ? `€${kpis.cpc.toFixed(2)}` : "—", icon: DollarSign },
    { label: "CPM", value: kpis.cpm > 0 ? `€${kpis.cpm.toFixed(2)}` : "—", icon: BarChart3 },
    { label: "Purchases", value: kpis.purchases > 0 ? kpis.purchases.toLocaleString() : "—", icon: ShoppingCart },
    { label: "ROAS", value: kpis.roas > 0 ? kpis.roas.toFixed(2) : "—", icon: DollarSign },
  ];

  return (
    <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {items.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div key={kpi.label} className="rounded-2xl border border-border bg-panel p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-faint">{kpi.label}</span>
              <Icon className="h-3.5 w-3.5 text-muted" />
            </div>
            <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{kpi.value}</p>
          </div>
        );
      })}
    </section>
  );
}

function CampaignsTable({ campaigns }: { campaigns: AnalyticsCampaign[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-panel p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Megaphone className="h-4 w-4 text-accent" />
          Campaigns
        </h2>
        <p className="mt-4 text-sm text-muted">No campaigns found.</p>
      </div>
    );
  }

  const statusColor = (s: string) => {
    if (s === "ACTIVE") return "text-emerald-400";
    if (s === "PAUSED") return "text-yellow-400";
    return "text-muted";
  };

  const formatBudget = (b: number | null) => {
    if (!b) return "—";
    return `€${(Number(b) / 100).toLocaleString()}/day`;
  };

  return (
    <div className="rounded-2xl border border-border bg-panel p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Megaphone className="h-4 w-4 text-accent" />
        Campaigns
        <span className="ml-auto text-xs font-normal text-muted">{campaigns.length}</span>
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-faint">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Objective</th>
              <th className="pb-2 pr-4 text-right">Budget</th>
              <th className="pb-2 text-right">Started</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 pr-4 text-foreground max-w-[300px] truncate">{c.name}</td>
                <td className={`py-2.5 pr-4 font-medium ${statusColor(c.status)}`}>{c.status}</td>
                <td className="py-2.5 pr-4 text-muted">{c.objective.replace("OUTCOME_", "")}</td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-muted">{formatBudget(c.daily_budget)}</td>
                <td className="py-2.5 text-right text-muted">
                  {c.start_time ? new Date(c.start_time).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdsTable({ ads }: { ads: AnalyticsAd[] }) {
  if (ads.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-panel p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Target className="h-4 w-4 text-accent" />
          Ads
        </h2>
        <p className="mt-4 text-sm text-muted">No ads found.</p>
      </div>
    );
  }

  const statusColor = (s: string) => {
    if (s === "ACTIVE") return "text-emerald-400";
    if (s === "PAUSED") return "text-yellow-400";
    if (s === "WITH_ISSUES") return "text-red-400";
    return "text-muted";
  };

  return (
    <div className="rounded-2xl border border-border bg-panel p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Target className="h-4 w-4 text-accent" />
        Ads
        <span className="ml-auto text-xs font-normal text-muted">{ads.length}</span>
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-faint">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Campaign ID</th>
              <th className="pb-2">Ad ID</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((a) => (
              <tr key={a.id} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 pr-4 text-foreground max-w-[300px] truncate">{a.name}</td>
                <td className={`py-2.5 pr-4 font-medium ${statusColor(a.status)}`}>{a.status}</td>
                <td className="py-2.5 pr-4 text-muted font-mono text-xs">{a.campaign_id}</td>
                <td className="py-2.5 text-muted font-mono text-xs">{a.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const brand = searchParams.get("brand") ?? "numy";
  const [visibleLimit, setVisibleLimit] = useState(30);
  const { data, isLoading, error } = useAnalytics(brand, visibleLimit, 0);
  const fetchMutation = useFetchAllAnalytics();
  const [showFetchDialog, setShowFetchDialog] = useState(false);

  function setBrand(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("brand", slug);
    setVisibleLimit(30);
    router.push(`?${params.toString()}`);
  }

  function handleFetchConfirm() {
    fetchMutation.mutate(brand, {
      onSettled: () => setShowFetchDialog(false),
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="mt-3 text-sm text-muted">Loading analytics...</p>
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

  const kpis = data?.kpis ?? { spend: 0, impressions: 0, clicks: 0, reach: 0, purchases: 0, purchase_value: 0, ctr: 0, cpc: 0, cpm: 0, roas: 0, cpp: 0 };
  const campaigns = data?.campaigns ?? [];
  const ads = data?.ads ?? [];

  const hasData = kpis.spend > 0 || campaigns.length > 0;
  const lastFetched = data?.last_fetched_at;

  return (
    <div className="animate-fade-in-up">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <BarChart3 className="h-5 w-5 text-accent" />
            Analytics
          </h1>
          <p className="mt-1 text-sm text-muted">
            Meta Ads performance data for <span className="font-medium text-foreground">{brand}</span>.
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
          {lastFetched && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Clock className="h-3 w-3" />
              Last fetched: {new Date(lastFetched).toLocaleString()}
            </span>
          )}
          <button
            onClick={() => setShowFetchDialog(true)}
            disabled={fetchMutation.isPending}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-50"
          >
            {fetchMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {fetchMutation.isPending ? "Fetching..." : "Fetch Latest Data"}
          </button>
        </div>
      </header>

      {!hasData && (
        <div className="mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-yellow-400" />
            <p className="text-sm text-yellow-400">
              No analytics data yet. Click &quot;Fetch Latest Data&quot; to retrieve performance data from Meta.
            </p>
          </div>
        </div>
      )}

      <KpiCards kpis={kpis} />

      <section className="mt-4">
        <CampaignsTable campaigns={campaigns} />
      </section>

      <section className="mt-4">
        <AdsTable ads={ads} />
      </section>

      {data && (data.total_ads ?? 0) > (data.limit ?? 30) && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setVisibleLimit((v) => v + 30)}
            disabled={fetchMutation.isPending}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-50"
          >
            Load more ({(data.total_ads ?? 0) - (data.limit ?? 30)} more)
          </button>
        </div>
      )}

      <ConfirmDialog
        open={showFetchDialog}
        title="Fetch Latest Meta Data?"
        message={
          "This will contact Meta and fetch the latest analytics for all uploaded products.\n\nThis may consume Meta API rate limit.\n\nContinue?"
        }
        onConfirm={handleFetchConfirm}
        onCancel={() => setShowFetchDialog(false)}
        loading={fetchMutation.isPending}
      />
    </div>
  );
}
