"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Play, Rocket, Upload, Video, Loader2 } from "lucide-react";
import type { Creative } from "@/lib/api";
import { displayModel } from "@/lib/utils";
import {
  useLaunchProduct,
  useUploadOptions,
  useUploadProduct,
  useUpdateFrameUrl,
} from "@/hooks/use-meta-actions";
import { useMetaProgress } from "@/hooks/use-meta-progress";
import { UploadProgress } from "./upload-progress";

const META_LABEL: Record<NonNullable<Creative["metaState"]>, string> = {
  not_uploaded: "Not Uploaded",
  uploading: "Uploading…",
  uploaded_paused: "Uploaded — Paused",
  launching: "Launching…",
  active: "Active",
  failed: "Failed",
};

const META_STYLE: Record<NonNullable<Creative["metaState"]>, string> = {
  not_uploaded: "border-white/10 text-muted",
  uploading: "border-accent/40 text-accent",
  uploaded_paused: "border-warning/40 text-warning",
  launching: "border-accent/40 text-accent",
  active: "border-emerald-500/40 text-emerald-400",
  failed: "border-red-500/40 text-red-400",
};

export function MetaControls({
  creative,
  compact = false,
}: {
  creative: Creative;
  compact?: boolean;
}) {
  const [showUpload, setShowUpload] = useState(false);
  const [showFrameInput, setShowFrameInput] = useState(false);
  const [showLaunchConfirm, setShowLaunchConfirm] = useState(false);
  const [frameInput, setFrameInput] = useState(creative.frameUrl ?? "");
  const uploadOptions = useUploadOptions(creative.id, showUpload);
  const upload = useUploadProduct();
  const launch = useLaunchProduct();
  const updateFrameUrl = useUpdateFrameUrl();

  const metaState = creative.metaState ?? "not_uploaded";
  const visibleMetaState = metaState === "failed" ? "not_uploaded" : metaState;
  const hasGeneratedCopy =
    (creative.headlines?.length ?? 0) > 0 &&
    (creative.primary_texts?.length ?? 0) > 0;

  const isUploading = metaState === "uploading";
  const progress = useMetaProgress(creative.id, isUploading);

  // Batch -> Concept rule: only concepts carry a `Parent item` relation and
  // only concepts own upload state. Batches/standalone products never show the
  // Upload / Launch / Add Frame URL controls (they aggregate concepts).
  const isConcept = (creative.parentItem?.length ?? 0) > 0;

  const canUpload = metaState === "not_uploaded" || metaState === "failed";
  const canLaunch = metaState === "uploaded_paused";
  const busy =
    metaState === "uploading" ||
    metaState === "launching" ||
    upload.isPending ||
    launch.isPending;

  const defaults = useMemo(() => {
    const options = uploadOptions.data;
    const campaignId =
      Object.values(options?.campaign_options ?? {})[0] ?? "";
    const pageId = options?.page_options?.[0]?.id ?? "";
    return {
      ad_account_id: options?.ad_account_id ?? "",
      campaign_id: campaignId,
      adset_name: `${creative.name || creative.product} - (F)`,
      ad_name: creative.name || creative.product,
      page_id: pageId,
      body: creative.primary_texts[0] ?? "",
      title: creative.headlines[0] ?? creative.product,
      link_url: options?.product_url ?? "",
      call_to_action: options?.default_cta ?? "SHOP_NOW",
      image: "",
      video: options?.video_url ?? "",
    };
  }, [uploadOptions.data, creative]);

  const onLaunch = () => {
    setShowLaunchConfirm(true);
  };

  return (
    <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-2"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${META_STYLE[visibleMetaState]}`}
        >
          {META_LABEL[visibleMetaState]}
        </span>
        {(creative.generationStatus ?? "idle") === "in_progress" && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            {displayModel(creative.model) || "running"}
          </span>
        )}
      </div>

      <div className="flex w-full flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Frame URL / Upload / Launch are concept-only controls. */}
          {isConcept && !creative.frameUrl && hasGeneratedCopy && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowFrameInput((v) => !v);
            }}
            disabled={updateFrameUrl.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-60"
          >
            <Video className="h-3.5 w-3.5" />
            Add Frame URL
          </button>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {isConcept && canUpload && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowUpload((v) => !v);
            }}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </button>
          )}

          {isConcept && canLaunch && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onLaunch();
            }}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-60"
          >
            <Rocket className="h-3.5 w-3.5" />
            Launch
          </button>
          )}
        </div>
      </div>

      {isConcept && !creative.frameUrl && !hasGeneratedCopy && (
        <p className="text-xs text-faint">
          Frame URL missing — upload Frame URL in Notion for this creative.
        </p>
      )}

      {isUploading && progress.data && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-3">
          <UploadProgress
            progressStage={progress.data.progress_stage}
            metaState={progress.data.meta_state}
            metaError={progress.data.meta_error}
          />
        </div>
      )}

      {showLaunchConfirm && (
        <LaunchConfirmDialog
          open={showLaunchConfirm}
          creative={creative}
          onConfirm={() => {
            setShowLaunchConfirm(false);
            launch.mutate({ id: creative.id });
          }}
          onCancel={() => setShowLaunchConfirm(false)}
          loading={launch.isPending}
        />
      )}

      {showFrameInput && hasGeneratedCopy && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          className="rounded-xl border border-border bg-panel p-3"
        >
          <label className="flex flex-col gap-1 text-xs text-muted">
            Frame URL
            <input
              value={frameInput}
              onChange={(e) => setFrameInput(e.target.value)}
              placeholder="https://next.frame.io/project/.../view/..."
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground"
            />
          </label>
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              onClick={() => setShowFrameInput(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                updateFrameUrl.mutate(
                  { id: creative.id, url: frameInput },
                  { onSuccess: () => setShowFrameInput(false) },
                );
              }}
              disabled={updateFrameUrl.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-60"
            >
              Save URL
            </button>
          </div>
          <p className="mt-2 text-[11px] text-faint">
            Saved locally as an override when Notion Frame URL is empty.
          </p>
        </div>
      )}

      {showUpload && canUpload && (
        <UploadForm
          key={JSON.stringify(defaults)}
          creative={creative}
          defaults={defaults}
          campaigns={uploadOptions.data?.campaign_options ?? {}}
          pages={uploadOptions.data?.page_options ?? []}
          loading={uploadOptions.isLoading}
          busy={busy}
          onCancel={() => setShowUpload(false)}
          creativeTypeOptions={uploadOptions.data?.creative_type_options ?? []}
          onSubmit={(payload) => {
            upload.mutate(
              { id: creative.id, payload },
              { onSuccess: () => setShowUpload(false) },
            );
          }}
        />
      )}
    </div>
  );
}

