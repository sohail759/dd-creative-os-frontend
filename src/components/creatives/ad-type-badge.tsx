"use client";

import { Video, Image as ImageIcon, FileQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A concept's `Type (A)` — "Video ad" or "Image ad" — beside its name.
 *
 * One component for the grid and the table, so the two cannot drift into
 * showing the same property two different ways.
 *
 * Colour and icon both carry the type, so it reads at a glance in a long
 * list. The hues are their own tokens rather than borrowed status colours:
 * on these cards `accent` means "uploaded" and `success` means "live", so a
 * lime video badge would read as a state the concept is not in. Violet and
 * sky are used nowhere else, so they can only mean the type.
 */
const STYLES: Record<string, { className: string; Icon: typeof Video }> = {
  video: {
    className: "border-type-video/40 bg-type-video-dim text-type-video",
    Icon: Video,
  },
  image: {
    className: "border-type-image/40 bg-type-image-dim text-type-image",
    Icon: ImageIcon,
  },
};

function styleFor(type: string) {
  const lowered = type.toLowerCase();
  if (lowered.includes("video")) return STYLES.video;
  if (lowered.includes("image")) return STYLES.image;
  // A type Notion has that this does not know about is still worth showing —
  // better a neutral badge than silently hiding a value someone set.
  return { className: "border-border bg-surface text-muted", Icon: FileQuestion };
}

export function AdTypeBadge({
  type,
  size = "md",
}: {
  type?: string | null;
  /** `sm` for the denser table row. */
  size?: "sm" | "md";
}) {
  const label = (type ?? "").trim();
  if (!label) return null;

  const { className, Icon } = styleFor(label);
  return (
    <span
      title={`Ad type: ${label}`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border font-semibold uppercase tracking-wide",
        size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        className,
      )}
    >
      <Icon className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {/* "Video ad" -> "Video": the word "ad" repeats on every badge and the
          surrounding page is already nothing but ads. */}
      {label.replace(/\s*ads?$/i, "")}
    </span>
  );
}
