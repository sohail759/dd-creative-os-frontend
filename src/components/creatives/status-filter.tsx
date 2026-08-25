"use client";

import { cn } from "@/lib/utils";
import { CREATIVE_STATUSES, STATUS_LABELS } from "@/lib/api/types";

export type StatusFilterValue = "all" | (typeof CREATIVE_STATUSES)[number];

export const FILTERS: { value: StatusFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  ...CREATIVE_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];

export function StatusFilter({
  value,
  onChange,
  counts,
}: {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
  counts?: Partial<Record<StatusFilterValue, number>>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTERS.map((filter) => {
        const active = value === filter.value;
        const count = counts?.[filter.value] ?? 0;
        return (
          <button
            key={filter.value}
            onClick={() => onChange(filter.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-accent/40 bg-accent-dim text-accent"
                : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground",
            )}
          >
            <span>{filter.label}</span>
            {counts !== undefined && count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                  active ? "bg-accent text-black" : "bg-white/5 text-faint",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
