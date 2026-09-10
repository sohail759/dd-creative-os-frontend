"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Batch, type MetaUploadPayload } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

/** Poll interval while any work is running on a batch. */
const BUSY_MS = 3000;

/**
 * Is anything running on this batch — copywriting, an upload, or a launch?
 *
 * The upload and launch endpoints are synchronous: the Meta work happens
 * inside the request, and each concept's `meta_ops.state` moves to
 * `uploading` / `launching` while it does. That state is the only signal
 * that survives a navigation, so it is what drives both the polling below
 * and every loader on the card.
 */
export function batchIsBusy(batch: Batch | undefined): boolean {
  if (!batch) return false;
  if (batch.sync?.is_syncing) return true;
  if (batch.upload?.is_uploading) return true;
  return batch.concepts.some(
    (c) => c.generation_status === "in_progress" || c.meta?.in_flight,
  );
}

/** Load the normalized Batch (concepts + readiness + meta) for the batch UI. */
export function useBatchSummary(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["batch", id],
    queryFn: () => api.getBatchSummary(id!),
    enabled: enabled && !!id,
    // This polled on copywriting alone, so an upload ran with the card
    // showing nothing: the run panel polled `meta-progress` and moved, while
    // the card sat on a snapshot taken before the upload began.
    refetchInterval: (query) => (batchIsBusy(query.state.data) ? BUSY_MS : false),
    // Always, not "only when the cache says busy". Conditioning on the cache
    // assumed the cache knew about the upload, which is exactly what fails
    // when the work was started from somewhere else — another view, the
    // concept page, a second tab. The card then came back to an idle
    // snapshot, and `staleTime` held it there for another minute while the
    // upload ran.
    //
    // The cost is one request per visible card per mount, which is what the
    // page already does on first load; the summary is a single indexed read.
    // Freshness is the whole job of this query.
    refetchOnMount: "always",
  });
}

/**
 * Mark concepts busy in the cached batch the moment the button is pressed.
 *
 * Without this the cache still holds the pre-click snapshot, so a user who
 * clicks Upload and immediately navigates away comes back to a batch that
 * looks idle — nothing to poll on, no loader — while the upload is very much
 * running. The server overwrites this on the next refetch.
 */
function markBusy(
  queryClient: ReturnType<typeof useQueryClient>,
  batchId: string | undefined,
  state: "uploading" | "launching",
  conceptId?: string,
) {
  if (!batchId) return;
  queryClient.setQueryData<Batch>(["batch", batchId], (batch) => {
    if (!batch) return batch;
    // Only the concept actually being acted on is marked. A BATCH upload has
    // no concept id, and marking all of them was a lie the server corrected a
    // moment later: it uploads one at a time, so the next refetch cleared
    // every loader at once and looked like the run had stopped. The batch is
    // busy; its concepts are not yet.
    const concepts = conceptId
      ? batch.concepts.map((c) =>
          c.id === conceptId
            ? { ...c, meta: { ...c.meta, in_flight: true, upload_status: state, error: null } }
            : c,
        )
      : batch.concepts;
    return {
      ...batch,
      concepts,
      upload: {
        ...batch.upload,
        in_flight: concepts.filter((c) => c.meta?.in_flight).length,
        is_uploading: true,
      },
    };
  });
}

function invalidateBatch(
  queryClient: ReturnType<typeof useQueryClient>,
  batchId?: string,
) {
  // Scope to the batch we actually changed. This used to invalidate the whole
  // ["batch"] key as well, so syncing or generating on one batch refetched
  // every batch query in the cache.
  if (batchId) {
    queryClient.invalidateQueries({ queryKey: ["batch", batchId] });
    return;
  }
  // No batch known (some callers only have a concept id) — fall back to
  // refreshing every batch query, which is the only correct option here.
  queryClient.invalidateQueries({ queryKey: ["batch"] });
}