function UploadForm({
  creative,
  defaults,
  campaigns,
  pages,
  loading,
  busy,
  onCancel,
  onSubmit,
  creativeTypeOptions = [],
}: {
  creative: Creative;
  defaults: {
    ad_account_id: string;
    campaign_id: string;
    adset_name: string;
    ad_name: string;
    page_id: string;
    body: string;
    title: string;
    link_url: string;
    call_to_action: string;
    image: string;
    video: string;
  };
  campaigns: Record<string, string>;
  pages: Array<{ id: string; name: string }>;
  loading: boolean;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: {
    ad_account_id?: string;
    campaign_id: string;
    adset_name: string;
    ad_name: string;
    page_id: string;
    body: string;
    title: string;
    bodies?: string[];
    titles?: string[];
    link_url: string;
    call_to_action: string;
    image?: string;
    video?: string;
    creative_type: string;
  }) => void;
  creativeTypeOptions: Array<{ value: string; label: string }>;
}) {
  const [form, setForm] = useState({ ...defaults, creative_type: "standard" });
  const [validationError, setValidationError] = useState<string>("");

  if (loading) {
    return <p className="text-xs text-muted">Loading upload options…</p>;
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      className="mt-1 rounded-xl border border-border bg-panel p-3"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-faint">
        Upload Configuration
      </p>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Field
          label="Ad Account"
          value={form.ad_account_id}
          onChange={(v) => setForm((s) => ({ ...s, ad_account_id: v }))}
          required
        />

        <label className="flex flex-col gap-1 text-xs text-muted">
          Campaign
          <select
            value={form.campaign_id}
            onChange={(e) => setForm((s) => ({ ...s, campaign_id: e.target.value }))}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground"
          >
            {Object.entries(campaigns).map(([lang, campaignId]) => (
              <option key={`${lang}-${campaignId}`} value={campaignId}>
                {lang} — {campaignId}
              </option>
            ))}
          </select>
        </label>

        <Field
          label="Ad Set Name"
          value={form.adset_name}
          onChange={(v) => setForm((s) => ({ ...s, adset_name: v }))}
          required
        />
        <Field
          label="Ad Name"
          value={form.ad_name}
          onChange={(v) => setForm((s) => ({ ...s, ad_name: v }))}
          required
        />

        <label className="flex flex-col gap-1 text-xs text-muted">
          Page
          <select
            value={form.page_id}
            onChange={(e) => setForm((s) => ({ ...s, page_id: e.target.value }))}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground"
          >
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.name} — {page.id}
              </option>
            ))}
          </select>
        </label>

        <Field
          label="CTA"
          value={form.call_to_action}
          onChange={(v) => setForm((s) => ({ ...s, call_to_action: v }))}
          required
        />

        <label className="flex flex-col gap-1 text-xs text-muted">
          Creative Type
          <select
            value={form.creative_type}
            onChange={(e) => setForm((s) => ({ ...s, creative_type: e.target.value }))}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground"
          >
            {creativeTypeOptions.map((opt: { value: string; label: string }) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <Field
          label="Headline"
          value={form.title}
          onChange={(v) => setForm((s) => ({ ...s, title: v }))}
          required
        />
        <Field
          label="Destination URL"
          value={form.link_url}
          onChange={(v) => setForm((s) => ({ ...s, link_url: v }))}
          required
        />

        <Field
          label="Image URL"
          value={form.image}
          onChange={(v) => setForm((s) => ({ ...s, image: v }))}
          placeholder="optional if video is set"
        />
        <Field
          label="Video URL"
          value={form.video}
          onChange={(v) => setForm((s) => ({ ...s, video: v }))}
          placeholder="optional if image is set"
        />
      </div>

      <label className="mt-2 flex flex-col gap-1 text-xs text-muted">
        Primary Text
        <textarea
          value={form.body}
          onChange={(e) => setForm((s) => ({ ...s, body: e.target.value }))}
          rows={4}
          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground"
        />
      </label>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            const link = (form.link_url || "").trim();
            const image = (form.image || "").trim();
            const video = (form.video || "").trim();
            if (!form.campaign_id || !form.page_id || !link) {
              setValidationError("Campaign, Page, and Destination URL are required.");
              return;
            }
            if (!image && !video) {
              setValidationError("Provide at least one media URL (Image or Video)." );
              return;
            }
            setValidationError("");
            onSubmit({
              ad_account_id: form.ad_account_id,
              campaign_id: form.campaign_id,
              adset_name: form.adset_name || `${creative.name || creative.product} - (F)`,
              ad_name: form.ad_name || creative.name || creative.product,
              page_id: form.page_id,
              body: form.body,
              title: form.title,
              bodies: (creative.primary_texts || []).filter(Boolean).slice(0, 5),
              titles: (creative.headlines || []).filter(Boolean).slice(0, 5),
              link_url: link,
              call_to_action: form.call_to_action,
              image: image || undefined,
              video: video || undefined,
              creative_type: form.creative_type,
            });
          }}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-60"
        >
          <Play className="h-3.5 w-3.5" />
          Confirm Upload
        </button>
      </div>
      {validationError && (
        <p className="mt-2 text-xs text-red-400">{validationError}</p>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      <input
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground"
      />
    </label>
  );
}

function LaunchConfirmDialog({
  open,
  creative,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  creative: Creative;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-foreground">Launch Ad</h3>
        <p className="mt-2 text-sm text-muted whitespace-pre-line">
          {"Are you sure you want to launch this ad?\n\nThis will make the Meta Ad active.\n\nProduct: " +
            (creative.name || creative.product || creative.id)}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Launching...
              </span>
            ) : (
              "Launch Ad"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
