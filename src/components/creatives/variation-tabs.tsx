"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useConceptVariations, formatRunTime } from "@/hooks/use-concept-run";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";
import type { ConceptVariation } from "@/lib/api/types";

/**
 * A concept's Level C variations, one tab per language.
 *
 * The copy belongs to the variation, not to the concept — a concept can carry
 * five languages, each with its own five headlines and five primary texts,
 * and its own Phase/Status. The detail view previously showed only the
 * concept's preferred (ENG) copy, so the other languages were invisible.
 *
 * ENG leads and is selected by default: it is the language the pipeline
 * generates natively, and the rest are translations of it.
 */
export function VariationTabs({
  conceptId,
  generating = false,
}: {
  conceptId: string;
  /** True while copy is being written, so the tabs keep refreshing. */
  generating?: boolean;
}) {
  const { data: variations, isLoading } = useConceptVariations(conceptId, true, {
    active: generating,
  });
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading variations...
      </p>
    );
  }
  if (!variations?.length) {
    return (
      <p className="rounded-xl border border-border bg-panel p-4 text-sm text-muted">
        This concept has no variations yet.
      </p>
    );
  }

  const active =
    variations.find((v) => v.id === selected) ?? variations[0];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Variations"
        className="flex flex-wrap gap-1 border-b border-border"
      >
        {variations.map((variation) => {
          const isActive = variation.id === active.id;
          return (
            <button
              key={variation.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => setSelected(variation.id)}
              className={cn(
                "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {variation.language}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  variation.headlines.length
                    ? "bg-success/15 text-success"
                    : "bg-white/5 text-faint",
                )}
              >
                {variation.headlines.length}
              </span>
            </button>
          );
        })}
      </div>

      <VariationPanel variation={active} />
    </div>
  );
}

function Badge({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-white/5 px-2 py-1 text-[11px] text-muted">
      <span className="text-faint">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}

function VariationPanel({ variation }: { variation: ConceptVariation }) {
  const empty =
    !variation.headlines.length && !variation.primaryTexts.length;

  return (
    <div role="tabpanel" className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{variation.name}</span>
        <Badge label="Phase" value={variation.phase} />
        <Badge label="Status" value={variation.status} />
        {variation.generatedAt ? (
          <span className="text-[11px] text-muted">
            Generated {formatRunTime(variation.generatedAt)}
          </span>
        ) : null}
      </div>

      {empty ? (
        <p className="mt-4 rounded-xl border border-border bg-panel p-4 text-sm text-muted">
          No copy generated for this variation yet.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-8">
          <CopyList
            title={`Headlines (${variation.headlines.length})`}
            items={variation.headlines}
          />
          <CopyList
            title={`Primary Text (${variation.primaryTexts.length})`}
            items={variation.primaryTexts}
            wrap
          />
        </div>
      )}
    </div>
  );
}

function CopyList({
  title,
  items,
  wrap = false,
}: {
  title: string;
  items: string[];
  wrap?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-3 text-base font-semibold">{title}</h3>
      <ol className="flex flex-col gap-2.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="group flex items-start gap-4 rounded-xl border border-border bg-panel p-4 transition-colors hover:border-border-strong"
          >
            <span className="mt-0.5 text-sm font-bold tabular-nums text-accent">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p
              className={cn(
                "flex-1 leading-relaxed text-foreground",
                wrap ? "whitespace-pre-wrap text-sm" : "text-base",
              )}
            >
              {item}
            </p>
            <CopyButton text={item} label="Copy" />
          </li>
        ))}
      </ol>
    </div>
  );
}
