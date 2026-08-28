"use client";

import {
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { api, type Creative } from "@/lib/api";

/** Server-side page size for the creatives list (matches backend limit cap). */
export const PRODUCTS_PAGE_SIZE = 30;

/**
 * Creatives we optimistically pinned to `in_progress` (id -> trigger time).
 *
 * The backend trigger is async: POST /generate returns 202 before the Celery
 * worker marks the Mongo doc `in_progress`, so an immediate refetch still
 * returns the stale state (e.g. a previous `failed`) and would otherwise
 * clobber the optimistic UI. `pinGenerating` keeps such creatives rendering
 * the progressive pipeline until the backend reports a *real* state.
 */
const optimisticGenerations = new Map<string, number>();

export function markGenerating(id: string) {
  optimisticGenerations.set(id, Date.now());
}

export function clearGenerating(id: string) {
  optimisticGenerations.delete(id);
}

function pinGenerating(c: Creative): Creative {
  const triggeredAt = optimisticGenerations.get(c.id);
  if (triggeredAt === undefined) return c;

  const updatedAt = c.generationUpdatedAt
    ? Date.parse(c.generationUpdatedAt) || 0
    : 0;
  const generatedAt = c.generatedAt ? Date.parse(c.generatedAt) || 0 : 0;
  const st = c.generationStatus;

  // Real states (worker picked it up / finished) end the pin.
  if (st === "in_progress") {
    optimisticGenerations.delete(c.id);
    return c;
  }
  // Completed: only clear the pin if the backend timestamp is newer than our trigger.
  // Otherwise the backend still has stale "completed" data from the previous generation.
  if (st === "completed") {
    const latestBackendUpdate = Math.max(updatedAt, generatedAt);
    if (latestBackendUpdate >= triggeredAt) {
      optimisticGenerations.delete(c.id);
      return c;
    }
    // Stale completed state — keep showing optimistic loading.
  }
  // A failure written to the doc *after* we triggered is a genuine failure;
  // an older failure is just the stale state still sitting in Mongo.
  if (st === "failed" && updatedAt >= triggeredAt) {
    optimisticGenerations.delete(c.id);
    return c;
  }

  return {
    ...c,
    generationStatus: "in_progress",
    headlines: [],
    primary_texts: [],
  };
}

/**
 * Paginated products list, filtered server-side by `status`, `brand`, and `phase`.
 * `data.pages` accumulates as the user hits "Load more".
 */
export function useProducts(status?: string, brand?: string, phase?: string, search?: string) {
  const searchTerm = search?.trim();
  const isSearching = Boolean(searchTerm);

  return useInfiniteQuery({
    queryKey: ["products", status ?? "all", brand ?? "all", phase ?? "all", searchTerm ?? ""],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const limit = isSearching ? undefined : PRODUCTS_PAGE_SIZE;
      const offset = isSearching ? undefined : pageParam;
      return (
        await api.getProducts(status, limit, offset, brand, phase, searchTerm)
      ).map(pinGenerating);
    },
    getNextPageParam: (lastPage, pages) => {
      if (isSearching) return undefined;
      if (lastPage.length < PRODUCTS_PAGE_SIZE) return undefined;
      return pages.length * PRODUCTS_PAGE_SIZE;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.pages.some((p) => p.some((c) => c.generationStatus === "in_progress")))
        return 4000;
      return false;
    },
  });
}

/** Per-status totals for the filter badges (independent of pagination). */
export function useProductCounts(brand?: string, phase?: string) {
  return useQuery({
    queryKey: ["products", "counts", brand ?? "all", phase ?? "all"],
    queryFn: () => api.getProductCounts(brand, phase),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: async () => pinGenerating(await api.getProduct(id)),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.generationStatus === "in_progress") return 4000;
      return false;
    },
  });
}
