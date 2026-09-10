"use client";

import { cn } from "@/lib/utils";

/**
 * A concept's Notion Phase and Status, as badges.
 *
 * Both were only visible by opening the concept in Notion, so a card could
 * not tell you that one concept was at Checkpoint while its siblings were
 * still being written — which is exactly the disagreement worth catching on
 * a batch that looks uniform.
 *
 * Colour groups the pipeline rather than giving fifteen phases fifteen hues,
 * which would be noise: what a reader needs at a glance is which STAGE a
 * concept is in, and the label supplies the rest. The groups follow the
 * pipeline's own shape:
 *
 *     pre-production -> writing -> Meta -> live -> analysis -> archived
 *
 * `success` is reserved for phases that mean the ad is really running, so a
 * green badge never appears on work that has not shipped.
 */
type Tone = "neutral" | "writing" | "meta" | "live" | "analysis" | "muted";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "border-border bg-surface text-muted",
  writing: "border-warning/35 bg-warning/10 text-warning",
  meta: "border-type-image/40 bg-type-image-dim text-type-image",
  live: "border-success/35 bg-success/10 text-success",
  analysis: "border-type-video/40 bg-type-video-dim text-type-video",
  muted: "border-border bg-transparent text-faint",
};

const PHASE_TONE: Record<string, Tone> = {
  "Not started": "neutral",
  Briefing: "neutral",
  Ideation: "neutral",
  Framing: "neutral",
  Filming: "neutral",
  Write: "writing",
  Editing: "writing",
  Iterate: "writing",
  Upload: "meta",
  Launch: "meta",
  Testing: "live",
  Active: "live",
  Analyse: "analysis",
  Analysis: "analysis",
  Archived: "muted",
};

const STATUS_TONE: Record<string, Tone> = {
  "Not started": "neutral",
  // The copywriter's own word for "this stage is done and signed off".
  Checkpoint: "live",
  "In progress": "meta",
  Revision: "writing",
};

function Badge({
  value,
  tone,
  title,
  size,
}: {
  value: string;
  tone: Tone;
  title: string;
  size: "sm" | "md";
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border font-semibold uppercase tracking-wide",
        size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        TONE_CLASS[tone],
      )}
    >
      {value}
    </span>
  );
}

export function WorkflowBadges({
  phase,
  status,
  size = "md",
  className,
}: {
  phase?: string | null;
  status?: string | null;
  /** `sm` for the denser table row. */
  size?: "sm" | "md";
  className?: string;
}) {
  const phaseText = (phase ?? "").trim();
  const statusText = (status ?? "").trim();
  if (!phaseText && !statusText) return null;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {phaseText ? (
        <Badge
          value={phaseText}
          // An unmapped phase still shows — better a neutral badge than
          // silently hiding a value someone set in Notion.
          tone={PHASE_TONE[phaseText] ?? "neutral"}
          title={`Phase: ${phaseText}`}
          size={size}
        />
      ) : null}
      {statusText ? (
        <Badge
          value={statusText}
          tone={STATUS_TONE[statusText] ?? "neutral"}
          title={`Status: ${statusText}`}
          size={size}
        />
      ) : null}
    </span>
  );
}
