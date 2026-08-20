"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const GENERATION_STAGES = [
  "Building brief",
  "Retrieving product knowledge",
  "Writing headlines",
  "Writing primary text",
  "Validating copy",
];

const STAGE_MS = 1800;

/**
 * Progressive pipeline visual. The backend does not expose per-stage events
 * yet, so the sequence is time-based — but the terminal state always comes
 * from the backend via polling (never faked as completed here).
 */
export function GenerationSteps({ startedAt }: { startedAt?: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (startedAt === undefined) return;
    const timer = window.setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 250);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const activeIndex =
    startedAt === undefined
      ? 0
      : Math.min(
          GENERATION_STAGES.length - 1,
          Math.floor(elapsed / STAGE_MS),
        );

  return (
    <div className="w-full">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
        Generating creative...
      </p>
      <ul className="mt-3 space-y-1.5">
        {GENERATION_STAGES.map((stage, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          return (
            <li
              key={stage}
              className="flex items-center gap-2 text-xs"
            >
              {done ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              ) : (
                <span
                  className={cn(
                    "h-3.5 w-3.5 rounded-full border",
                    active
                      ? "border-accent bg-accent/30"
                      : "border-border-strong",
                  )}
                />
              )}
              <span
                className={cn(
                  "transition-colors",
                  done
                    ? "text-muted"
                    : active
                      ? "font-medium text-foreground"
                      : "text-faint",
                )}
              >
                {stage}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
