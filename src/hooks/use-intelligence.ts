"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export function useIntelligenceConcepts(
  brand = "numy",
  search?: string,
  limit = 50,
  offset = 0
) {
  return useQuery({
    queryKey: ["intelligence", "concepts", brand, search ?? "", limit, offset],
    queryFn: () => api.getIntelligenceConcepts(brand, search, limit, offset),
    staleTime: 5 * 60 * 1000,
  });
}

export function useIntelligenceConcept(conceptName: string, brand = "numy") {
  return useQuery({
    queryKey: ["intelligence", "concept", conceptName, brand],
    queryFn: () => api.getIntelligenceConcept(conceptName, brand),
    staleTime: 5 * 60 * 1000,
    enabled: !!conceptName,
  });
}

const RUNNING_STATUSES = new Set([
  "PENDING",
  "STARTED",
  "RECEIVED",
  "RETRY",
  "queued",
]);

export function useRunIntelligenceConcept() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      conceptName,
      brand = "numy",
      datePreset = "last_30d",
      since,
      until,
    }: {
      conceptName: string;
      brand?: string;
      datePreset?: string;
      since?: string;
      until?: string;
    }) => {
      const dispatched = await api.runIntelligenceConcept(
        conceptName,
        brand,
        datePreset,
        since,
        until
      );

      // Poll the Celery task until it reaches a terminal state.
      for (let i = 0; i < 180; i++) {
        const res = await api.getIntelligenceConceptRun(
          dispatched.task_id,
          conceptName,
          brand,
          datePreset,
          since,
          until
        );
        const status = res.status ?? "";
        if (!RUNNING_STATUSES.has(status)) {
          return res;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      throw new Error("Analysis timed out while waiting for the worker.");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["intelligence"] });
      if (data.gated) {
        toast("info", "Analyst disabled", data.gate_message || data.message);
      } else if (data.ok) {
        toast("success", "Analysis complete", data.message);
      } else {
        toast("error", "Analysis needs review", data.message);
      }
    },
    onError: (error: Error) => {
      toast("error", "Analysis failed", error.message);
    },
  });
}

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
