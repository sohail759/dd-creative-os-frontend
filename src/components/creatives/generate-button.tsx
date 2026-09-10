"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { useGenerateProduct } from "@/hooks/use-generate";
import { GenerationSteps, RunError } from "./generation-steps";
import { useConceptRun } from "@/hooks/use-concept-run";
import type { Creative } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Status-aware generation control.
 *  - generation in_progress -> progressive "Generating…" state
 *  - no copy yet -> trigger button
 *  - generation failed -> "Try Again"
 *  - generation completed + has copy -> "Regenerate" button (force=true)
 */
export function GenerateButton({
  creative,
  className,
  showRunError = true,
}: {
  creative: Creative;
  className?: string;
  /** False where a RunPanel already shows the failure, to avoid two copies. */
  showRunError?: boolean;
}) {
  const mutation = useGenerateProduct();
  const { data: run } = useConceptRun(creative.id, {
    active: (creative.generationStatus ?? "idle") === "in_progress",
  });
  const generation = creative.generationStatus ?? "idle";
  const hasCopy = creative.headlines.length > 0;

  const pendingForThis =
    mutation.isPending && mutation.variables?.id === creative.id;
  const generating = generation === "in_progress" || pendingForThis;

  // While generating, show the progressive pipeline or "Regenerating..."
  if (generating) {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl border border-accent/20 bg-accent-dim/40 p-4",
          className,
        )}
      >
        {(hasCopy || pendingForThis) ? (
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <RefreshCw className="h-4 w-4 animate-spin text-accent" />
            Regenerating creative...
          </p>
        ) : (
          <GenerationSteps conceptId={creative.id} />
        )}
      </div>
    );
  }

  const isFailed = generation === "failed";
  const lastError =
    showRunError && run?.error ? <RunError run={run} /> : null;

  const trigger = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        mutation.mutate({ id: creative.id, options: { force: true } });
      }}
      disabled={mutation.isPending && mutation.variables?.id === creative.id}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        hasCopy
          ? "border border-accent/30 bg-accent-dim text-accent hover:bg-accent/20"
          : "bg-accent text-black hover:bg-accent-hover",
        className,
      )}
    >
      {hasCopy ? (
        <>
          <RefreshCw className="h-4 w-4" />
          Regenerate
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          {isFailed ? "Try Again" : "Generate Copy"}
        </>
      )}
    </button>
  );

  // The most recent run's real failure sits above the retry control, so the
  // user sees what went wrong rather than a bare "Try Again".
  if (lastError) {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        {lastError}
        {trigger}
      </div>
    );
  }
  return trigger;
}
