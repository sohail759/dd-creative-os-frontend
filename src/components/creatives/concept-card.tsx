"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ConceptSummary } from "@/lib/api/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

export function ConceptCard({ concept }: { concept: ConceptSummary }) {
  return (
    <Link
      href={`/creatives/${concept.id}`}
      className="group flex flex-col rounded-2xl border border-border bg-panel p-4 transition-all hover:border-border-strong hover:bg-panel-hover"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-sm font-bold tracking-tight text-foreground">
          {concept.name}
        </span>
        <StatusBadge status={concept.status} className="shrink-0" />
      </div>

      {(concept.phase || concept.angle || concept.awareness) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {/* Same phase chip the batch card uses, so a phase reads the same
              wherever it appears. */}
          {concept.phase && (
            <Chip
              label={concept.phase}
              className="border-blue-500/30 bg-blue-500/10 text-blue-400"
            />
          )}
          {concept.angle && <Chip label={concept.angle} />}
          {concept.awareness && <Chip label={concept.awareness} />}
        </div>
      )}

      {concept.variations?.length ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-1">
          <span className="mr-0.5 text-[10px] uppercase tracking-wider text-faint">
            Variations
          </span>
          {concept.variations.map((variation) => (
            <span
              key={variation.id}
              title={
                variation.hasCopy
                  ? `${variation.name} — ${variation.headlineCount} headlines`
                  : `${variation.name} — no copy yet`
              }
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                variation.hasCopy
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-border bg-white/5 text-faint",
              )}
            >
              {variation.language}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-end gap-1 pt-3 text-xs font-medium text-muted opacity-0 transition-opacity group-hover:opacity-100">
        Open concept
        <ArrowUpRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}
