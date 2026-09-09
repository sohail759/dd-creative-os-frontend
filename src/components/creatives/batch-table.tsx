"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Check, ExternalLink, Layers3, Loader2, RefreshCw, Upload, X, Rocket, Sparkles } from "lucide-react";
import type { Batch, BatchConcept, Creative } from "@/lib/api/types";
import { useBatchSummary, useCopywriteBatch, useLaunchBatch, useRunDeconstruct, useSyncBatch, useUploadBatch, useUploadConcept } from "@/hooks/use-batch";
import { useRouter } from "next/navigation";
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
import { useBatchConceptRun, formatRunTime } from "@/hooks/use-concept-run";

function dispatchMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  for (const key of ["instruction", "error", "reason", "message"]) {
    if (typeof data[key] === "string" && data[key]) return data[key];
  }
  return dispatchMessage(data.payload);
}

function CheckCell({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex min-w-[130px] items-center gap-2">
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border ${ok ? "border-success/20 bg-success/10 text-success" : "border-danger/20 bg-danger/[0.07] text-danger"}`}>
        {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      </span>
      <div><p className={`text-xs font-semibold ${ok ? "text-foreground" : "text-muted"}`}>{ok ? "Ready" : "Missing"}</p><p className="text-[10px] text-faint">{label}</p></div>
    </div>
  );
}

function MiniButton({ onClick, pending, disabled, title, children }: { onClick: () => void; pending?: boolean; disabled?: boolean; title?: string; children: React.ReactNode }) {
  return (
    <button type="button" title={title} onClick={(event) => { event.stopPropagation(); onClick(); }} disabled={pending || disabled} className="mt-2 inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-accent/40 bg-accent-dim px-2.5 text-[11px] font-semibold text-accent hover:border-accent hover:bg-accent hover:text-black disabled:opacity-50">
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{children}
    </button>
  );
}

function ConceptRow({ concept, batchId, batchPhase }: { concept: BatchConcept; batchId: string; batchPhase?: string | null }) {
  const deconstruct = useRunDeconstruct();
  const upload = useUploadConcept();
  const launch = useLaunchProduct();
  const router = useRouter();
  const isGenerating = concept.generation_status === "in_progress";
  // Readiness AND phase, matching the card view. `can_upload` from the
  // server is readiness alone by design.
  // Visible vs. pressable, kept apart — see the card view. Folding
  // "uploading" into visibility dropped the row through to the disabled
  // placeholder, which reads "complete all readiness checks" at exactly the
  // moment the upload is running.
  const uploadSlotVisible =
    concept.actions.can_upload &&
    canUploadToMeta(batchPhase) &&
    !["uploaded_paused", "launching", "active"].includes(
      concept.meta.upload_status ?? "",
    );
  const isUploaded = ["uploaded_paused", "active"].includes(
    concept.meta.upload_status ?? "",
  );
  const isLive = concept.meta.upload_status === "active";
  // Server state first: a mutation's local flag is lost on navigation, so
  // coming back to the table showed an idle row mid-upload.
  const isUploading = Boolean(concept.meta.in_flight) || upload.isPending;
  const isLaunching =
    concept.meta.upload_status === "launching" || launch.isPending;
  const canLaunch =
    concept.meta.upload_status === "uploaded_paused" && !isLaunching && !isUploading;
  const generationMessage = dispatchMessage(deconstruct.data);
  // Same run the concept page shows, so a failure is visible in the table too.
  const run = useBatchConceptRun(concept, isGenerating);

  function openConcept(event: React.MouseEvent<HTMLTableRowElement>) {
    // Buttons and links inside the row keep their own behaviour.
    if ((event.target as HTMLElement).closest("button, a, input, textarea, select")) {
      return;
    }
    router.push(`/creatives/${concept.id}`);
  }

  return (
    <tr
      onClick={openConcept}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`/creatives/${concept.id}`);
        }
      }}
      tabIndex={0}
      role="link"
      title={`Open ${concept.name}`}
      className="group cursor-pointer border-b border-border/60 bg-panel hover:bg-panel-hover/70"
    >
      <td className="sticky left-0 z-10 min-w-[270px] bg-panel py-4 pl-6 pr-4 group-hover:bg-[#1b1c20]">
        <div className="flex items-start">
          <span className="relative mr-3 mt-0.5 h-8 w-6 shrink-0 border-b border-l border-accent/60"><span className="absolute -left-px -top-5 h-5 border-l border-accent/60" /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-bold text-foreground">{concept.name}</span><AdTypeBadge type={concept.ad_type} size="sm" /><WorkflowBadges phase={concept.phase} status={concept.status} size="sm" />{isLive ? <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">Live</span> : isUploaded && <span className="rounded-full border border-accent/30 bg-accent-dim px-2 py-0.5 text-[10px] font-bold text-accent">Uploaded</span>}</div>
            {/* The Meta objects this concept became. A record derived from
                the Notion phase has no ids behind it and says so. */}
            {isUploaded && (concept.meta.from_phase ? (
              <p className="mt-1 text-[10px] text-faint">State from Notion phase — no Meta ids recorded.</p>
            ) : (
              <MetaTargetList
                className="mt-1"
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
            ))}
            {isGenerating && <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-accent"><Loader2 className="h-3 w-3 animate-spin" />Generating creative…</p>}
            {generationMessage && <p className="mt-1 rounded-md border border-warning/25 bg-warning/[0.07] px-2 py-1.5 text-[10px] leading-relaxed text-warning">{generationMessage}</p>}
            {!isGenerating && run.error && (
              <div className="mt-1 rounded-md border border-danger/30 bg-danger/10 px-2 py-1.5">
                <p className="flex items-start gap-1 text-[10px] font-semibold leading-relaxed text-danger">
                  <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
                  <span className="break-words">{run.error}</span>
                </p>
                <p className="mt-0.5 pl-4 text-[10px] text-muted">
                  {run.failedStepLabel ? `Stopped at "${run.failedStepLabel}" · ` : ""}
                  {formatRunTime(run.finishedAt ?? run.startedAt)}
                </p>
              </div>
            )}
            {/* The Meta half, given the same treatment as copy generation:
                a spinner and the running step while it works, the error when
                it fails. The plain status word alone read as idle. */}
            {(isUploading || isLaunching) ? (
              <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-accent">
                <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                <span className="truncate">
                  {isLaunching ? "Launching" : "Uploading"}
                  {concept.meta.progress_label ? ` — ${concept.meta.progress_label.toLowerCase()}` : ""}…
                </span>
              </p>
            ) : concept.meta.upload_status === "failed" && concept.meta.error ? (
              <p className="mt-1 flex items-start gap-1 text-[10px] font-semibold leading-relaxed text-danger">
                <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
                <span className="break-words">{concept.meta.error}</span>
              </p>
            ) : (
              <p className="mt-1 truncate text-[11px] capitalize text-faint">{concept.meta.upload_status?.replaceAll("_", " ")}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-4"><CheckCell ok={concept.readiness.frame_url} label="Creative URL" /></td>
      <td className="px-4 py-4"><CheckCell ok={concept.readiness.creative} label="Creative Content" />{canGenerateCopy(concept.phase, concept.readiness.creative) && <MiniButton onClick={() => deconstruct.mutate({ batchId, conceptId: concept.id })} pending={isGenerating || deconstruct.isPending} disabled={copyGenerationBlocked(concept.readiness.frame_url)} title={copyGenerationBlocked(concept.readiness.frame_url) ? "Needs a Creative URL first — sync, or add one in Notion then sync" : undefined}>{concept.readiness.creative ? "Re-Generate Copy" : "Generate Copy"}</MiniButton>}</td>
      <td className="px-4 py-4">
        <CheckCell ok={concept.readiness.destination_url} label="Destination" />
        {concept.destination_url && (
          <a
            href={concept.destination_url}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            title={concept.destination_url}
            className="mt-1 block max-w-[200px] truncate text-[11px] text-muted underline decoration-border underline-offset-2 hover:text-foreground hover:decoration-foreground"
          >
            {prettyUrl(concept.destination_url)}
          </a>
        )}
      </td>
      <td className="sticky right-0 z-10 min-w-[180px] bg-panel px-5 py-4 text-right group-hover:bg-[#1b1c20]">
        <div className="flex items-center justify-end gap-2">
          {concept.notion_url && <a href={concept.notion_url} target="_blank" rel="noreferrer" title="Open concept in Notion" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-accent-dim text-accent hover:border-accent hover:bg-accent hover:text-black"><ExternalLink className="h-3.5 w-3.5" /></a>}
          {uploadSlotVisible ? (
            <button type="button" onClick={() => upload.mutate({ batchId, conceptId: concept.id })} disabled={isUploading} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-bold text-black shadow-[0_0_18px_rgba(204,255,0,0.12)] hover:bg-accent-hover disabled:opacity-50">{isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}{isUploading ? "Uploading…" : "Upload"}</button>
          ) : isUploaded && !isLive ? (
            <button type="button" onClick={() => launch.mutate({ id: concept.id })} disabled={!canLaunch} title="Set this ad to ACTIVE" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent-dim px-3 text-xs font-bold text-accent hover:border-accent hover:bg-accent hover:text-black disabled:opacity-50">{isLaunching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}{isLaunching ? "Launching…" : "Launch"}</button>
          ) : isLive ? (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 text-xs font-semibold text-success"><Rocket className="h-3.5 w-3.5" /> Live</span>
          ) : (
            <button type="button" disabled title={canUploadToMeta(batchPhase) ? "Complete all readiness checks before uploading" : `This batch is at ${batchPhase || "an earlier"} phase — it moves to Upload once its copy is written`} className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-faint opacity-60">
              <Upload className="h-3.5 w-3.5" /> Upload
            </button>
          )}
        </div>
        {concept.actions.sync_required && <p className="mt-2 flex items-center justify-end gap-1 text-[10px] font-medium text-warning"><AlertTriangle className="h-3 w-3" /> Sync required</p>}
        {upload.isError && (
          <div className="mt-2 ml-auto max-w-[320px] rounded-lg border border-danger/25 bg-danger/[0.07] px-3 py-2 text-left">
            <p className="flex items-start gap-1.5 text-[11px] font-semibold text-danger">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{upload.error.message}</span>
            </p>
            {"retryable" in upload.error && Boolean(upload.error.retryable) && (
              <p className="mt-1 text-[10px] text-warning">Safe to retry. Previously completed Meta steps will be reused.</p>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

function BatchParent({ batch }: { batch: Batch }) {
  const sync = useSyncBatch();
  const upload = useUploadBatch();
  const launchBatch = useLaunchBatch();
  const copywriteBatch = useCopywriteBatch();
  const { reset: resetUpload } = upload;
  const ready = batch.readiness.is_ready;
  const hasConcepts = batch.readiness.total_concepts > 0;

  const copy = batch.copy;
  const copyGenerating = copy.is_generating || copywriteBatch.isPending;
  const isWriting = canWriteCopy(batch.phase);
  const needsCopy = isWriting && copy.needs_copy.length > 0;
  const canGenerateCopy = copy.can_generate && !copywriteBatch.isPending;

  const uploadingBatch = batch.upload.is_uploading || upload.isPending;
  // Server state first — see the card view.
  const syncing = Boolean(batch.sync?.is_syncing) || sync.isPending;
  const launchingBatch =
    (batch.upload.in_flight > 0 && batch.upload.all_uploaded) || launchBatch.isPending;
  const allUploaded = batch.upload.all_uploaded;
  const allLaunched = batch.upload.all_launched;
  const canLaunchBatch =
    allUploaded && !allLaunched && !launchingBatch && !uploadingBatch;
  // Not before the Upload phase — the same rule the card view applies.
  const showMeta = hasConcepts && canUploadToMeta(batch.phase);
  
  useEffect(() => {
    if (upload.isError) resetUpload();
  }, [batch, resetUpload, upload.isError]);

  return (
    <tr>
      <td colSpan={6} className="border-y border-border-strong bg-surface/85 p-0 first:border-t-0">
        <div className="flex min-w-[1120px] items-center justify-between gap-6 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent-dim text-accent"><Layers3 className="h-5 w-5" /></span>
            <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Batch</p><div className="mt-1 flex min-w-0 flex-wrap items-center gap-2"><h3 className="truncate text-base font-bold text-foreground">{batch.name}</h3><WorkflowBadges phase={batch.phase} status={batch.status} size="sm" /></div><p className="mt-1 text-[11px] capitalize text-muted">{batch.readiness.total_concepts} concepts{batch.meta.upload_status ? ` · ${batch.meta.upload_status.replaceAll("_", " ")}` : ""}</p></div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => sync.mutate(batch.id)} disabled={syncing} title={syncing && batch.sync?.stage ? `Syncing — ${batch.sync.stage}` : undefined} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent-dim px-3 text-xs font-semibold text-accent hover:border-accent hover:bg-accent hover:text-black disabled:opacity-50">{syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}{syncing ? "Syncing…" : "Sync Notion"}</button>
            {batch.notion_url && <a href={batch.notion_url} target="_blank" rel="noreferrer" title="Open batch in Notion" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent-dim px-3 text-xs font-semibold text-accent hover:border-accent hover:bg-accent hover:text-black"><ExternalLink className="h-4 w-4" />Notion</a>}
            <div className="ml-1">
              {/* Same states as the card view, so the two never disagree. */}
              {needsCopy && (
                <button type="button" onClick={() => copywriteBatch.mutate(batch.id)} disabled={!canGenerateCopy} title={copy.missing_creative_url.length > 0 ? `Waiting on a Creative URL for ${copy.missing_creative_url.join(", ")}` : "Write copy for every concept that does not have it yet"} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-accent/40 bg-accent-dim px-4 text-sm font-bold text-accent hover:border-accent hover:bg-accent hover:text-black disabled:cursor-not-allowed disabled:border-border disabled:bg-surface disabled:text-faint">{copyGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{copyGenerating ? `Writing ${copy.total - copy.needs_copy.length}/${copy.total}…` : `Generate Batch Copy (${copy.needs_copy.length})`}</button>
              )}
              {showMeta && (allUploaded ? (
                <button type="button" onClick={() => launchBatch.mutate(batch.id)} disabled={!canLaunchBatch} className="inline-flex h-10 min-w-[190px] items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-extrabold text-black shadow-[0_0_24px_rgba(204,255,0,0.18)] hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-accent/40 disabled:text-black/60 disabled:shadow-none">{launchingBatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}{allLaunched ? "Batch Launched" : launchingBatch ? `Launching ${batch.upload.launched}/${batch.upload.total}…` : "Launch Batch to Meta"}</button>
              ) : (
                <button type="button" onClick={() => upload.mutate(batch.id)} disabled={!ready || !hasConcepts || uploadingBatch} className="inline-flex h-10 min-w-[190px] items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-extrabold text-black shadow-[0_0_24px_rgba(204,255,0,0.18)] hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-accent/40 disabled:text-black/60 disabled:shadow-none">{uploadingBatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{uploadingBatch ? `Uploading ${batch.upload.uploaded}/${batch.upload.total}…` : "Upload Batch to Meta"}</button>
              ))}
              {!ready && showMeta && <p className="mt-1.5 flex items-center justify-end gap-1.5 text-[11px] font-semibold text-warning"><AlertTriangle className="h-3.5 w-3.5" />{batch.readiness.ready_concepts}/{batch.readiness.total_concepts} concepts ready — all must be ready to upload.</p>}
              {upload.isError && (
                <div className="mt-2 max-w-[440px] rounded-lg border border-danger/25 bg-danger/[0.07] px-3 py-2 text-left">
                  <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-danger">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{upload.error.message}</span>
                  </p>
                  {"retryable" in upload.error && Boolean(upload.error.retryable) && (
                    <p className="mt-1 text-[10px] text-warning">Safe to retry. Previously completed Meta steps will be reused.</p>
                  )}
                </div>
              )}
              {upload.data?.results.some((result) => !result.ok) && (
                <div className="mt-2 max-w-[440px] space-y-1 rounded-lg border border-danger/25 bg-danger/[0.07] p-2 text-left">
                  {upload.data.results.filter((result) => !result.ok).map((result) => {
                    const concept = batch.concepts.find((item) => item.id === result.id);
                    return (
                      <p key={result.id} className="text-[10px] leading-relaxed text-danger">
                        <span className="font-bold">{concept?.name ?? result.id}:</span>{" "}
                        {result.error ?? "Upload failed"}
                        {result.retryable ? " Safe to retry." : ""}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
            <Link href={`/creatives/${batch.id}`} className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-full border border-accent/35 bg-accent-dim px-3.5 text-xs font-bold text-accent hover:bg-accent hover:text-black">View Full Batch <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </td>
    </tr>
  );
}

function BatchTree({ creative }: { creative: Creative }) {
  const { data: batch, isLoading, isError } = useBatchSummary(creative.id);
  const sync = useSyncBatch();
  if (isLoading) return <tr><td colSpan={6} className="border-b border-border p-5"><div className="skeleton h-16 rounded-xl" /></td></tr>;
  if (isError || !batch) return <tr><td colSpan={6} className="border-b border-border bg-surface/60 p-5"><div className="flex items-center justify-between"><div><p className="font-bold text-foreground">{creative.name}</p><p className="text-xs text-danger">Couldn&apos;t load batch details.</p></div><MiniButton onClick={() => sync.mutate(creative.id)} pending={sync.isPending}>Retry sync</MiniButton></div></td></tr>;
  return <><BatchParent batch={batch} />{batch.concepts.length ? batch.concepts.map((concept) => <ConceptRow key={concept.id} concept={concept} batchId={batch.id} batchPhase={batch.phase} />) : <tr><td colSpan={6} className="border-b border-border px-10 py-5 text-sm text-faint">No concepts in this batch yet.</td></tr>}</>;
}

export function BatchTable({ batches }: { batches: Creative[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between border-b border-border bg-surface/70 px-5 py-3"><div><p className="text-sm font-bold text-foreground">Batch workflow</p><p className="text-xs text-faint">Batches with their nested concepts and required actions</p></div><span className="rounded-full border border-border bg-panel px-2.5 py-1 text-xs font-semibold text-muted">{batches.length} {batches.length === 1 ? "batch" : "batches"}</span></div>
      <div className="custom-scrollbar max-h-[calc(100vh-250px)] min-h-[360px] overflow-auto">
        <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-left">
          <thead className="sticky top-0 z-30 bg-[#121316]/95 backdrop-blur-xl"><tr className="text-[10px] font-bold uppercase tracking-[0.14em] text-faint"><th className="sticky left-0 z-40 w-[280px] border-b border-border bg-[#121316] px-6 py-3">Batch / Concept</th><th className="w-[155px] border-b border-border px-4 py-3">Creative URL</th><th className="w-[175px] border-b border-border px-4 py-3">Deconstruct</th><th className="w-[175px] border-b border-border px-4 py-3">Copywriter</th><th className="w-[155px] border-b border-border px-4 py-3">Destination URL</th><th className="sticky right-0 z-40 w-[185px] border-b border-border bg-[#121316] px-5 py-3 text-right">Concept actions</th></tr></thead>
          <tbody>{batches.map((batch) => <BatchTree key={batch.id} creative={batch} />)}</tbody>
        </table>
      </div>
      <div className="flex justify-between border-t border-border bg-surface/40 px-5 py-2.5 text-[11px] text-faint"><span>Parent rows are batches; indented rows are concepts</span><span className="hidden sm:inline">Scroll horizontally to see all workflow columns</span></div>
    </div>
  );
}