/**
 * Mark one concept busy without knowing its batch id.
 *
 * The per-concept launch button is called with only `{ id }`, so it cannot
 * use `markBusy` above. Scanning the cached batches for the one that holds
 * the concept is cheap — a page has at most a screenful of them — and means
 * every entry point marks state the same way.
 */
export function markConceptBusyAnywhere(
  queryClient: ReturnType<typeof useQueryClient>,
  conceptId: string,
  state: "uploading" | "launching",
) {
  for (const [key, batch] of queryClient.getQueriesData<Batch>({ queryKey: ["batch"] })) {
    if (!batch?.concepts?.some((c) => c.id === conceptId)) continue;
    queryClient.setQueryData<Batch>(key, (current) => {
      if (!current) return current;
      const concepts = current.concepts.map((c) =>
        c.id === conceptId
          ? { ...c, meta: { ...c.meta, in_flight: true, upload_status: state, error: null } }
          : c,
      );
      return {
        ...current,
        concepts,
        upload: {
          ...current.upload,
          in_flight: concepts.filter((c) => c.meta?.in_flight).length,
          is_uploading: true,
        },
      };
    });
  }
}

/** Sync a batch (and its concepts/languages) from Notion. */
export function useSyncBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => api.syncBatch(id),
    // Mark it syncing in the cache immediately, so a user who clicks and
    // navigates away comes back to a batch that still looks busy — and to a
    // query that knows to poll. The server overwrites this on the next read.
    onMutate: (id) => {
      queryClient.setQueryData<Batch>(["batch", id], (batch) =>
        batch
          ? { ...batch, sync: { ...batch.sync, is_syncing: true } }
          : batch,
      );
    },
    onSuccess: (res) => {
      toast("success", "Batch synced", `Synced ${res.name || res.id} from Notion.`);
    },
    onError: (error: Error) => {
      toast("error", "Sync failed", error.message);
    },
    // Always resync: the optimistic flag must not outlive its request.
    onSettled: (res, _err, id) => invalidateBatch(queryClient, res?.id || id),
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
    onMutate: (vars) => markBusy(queryClient, vars.batchId, "uploading", vars.conceptId),
    onSuccess: (res, vars) => {
      toast("success", "Concept uploaded", res.message);
    },
    // Always resync, success or failure — the optimistic busy flag above
    // must never outlive the request that set it.
    onSettled: (res, _err, vars) => {
      invalidateBatch(queryClient, vars.batchId || res?.id);
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
export function useCopywriteBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (batchId: string) => api.copywriteBatch(batchId),
    onSuccess: (res) => {
      invalidateBatch(queryClient, res.id);
      const skipped = res.results.filter((r) => !r.queued);
      toast(
        res.queued > 0 ? "success" : "error",
        "Batch copy",
        res.queued > 0
          ? `Writing copy for ${res.queued} concept${res.queued === 1 ? "" : "s"}.`
          : skipped[0]?.reason
            ? `Nothing to write: ${skipped[0].reason}.`
            : "Nothing to write.",
      );
    },
    onError: (error: Error) => {
      toast("error", "Batch copy failed", error.message);
    },
  });
}


export function useLaunchBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (batchId: string) => api.launchBatch(batchId),
    onMutate: (batchId) => markBusy(queryClient, batchId, "launching"),
    onSuccess: (res) => {
      const failed = res.total - res.launched;
      toast(
        failed > 0 ? "error" : "success",
        "Batch launch",
        failed > 0
          ? `${res.launched} launched, ${failed} failed.`
          : "Every concept is live",
      );
    },
    onError: (error: Error) => {
      toast("error", "Batch launch failed", error.message);
    },
    onSettled: (res, _err, batchId) => {
      invalidateBatch(queryClient, res?.id || batchId);
    },
  });
}


export function useUploadBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (batchId: string) => api.uploadBatch(batchId),
    onMutate: (batchId) => markBusy(queryClient, batchId, "uploading"),
    onSuccess: (res) => {
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
    onSettled: (res, _err, batchId) => {
      invalidateBatch(queryClient, res?.batch_id || batchId);
    },
  });
}
