"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Where an uploaded ad actually lives in Meta, with each value copyable.
 *
 * The ids were already shown, but Ads Manager does not list anything by id —
 * finding the ad means searching for the page or campaign by name, and those
 * names existed only in the upload picker and were thrown away once the
 * upload finished. They are recorded on `meta_ops` now, and shown here
 * alongside the ids they correspond to.
 *
 * One component for the card, the table and the concept page, so the three
 * cannot drift into showing different subsets.
 */
export type MetaTargets = {
  page_name?: string | null;
  page_id?: string | null;
  campaign_name?: string | null;
  adset_name?: string | null;
  ad_name?: string | null;
};

type Row = { label: string; value: string; mono: boolean };

/** Names first: they are what someone searches Ads Manager by. */
export function metaTargetRows(
  targets: MetaTargets | undefined,
  ids: Record<string, string | null | undefined> = {},
): Row[] {
  const rows: Row[] = [];
  const push = (label: string, value: unknown, mono = false) => {
    const text = typeof value === "string" ? value.trim() : "";
    if (text) rows.push({ label, value: text, mono });
  };

  push("Page", targets?.page_name);
  push("Campaign", targets?.campaign_name);
  push("Ad set", targets?.adset_name);
  push("Ad", targets?.ad_name);

  push("Page ID", targets?.page_id, true);
  push("Campaign ID", ids.campaign_id, true);
  push("Ad set ID", ids.adset_id, true);
  push("Creative ID", ids.creative_id, true);
  push("Ad ID", ids.ad_id, true);

  return rows;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard access is denied outside a secure context and in some
      // embedded browsers. A selectable fallback beats a dead button.
      const el = document.createElement("textarea");
      el.value = value;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand("copy");
      } catch {
        return;
      } finally {
        document.body.removeChild(el);
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        // These sit inside a clickable table row and a linked card.
        event.stopPropagation();
        event.preventDefault();
        void copy();
      }}
      title={copied ? "Copied" : `Copy ${label.toLowerCase()}`}
      aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
      className={cn(
        "shrink-0 cursor-pointer rounded p-0.5 transition-colors",
        copied ? "text-success" : "text-faint hover:text-foreground",
      )}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export function MetaTargetList({
  targets,
  ids,
  className,
}: {
  targets?: MetaTargets;
  ids?: Record<string, string | null | undefined>;
  className?: string;
}) {
  const rows = metaTargetRows(targets, ids ?? {});
  if (rows.length === 0) return null;

  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-x-4 gap-y-1 text-[10px] sm:grid-cols-2",
        className,
      )}
    >
      {rows.map(({ label, value, mono }) => (
        <div key={label} className="flex min-w-0 items-baseline gap-1.5">
          <dt className="shrink-0 uppercase tracking-wide text-faint">{label}</dt>
          <dd
            title={value}
            className={cn("truncate text-muted", mono && "tabular-nums")}
          >
            {value}
          </dd>
          <CopyButton value={value} label={label} />
        </div>
      ))}
    </dl>
  );
}
