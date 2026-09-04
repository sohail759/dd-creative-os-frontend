"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  ExternalLink,
  Layers,
  Loader2,
  RefreshCw,
  Upload,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import type {
  Batch,
  BatchConcept,
  ConceptReadiness,
} from "@/lib/api/types";
import {
  useBatchSummary,
  useRunDeconstruct,
  useSyncBatch,
  useUploadBatch,
  useUploadConcept,
} from "@/hooks/use-batch";

/** Ordered readiness checks with human labels. */
const CHECK_ORDER: { key: keyof ConceptReadiness; label: string }[] = [
  { key: "frame_url", label: "Creative URL" },
  { key: "creative", label: "Creative Content" },
  { key: "destination_url", label: "Destination URL" },
];

function dispatchMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  for (const key of ["instruction", "error", "reason", "message"]) {
    if (typeof data[key] === "string" && data[key]) return data[key];
  }
  return dispatchMessage(data.payload);
}

function ActionButton({
  onClick,
  pending,
  disabled,
  children,
}: {
  onClick: () => void;
  pending?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || disabled}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-accent/40 bg-accent-dim px-2 py-1 text-xs font-medium text-accent transition-colors hover:border-accent hover:bg-accent hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

function SyncHint({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{children}</span>;
}

function ReadinessRow({
  label,
  ok,
  trailing,
}: {
  label: string;
  ok: boolean;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-2">
        {ok ? (
          <Check className="h-4 w-4 shrink-0 text-success" />
        ) : (
          <X className="h-4 w-4 shrink-0 text-danger" />
        )}
        <span className={ok ? "text-foreground" : "text-muted"}>{label}</span>
      </div>
      <div className="flex items-center gap-2">{trailing}</div>
    </div>
  );
}

function ConceptSection({
  concept,
  batchId,
}: {
  concept: BatchConcept;
  batchId: string;
}) {
  const runDeconstruct = useRunDeconstruct();
  const uploadConcept = useUploadConcept();
  const router = useRouter();
  const { actions, readiness } = concept;

  const conceptUploadPending = uploadConcept.isPending;
  const isGenerating = concept.generation_status === "in_progress";
  const canUpload =
    actions.can_upload &&
    !["uploading", "uploaded_paused", "launching", "active"].includes(
      concept.meta.upload_status ?? "",
    );
  const isUploaded = ["uploaded_paused", "active"].includes(
    concept.meta.upload_status ?? "",
  );
  const generationMessage = dispatchMessage(runDeconstruct.data);

  const rowFor = (key: keyof ConceptReadiness) =>
    CHECK_ORDER.find((c) => c.key === key)!;

  const frameRow = rowFor("frame_url");
  const creativeRow = rowFor("creative");
  const destinationRow = rowFor("destination_url");

  function openConcept(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button, a, input, textarea, select")) {
      return;
    }
    router.push(`/creatives/${concept.id}`);
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={openConcept}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`/creatives/${concept.id}`);
        }
      }}
      className="cursor-pointer rounded-2xl border border-border bg-panel p-4 transition-colors hover:border-accent/40 hover:bg-panel-hover"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-bold tracking-tight text-foreground">
          {concept.name}
        </p>
        {isUploaded && (
          <span className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent-dim/40 px-2 py-0.5 text-xs font-medium text-accent">
            <Check className="h-3 w-3" /> Uploaded
          </span>
        )}
      </div>

      {isGenerating && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-accent">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Generating copy…
        </p>
      )}
      {generationMessage && (
        <p className="mt-2 rounded-lg border border-warning/25 bg-warning/[0.07] px-3 py-2 text-xs leading-relaxed text-warning">
          {generationMessage}
        </p>
      )}
      <div className="mt-3 flex flex-col gap-2">
        <ReadinessRow
          label={frameRow.label}
          ok={readiness.frame_url}
          trailing={
            readiness.frame_url ? null : (
              <SyncHint>Sync or add in Notion then Sync</SyncHint>
            )
          }
        />
        <ReadinessRow
          label={creativeRow.label}
          ok={readiness.creative}
          trailing={
            <ActionButton
              onClick={() =>
                runDeconstruct.mutate({ batchId, conceptId: concept.id })
              }
              pending={isGenerating || runDeconstruct.isPending}
              disabled={!readiness.frame_url}
            >
              {readiness.creative ? "Re-run Creative" : "Run Creative"}
            </ActionButton>
          }
        />
        <ReadinessRow
          label={destinationRow.label}
          ok={readiness.destination_url}
          trailing={
            readiness.destination_url ? null : (
              <SyncHint>Sync or add in Notion then Sync</SyncHint>
            )
          }
        />
      </div>

      {canUpload && (
        <button
          type="button"
          onClick={() => uploadConcept.mutate({ batchId, conceptId: concept.id })}
          disabled={conceptUploadPending}
          className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {conceptUploadPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Upload Concept to Meta
        </button>
      )}
    </div>
  );
}

