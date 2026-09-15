"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdDetail,
  getOverview,
  getSyncStatus,
  listAds,
  listCampaignAds,
  listCampaigns,
  refreshInsights,
  type AdDetail,
  type AdRow,
  type CampaignRow,
  type Overview,
  type Paged,
  type SyncStatus,
  type Window,
} from "@/lib/api/analytics-insights";
import { useToast } from "@/components/ui/toast";

/**
 * `refetchOnMount: "always"` everywhere, as with the Pages screens: the app
 * sets a global `refetchOnMount: false`, and `staleTime: 0` alone does not
 * override that — a cached KPI row would sit unchanged after a refresh had
 * rewritten every number underneath it.
 */

export function useOverview(brand: string, window: Window) {
  return useQuery<Overview>({
    queryKey: ["analytics-overview", brand, window],
    queryFn: () => getOverview(brand, window),
    refetchOnMount: "always",
    staleTime: 0,
    placeholderData: (previous) => previous,
  });
}

export function useCampaignsTable(params: {
  brand: string;
  window: Window;
  q?: string;
  status?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery<Paged<CampaignRow>>({
    queryKey: ["analytics-campaigns", params],
    queryFn: () => listCampaigns(params),
    refetchOnMount: "always",
    staleTime: 0,
    placeholderData: (previous) => previous,
  });
}

export function useCampaignAdsTable(
  params: { brand: string; campaignId: string; window: Window; limit?: number; offset?: number },
  enabled = true,
) {
  return useQuery<Paged<AdRow>>({
    queryKey: ["analytics-campaign-ads", params],
    queryFn: () => listCampaignAds(params),
    enabled: enabled && Boolean(params.campaignId),
    refetchOnMount: "always",
    staleTime: 0,
  });
}

export function useAdsTable(params: {
  brand: string;
  window: Window;
  q?: string;
  status?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery<Paged<AdRow>>({
    queryKey: ["analytics-ads", params],
    queryFn: () => listAds(params),
    refetchOnMount: "always",
    staleTime: 0,
    placeholderData: (previous) => previous,
  });
}

export function useAdDetail(brand: string, adId: string | null) {
  return useQuery<AdDetail>({
    queryKey: ["analytics-ad-detail", brand, adId],
    queryFn: () => getAdDetail(brand, adId as string),
    enabled: Boolean(adId),
    refetchOnMount: "always",
    staleTime: 0,
  });
}

export function useSyncStatus(brand: string) {
  return useQuery<SyncStatus>({
    queryKey: ["analytics-sync-status", brand],
    queryFn: () => getSyncStatus(brand),
    // Poll quickly while a refresh is running, slowly otherwise — same
    // pattern as the Page Health screen's own refresh watcher.
    refetchInterval: (query) => (query.state.data?.running ? 3000 : 30_000),
    refetchOnMount: "always",
    staleTime: 0,
  });
}

export function useRefreshInsights() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ brand, includeLifetime }: { brand: string; includeLifetime?: boolean }) =>
      refreshInsights(brand, includeLifetime),
    onSuccess: (res, { brand }) => {
      if (res.queued) {
        toast("success", "Refresh started", `Reading ${brand}'s Meta performance data. This can take a minute or two.`);
      } else {
        toast("info", "Already running", `A refresh for ${brand} is already under way.`);
      }
      queryClient.invalidateQueries({ queryKey: ["analytics-sync-status"] });
      window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["analytics-sync-status"] });
      }, 1500);
    },
    onError: (error: Error) => {
      toast("error", "Could not start the refresh", error.message);
    },
  });
}
