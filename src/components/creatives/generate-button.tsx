"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { useGenerateProduct } from "@/hooks/use-generate";
import { GenerationSteps } from "./generation-steps";
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
}: {
  creative: Creative;
  className?: string;
}) {
  const mutation = useGenerateProduct();
  const generation = creative.generationStatus ?? "idle";
  const hasCopy = creative.headlines.length > 0;

  const [startedAt, setStartedAt] = useState<number | undefined>(() =>
    generation === "in_progress" ? Date.now() : undefined,
  );

  const initialRef = useRef(generation === "in_progress");
  useEffect(() => {
    if (initialRef.current) {
      setStartedAt(Date.now());
      initialRef.current = false;
    }
  }, []);

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
          <GenerationSteps startedAt={startedAt} />
        )}
      </div>
    );
  }

  const isFailed = generation === "failed";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setStartedAt(Date.now());
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
}
