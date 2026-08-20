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
 *  - no copy yet (not_started / revision / checkpoint) -> trigger button
 *  - generation failed -> "Try Again"
 *  - generation completed -> no control (copy is displayed separately)
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

  // If the creative arrives already generating, render the progressive steps
  // immediately.
  const initialRef = useRef(generation === "in_progress");
  useEffect(() => {
    if (initialRef.current) {
      setStartedAt(Date.now());
      initialRef.current = false;
    }
  }, []);

  // UI triggers are available for any concept regardless of phase/status; the
  // Write phase / In progress gate applies only to the webhook automation.
  if (generation === "completed" && hasCopy) return null;

  // While the trigger request is in flight (and before the backend reflects
  // `in_progress` on the next poll), show the progressive pipeline so the user
  // gets immediate feedback instead of just a toast.
  const pendingForThis =
    mutation.isPending && mutation.variables?.id === creative.id;
  const generating = generation === "in_progress" || pendingForThis;

  if (generating) {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl border border-accent/20 bg-accent-dim/40 p-4",
          className,
        )}
      >
        {hasCopy ? (
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <RefreshCw className="h-4 w-4 animate-spin text-accent" />
            Updating creative...
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
        mutation.mutate({ id: creative.id });
      }}
      disabled={mutation.isPending && mutation.variables?.id === creative.id}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <Sparkles className="h-4 w-4" />
      {isFailed ? "Try Again" : "Generate Copy"}
    </button>
  );
}
