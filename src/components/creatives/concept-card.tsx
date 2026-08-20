"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ConceptSummary } from "@/lib/api/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { Chip } from "@/components/ui/chip";

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

      {(concept.angle || concept.awareness) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {concept.angle && <Chip label={concept.angle} />}
          {concept.awareness && <Chip label={concept.awareness} />}
        </div>
      )}

      <div className="mt-auto flex items-center justify-end gap-1 pt-3 text-xs font-medium text-muted opacity-0 transition-opacity group-hover:opacity-100">
        Open concept
        <ArrowUpRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}
