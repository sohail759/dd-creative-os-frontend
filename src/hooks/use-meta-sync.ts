"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { latestMetaSync, startMetaSync, type MetaSync } from "@/lib/api/meta-sync";
import { useToast } from "@/components/ui/toast";

export function isMetaSyncRunning(sync: MetaSync | null | undefined): boolean {
  return sync?.status === "running";
}

/**
 * The latest Meta pull for a brand, polling while one is running.
 *
 * The record is written when the pull starts and updated when it ends, so
 * polling it is how the page knows whether the button should be available —
 * including when the weekly schedule started the pull rather than a person.
 */
export function useLatestMetaSync(brand: string) {
  return useQuery({
    queryKey: ["meta-sync", brand],
    queryFn: () => latestMetaSync(brand),
    enabled: Boolean(brand),
    refetchInterval: (query) =>
      isMetaSyncRunning(query.state.data as MetaSync | null) ? 4000 : 30000,
    refetchOnMount: "always",
    staleTime: 0,
  });
}

export function useStartMetaSync(brand: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (datePreset?: string) => startMetaSync(brand, datePreset),
    onSuccess: () => {
      toast("success", "Fetching from Meta", "Running in the background.");
      queryClient.invalidateQueries({ queryKey: ["meta-sync", brand] });
      // The record appears a moment after the worker picks the job up.
      window.setTimeout(
        () => queryClient.invalidateQueries({ queryKey: ["meta-sync", brand] }),
        1500,
      );
    },
    onError: (error: Error) => toast("error", "Could not start", error.message),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["meta-sync", brand] }),
  });
}

/** "3 minutes ago". */
export function timeAgo(iso?: string | null): string {
  if (!iso) return "never";
  const then = Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`);
  if (Number.isNaN(then)) return "never";
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
