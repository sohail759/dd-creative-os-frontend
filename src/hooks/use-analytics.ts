"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export function useAnalytics(brand = "numy", limit = 30, offset = 0) {
  return useQuery({
    queryKey: ["analytics", brand, limit, offset],
    queryFn: () => api.getAnalytics(brand, limit, offset),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFetchAllAnalytics() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (brand?: string) => api.fetchBulkAnalytics(brand),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      if (data.success) {
        toast("success", "Analytics refreshed", data.message);
      } else {
        toast("info", "Partial refresh", data.message);
      }
    },
    onError: (error: Error) => {
      toast("error", "Analytics refresh failed", error.message);
    },
  });
}

/**
 * The ads inside one campaign, fetched when its row is expanded.
 *
 * The list response used to nest every ad in every campaign — 17,433 ad
 * objects, 7.5MB of a 22MB payload — for a table that shows one campaign's
 * ads at a time, and only if clicked. This fetches the one that was opened.
 */
export function useCampaignAds(
  campaignId: string | null,
  brand: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["campaign-ads", campaignId, brand],
    queryFn: () => api.getCampaignAds(campaignId!, brand),
    enabled: Boolean(campaignId) && enabled,
    // Expanding, collapsing and re-expanding the same row is common; the
    // second open should be instant.
    staleTime: 5 * 60 * 1000,
  });
}
