"use client";

import { cn } from "@/lib/utils";
import { CREATIVE_PHASES } from "@/lib/api/types";

export type PhaseFilterValue = "all" | (typeof CREATIVE_PHASES)[number];

/**
 * The phases worth filtering by, in workflow order.
 *
 * `CREATIVE_PHASES` lists all fifteen Notion allows, and rendering every one
 * gave sixteen buttons wrapping over three rows — most of them for phases
 * that are upstream of this tool (Briefing, Filming, Ideation) or that
 * nobody filters by. These five are the stages the work actually moves
 * through here.
 *
 * The full list still validates `?phase=` in the URL, so a saved link to
 * Archived or Editing keeps working even though there is no button for it.
 */
const FILTER_PHASES = ["Write", "Upload", "Launch", "Testing", "Active"] as const;

const FILTERS: { value: PhaseFilterValue; label: string }[] = [
  { value: "all", label: "All Phases" },
  ...FILTER_PHASES.map((phase) => ({ value: phase, label: phase })),
];

export function PhaseFilter({
  value,
  onChange,
}: {
  value: PhaseFilterValue;
  onChange: (value: PhaseFilterValue) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTERS.map((filter) => {
        const active = value === filter.value;
        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => onChange(filter.value)}
            className={cn(
              "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-accent/40 bg-accent-dim text-accent"
                : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground",
            )}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}