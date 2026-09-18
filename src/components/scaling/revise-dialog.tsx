"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { useLandingPageOptions } from "@/hooks/use-scaling";
import type { Proposal } from "@/lib/api/scaling";
import { cn } from "@/lib/utils";

/**
 * Approve a proposal, but somewhere else.
 *
 * Revising is not rejecting: the creative is still worth scaling, the page
 * chosen for it is not the right one. The proposal keeps what was proposed
 * and records what was agreed, so the audit trail shows both.
 *
 * The choices are the pages the PLANNER would have considered, so a revision
 * cannot send an ad somewhere the rules would never have proposed.
 */
export function ReviseDialog({ proposal, busy, onCancel, onConfirm }: {
  proposal: Proposal;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (revision: Record<string, string>, note: string) => void;
}) {
  const { data, isLoading } = useLandingPageOptions(proposal.brand);
  const [pageName, setPageName] = useState("");
  const [note, setNote] = useState("");

  const options = (data?.pages ?? []).filter(
    (page) => page.page_name !== proposal.target_page_name,
  );
  const chosen = options.find((page) => page.page_name === pageName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-5 text-xs">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Send this somewhere else</h2>
            <p className="mt-0.5 text-muted">
              The ad stays the same. Only the page it points at changes.
            </p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close"
                  className="text-faint hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <dl className="mt-4 space-y-1">
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-faint">Ad</dt>
            <dd className="truncate" title={proposal.source_ad_name}>
              {proposal.source_ad_name}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-faint">Was going to</dt>
            <dd>{proposal.target_page_name}</dd>
          </div>
        </dl>

        <label className="mt-4 block">
          <span className="font-semibold">Send it to</span>
          {isLoading ? (
            <p className="mt-1 text-faint">Loading pages…</p>
          ) : options.length === 0 ? (
            <p className="mt-1 text-warning">
              No other page is eligible for {proposal.brand} right now, so
              there is nowhere to move this to.
            </p>
          ) : (
            <select
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-transparent px-2 py-1.5 text-foreground"
            >
              <option value="">Choose a page…</option>
              {options.map((page) => (
                <option key={page.page_name} value={page.page_name}>
                  {page.page_name}
                  {page.angle ? ` — ${page.angle}` : ""}
                </option>
              ))}
            </select>
          )}
        </label>

        {chosen && (
          <p className="mt-1.5 truncate text-faint" title={chosen.url}>
            Lands on {chosen.url}
          </p>
        )}

        <label className="mt-3 block">
          <span className="font-semibold">Why (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Kept with the decision, for whoever reads it later"
            className="mt-1 w-full rounded border border-border bg-transparent px-2 py-1.5 text-foreground"
          />
        </label>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onCancel}
                  className="rounded-lg px-3 py-1.5 text-muted hover:text-foreground">
            Cancel
          </button>
          <button
            type="button"
            disabled={!chosen || busy}
            onClick={() => chosen && onConfirm({
              target_page_name: chosen.page_name,
              target_url: chosen.url,
            }, note)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-opacity",
              "bg-accent text-black hover:opacity-90 disabled:opacity-40",
            )}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Approve for this page
          </button>
        </div>
      </div>
    </div>
  );
}
