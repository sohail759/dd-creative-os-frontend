"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type MetaUploadPayload } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

/** Load the normalized Batch (concepts + readiness + meta) for the batch UI. */
export function useBatchSummary(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["batch", id],
    queryFn: () => api.getBatchSummary(id!),
    enabled: enabled && !!id,
    refetchInterval: (query) => {
      const batch = query.state.data;
      if (!batch) return false;
      // Poll every 3 seconds while any concept has an in-progress generation task
      const hasInProgress = batch.concepts.some(
        (c) => c.generation_status === "in_progress",
      );
      return hasInProgress ? 3000 : false;
    },
  });
}

function invalidateBatch(
  queryClient: ReturnType<typeof useQueryClient>,
  batchId?: string,
) {
  if (batchId) queryClient.invalidateQueries({ queryKey: ["batch", batchId] });
  queryClient.invalidateQueries({ queryKey: ["batch"] });
}

/** Sync a batch (and its concepts/languages) from Notion. */
export function useSyncBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => api.syncBatch(id),
    onSuccess: (res) => {
      invalidateBatch(queryClient, res.id);
      toast("success", "Batch synced", `Synced ${res.name || res.id} from Notion.`);
    },
    onError: (error: Error) => {
      toast("error", "Sync failed", error.message);
    },
  });
}

/** Run the deconstruct pipeline for a concept. */
export function useRunDeconstruct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (vars: { batchId?: string; conceptId: string }) =>
      api.runDeconstruct(vars.conceptId),
    onMutate: (vars) => {
      if (!vars.batchId) return;
      queryClient.setQueryData<import("@/lib/api").Batch>(
        ["batch", vars.batchId],
        (batch) => batch
          ? {
              ...batch,
              concepts: batch.concepts.map((concept) =>
                concept.id === vars.conceptId
                  ? {
                      ...concept,
                      generation_status: "in_progress" as const,
                      generation_error: null,
                      generation_updated_at: new Date().toISOString(),
                    }
                  : concept,
              ),
            }
          : batch,
      );
    },
    onSuccess: (_res, vars) => {
      invalidateBatch(queryClient, vars.batchId);
      toast("success", "Creative generation started", "Deconstruction and copy generation will continue in the background.");
    },
    onError: (error: Error, vars) => {
      invalidateBatch(queryClient, vars.batchId);
      toast("error", "Deconstruction failed", error.message);
    },
  });
}

/** Run the copywriter agent for a concept. */
export function useRunCopywriter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (vars: {
      batchId?: string;
      conceptId: string;
      force?: boolean;
    }) => api.runCopywriter(vars.conceptId, vars.force),
    onSuccess: (_res, vars) => {
      invalidateBatch(queryClient, vars.batchId);
      toast("success", "Copywriter started", "Generating copy in the background.");
    },
    onError: (error: Error) => {
      toast("error", "Copywriter failed", error.message);
    },
  });
}

/** Upload a single concept as an ad inside its batch's Meta Ad Set. */
export function useUploadConcept() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (vars: {
      batchId?: string;
      conceptId: string;
      payload?: MetaUploadPayload;
    }) => api.uploadConcept(vars.conceptId, vars.payload),
    onSuccess: (res, vars) => {
      invalidateBatch(queryClient, vars.batchId || res.id);
      toast("success", "Concept uploaded", res.message);
    },
    onError: (error: Error) => {
      const retryable = "retryable" in error && Boolean(error.retryable);
      toast(
        "error",
        "Upload failed",
        `${error.message}${retryable ? " You can safely retry; completed steps will be reused." : ""}`,
      );
    },
  });
}

/** Upload every ready concept in a batch; per-concept results. */
export function useUploadBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (batchId: string) => api.uploadBatch(batchId),
    onSuccess: (res) => {
      invalidateBatch(queryClient, res.batch_id);
      const ok = res.results.filter((r) => r.ok).length;
      const failed = res.results.length - ok;
      const firstFailure = res.results.find((result) => !result.ok);
      const message = failed > 0
        ? `${ok} uploaded, ${failed} failed. ${firstFailure?.error ?? "Review the failed concepts below."}`
        : "All concepts uploaded";
      toast(
        failed > 0 ? "error" : "success",
        "Batch upload",
        message,
      );
    },
    onError: (error: Error) => {
      toast("error", "Batch upload failed", error.message);
    },
  });
}
