"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, CheckCircle2, ExternalLink, FileText, Loader2, PlayCircle, Rocket, XCircle,
} from "lucide-react";
import {
  useDecideProposal, useDecideSelection, useExecuteProposal,
  useProposalCounts, useProposals, useRunPlan,
} from "@/hooks/use-scaling";
import type { Period, Proposal, ProposalStatus } from "@/lib/api/scaling";
import {
  BRANDS, Badge, BrandTabs, DEFAULT_PAGE_SIZE, Pagination, TimeAgo,
} from "@/components/pages/shared";
import { ExpiresIn } from "./expires-in";
import { ReviseDialog } from "./revise-dialog";
import { RunBanner } from "./run-banner";
import { cn } from "@/lib/utils";

const TABS: Array<{ key: ProposalStatus; label: string }> = [
  { key: "pending", label: "Waiting on you" },
  { key: "approved", label: "Approved" },
  { key: "revised", label: "Revised" },
  { key: "rejected", label: "Rejected" },
  { key: "expired", label: "Expired" },
];

/**
 * A link that actually opens the ad.
 *
 * Ads Manager resolves an ad id only within an ad account: without `act=` it
 * opens whichever account the browser last used, and the selection is
 * silently dropped. `adsmanager.facebook.com` rather than `www.` because the
 * www host redirects and loses the query on the way.
 */
function adsManagerUrl(accountId: string | undefined, adId: string): string {
  const act = (accountId || "").replace(/^act_/, "");
  const base = "https://adsmanager.facebook.com/adsmanager/manage/ads";
  const params = new URLSearchParams({ selected_ad_ids: adId });
  if (act) params.set("act", act);
  return `${base}?${params.toString()}`;
}

const PERIODS: Array<{ key: Period; label: string }> = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This week" },
  { key: "all", label: "All" },
  { key: "custom", label: "Range" },
];

