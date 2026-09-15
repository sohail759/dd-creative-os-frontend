"use client";

import type { Window } from "@/lib/api/analytics-insights";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Window; label: string }[] = [
  { value: "7d", label: "7 Days" },
  { value: "14d", label: "14 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "lifetime", label: "Lifetime" },
];

export function WindowTabs({ value, onChange }: { value: Window; onChange: (w: Window) => void }) {
  return (
    <div className="flex rounded-lg border border-border bg-surface p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            value === opt.value ? "bg-accent text-black" : "text-muted hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
