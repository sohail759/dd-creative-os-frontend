"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, RefreshCw, Search } from "lucide-react";
import { useAdSets, useCampaigns, useRefreshTopology } from "@/hooks/use-pages";
import type { Campaign, MirrorFreshness } from "@/lib/api/pages";
import { BRANDS, Badge, BrandTabs, TimeAgo } from "./shared";
import { cn } from "@/lib/utils";

/**
 * Campaigns and the ad sets under them.
 *
 * Both were invisible. A campaign was a name in a dropdown; an ad set was a
 * string the uploader built that Meta either matched or created. So "which
 * campaign is live for Dutch" and "did B438 get its own ad set or land in an
 * old one" had no answer short of opening Ads Manager and searching by name.
 *
 * A campaign expands to its ad sets rather than opening a second screen: the
 * question is almost always about one campaign's contents, and two thousand
 * ad sets in a flat list answers nothing.
 */
export function MetaStructureView() {
  const [brand, setBrand] = useState<string>(BRANDS[0].slug);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, error } = useCampaigns({
    brand,
    q: search.trim() || undefined,
    status: activeOnly ? "ACTIVE" : undefined,
  });
  const refresh = useRefreshTopology();

  const campaigns = data?.items ?? [];
  const mirror = data?.mirror;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Campaigns &amp; Ad Sets
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            What an upload picks between. An ad set is created once per batch
            and reused by every concept in it, so this is also where a batch
            went.
          </p>
          {mirror && <MirrorLine mirror={mirror} />}
        </div>
        <button
          type="button"
          onClick={() => refresh.mutate(brand)}
          disabled={refresh.isPending}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition-colors",
            refresh.isPending
              ? "cursor-wait text-accent"
              : "text-muted hover:bg-white/5 hover:text-foreground",
          )}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refresh.isPending && "animate-spin")} />
          Refresh from Meta
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <BrandTabs value={brand} onChange={setBrand} />
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns by name"
              className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--color-accent)]"
            />
            Active only
          </label>
        </div>
      </div>

      {error && (
        <p className="mt-6 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {(error as Error).message}
        </p>
      )}

      {isLoading && (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted" />
        </div>
      )}

      {!isLoading && campaigns.length === 0 && (
        <p className="mt-6 rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          No campaigns mirrored for this brand yet. Use Refresh from Meta.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-1.5">
        {campaigns.map((campaign) => (
          <CampaignRow
            key={campaign.id}
            campaign={campaign}
            brand={brand}
            open={expanded === campaign.campaign_id}
            onToggle={() =>
              setExpanded(expanded === campaign.campaign_id ? null : campaign.campaign_id)
            }
          />
        ))}
      </div>
    </div>
  );
}

/**
 * How old this view is, and why that is fine.
 *
 * Nothing refreshes campaigns on a timer. An upload re-reads the campaign list
 * and the ad sets of the campaign it is about to use, so what an ad lands in is
 * always current even when this screen is a day behind. Saying so stops the
 * Refresh button reading as something you have to remember to press.
 */
function MirrorLine({ mirror }: { mirror: MirrorFreshness }) {
  const minutes = mirror.upload_refreshes_after_seconds / 60;
  if (mirror.age_seconds === null) {
    return (
      <p className="mt-2 text-xs text-warning">
        Never read from Meta for this brand. An upload will read it before it
        runs; Refresh now to see it here.
      </p>
    );
  }
  const age =
    mirror.age_seconds < 90 ? "just now"
    : mirror.age_seconds < 5400 ? `${Math.round(mirror.age_seconds / 60)} min ago`
    : `${Math.round(mirror.age_seconds / 3600)} h ago`;
  return (
    <p className="mt-2 text-xs text-faint">
      Read from Meta {age}. An upload re-reads anything older than{" "}
      {minutes < 60 ? `${Math.round(minutes)} minutes` : `${Math.round(minutes / 60)} hours`}{" "}
      before it runs, so this being behind never affects where an ad lands.
    </p>
  );
}

function CampaignRow({
  campaign,
  brand,
  open,
  onToggle,
}: {
  campaign: Campaign;
  brand: string;
  open: boolean;
  onToggle: () => void;
}) {
  const Chevron = open ? ChevronDown : ChevronRight;
  // The pack claiming one language while the name says another means the
  // pack has gone stale against a rotation, which is the single thing most
  // likely to send an ad to the wrong campaign.
  const packDisagrees =
    Boolean(campaign.configured_language) &&
    Boolean(campaign.language) &&
    campaign.configured_language !== campaign.language;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-surface",
        open ? "border-accent/40" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
      >
        <Chevron className="h-4 w-4 shrink-0 text-faint" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {campaign.name}
          </span>
          <span className="block text-[10px] tabular-nums text-faint">
            {campaign.campaign_id}
          </span>
        </span>
        {campaign.language && <Badge tone="muted">{campaign.language}</Badge>}
        {packDisagrees && (
          <Badge
            tone="warn"
            title={`The brand pack lists this campaign as ${campaign.configured_language}, but its name says ${campaign.language}.`}
          >
            Pack says {campaign.configured_language}
          </Badge>
        )}
        <Badge
          tone={
            campaign.status === "ACTIVE" ? "good"
            : campaign.status === "GONE" ? "bad"
            : "muted"
          }
        >
          {campaign.status}
        </Badge>
        <span className="shrink-0 text-xs tabular-nums text-muted">
          {campaign.adset_count} ad sets
        </span>
      </button>

      {open && <AdSetList brand={brand} campaignId={campaign.campaign_id} />}
    </div>
  );
}

function AdSetList({ brand, campaignId }: { brand: string; campaignId: string }) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAdSets({
    brand,
    campaign_id: campaignId,
    q: search.trim() || undefined,
    limit: 200,
  });
  const rows = data?.items ?? [];

  return (
    <div className="border-t border-border bg-black/10 px-4 py-3">
      <label className="relative block max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ad sets"
          className="w-full rounded-lg border border-border bg-surface py-1.5 pl-8 pr-2.5 text-xs text-foreground placeholder:text-faint focus:border-accent focus:outline-none"
        />
      </label>

      {isLoading && (
        <div className="py-4 text-center">
          <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted" />
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <p className="py-4 text-center text-xs text-muted">No ad sets here.</p>
      )}

      {rows.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-faint">
                <th className="pb-1.5 pr-4 text-left font-semibold">Ad set</th>
                <th className="pb-1.5 pr-4 text-left font-semibold">Batch</th>
                <th className="pb-1.5 pr-4 text-left font-semibold">Status</th>
                <th className="pb-1.5 pr-4 text-left font-semibold">Created</th>
                <th className="pb-1.5 text-left font-semibold">Seen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/50">
                  <td className="py-1.5 pr-4">
                    <span className="text-foreground">{row.name}</span>
                    <span className="ml-2 tabular-nums text-[10px] text-faint">
                      {row.adset_id}
                    </span>
                  </td>
                  <td className="py-1.5 pr-4 text-muted">{row.batch_name || "—"}</td>
                  <td className="py-1.5 pr-4">
                    <Badge
                      tone={
                        (row.effective_status || row.status) === "ACTIVE" ? "good" : "muted"
                      }
                    >
                      {row.effective_status || row.status}
                    </Badge>
                  </td>
                  <td className="py-1.5 pr-4 text-muted">
                    {row.created_by === "upload" ? "By an upload" : "—"}
                  </td>
                  <td className="py-1.5 text-muted">
                    <TimeAgo at={row.last_seen_at} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
