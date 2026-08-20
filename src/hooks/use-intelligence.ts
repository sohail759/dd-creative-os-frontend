"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export function useIntelligenceAds(
  brand = "numy",
  limit = 30,
  offset = 0
) {
  return useQuery({
    queryKey: ["intelligence", "ads", brand, limit, offset],
    queryFn: () => api.getIntelligenceAds(brand, limit, offset),
    staleTime: 5 * 60 * 1000,
  });
}

export function useIntelligenceAd(adId: string, brand = "numy") {
  return useQuery({
    queryKey: ["intelligence", "ad", adId, brand],
    queryFn: () => api.getIntelligenceAd(adId, brand),
    staleTime: 5 * 60 * 1000,
    enabled: !!adId,
  });
}

export function useFetchIntelligence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      adId,
      brand = "numy",
      datePreset,
    }: {
      adId: string;
      brand?: string;
      datePreset?: string;
    }) => api.fetchIntelligenceAd(adId, brand, datePreset),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["intelligence", "ad", data.ad?.id, typeof window !== "undefined" ? null : null],
        data
      );
      queryClient.invalidateQueries({ queryKey: ["intelligence", "ad"] });
      toast("success", "Intelligence refreshed", "Latest analytics and intelligence generated.");
    },
    onError: (error: Error) => {
      toast("error", "Intelligence refresh failed", error.message);
    },
  });
}
