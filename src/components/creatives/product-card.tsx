"use client";

import Link from "next/link";
import { ArrowUpRight, Clock, Layers } from "lucide-react";
import type { Creative } from "@/lib/api/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { Chip } from "@/components/ui/chip";
import { GenerateButton } from "./generate-button";
import { MetaControls } from "./meta-controls";
import { displayModel, formatRelativeTime } from "@/lib/utils";

export function ProductCard({
  creative,
  statusParam,
}: {
  creative: Creative;
  statusParam?: string;
}) {
  const { id, name, brand, product, angle, awareness, headlines, primary_texts } =
    creative;
  const hasCopy = headlines.length > 0;
  // Batch -> Concept rule: only concepts carry a `Parent item` relation and
  // only concepts own upload state / generated copy. Batches aggregate
  // concepts, so their cards show neither the generate button nor upload
  // controls.
  const isConcept = (creative.parentItem?.length ?? 0) > 0;
  const generating =
    (creative.generationStatus ?? "idle") === "in_progress" && !hasCopy;
  const conceptCount = creative.conceptCount ?? 0;
  const statusQuery = statusParam ? `?status=${encodeURIComponent(statusParam)}` : "";

  return (
    <Link
      href={`/creatives/${id}${statusQuery}`}
      className="group relative flex flex-col rounded-2xl border border-border bg-panel p-5 transition-all hover:border-border-strong hover:bg-panel-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-faint">
            {brand}
          </p>
          <h3 className="mt-0.5 text-lg font-bold tracking-tight text-foreground">
            {product}
          </h3>
        </div>
        <div className="flex min-w-0 max-w-[78%] shrink-0 items-center gap-2">
          {name && (
            <span
              title={name}
              className="max-w-42.5 truncate rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-foreground"
            >
              {name}
            </span>
          )}
          {creative.model && (
            <span className="max-w-24 truncate rounded-md border border-white/5 bg-black/70 px-2 py-1 text-xs font-medium text-white">
              {displayModel(creative.model)}
            </span>
          )}
          <StatusBadge className="truncate max-sm:px-1" status={creative.status} />
        </div>
      </div>

      {(angle || awareness || creative.phase || conceptCount > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {angle && <Chip label={angle} />}
          {awareness && <Chip label={awareness} />}
          {creative.phase && (
            <Chip label={creative.phase} className="border-blue-500/30 bg-blue-500/10 text-blue-400" />
          )}
          {conceptCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent-dim/40 px-2 py-0.5 text-xs font-medium text-accent">
              <Layers className="h-3 w-3" />
              {conceptCount} concept{conceptCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      )}

      {isConcept && generating ? (
        <div className="mt-4">
          <GenerateButton creative={creative} />
        </div>
      ) : (
        <>
          {isConcept && hasCopy ? (
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
                  Headlines
                </p>
                <div className="flex flex-col gap-1.5">
                  {headlines.slice(0, 2).map((h, i) => (
                    <p
                      key={i}
                      className="rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-foreground"
                    >
                      {h}
                    </p>
                  ))}
                  {headlines.length > 2 && (
                    <p className="text-xs text-faint">
                      +{headlines.length - 2} more
                    </p>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
                  Primary Text
                </p>
                <p className="line-clamp-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-muted">
                  {primary_texts[0]}
                </p>
              </div>
            </div>
          ) : (
            isConcept && (
              <div className="mt-4">
                <GenerateButton creative={creative} />
              </div>
            )
          )}
        </>
      )}

      <div className="mt-4">
        <MetaControls creative={creative} compact />
      </div>

      <div className="mt-auto flex items-center justify-between pt-4">
        <div className="flex items-center gap-3 text-xs text-faint">
          {creative.lastEditedAt && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Edited {formatRelativeTime(creative.lastEditedAt)}
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted opacity-0 transition-opacity group-hover:opacity-100">
          View creative
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
