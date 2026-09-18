"use client";

import { useSyncExternalStore } from "react";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
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

/**
 * Parse an instant the API sent, as UTC.
 *
 * The database stores UTC but returns it without a timezone marker, so the
 * API emits "2026-09-20T13:05:03" — which JavaScript reads as LOCAL time.
 * Every timestamp in the app was therefore shifted by the reader's offset:
 * an hour out in Amsterdam, five in New York.
 *
 * A string that already carries an offset or a "Z" is left alone.
 */
export function parseInstant(at?: string | null): Date | null {
  if (!at) return null;
  const text = String(at);
  const hasZone = /(?:[Zz]|[+-]\d{2}:?\d{2})$/.test(text);
  const date = new Date(hasZone ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The exact instant in the reader's own timezone, for a tooltip. */
export function localTime(at?: string | null): string {
  const date = parseInstant(at);
  return date ? date.toLocaleString(undefined, { timeZoneName: "short" }) : "";
}

/**
 * An instant as "3 minutes ago" or "in 2 days", with the local time on hover.
 *
 * Past AND future: `expires_at` is a future instant, and the old version
 * computed `now - then` for everything, so a proposal expiring in two days
 * rendered as "just now".
 */
/**
 * One clock, shared by every relative timestamp on the page.
 *
 * Reading `Date.now()` during render is impure, and a component that reads
 * it once goes stale on a screen left open. `useSyncExternalStore` is the
 * supported way to read a changing external value — and a single module-level
 * timer serves every `TimeAgo` at once, rather than one timer each.
 */
const clockListeners = new Set<() => void>();
let clockNow = 0;
let clockTimer: number | null = null;

function subscribeToClock(onChange: () => void): () => void {
  clockListeners.add(onChange);
  if (clockTimer === null) {
    clockNow = Date.now();
    clockTimer = window.setInterval(() => {
      clockNow = Date.now();
      clockListeners.forEach((listener) => listener());
    }, 60_000);
  }
  return () => {
    clockListeners.delete(onChange);
    if (clockListeners.size === 0 && clockTimer !== null) {
      window.clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

function readClock(): number {
  if (clockNow === 0) clockNow = Date.now();
  return clockNow;
}

/** The server has no clock to agree on, so it renders the absolute time. */
function readClockOnServer(): number {
  return 0;
}

export function TimeAgo({ at, fallback = "Never" }: { at?: string | null; fallback?: string }) {
  const now = useSyncExternalStore(subscribeToClock, readClock, readClockOnServer);

  const date = parseInstant(at);
  if (!date) return <span className="text-faint">{fallback}</span>;
  // Server-rendered: show the absolute local time rather than a relative one
  // computed against a clock the server does not share.
  if (!now) return <span title={localTime(at)}>{localTime(at)}</span>;

  const deltaMs = date.getTime() - now;
  const future = deltaMs > 0;
  const mins = Math.round(Math.abs(deltaMs) / 60_000);
  const amount =
    mins < 1 ? "" 
    : mins < 60 ? `${mins} min`
    : mins < 1440 ? `${Math.round(mins / 60)} h`
    : `${Math.round(mins / 1440)} d`;
  const text = !amount
    ? (future ? "any moment" : "just now")
    : future ? `in ${amount}` : `${amount} ago`;

  return <span title={localTime(at)}>{text}</span>;
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


/** Rows per page. Ten first, because that is what fits without scrolling. */
export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;

/**
 * One pager for every list, so the three screens cannot drift apart.
 *
 * Shows where you are rather than only offering Next and Previous: on a list
 * of a hundred landing pages, "page 3 of 10" is the thing you actually want,
 * and jumping to the last page took ten clicks without it.
 *
 * The buttons are disabled at the ends rather than hidden. A control that
 * vanishes moves everything beside it, and the row jumps under the cursor.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  label = "rows",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  label?: string;
}) {
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2 text-muted">
        <span className="tabular-nums">
          {total === 0 ? `No ${label}` : `${from}–${to} of ${total} ${label}`}
        </span>
        <span className="text-faint">·</span>
        <label className="flex items-center gap-1.5">
          <span className="text-faint">Show</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded border border-border bg-surface px-1.5 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <PageButton
          onClick={() => onPageChange(0)}
          disabled={page === 0}
          label="First page"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </PageButton>
        <PageButton
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </PageButton>
        <span className="px-2 tabular-nums text-muted">
          Page {total === 0 ? 0 : page + 1} of {lastPage + 1}
        </span>
        <PageButton
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage}
          label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </PageButton>
        <PageButton
          onClick={() => onPageChange(lastPage)}
          disabled={page >= lastPage}
          label="Last page"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-lg border border-border p-1.5 transition-colors",
        disabled
          ? "cursor-not-allowed text-faint opacity-50"
          : "text-muted hover:bg-white/5 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
