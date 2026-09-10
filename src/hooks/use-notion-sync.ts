"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelSync, listSyncRuns, startBrandSync, type SyncRun,
} from "@/lib/api/notion-sync";
import { useToast } from "@/components/ui/toast";

/** True while a run is still going. */
export function isRunning(run: SyncRun | undefined): boolean {
  return run?.status === "running";
}

/**
 * Recent syncs, polling while any of them is running.
 *
 * The run document is updated with its stage as the sync goes, so polling it
 * is how the page shows progress — the request that started the sync returned
 * long before the work did.
 */
export function useSyncRuns() {
  return useQuery({
    queryKey: ["notion-sync-runs"],
    queryFn: () => listSyncRuns(50),
    refetchInterval: (query) =>
      (query.state.data ?? []).some(isRunning) ? 3000 : 15000,
    refetchOnMount: "always",
    staleTime: 0,
  });
}

export function useStartBrandSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (vars: { brand: string; editedSince?: string }) =>
      startBrandSync(vars.brand, vars.editedSince),
    onSuccess: (_res, vars) => {
      toast(
        "success",
        "Sync started",
        vars.editedSince
          ? `Syncing ${vars.brand} changes since the selected time.`
          : `Syncing all of ${vars.brand} from Notion.`,
      );
      // The run document appears a moment after the worker picks the job up.
      queryClient.invalidateQueries({ queryKey: ["notion-sync-runs"] });
      window.setTimeout(
        () => queryClient.invalidateQueries({ queryKey: ["notion-sync-runs"] }),
        1500,
      );
    },
    onError: (error: Error) => toast("error", "Could not start sync", error.message),
  });
}

/** Stop a running sync. */
export function useCancelSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (runId: string) => cancelSync(runId),
    onSuccess: () => {
      toast("success", "Cancelling", "The sync will stop at its next checkpoint.");
      queryClient.invalidateQueries({ queryKey: ["notion-sync-runs"] });
    },
    onError: (error: Error) => toast("error", "Could not cancel", error.message),
  });
}
