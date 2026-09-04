"use client";

import { cn } from "@/lib/utils";
import { CREATIVE_PHASES } from "@/lib/api/types";

export type PhaseFilterValue = "all" | (typeof CREATIVE_PHASES)[number];

const FILTERS: { value: PhaseFilterValue; label: string }[] = [
  { value: "all", label: "All Phases" },
  ...CREATIVE_PHASES.map((phase) => ({ value: phase, label: phase })),
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