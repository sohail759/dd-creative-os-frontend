"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Upload,
  Rocket,
  BarChart3,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";

import { useUploadedProducts } from "@/hooks/use-uploaded-products";
import { useFetchProductAnalytics } from "@/hooks/use-product-analytics";
import { useLaunchProduct } from "@/hooks/use-meta-actions";
import type { UploadedProduct } from "@/lib/api/types";

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
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
                Processing...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ProductCard({
  product,
  onLaunch,
  onAnalytics,
  onClick,
}: {
  product: UploadedProduct;
  onLaunch: (product: UploadedProduct) => void;
  onAnalytics: (product: UploadedProduct) => void;
  onClick: (product: UploadedProduct) => void;
}) {
  const isActive = product.meta_state === "active";
  const isUploaded = product.meta_state === "uploaded_paused";

  const stateColor = (s: string) => {
    if (s === "active") return "text-emerald-400";
    if (s === "uploaded_paused") return "text-yellow-400";
    if (s === "failed") return "text-red-400";
    return "text-muted";
  };

  const stateLabel = (s: string) => {
    if (s === "active") return "Active";
    if (s === "uploaded_paused") return "Uploaded";
    if (s === "failed") return "Failed";
    return s;
  };

  return (
    <div
      className="rounded-2xl border border-border bg-panel p-5 cursor-pointer transition-colors hover:border-accent/40 hover:bg-accent/5"
      onClick={() => onClick(product)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {product.product_name || product.creative_id}
          </h3>
          <div className="mt-2 space-y-1 text-xs text-muted">
            {product.campaign_name && (
              <p>Campaign: {product.campaign_name}</p>
            )}
            {product.adset_name && (
              <p>Ad Set: {product.adset_name}</p>
            )}
            {product.ad_name && (
              <p>Ad: {product.ad_name}</p>
            )}
            {!product.campaign_name && product.campaign_id && (
              <p className="font-mono">Campaign: {product.campaign_id}</p>
            )}
            {!product.adset_name && product.adset_id && (
              <p className="font-mono">Ad Set: {product.adset_id}</p>
            )}
            {!product.ad_name && product.ad_id && (
              <p className="font-mono">Ad: {product.ad_id}</p>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className={`font-medium ${stateColor(product.meta_state)}`}>
              {stateLabel(product.meta_state)}
            </span>
            {product.uploaded_at && (
              <span className="flex items-center gap-1 text-muted">
                <Clock className="h-3 w-3" />
                {new Date(product.uploaded_at).toLocaleDateString()}
              </span>
            )}
            {product.launched_at && (
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Launched {new Date(product.launched_at).toLocaleDateString()}
              </span>
            )}
          </div>
          {product.last_error && (
            <p className="mt-2 text-xs text-red-400 truncate">{product.last_error}</p>
          )}
        </div>
        <div className="ml-4 flex-shrink-0">
          {isUploaded && (
            <button
              onClick={(e) => { e.stopPropagation(); onLaunch(product); }}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-emerald-400"
            >
              <Rocket className="h-3.5 w-3.5" />
              Launch
            </button>
          )}
          {isActive && (
            <button
              onClick={(e) => { e.stopPropagation(); onAnalytics(product); }}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Analytics
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UploadedProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const brand = searchParams.get("brand") ?? undefined;
  const { data: products, isLoading, error } = useUploadedProducts(brand);
  const launchMutation = useLaunchProduct();
  const fetchAnalytics = useFetchProductAnalytics();

  const [launchTarget, setLaunchTarget] = useState<UploadedProduct | null>(null);
  const [analyticsTarget, setAnalyticsTarget] = useState<UploadedProduct | null>(null);

  function setBrand(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("brand", slug);
    router.push(`?${params.toString()}`);
  }

  function handleLaunchConfirm() {
    if (!launchTarget) return;
    launchMutation.mutate(
      { id: launchTarget.creative_id },
      {
        onSettled: () => setLaunchTarget(null),
      },
    );
  }

  function handleAnalyticsConfirm() {
    if (!analyticsTarget) return;
    fetchAnalytics.mutate(
      { creativeId: analyticsTarget.creative_id },
      {
        onSettled: () => setAnalyticsTarget(null),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="mt-3 text-sm text-muted">Loading uploaded products...</p>
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

  const items = products ?? [];

  return (
    <div className="animate-fade-in-up">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Upload className="h-5 w-5 text-accent" />
            Uploaded Products
          </h1>
          <p className="mt-1 text-sm text-muted">
            Products uploaded to Meta Ads for <span className="font-medium text-foreground">{brand || "all brands"}</span>.
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
          <span className="text-xs text-muted">
            {items.length} product{items.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      <section className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-panel p-8 text-center">
            <Upload className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-3 text-sm text-muted">
              No uploaded products yet. Upload a creative from the Creatives page.
            </p>
          </div>
        ) : (
          items.map((product) => (
            <ProductCard
              key={product.creative_id}
              product={product}
              onLaunch={setLaunchTarget}
              onAnalytics={setAnalyticsTarget}
              onClick={(p) => {
                const params = new URLSearchParams();
                if (brand) params.set("brand", brand);
                router.push(`/creatives/${p.creative_id}?${params.toString()}`);
              }}
            />
          ))
        )}
      </section>

      <ConfirmDialog
        open={!!launchTarget}
        title="Launch Ad"
        message={`Are you sure you want to launch this ad?\n\nThis will make the Meta Ad active.\n\nProduct: ${launchTarget?.product_name || launchTarget?.creative_id}`}
        confirmLabel="Launch"
        onConfirm={handleLaunchConfirm}
        onCancel={() => setLaunchTarget(null)}
        loading={launchMutation.isPending}
      />

      <ConfirmDialog
        open={!!analyticsTarget}
        title="Fetch Meta Analytics?"
        message={`This will contact Meta to retrieve the latest performance data for this product.\n\nThis may consume Meta API rate limit.\n\nProduct: ${analyticsTarget?.product_name || analyticsTarget?.creative_id}`}
        confirmLabel="Fetch Analytics"
        onConfirm={handleAnalyticsConfirm}
        onCancel={() => setAnalyticsTarget(null)}
        loading={fetchAnalytics.isPending}
      />
    </div>
  );
}
