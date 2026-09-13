"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  landingPageFilters,
  listAdsPages,
  listLandingPages,
  pageHealthOverview,
  pageHealthRuns,
  refreshPageHealth,
  type AdsPage,
  type LandingPage,
  type Paged,
  type PageHealthBrand,
  type PageHealthRun,
} from "@/lib/api/pages";
import { useToast } from "@/components/ui/toast";

/**
 * `refetchOnMount: "always"` on every one of these, deliberately.
 *
 * The app sets `refetchOnMount: false` globally and `staleTime: 0` does NOT
 * override it — a cached list would be shown unchanged after a refresh had
 * rewritten every row, which is exactly the case these screens exist for.
 */

export function useLandingPages(params: {
  brand?: string;
  q?: string;
  language?: string;
  angle?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery<Paged<LandingPage>>({
    queryKey: ["landing-pages", params],
    queryFn: () => listLandingPages(params),
    refetchOnMount: "always",
    staleTime: 0,
    placeholderData: (previous) => previous,
  });
}

export function useLandingPageFilters(brand?: string) {
  return useQuery({
    queryKey: ["landing-page-filters", brand ?? ""],
    queryFn: () => landingPageFilters(brand),
    refetchOnMount: "always",
    staleTime: 60_000,
  });
}

export function useAdsPages(params: {
  brand?: string;
  q?: string;
  drift_state?: string;
  eligible?: boolean;
  limit?: number;
  offset?: number;
}) {
  return useQuery<Paged<AdsPage>>({
    queryKey: ["ads-pages", params],
    queryFn: () => listAdsPages(params),
    refetchOnMount: "always",
    staleTime: 0,
    placeholderData: (previous) => previous,
  });
}

/** True while a refresh is under way for any brand. */
export function anyRefreshRunning(brands: PageHealthBrand[] | undefined): boolean {
  return (brands ?? []).some((b) => Boolean(b.running_run_id));
}

export function usePageHealth(brand?: string) {
  return useQuery({
    queryKey: ["page-health", brand ?? ""],
    queryFn: () => pageHealthOverview(brand),
    // Poll quickly while something is running, slowly otherwise. A refresh
    // takes about a minute for thirty pages, so three seconds is enough to
    // watch it move without hammering the API.
    refetchInterval: (query) =>
      anyRefreshRunning(query.state.data?.brands) ? 3000 : 30_000,
    refetchOnMount: "always",
    staleTime: 0,
  });
}

export function usePageHealthRuns(brand: string, enabled = true) {
  return useQuery<{ runs: PageHealthRun[] }>({
    queryKey: ["page-health-runs", brand],
    queryFn: () => pageHealthRuns(brand),
    enabled: enabled && Boolean(brand),
    refetchInterval: (query) =>
      (query.state.data?.runs ?? []).some((r) => r.status === "running") ? 3000 : 30_000,
    refetchOnMount: "always",
    staleTime: 0,
  });
}

export function useRefreshPageHealth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (brand: string) => refreshPageHealth(brand),
    onSuccess: (res, brand) => {
      if (res.queued) {
        toast(
          "success",
          "Refresh started",
          `Re-reading ${brand}'s pages from Meta. This takes about a minute.`,
        );
      } else {
        toast("info", "Already running", `A refresh for ${brand} is already under way.`);
      }
      // The run row appears a moment after the worker picks the job up.
      queryClient.invalidateQueries({ queryKey: ["page-health"] });
      queryClient.invalidateQueries({ queryKey: ["page-health-runs"] });
      window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["page-health"] });
        queryClient.invalidateQueries({ queryKey: ["page-health-runs"] });
      }, 1500);
    },
    onError: (error: Error) => {
      toast("error", "Could not start the refresh", error.message);
    },
  });
}

/* --- campaigns and ad sets ------------------------------------------------ */

import {
  listAdSets,
  listCampaigns,
  refreshTopology,
  type AdSet,
  type Campaign,
  type MirrorFreshness,
} from "@/lib/api/pages";

export function useCampaigns(params: {
  brand?: string;
  q?: string;
  language?: string;
  status?: string;
}) {
  return useQuery<{ total: number; items: Campaign[]; mirror: MirrorFreshness }>({
    queryKey: ["meta-campaigns", params],
    queryFn: () => listCampaigns(params),
    refetchOnMount: "always",
    staleTime: 0,
    placeholderData: (previous) => previous,
  });
}

export function useAdSets(
  params: {
    brand?: string;
    campaign_id?: string;
    q?: string;
    batch_name?: string;
    limit?: number;
    offset?: number;
  },
  enabled = true,
) {
  return useQuery<Paged<AdSet>>({
    queryKey: ["meta-adsets", params],
    queryFn: () => listAdSets(params),
    enabled,
    refetchOnMount: "always",
    staleTime: 0,
    placeholderData: (previous) => previous,
  });
}

export function useRefreshTopology() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (brand: string) => refreshTopology(brand),
    onSuccess: (res, brand) => {
      toast(
        "success",
        "Refreshed from Meta",
        `${brand}: ${res.campaigns} campaigns, ${res.ad_sets} ad sets.`,
      );
      queryClient.invalidateQueries({ queryKey: ["meta-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["meta-adsets"] });
    },
    onError: (error: Error) => {
      toast("error", "Could not refresh", error.message);
    },
  });
}
