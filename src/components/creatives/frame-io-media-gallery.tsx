"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Loader2, Play, RefreshCw, X, ExternalLink } from "lucide-react";
import { useFrameAssets, useRefreshFrameAssets } from "@/hooks/use-meta-actions";

type Props = {
  productId: string;
  frameUrl?: string | null;
};

type Preview = {
  type: "video" | "image";
  url: string;
  name?: string | null;
};

export function FrameIoMediaGallery({ productId, frameUrl }: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const query = useFrameAssets(productId, Boolean(frameUrl));
  const refreshMedia = useRefreshFrameAssets(productId);

  const assets = useMemo(() => query.data?.assets ?? [], [query.data]);

  if (!frameUrl) return null;

  if (query.isLoading) {
    return (
      <section className="rounded-2xl border border-border bg-panel p-4">
        <p className="inline-flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Frame.io media...
        </p>
      </section>
    );
  }

  if (query.isError) {
    return (
      <section className="rounded-2xl border border-border bg-panel p-4">
        <p className="text-sm text-red-400">Unable to load Frame.io media.</p>
        <button
          onClick={() => refreshMedia.mutate()}
          disabled={refreshMedia.isPending}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          {refreshMedia.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Retry
        </button>
      </section>
    );
  }

  if (query.data?.error) {
    return (
      <section className="rounded-2xl border border-border bg-panel p-4">
        <p className="text-sm text-red-400">{query.data.error}</p>
        {frameUrl && (
          <a
            href={frameUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in Frame.io
          </a>
        )}
        <button
          onClick={() => refreshMedia.mutate()}
          disabled={refreshMedia.isPending}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          {refreshMedia.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Retry
        </button>
      </section>
    );
  }

  if (!assets.length) {
    return (
      <section className="rounded-2xl border border-border bg-panel p-4">
        <p className="text-sm text-muted">No media preview is cached for this Creative URL.</p>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => refreshMedia.mutate()}
            disabled={refreshMedia.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            {refreshMedia.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh media
          </button>
          <a href={frameUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
            <ExternalLink className="h-3.5 w-3.5" /> Open Creative URL
          </a>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-border bg-panel p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">
            Product Media
          </h3>
          <a
            href={frameUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 truncate text-xs font-medium text-accent hover:underline"
            title={frameUrl}
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{frameUrl}</span>
          </a>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset, index) => (
            <button
              key={asset.id || `${asset.url}-${index}`}
              onClick={() =>
                setPreview({
                  type: asset.type,
                  url: asset.url,
                  name: asset.name,
                })
              }
              className="group overflow-hidden rounded-xl border border-border bg-surface text-left"
              title={asset.name || undefined}
            >
              {asset.type === "video" ? (
                <video
                  src={asset.url}
                  controls
                  preload="metadata"
                  className="h-44 w-full bg-black object-cover"
                  onClick={(event) => event.stopPropagation()}
                />
              ) : (
                <Image
                  src={asset.thumbnail_url || asset.url}
                  alt={asset.name || `Frame image ${index + 1}`}
                  width={800}
                  height={450}
                  unoptimized
                  className="h-44 w-full bg-black object-cover"
                />
              )}
              <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted transition-colors group-hover:text-foreground">
                <span className="truncate">
                  {asset.name || `${asset.type === "video" ? "Video" : "Image"} ${index + 1}`}
                </span>
                {asset.type === "video" && <Play className="h-3.5 w-3.5 shrink-0" />}
              </div>
            </button>
          ))}
        </div>
      </section>

      {preview && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4">
          <button
            onClick={() => setPreview(null)}
            className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/30 p-2 text-white hover:bg-black/50"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="w-full max-w-5xl rounded-2xl border border-white/20 bg-black/40 p-3">
            {preview.type === "video" ? (
              <video src={preview.url} controls autoPlay className="max-h-[80vh] w-full rounded-lg bg-black" />
            ) : (
              <Image
                src={preview.url}
                alt={preview.name || "Frame image"}
                width={1600}
                height={900}
                unoptimized
                className="max-h-[80vh] w-full rounded-lg object-contain"
              />
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