function money(value: number): string {
  return `€${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/** What the execution record means, in words rather than a state name. */
function executionNote(p: Proposal): { tone: "good" | "bad" | "warn" | "info"; text: string } | null {
  switch (p.execution_status) {
    case "activated":
      return { tone: "good", text: `Live as ${p.created_ad_id}` };
    case "verified_paused":
      return { tone: "warn", text: `Built and paused as ${p.created_ad_id}` };
    case "created_unverified":
      return {
        tone: "bad",
        text: `Ad ${p.created_ad_id} was created but failed its check — it is paused and needs a look`,
      };
    case "creative_orphaned":
      return {
        tone: "bad",
        text: `A creative (${p.created_creative_id}) was made on Meta but the ad was refused`,
      };
    case "waiting_for_limit":
      return {
        tone: "warn",
        // The backend writes the reason as a sentence, with Meta's own
        // figure in it. Falling back only when it is somehow missing.
        text: p.deferred_reason
          || "Waiting for Meta's rate limit to clear — nothing has been "
             + "created yet. This retries on its own every 15 minutes.",
      };
    case "blocked":
      return { tone: "bad", text: p.execution_error || "Stopped before anything was created" };
    default:
      // Approved but not yet built: the build runs on its own after approval,
      // so this is a normal waiting state rather than something to act on.
      if (p.status === "approved" || p.status === "revised") {
        return { tone: "info", text: "Approved — queued to be built on Meta" };
      }
      return null;
  }
}

export function ProposalsView() {
  const [brand, setBrand] = useState<string>(BRANDS[0].slug);
  const [tab, setTab] = useState<ProposalStatus>("pending");
  const [minPurchases, setMinPurchases] = useState("");
  const [maxCpa, setMaxCpa] = useState("");
  // Today by default: the list is a work queue, and last week's decisions
  // are history rather than something waiting on anyone.
  const [period, setPeriod] = useState<Period>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [revising, setRevising] = useState<Proposal | null>(null);

  // Sent so the server's "today" is the reader's day. A browser in Amsterdam
  // and a worker in UTC otherwise disagree for two hours every evening.
  const tzOffsetMinutes = -new Date().getTimezoneOffset();
  const window = {
    period,
    tz_offset_minutes: tzOffsetMinutes,
    ...(period === "custom"
      ? {
          created_from: customFrom ? new Date(customFrom).toISOString() : undefined,
          created_to: customTo
            // An end date is inclusive to a person: "to the 5th" means
            // through the end of the 5th, not its first instant.
            ? new Date(new Date(customTo).getTime() + 86_400_000).toISOString()
            : undefined,
        }
      : {}),
  };
  const filters = {
    brand,
    status: [tab],
    min_purchases: minPurchases ? Number(minPurchases) : undefined,
    max_cpa: maxCpa ? Number(maxCpa) : undefined,
    ...window,
    limit: pageSize,
    offset: page * pageSize,
  };
  const { data, isLoading, error } = useProposals(filters);
  const counts = useProposalCounts({ brand, ...window });
  const decide = useDecideProposal();
  const decideMany = useDecideSelection();
  const execute = useExecuteProposal();
  const plan = useRunPlan(brand);

  const rows = useMemo(() => data?.proposals ?? [], [data]);
  const total = data?.total ?? 0;

  /** Selection belongs to one filtered list; changing the list drops it. */
  function reset(next: Partial<{ brand: string; tab: ProposalStatus }>) {
    if (next.brand !== undefined) setBrand(next.brand);
    if (next.tab !== undefined) setTab(next.tab);
    setPage(0);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectableIds = rows.filter((r) => r.status === "pending").map((r) => r._id);
  const allSelected = selectableIds.length > 0
    && selectableIds.every((id) => selected.has(id));

  const busy = decide.isPending || decideMany.isPending || execute.isPending;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Ad Scaling</h1>
          <p className="text-xs text-muted">
            Winning ads, and the pages they could be duplicated onto. Approving
            one builds it on Meta — created paused, checked, then activated.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => plan.mutate(true)}
            disabled={plan.isPending}
            title="See what a plan would propose, without saving anything"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-white/5 hover:text-foreground disabled:cursor-not-allowed disabled:text-faint"
          >
            {plan.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <PlayCircle className="h-3.5 w-3.5" />}
            Preview a plan
          </button>
          <button
            type="button"
            onClick={() => plan.mutate(false)}
            disabled={plan.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Rocket className="h-3.5 w-3.5" />
            Run a plan
          </button>
        </div>
      </header>

      <BrandTabs value={brand} onChange={(next) => reset({ brand: next })} />

      {/* What the last pass decided, before the list of what it produced.
          An empty list alone never said whether the planner had run. */}
      <RunBanner brand={brand} />

      {/* Status tabs, each carrying its own count. */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => reset({ tab: key })}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-xs font-semibold transition-colors",
              tab === key
                ? "border-accent text-foreground"
                : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {label}
            <span className="ml-1.5 text-faint">{counts.data?.[key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* When. Above the other filters because it changes the tab counts
          too, and a count that disagrees with the list is worse than none. */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs">
        <span className="mr-1 text-muted">Proposed</span>
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setPeriod(key); setPage(0); setSelected(new Set()); }}
            className={cn(
              "rounded-lg px-2.5 py-1 font-semibold transition-colors",
              period === key
                ? "bg-accent text-black"
                : "text-muted hover:bg-white/5 hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
        {period === "custom" && (
          <span className="ml-2 flex items-center gap-1.5">
            <input
              type="date" value={customFrom}
              onChange={(e) => { setCustomFrom(e.target.value); setPage(0); }}
              className="rounded border border-border bg-transparent px-2 py-1 text-foreground"
            />
            <span className="text-faint">to</span>
            <input
              type="date" value={customTo}
              onChange={(e) => { setCustomTo(e.target.value); setPage(0); }}
              className="rounded border border-border bg-transparent px-2 py-1 text-foreground"
            />
          </span>
        )}
      </div>

      {/* Filters. */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs">
        <label className="flex items-center gap-1.5">
          <span className="text-muted">Purchases at least</span>
          <input
            type="number" min={0} value={minPurchases}
            onChange={(e) => { setMinPurchases(e.target.value); setPage(0); }}
            placeholder="any"
            className="w-20 rounded border border-border bg-transparent px-2 py-1 text-foreground"
          />
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-muted">Cost per purchase under</span>
          <input
            type="number" min={0} value={maxCpa}
            onChange={(e) => { setMaxCpa(e.target.value); setPage(0); }}
            placeholder="any"
            className="w-24 rounded border border-border bg-transparent px-2 py-1 text-foreground"
          />
        </label>
        {(minPurchases || maxCpa) && (
          <button
            type="button"
            onClick={() => { setMinPurchases(""); setMaxCpa(""); setPage(0); }}
            className="text-faint underline-offset-2 hover:underline"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-faint">
          {total} proposal{total === 1 ? "" : "s"}
        </span>
      </div>

      {/* Bulk bar — only where a bulk decision is possible. */}
      {tab === "pending" && selectableIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs">
          <label className="flex items-center gap-2 font-semibold text-muted">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() =>
                setSelected(allSelected ? new Set() : new Set(selectableIds))}
            />
            Select all on this page
          </label>
          <span className="text-faint">{selected.size} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              disabled={selected.size === 0 || busy}
              onClick={() => decideMany.mutate(
                { ids: [...selected], decision: "approved" },
                { onSuccess: () => setSelected(new Set()) },
              )}
              className="flex items-center gap-1.5 rounded-lg bg-success/15 px-3 py-1.5 font-semibold text-success ring-1 ring-inset ring-success/25 transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve selected
            </button>
            <button
              type="button"
              disabled={selected.size === 0 || busy}
              onClick={() => decideMany.mutate(
                { ids: [...selected], decision: "rejected" },
                { onSuccess: () => setSelected(new Set()) },
              )}
              className="flex items-center gap-1.5 rounded-lg bg-danger/15 px-3 py-1.5 font-semibold text-danger ring-1 ring-inset ring-danger/25 transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject selected
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-xs text-danger">
          {(error as Error).message}
        </p>
      ) : isLoading ? (
        <p className="p-8 text-center text-xs text-faint">Loading proposals…</p>
      ) : rows.length === 0 ? (
        <EmptyState tab={tab} brand={brand} />
      ) : (
        <ul className="space-y-2">
          {rows.map((proposal) => (
            <ProposalCard
              key={proposal._id}
              proposal={proposal}
              selected={selected.has(proposal._id)}
              onToggle={() => toggle(proposal._id)}
              busy={busy}
              onDecide={(decision) =>
                decide.mutate({ id: proposal._id, decision })}
              onRevise={() => setRevising(proposal)}
              onExecute={() => execute.mutate(proposal._id)}
            />
          ))}
        </ul>
      )}

      {revising && (
        <ReviseDialog
          proposal={revising}
          busy={decide.isPending}
          onCancel={() => setRevising(null)}
          onConfirm={(revision, note) =>
            decide.mutate(
              { id: revising._id, decision: "revised", revision, note },
              { onSuccess: () => setRevising(null) },
            )}
        />
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
        label="proposals"
      />
    </div>
  );
}

function EmptyState({ tab, brand }: { tab: ProposalStatus; brand: string }) {
  const text = tab === "pending"
    ? `Nothing waiting for ${brand}. Run a plan to look for winners.`
    : `No ${tab} proposals for ${brand}.`;
  return <p className="rounded-xl border border-border bg-surface p-8 text-center text-xs text-faint">{text}</p>;
}

function ProposalCard({
  proposal, selected, onToggle, busy, onDecide, onRevise, onExecute,
}: {
  proposal: Proposal;
  selected: boolean;
  onToggle: () => void;
  busy: boolean;
  onDecide: (decision: "approved" | "rejected") => void;
  onRevise: () => void;
  onExecute: () => void;
}) {
  const pending = proposal.status === "pending";
  const approved = proposal.status === "approved" || proposal.status === "revised";
  const built = Boolean(proposal.created_ad_id);
  // The build happens automatically after approval. This button is for the
  // case where it did not — a refused creative, or a rate limit that has not
  // cleared — so it reads as a retry rather than as the normal way to launch
  // an ad. Offered for a waiting proposal too: the automatic sweep runs every
  // fifteen minutes, and someone watching the gauge clear should not have to
  // wait for the next tick.
  const waiting = proposal.execution_status === "waiting_for_limit";
  const needsRetry = approved && !built
    && (Boolean(proposal.execution_error) || waiting);
  const note = executionNote(proposal);
  const revisedPage = proposal.revision?.target_page_name;

  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start gap-3">
        {pending && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="mt-1"
            aria-label={`Select ${proposal.source_ad_name}`}
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" title={proposal.source_ad_name}>
            {proposal.source_ad_name}
          </p>

          {/* Where it comes from, and where it goes. Both named, because
              "onto Listicle 2" alone never said which Facebook page would
              carry it or which campaign it would join. */}
          <dl className="mt-1.5 grid gap-x-4 gap-y-1 text-[11px] sm:grid-cols-2">
            <Fact label="Lands on" value={revisedPage || proposal.target_page_name}
                  hint={revisedPage ? `changed from ${proposal.target_page_name}` : ""}
                  href={proposal.target_url} />
            <Fact label="Posts from" value={proposal.editorial_page_name || "—"} />
            <Fact label="Joins campaign"
                  value={proposal.target_campaign_name || proposal.source_campaign_name || "—"} />
            <Fact label="In ad set"
                  value={proposal.target_adset_name || proposal.source_adset_name || "—"} />
          </dl>

          {proposal.new_ad_name && (
            <p className="mt-1.5 truncate text-[11px] text-faint" title={proposal.new_ad_name}>
              New ad name: <span className="text-muted">{proposal.new_ad_name}</span>
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px]">
            {/* The concept page first: headlines, primary texts and the
                Analyst's verdict are what someone actually needs to judge
                whether this creative deserves another placement. */}
            {proposal.concept && (
              <Link
                href={`/concepts-analysis/${encodeURIComponent(proposal.concept)}?brand=${proposal.brand}`}
                className="inline-flex items-center gap-1 text-accent underline-offset-2 hover:underline"
              >
                <FileText className="h-3 w-3" />
                Read this concept
              </Link>
            )}
            {proposal.source_ad_id && (
              <a
                href={adsManagerUrl(proposal.ad_account_id, proposal.source_ad_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-muted underline-offset-2 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Open in Ads Manager
              </a>
            )}
          </div>
        </div>

        {/* The evidence that made it a candidate. */}
        <dl className="flex shrink-0 gap-4 text-xs tabular-nums">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-faint">Purchases</dt>
            <dd className="font-semibold">{proposal.purchases}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-faint">Spend</dt>
            <dd className="font-semibold">{money(proposal.spend)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-faint">Per purchase</dt>
            <dd className="font-semibold">{proposal.cpa ? money(proposal.cpa) : "—"}</dd>
          </div>
        </dl>
      </div>

      {note && (
        <p className={cn(
          "mt-3 flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs",
          note.tone === "good" && "bg-success/10 text-success",
          note.tone === "warn" && "bg-warning/10 text-warning",
          note.tone === "bad" && "bg-danger/10 text-danger",
          note.tone === "info" && "bg-white/5 text-muted",
        )}>
          {note.tone === "bad" && <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span>{note.text}</span>
        </p>
      )}

      {proposal.blockers && proposal.blockers.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-warning">
          {proposal.blockers.map((blocker) => (
            <li key={blocker}>· {blocker}</li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {proposal.status !== "pending" && (
          <Badge tone={
            proposal.status === "approved" || proposal.status === "revised" ? "good"
              : proposal.status === "rejected" ? "bad" : "muted"
          }>
            {proposal.status}
          </Badge>
        )}
        {proposal.decided_by && (
          <span className="text-faint">
            by {proposal.decided_by} <TimeAgo at={proposal.decided_at} />
          </span>
        )}
        {proposal.status === "pending" && (
          <ExpiresIn at={proposal.expires_at} />
        )}

        <div className="ml-auto flex items-center gap-2">
          {pending && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDecide("approved")}
                className="rounded-lg bg-success/15 px-3 py-1.5 font-semibold text-success ring-1 ring-inset ring-success/25 transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Approve
              </button>
              {/* Revising is not rejecting: the creative is still worth
                  scaling, the page chosen for it is not the right one. */}
              <button
                type="button"
                disabled={busy}
                onClick={onRevise}
                title="Approve it, but for a different page"
                className="rounded-lg bg-white/5 px-3 py-1.5 font-semibold text-muted ring-1 ring-inset ring-white/10 transition-colors hover:text-foreground disabled:opacity-40"
              >
                Revise
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDecide("rejected")}
                className="rounded-lg bg-danger/15 px-3 py-1.5 font-semibold text-danger ring-1 ring-inset ring-danger/25 transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Reject
              </button>
            </>
          )}
          {needsRetry && (
            <button
              type="button"
              disabled={busy}
              onClick={onExecute}
              title={waiting
                ? "Tries now instead of waiting for the next automatic retry."
                : "Tries again. The ad is created paused, checked, then activated."}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Rocket className="h-3.5 w-3.5" />
              Try again
            </button>
          )}
        </div>
      </div>
    </li>
  );
}


/** One labelled fact about where a copy is going. */
function Fact({ label, value, hint, href }: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-faint">{label}</dt>
      <dd className="truncate font-semibold text-foreground" title={value}>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer"
             className="underline-offset-2 hover:underline">
            {value}
          </a>
        ) : value}
        {hint && <span className="ml-1 font-normal text-faint">({hint})</span>}
      </dd>
    </div>
  );
}
