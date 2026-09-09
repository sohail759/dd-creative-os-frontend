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
  Rocket,
  Sparkles,
} from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useBatchConceptRun, formatRunTime, formatDuration } from "@/hooks/use-concept-run";
import { useLaunchProduct } from "@/hooks/use-meta-actions";
import { AdTypeBadge } from "./ad-type-badge";
import { WorkflowBadges } from "./workflow-badge";
import { prettyUrl } from "@/lib/pretty-url";
import { MetaTargetList } from "./meta-target-list";
import {
  canWriteCopy,
  canUploadToMeta,
  canGenerateCopy,
  copyGenerationBlocked,
} from "@/lib/batch-phase";
import type {
  Batch,
  BatchConcept,
  ConceptReadiness,
} from "@/lib/api/types";
import {
  useBatchSummary,
  useRunDeconstruct,
  useSyncBatch,
  useCopywriteBatch,
  useLaunchBatch,
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
  title,
  children,
}: {
  onClick: () => void;
  pending?: boolean;
  disabled?: boolean;
  /** Why the button is disabled — the only place a greyed-out control can
      explain itself. */
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={pending || disabled}
      title={title}
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
  batchPhase,
}: {
  concept: BatchConcept;
  batchId: string;
  /** The parent batch's phase — a concept can only be uploaded once its
      batch has reached the Upload stage, whatever its own readiness says. */
  batchPhase?: string | null;
}) {
  const runDeconstruct = useRunDeconstruct();
  const uploadConcept = useUploadConcept();
  const router = useRouter();
  const { actions, readiness } = concept;

  const launchConcept = useLaunchProduct();
  // Server state first, so an upload started here is still shown as running
  // after a navigation — the same reason the batch button reads
  // `batch.upload` rather than a mutation's local flag.
  const isUploading = Boolean(concept.meta.in_flight) || uploadConcept.isPending;
  const isLaunching =
    concept.meta.upload_status === "launching" || launchConcept.isPending;
  const conceptUploadPending = isUploading;
  const isGenerating = concept.generation_status === "in_progress";
  // `actions.can_upload` is readiness only — the server deliberately keeps
  // it that way so the "n/m concepts ready" warning stays accurate. The
  // phase is the second half of the rule and is applied here, where the
  // parent batch is in scope.
  // Two separate questions, conflated before: whether the button belongs on
  // this card at all, and whether it can be pressed right now. Folding
  // "uploading" into the first made the button VANISH the moment an upload
  // started, so a running upload showed no control and no loader — the state
  // it is most important to see.
  const uploadSlotVisible =
    actions.can_upload &&
    canUploadToMeta(batchPhase) &&
    !["uploaded_paused", "launching", "active"].includes(
      concept.meta.upload_status ?? "",
    );
  const canUpload = uploadSlotVisible && !isUploading;
  const isUploaded = ["uploaded_paused", "active"].includes(
    concept.meta.upload_status ?? "",
  );
  const isLive = concept.meta.upload_status === "active";
  const canLaunch =
    concept.meta.upload_status === "uploaded_paused" && !isLaunching && !isUploading;
  const generationMessage = dispatchMessage(runDeconstruct.data);
  // The last run for this concept, so a failure is visible on the card and
  // not only on the concept page. Polls while it is generating.
  const run = useBatchConceptRun(concept, isGenerating);

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
      <div className="flex items-start justify-between gap-3">
        {/* Name and type read as one label. They were siblings of a
            `justify-between` container, which pushed the type across the
            card to sit with the status badge — so a concept's own property
            looked like part of its Meta state. */}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="min-w-0 break-words text-base font-bold tracking-tight text-foreground">
            {concept.name}
          </p>
          <AdTypeBadge type={concept.ad_type} />
          {/* The concept's own Notion phase and status. A concept does not
              always match its batch — one can be at Checkpoint while its
              siblings are still being written — and that was invisible
              without opening Notion. */}
          <WorkflowBadges phase={concept.phase} status={concept.status} />
        </div>
        {isLive ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
            <Rocket className="h-3 w-3" /> Live
          </span>
        ) : isUploaded ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent-dim/40 px-2 py-0.5 text-xs font-medium text-accent">
            <Check className="h-3 w-3" /> Uploaded
          </span>
        ) : null}
      </div>

      {/* The Meta half of the card, shown the way copy generation already is:
          a spinner and a line of text while it runs, the failure when it
          does not. Without this an upload looked like nothing was happening. */}
      {isUploading && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-accent">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {concept.meta.progress_label
            ? `Uploading to Meta — ${concept.meta.progress_label.toLowerCase()}…`
            : "Uploading to Meta…"}
        </p>
      )}
      {isLaunching && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-accent">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {concept.meta.progress_label
            ? `Launching on Meta — ${concept.meta.progress_label.toLowerCase()}…`
            : "Launching on Meta…"}
        </p>
      )}
      {concept.meta.upload_status === "failed" && concept.meta.error && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-danger/25 bg-danger/[0.07] px-3 py-2 text-xs leading-relaxed text-danger">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="break-words">{concept.meta.error}</span>
        </p>
      )}

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
      {!isGenerating && run.error && (
        <div className="mt-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2">
          <p className="flex items-start gap-1.5 text-xs font-semibold text-danger">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="break-words">{run.error}</span>
          </p>
          <p className="mt-1 pl-5 text-[11px] text-muted">
            {run.failedStepLabel ? `Stopped at "${run.failedStepLabel}" · ` : ""}
            {formatRunTime(run.finishedAt ?? run.startedAt)}
            {run.durationSeconds ? ` · took ${formatDuration(run.durationSeconds)}` : ""}
          </p>
        </div>
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
            // Decided from the CONCEPT's phase and its own copy, not the
            // batch's phase — see `canGenerateCopy`.
            canGenerateCopy(concept.phase, readiness.creative) ? (
              <ActionButton
                onClick={() =>
                  runDeconstruct.mutate({ batchId, conceptId: concept.id })
                }
                pending={isGenerating || runDeconstruct.isPending}
                disabled={copyGenerationBlocked(readiness.frame_url)}
                title={
                  copyGenerationBlocked(readiness.frame_url)
                    ? "Needs a Creative URL first — sync, or add one in Notion then sync"
                    : undefined
                }
              >
                {readiness.creative ? "Re-Generate Copy" : "Generate Copy"}
              </ActionButton>
            ) : null
          }
        />
        <ReadinessRow
          label={destinationRow.label}
          ok={readiness.destination_url}
          trailing={
            readiness.destination_url ? (
              // The row said only whether a URL existed. Which URL is the
              // part worth checking before an upload sends traffic to it.
              <a
                href={concept.destination_url ?? undefined}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                title={concept.destination_url ?? ""}
                className="max-w-[220px] truncate text-xs text-muted underline decoration-border underline-offset-2 hover:text-foreground hover:decoration-foreground"
              >
                {prettyUrl(concept.destination_url)}
              </a>
            ) : (
              <SyncHint>Sync or add in Notion then Sync</SyncHint>
            )
          }
        />
      </div>

      {uploadSlotVisible && (
        <button
          type="button"
          onClick={() => uploadConcept.mutate({ batchId, conceptId: concept.id })}
          disabled={!canUpload}
          className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {isUploading
            ? concept.meta.progress_label
              ? `${concept.meta.progress_label}…`
              : "Uploading…"
            : "Upload Concept to Meta"}
        </button>
      )}

      {/* The Meta objects this concept became. Only shown once it has
          actually been through Meta — a record derived from the Notion
          phase has no ids behind it and says so instead of showing blanks. */}
      {isUploaded && (
        concept.meta.from_phase ? (
          <p className="mt-3 border-t border-border/60 pt-2 text-[10px] text-faint">
            State taken from the Notion phase — no Meta object ids recorded.
          </p>
        ) : (
          <MetaTargetList
            className="mt-3 border-t border-border/60 pt-2"
            targets={{
              page_name: concept.meta.page_name,
              page_id: concept.meta.page_id,
              campaign_name: concept.meta.campaign_name,
              adset_name: concept.meta.adset_name,
              ad_name: concept.meta.ad_name,
            }}
            ids={{
              campaign_id: concept.meta.campaign_id,
              adset_id: concept.meta.adset_id,
              creative_id: concept.meta.creative_id,
              ad_id: concept.meta.ad_id,
            }}
          />
        )
      )}

      {/* Launch sits beside Upload on the concept itself, not only on the
          batch: a concept that is uploaded and paused is the unit you
          actually set live. */}
      {isUploaded && !isLive && (
        <button
          type="button"
          onClick={() => launchConcept.mutate({ id: concept.id })}
          disabled={!canLaunch}
          className="mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-accent/40 bg-accent-dim/30 px-3 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-dim/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLaunching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Rocket className="h-4 w-4" />
          )}
          {isLaunching ? "Launching…" : "Launch Concept"}
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
  const launchBatch = useLaunchBatch();
  const copywriteBatch = useCopywriteBatch();
  const { reset: resetUpload } = uploadBatch;
  const ready = batch.readiness.is_ready;
  const hasConcepts = batch.readiness.total_concepts > 0;

  // Server state first, the in-flight mutation second — so the button is
  // still busy after a navigation, and idle only when the server agrees.
  // Copy first: a batch has to be written before it can be uploaded, so the
  // Generate button takes the slot until every concept has content.
  const copy = batch.copy;
  const copyGenerating = copy.is_generating || copywriteBatch.isPending;
  // Only while the batch is still being written. Offering "Generate" on a
  // batch already at Upload or Active invites regenerating copy that is
  // live in Meta.
  const isWriting = canWriteCopy(batch.phase);
  const needsCopy = isWriting && copy.needs_copy.length > 0;
  const canGenerateCopy = copy.can_generate && !copywriteBatch.isPending;

  const uploading = batch.upload.is_uploading || uploadBatch.isPending;
  // Server state first, the in-flight mutation second, so the loader
  // survives a navigation instead of dying with the component.
  const syncing = Boolean(batch.sync?.is_syncing) || sync.isPending;
  const launchingServer = batch.upload.in_flight > 0 && batch.upload.all_uploaded;
  const launching = launchingServer || launchBatch.isPending;
  const allUploaded = batch.upload.all_uploaded;
  const allLaunched = batch.upload.all_launched;
  const canLaunch = allUploaded && !allLaunched && !launching && !uploading;
  // The missing half of the rule above. This block was gated on readiness
  // alone, so a batch still at Write whose concepts happened to have a
  // creative URL, content and a destination URL offered to push them to
  // Meta — before the writing stage had handed the batch on.
  const showMeta = hasConcepts && canUploadToMeta(batch.phase);
  
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
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              {batch.name}
            </h3>
            <WorkflowBadges phase={batch.phase} status={batch.status} />
          </div>
        </div>

        {/* Top-right actions */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => sync.mutate(batch.id)}
            disabled={syncing}
            title={
              syncing
                ? batch.sync?.stage
                  ? `Syncing from Notion — ${batch.sync.stage}`
                  : "Syncing from Notion"
                : "Sync from Notion"
            }
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-accent/40 bg-accent-dim px-3 text-sm font-medium text-accent transition-colors hover:border-accent hover:bg-accent hover:text-black disabled:opacity-60"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>{syncing ? "Syncing…" : "Sync Notion"}</span>
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

      {/* Upload / Launch — one button, driven by the batch's own state.
          `uploadBatch.isPending` alone was not enough: it is a mutation's
          local state, so navigating away and back showed an idle button
          while the upload was still running. `batch.upload` comes from the
          server, so it survives the round trip. */}
      {/* Generate Batch Copy — only while some concept still lacks content.
          Disabled until every concept has a Creative URL: writing only the
          ones that happen to have a URL leaves the batch half-written and
          the gap is invisible afterwards. */}
      {hasConcepts && needsCopy && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => copywriteBatch.mutate(batch.id)}
            disabled={!canGenerateCopy}
            title={
              copy.missing_creative_url.length > 0
                ? `Waiting on a Creative URL for ${copy.missing_creative_url.join(", ")}`
                : "Write copy for every concept that does not have it yet"
            }
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-accent/40 bg-accent-dim/40 px-4 py-2 text-sm font-bold text-accent transition-all hover:border-accent hover:bg-accent hover:text-black disabled:cursor-not-allowed disabled:border-border disabled:bg-surface disabled:text-faint"
          >
            {copyGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {copyGenerating
              ? `Writing copy ${copy.total - copy.needs_copy.length}/${copy.total}…`
              : `Generate Batch Copy (${copy.needs_copy.length})`}
          </button>
          {copy.missing_creative_url.length > 0 && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-warning">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {copy.with_creative_url}/{copy.total} concepts have a Creative URL —
              all are needed before writing.
            </p>
          )}
        </div>
      )}

      {showMeta && (
        <div className="mt-3">
          {allUploaded ? (
            <button
              type="button"
              onClick={() => launchBatch.mutate(batch.id)}
              disabled={!canLaunch}
              title={
                allLaunched
                  ? "Every concept is already live"
                  : "Set every uploaded ad to ACTIVE"
              }
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-black shadow-[0_0_22px_rgba(204,255,0,0.14)] transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-accent/40 disabled:text-black/60 disabled:shadow-none"
            >
              {launching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {allLaunched
                ? "Batch Launched"
                : launching
                  ? `Launching ${batch.upload.launched}/${batch.upload.total}…`
                  : "Launch Batch to Meta"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => uploadBatch.mutate(batch.id)}
              disabled={!ready || uploading}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-black shadow-[0_0_22px_rgba(204,255,0,0.14)] transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-accent/40 disabled:text-black/60 disabled:shadow-none"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading
                ? `Uploading ${batch.upload.uploaded}/${batch.upload.total}…`
                : "Upload Batch to Meta"}
            </button>
          )}
          {uploading && (
            <p className="mt-1.5 text-xs text-muted">
              Uploading every concept to Meta, paused. This keeps running if
              you navigate away.
            </p>
          )}
          {batch.upload.failed.length > 0 && !uploading && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-danger">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Upload failed for {batch.upload.failed.join(", ")}
            </p>
          )}
          {!ready && !allUploaded && (
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
            <ConceptSection key={concept.id} concept={concept} batchId={batch.id} batchPhase={batch.phase} />
          ))
        )}
      </div>
    </div>
  );
}
