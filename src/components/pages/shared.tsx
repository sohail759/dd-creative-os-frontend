"use client";

import { cn } from "@/lib/utils";

/** The brands the sidebar offers. Kept here so all three screens agree. */
export const BRANDS = [
  { slug: "numy", label: "NUMY" },
  { slug: "holy-mouthwash", label: "Holy Mouthwash" },
  { slug: "soralune", label: "Soralune" },
] as const;

/**
 * A page's state, said in words rather than in the registry's vocabulary.
 *
 * `drift_state` is precise and unreadable. Each one is a different reason an
 * ad cannot run, and the reason is what an operator acts on: a restricted
 * page needs Meta, a page with no write access needs Business Manager, and an
 * excluded page needs whoever excluded it.
 */
export const DRIFT_LABELS: Record<string, { label: string; tone: Tone; why: string }> = {
  active_verified: {
    label: "Usable",
    tone: "good",
    why: "Write access proved, capacity read, and classified.",
  },
  banned_or_restricted: {
    label: "Restricted by Meta",
    tone: "bad",
    why: "Meta refused the read. The page is banned or restricted.",
  },
  unpublished: {
    label: "Unpublished",
    tone: "bad",
    why: "Business Manager reports the page as not published.",
  },
  inaccessible: {
    label: "No access",
    tone: "bad",
    why: "Nothing proves this token can still write to the page.",
  },
  excluded_manual: {
    label: "Excluded by hand",
    tone: "muted",
    why: "Someone listed this page as not to be used.",
  },
  retired_manual: {
    label: "Retired",
    tone: "muted",
    why: "Retired by an operator.",
  },
  performance_retired: {
    label: "Retired on performance",
    tone: "muted",
    why: "Taken out of rotation because of how it performed.",
  },
  unclassified_new: {
    label: "Needs classifying",
    tone: "warn",
    why: "New to us. Nobody has said what kind of page it is or whose it is.",
  },
  missing_from_latest_bm_read: {
    label: "Disappeared",
    tone: "warn",
    why: "No source returned it this time. Kept, not deleted, in case ads still run on it.",
  },
  page_health_only: {
    label: "Measured only",
    tone: "muted",
    why: "Capacity is tracked, but ads are never launched from it.",
  },
  unknown_fail_closed: {
    label: "Unknown",
    tone: "warn",
    why: "Something could not be established, so the page is held back.",
  },
};

export type Tone = "good" | "bad" | "warn" | "muted";

const TONE_CLASSES: Record<Tone, string> = {
  good: "bg-success/10 text-success ring-success/25",
  bad: "bg-danger/10 text-danger ring-danger/25",
  warn: "bg-warning/10 text-warning ring-warning/25",
  muted: "bg-white/5 text-muted ring-white/10",
};

export function Badge({
  tone = "muted",
  children,
  title,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function DriftBadge({ state }: { state: string }) {
  const entry = DRIFT_LABELS[state] ?? {
    label: state.replace(/_/g, " "),
    tone: "muted" as Tone,
    why: "",
  };
  return (
    <Badge tone={entry.tone} title={entry.why || undefined}>
      {entry.label}
    </Badge>
  );
}

/**
 * How much room a page has left, as a bar.
 *
 * The number alone does not say whether 94 is a lot: it is against a limit
 * that differs per page. The bar carries the ratio and the number carries the
 * amount, and a page near its limit reads as near its limit at a glance.
 */
export function CapacityBar({
  used,
  limit,
}: {
  used?: number | null;
  limit?: number | null;
}) {
  if (typeof used !== "number" || typeof limit !== "number" || limit <= 0) {
    return <span className="text-faint">—</span>;
  }
  const ratio = Math.min(1, Math.max(0, used / limit));
  const tone =
    ratio >= 1 ? "bg-danger" : ratio >= 0.8 ? "bg-warning" : "bg-success";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-white/10">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className="tabular-nums text-xs text-muted">
        {used} / {limit}
      </span>
    </div>
  );
}

/** An instant as "3 minutes ago", with the exact time on hover. */
export function TimeAgo({ at, fallback = "Never" }: { at?: string | null; fallback?: string }) {
  if (!at) return <span className="text-faint">{fallback}</span>;
  const ms = Date.now() - Date.parse(at);
  if (Number.isNaN(ms)) return <span className="text-faint">{fallback}</span>;
  const mins = Math.round(ms / 60_000);
  const text =
    mins < 1 ? "just now"
    : mins < 60 ? `${mins} min ago`
    : mins < 1440 ? `${Math.round(mins / 60)} h ago`
    : `${Math.round(mins / 1440)} d ago`;
  return <span title={new Date(at).toLocaleString()}>{text}</span>;
}

export function BrandTabs({
  value,
  onChange,
  brands = BRANDS.map((b) => b.slug),
  allowAll = false,
}: {
  value: string;
  onChange: (brand: string) => void;
  brands?: readonly string[];
  allowAll?: boolean;
}) {
  const options = allowAll ? ["", ...brands] : brands;
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((slug) => {
        const label =
          slug === ""
            ? "All brands"
            : BRANDS.find((b) => b.slug === slug)?.label ?? slug;
        return (
          <button
            key={slug || "all"}
            type="button"
            onClick={() => onChange(slug)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              value === slug
                ? "bg-accent-dim text-accent"
                : "text-muted hover:bg-white/5 hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
