"use client";

import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const UPLOAD_STAGES = [
  "Creating Ad Set",
  "Preparing media",
  "Uploading video",
  "Uploading thumbnail",
  "Creating creative",
  "Creating ad",
  "Verifying status",
];

const STAGE_INDEX: Record<string, number> = {
  adset_created: 1,
  creative_created: 4,
  ad_created: 5,
};

interface UploadProgressProps {
  progressStage: string | null;
  metaState: string | null;
  metaError?: string | null;
}

export function UploadProgress({
  progressStage,
  metaState,
  metaError,
}: UploadProgressProps) {
  const isUploading = metaState === "uploading";
  const isFailed = metaState === "failed";
  const isComplete = metaState === "uploaded_paused" || metaState === "active";

  const activeIndex =
    isComplete
      ? UPLOAD_STAGES.length
      : isFailed
        ? UPLOAD_STAGES.length
        : STAGE_INDEX[progressStage ?? ""] ?? 0;

  return (
    <div className="w-full">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        {isComplete ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : isFailed ? (
          <span className="h-4 w-4 rounded-full bg-red-500/20 border border-red-500/40" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
        )}
        {isComplete
          ? "Upload complete"
          : isFailed
            ? "Upload failed"
            : "Uploading to Meta..."}
      </p>
      <ul className="mt-3 space-y-1.5">
        {UPLOAD_STAGES.map((stage, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex && isUploading;
          const failed = isFailed && i === activeIndex;
          return (
            <li key={stage} className="flex items-center gap-2 text-xs">
              {done ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              ) : failed ? (
                <span className="h-3.5 w-3.5 rounded-full bg-red-500/30 border border-red-500/50" />
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
                      : failed
                        ? "text-red-400"
                        : "text-faint",
                )}
              >
                {stage}
              </span>
            </li>
          );
        })}
      </ul>
      {isFailed && metaError && (
        <p className="mt-2 text-xs text-red-400">{metaError}</p>
      )}
    </div>
  );
}
