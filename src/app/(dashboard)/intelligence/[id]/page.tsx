"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Brain,
  ChevronLeft,
  DollarSign,
  Eye,
  MousePointerClick,
  ShoppingCart,
  Target,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Clock,
} from "lucide-react";

import { useIntelligenceAd, useFetchIntelligence } from "@/hooks/use-intelligence";
import type { IntelligenceDetail, IntelligenceBlock, AnalyticsKpis } from "@/lib/api/types";

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
                Fetching & analyzing...
              </span>
            ) : (
              "Fetch & Analyze"
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
    { label: "Spend", value: kpis.spend > 0 ? `€${kpis.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—", icon: DollarSign },
    { label: "Impressions", value: kpis.impressions > 0 ? kpis.impressions.toLocaleString() : "—", icon: Eye },
    { label: "Clicks", value: kpis.clicks > 0 ? kpis.clicks.toLocaleString() : "—", icon: MousePointerClick },
    { label: "Purchases", value: kpis.purchases > 0 ? kpis.purchases.toLocaleString() : "—", icon: ShoppingCart },
    { label: "ROAS", value: kpis.roas > 0 ? kpis.roas.toFixed(2) : "—", icon: DollarSign },
  ];
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.label}
            className="rounded-2xl border border-border bg-panel p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-faint">
                {kpi.label}
              </span>
              <Icon className="h-3.5 w-3.5 text-muted" />
            </div>
            <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
              {kpi.value}
            </p>
          </div>
        );
      })}
    </section>
  );
}

function BlockList({
  title,
  blocks,
}: {
  title: string;
  blocks: IntelligenceBlock[];
}) {
  if (!blocks || blocks.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-panel p-5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-3 text-sm text-muted">No data yet. Click 'Fetch Latest'.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-panel p-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3 space-y-4">
        {blocks.map((b, i) => (
          <div key={i} className="border-b border-border/50 pb-3 last:border-0">
            <p className="font-medium text-foreground">{b.title}</p>
            <p className="mt-1 text-sm text-muted">{b.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function IntelligenceDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const adId = params.id as string;
  const brand = searchParams.get("brand") ?? "numy";

  const { data, isLoading, error } = useIntelligenceAd(adId, brand);
  const fetchMutation = useFetchIntelligence();
  const [showFetchDialog, setShowFetchDialog] = useState(false);

  const detail: IntelligenceDetail | undefined = data;
  const ad = detail?.ad;
  const analytics = detail?.analytics;
  const intelligence = detail?.intelligence;

  function handleFetchConfirm() {
    fetchMutation.mutate(
      { adId, brand, datePreset: "last_30d" },
      {
        onSuccess: () => {
          setShowFetchDialog(false);
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="mt-3 text-sm text-muted">Loading ad intelligence...</p>
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

  const fetchedAt = analytics?.fetched_at;

  return (
    <div className="animate-fade-in-up">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={`/intelligence?brand=${brand}`}
            className="text-muted transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Brain className="h-5 w-5 text-accent" />
            {ad?.name || adId}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {fetchedAt && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Clock className="h-3 w-3" />
              Analytics fetched: {new Date(fetchedAt).toLocaleString()}
            </span>
          )}
          <button
            onClick={() => setShowFetchDialog(true)}
            disabled={fetchMutation.isPending}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${fetchMutation.isPending ? "animate-spin" : ""}`}
            />
            Fetch Latest
          </button>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-border bg-panel p-5">
            <h3 className="text-sm font-semibold text-foreground">
              Ad Details
            </h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-faint">Status</dt>
                <dd className="text-foreground">{ad?.status || "—"}</dd>
              </div>
              <div>
                <dt className="text-faint">Campaign</dt>
                <dd className="text-muted max-w-[220px] truncate">
                  {ad?.campaign_name || ad?.campaign_id || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-faint">Ad Set ID</dt>
                <dd className="font-mono text-muted text-xs break-all">
                  {ad?.adset_id || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-faint">Creative ID</dt>
                <dd className="font-mono text-muted text-xs break-all">
                  {ad?.creative_id || "—"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="lg:col-span-2">
          {analytics ? (
            KpiCards({ kpis: analytics.kpis })
          ) : (
            <div className="rounded-2xl border border-border bg-panel p-5">
              <h3 className="text-sm font-semibold text-foreground">
                Analytics
              </h3>
              <p className="mt-3 text-sm text-muted">
                No analytics cached. Click 'Fetch Latest' above to pull fresh
                Meta insights.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BlockList title="Value Blocks" blocks={intelligence?.value_blocks ?? []} />
        <BlockList title="Learnings" blocks={intelligence?.learnings ?? []} />
      </div>

      {intelligence && (
        <div className="mt-6 text-xs text-faint">
          Generated via <span className="text-muted">{intelligence.model}</span>
          {intelligence.generated_at && (
            <>
              {" "}
              on{" "}
              {new Date(intelligence.generated_at).toLocaleString()}
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showFetchDialog}
        title="Fetch latest intelligence?"
        message={
          "This will pull fresh Meta analytics for this ad and regenerate its " +
            "Value Blocks and Learnings. This action calls Meta and the LLM and " +
            "costs a small amount of OpenRouter credits. Continue?"
        }
        onConfirm={handleFetchConfirm}
        onCancel={() => setShowFetchDialog(false)}
        loading={fetchMutation.isPending}
      />
    </div>
  );
}
