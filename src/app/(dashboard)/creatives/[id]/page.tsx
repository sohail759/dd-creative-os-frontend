"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useProduct } from "@/hooks/use-products";
import { CreativeDetailView } from "@/components/creatives/creative-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Creative } from "@/lib/api";

/**
 * A concept has no product details of its own when the Notion parent row is
 * still empty — in that case inherit the batch's details so the page renders
 * something useful instead of blanks.
 */
function mergeWithParent(c: Creative): Creative {
  const parent = c.parentBatch;
  if (!parent || (c.parentItem?.length ?? 0) === 0) return c;
  const pick = <K extends keyof Creative>(
    key: K,
    fallback: Creative[K],
  ): Creative[K] => (c[key] === undefined || c[key] === null || c[key] === "")
    ? fallback
    : c[key];
  return {
    ...c,
    brand: pick("brand", parent.brand),
    product: pick("product", parent.product),
    angle: pick("angle", parent.angle),
    awareness: pick("awareness", parent.awareness),
    audience: pick("audience", parent.audience),
    problem: pick("problem", parent.problem),
    desire: pick("desire", parent.desire),
    hook: pick("hook", parent.hook),
    hypothesis: pick("hypothesis", parent.hypothesis),
  };
}

function backStatusQuery(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const brand = params.get("brand");
  const status = params.get("status");
  const ret: string[] = [];
  if (brand) ret.push(`brand=${encodeURIComponent(brand)}`);
  if (status) ret.push(`status=${encodeURIComponent(status)}`);
  return ret.length ? `?${ret.join("&")}` : "";
}

export default function CreativeDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useProduct(params.id);

  if (isLoading) {
    return (
      <div className="animate-fade-in-up">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-6 h-8 w-64" />
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={<RefreshCw className="h-6 w-6" />}
        title="Creative not found"
        description={(error as Error)?.message ?? "It may have been removed."}
        action={
          <Link
            href="/creatives"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-accent-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Creatives
          </Link>
        }
      />
    );
  }

  const isConcept = (data.parentItem?.length ?? 0) > 0;
  const viewData = mergeWithParent(data);
  const backQuery = backStatusQuery();

  return (
    <CreativeDetailView
      creative={viewData}
      back={
        isConcept && data.parentBatch
          ? {
              href: `/creatives/${data.parentItem?.[0]}${backQuery}`,
              label: data.parentBatch.product || "Batch",
            }
          : { href: `/creatives${backQuery}`, label: "Creatives" }
      }
    />
  );
}
