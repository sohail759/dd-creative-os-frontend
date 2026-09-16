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


/**
 * The durable status of the last Analyst pass over a concept.
 *
 * Read from the run records rather than Celery's result backend, so closing
 * the page does not lose the answer. A pass takes minutes; whoever pressed
 * the button needs a way back to "did that finish", and a task id held in a
 * browser tab is not one.
 */
export function useConceptRunStatus(
  conceptName: string,
  brand = "numy",
  /**
   * When a run was dispatched from this page, as epoch ms.
   *
   * Polling on `status === "running"` alone was not enough. Dispatch returns
   * as soon as the task is QUEUED, and the worker may not have opened the run
   * record yet, so the refetch that follows still sees the PREVIOUS run —
   * finished — and polling never starts. The page then sat on a stale status
   * until someone reloaded it.
   *
   * Knowing when we asked lets the hook keep polling until a run that started
   * after that moment appears.
   */
  dispatchedAt?: number,
) {
  return useQuery({
    queryKey: ["intelligence", "run-status", conceptName, brand],
    queryFn: () => api.getConceptRunStatus(conceptName, brand),
    enabled: !!conceptName,
    // The global 60s staleTime is for lists, not for something being watched.
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: (query) => {
      const run = query.state.data?.run;
      const concept = query.state.data?.concept;
      // Poll while THIS concept is still being worked on. A brand-wide pass
      // keeps `run.status === "running"` for hours after it has finished with
      // this concept, so polling on the run alone kept every finished concept
      // refetching — and reporting itself as in progress.
      if (concept) {
        return concept.status === "pending" || concept.status === "running"
          ? 5_000
          : false;
      }
      if (run?.status === "running") return 5_000;
      if (!dispatchedAt) return false;
      // Still waiting for the worker to pick the task up. Give it two minutes
      // before concluding nothing is coming, so a busy queue does not leave
      // the page polling for ever.
      if (Date.now() - dispatchedAt > 120_000) return false;
      const started = run?.started_at ? Date.parse(run.started_at) : 0;
      return started >= dispatchedAt ? false : 3_000;
    },
  });
}

/**
 * Dispatch an Analyst pass and return immediately.
 *
 * It used to await the whole run, which meant the confirm dialog stayed open
 * for the nine minutes a pass takes and any navigation threw the result
 * away. Dispatch is the mutation; watching is `useConceptRunStatus`.
 */
export function useRunIntelligenceConcept() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      conceptName,
      brand = "numy",
      // No window. The Analyst classifies on LIFETIME totals — its
      // thresholds are lifetime-scale — and sending one here overrode that
      // server-side default, so the button judged a month while the weekly
      // pass judged all time.
      datePreset,
      since,
      until,
    }: {
      conceptName: string;
      brand?: string;
      datePreset?: string;
      since?: string;
      until?: string;
    }) => api.runIntelligenceConcept(conceptName, brand, datePreset, since, until),
    onSuccess: (_data, variables) => {
      toast(
        "info",
        "Analysis started",
        "It runs in the background. Progress shows on this page, and on the Analyst Agent Runs screen.",
      );
      queryClient.invalidateQueries({
        queryKey: ["intelligence", "run-status", variables.conceptName],
      });
    },
    onError: (error: Error) => {
      toast("error", "Could not start analysis", error.message);
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