export function BatchCard({ id }: { id: string }) {
  const { data: batch, isLoading, isError } = useBatchSummary(id);
  const sync = useSyncBatch();

  if (isLoading) {
    return (
      <div className="flex flex-col rounded-2xl border border-border bg-panel p-5">
        <div className="skeleton h-6 w-40 rounded-md" />
        <div className="mt-4 space-y-2">
          <div className="skeleton h-20 rounded-xl" />
          <div className="skeleton h-20 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !batch) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-panel p-5">
        <h3 className="text-lg font-bold tracking-tight text-foreground">
          {id}
        </h3>
        <p className="text-sm text-muted">Couldn&apos;t load this batch.</p>
        <button
          type="button"
          onClick={() => sync.mutate(id)}
          disabled={sync.isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent-dim px-3 py-2 text-sm font-medium text-accent transition-colors hover:border-accent hover:bg-accent hover:text-black disabled:opacity-60"
        >
          {sync.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sync from Notion
        </button>
      </div>
    );
  }

  return <BatchBody batch={batch} />;
}

export function BatchBody({ batch }: { batch: Batch }) {
  const sync = useSyncBatch();
  const uploadBatch = useUploadBatch();
  const { reset: resetUpload } = uploadBatch;
  const ready = batch.readiness.is_ready;
  const hasConcepts = batch.readiness.total_concepts > 0;
  
  useEffect(() => {
    if (uploadBatch.isError) resetUpload();
  }, [batch, resetUpload, uploadBatch.isError]);

  return (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-panel p-5 transition-all hover:border-border-strong hover:bg-panel-hover">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-faint">
            Batch
          </p>
          <h3 className="mt-0.5 text-xl font-bold tracking-tight text-foreground">
            {batch.name}
          </h3>
        </div>

        {/* Top-right actions */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => sync.mutate(batch.id)}
            disabled={sync.isPending}
            title="Sync from Notion"
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-accent/40 bg-accent-dim px-3 text-sm font-medium text-accent transition-colors hover:border-accent hover:bg-accent hover:text-black disabled:opacity-60"
          >
            {sync.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>Sync Notion</span>
          </button>
          {batch.notion_url ? (
            <a
              href={batch.notion_url}
              target="_blank"
              rel="noreferrer"
              title="Open in Notion"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent-dim px-2.5 text-accent transition-colors hover:border-accent hover:bg-accent hover:text-black"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Notion</span>
            </a>
          ) : (
            <span
              title="No Notion URL"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-accent/20 bg-accent-dim/50 px-2.5 text-accent/50"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Notion</span>
            </span>
          )}
        </div>
      </div>

      {/* Upload Batch — only when every concept is ready */}
      {hasConcepts && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => uploadBatch.mutate(batch.id)}
            disabled={!ready || uploadBatch.isPending}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-black shadow-[0_0_22px_rgba(204,255,0,0.14)] transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-accent/40 disabled:text-black/60 disabled:shadow-none"
          >
            {uploadBatch.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload Batch to Meta
          </button>
          {!ready && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-warning">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {batch.readiness.ready_concepts}/{batch.readiness.total_concepts}{" "}
              concepts ready — all must be ready to upload.
            </p>
          )}
          {uploadBatch.isError && (
            <div className="mt-2 max-w-[440px] rounded-lg border border-danger/25 bg-danger/[0.07] px-3 py-2 text-left">
              <p className="flex items-start gap-1.5 text-xs leading-relaxed text-danger">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{uploadBatch.error.message}</span>
              </p>
              {"retryable" in uploadBatch.error && Boolean(uploadBatch.error.retryable) && (
                <p className="mt-1 text-[11px] text-warning">Safe to retry. Previously completed Meta steps will be reused.</p>
              )}
            </div>
          )}
          {uploadBatch.data?.results.some((result) => !result.ok) && (
            <div className="mt-2 max-w-[440px] space-y-1 rounded-lg border border-danger/25 bg-danger/[0.07] p-2 text-left">
              {uploadBatch.data.results.filter((result) => !result.ok).map((result) => {
                const concept = batch.concepts.find((item) => item.id === result.id);
                return (
                  <p key={result.id} className="text-xs leading-relaxed text-danger">
                    <span className="font-bold">{concept?.name ?? result.id}:</span>{" "}
                    {result.error ?? result.message ?? "Upload failed"}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Concepts */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-faint">
          Concepts
        </p>
        <Link
          href={`/creatives/${batch.id}`}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-accent/40 bg-accent-dim/40 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-black"
        >
          View Full Batch
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {batch.concepts.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-faint">
            <Layers className="h-4 w-4" /> No concepts in this batch yet.
          </p>
        ) : (
          batch.concepts.map((concept) => (
            <ConceptSection key={concept.id} concept={concept} batchId={batch.id} />
          ))
        )}
      </div>
    </div>
  );
}
