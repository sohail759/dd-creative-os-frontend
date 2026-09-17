"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { useScalingPolicy, useUpdatePolicy } from "@/hooks/use-scaling";
import type { ScalingPolicy } from "@/lib/api/scaling";
import { BRANDS, BrandTabs, TimeAgo } from "@/components/pages/shared";

/**
 * The rules Ad Scaling runs by.
 *
 * Split into what can be changed and what cannot. The locked half is shown
 * rather than hidden: those values still decide whether a proposal exists, so
 * "why did nothing get proposed" needs them visible. They are locked because
 * a wrong page name or status matches nothing and disqualifies every
 * candidate silently — which looks exactly like a quiet week.
 */

const NUMBER_FIELDS: Array<{ key: keyof ScalingPolicy; label: string; hint: string }> = [
  { key: "purchase_threshold", label: "Purchases needed to qualify",
    hint: "An ad must reach this many purchases in the lookback window." },
  { key: "lookback_days", label: "Lookback window (days)",
    hint: "How far back performance is counted." },
  { key: "max_proposals_per_run", label: "Most proposals per run",
    hint: "A ceiling, so a rule change cannot quietly propose hundreds." },
  { key: "proposal_expiry_hours", label: "Proposals expire after (hours)",
    hint: "Past this, the numbers behind a proposal are too old to act on." },
  { key: "max_ads_per_page", label: "Ads per page (fallback)",
    hint: "Used only for a page that carries no limit of its own." },
  { key: "page_health_stale_hours", label: "Page health stale after (hours)",
    hint: "Older than this, a page's capacity is not trusted." },
];

export function ScalingPolicyView() {
  const [brand, setBrand] = useState<string>(BRANDS[0].slug);
  const { data: policy, isLoading, error } = useScalingPolicy(brand);
  const save = useUpdatePolicy(brand);
  const [draft, setDraft] = useState<Record<string, string | boolean>>({});

  /** A draft belongs to the brand it was typed for, so switching drops it. */
  function changeBrand(next: string) {
    setBrand(next);
    setDraft({});
  }

  if (isLoading) return <p className="p-8 text-center text-xs text-faint">Loading rules…</p>;
  if (error) {
    return (
      <p className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-xs text-danger">
        {(error as Error).message}
      </p>
    );
  }
  if (!policy) return null;

  const editable = new Set(policy.editable_fields);
  function value(key: keyof ScalingPolicy) {
    return draft[key] ?? (policy as ScalingPolicy)[key];
  }
  const dirty = Object.keys(draft).length > 0;

  function commit() {
    const changes: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(draft)) {
      changes[key] = typeof raw === "boolean" ? raw : Number(raw);
    }
    save.mutate(changes as Partial<ScalingPolicy>, { onSuccess: () => setDraft({}) });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <h1 className="text-lg font-semibold">Ad Scaling rules</h1>
        <p className="text-xs text-muted">
          What counts as a winner, and how far one run may go.
        </p>
      </header>

      <BrandTabs value={brand} onChange={changeBrand} />

      {!policy.configured && (
        <p className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
          {brand} has never been configured, so these are the defaults and
          scaling is switched off.
        </p>
      )}
      {policy.warnings.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
          {policy.warnings.map((w) => <li key={w}>· {w}</li>)}
        </ul>
      )}

      <section className="rounded-xl border border-border bg-surface p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={Boolean(value("enabled"))}
            onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
            disabled={!editable.has("enabled")}
            className="mt-0.5"
          />
          <span>
            <span className="text-sm font-semibold">Scaling is on for {brand}</span>
            <span className="block text-xs text-muted">
              While off, the daily planner proposes nothing for this brand.
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Thresholds</h2>
        {NUMBER_FIELDS.map(({ key, label, hint }) => (
          <label key={key} className="flex flex-wrap items-center gap-3 text-xs">
            <span className="w-64 shrink-0">
              <span className="font-semibold">{label}</span>
              <span className="block text-faint">{hint}</span>
            </span>
            <input
              type="number"
              min={0}
              step={key === "purchase_threshold" ? "0.5" : "1"}
              value={String(value(key) ?? "")}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              disabled={!editable.has(key as string)}
              className="w-28 rounded border border-border bg-transparent px-2 py-1 tabular-nums text-foreground disabled:text-faint"
            />
          </label>
        ))}

        <label className="flex flex-wrap items-center gap-3 text-xs">
          <span className="w-64 shrink-0">
            <span className="font-semibold">Build automatically on approval</span>
            <span className="block text-faint">
              Approving is the last step: the ad is created on Meta without a
              second click, as legacy did.
            </span>
          </span>
          <input
            type="checkbox"
            checked={Boolean(value("auto_build_after_approval"))}
            onChange={(e) => setDraft((d) => ({
              ...d, auto_build_after_approval: e.target.checked,
            }))}
            disabled={!editable.has("auto_build_after_approval")}
          />
        </label>

        <label className="flex flex-wrap items-center gap-3 text-xs">
          <span className="w-64 shrink-0">
            <span className="font-semibold">Activate after the check passes</span>
            <span className="block text-faint">
              Ads are always created paused. This decides whether a verified ad
              is then switched on.
            </span>
          </span>
          <input
            type="checkbox"
            checked={Boolean(value("auto_activate_after_verification"))}
            onChange={(e) => setDraft((d) => ({
              ...d, auto_activate_after_verification: e.target.checked,
            }))}
            disabled={!editable.has("auto_activate_after_verification")}
          />
        </label>
      </section>

      <section className="space-y-2 rounded-xl border border-border bg-surface p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Lock className="h-3.5 w-3.5 text-faint" />
          Fixed rules
        </h2>
        <p className="text-xs text-muted">
          These come from the brand&apos;s policy file and decide which ads,
          campaigns and pages are eligible. They are not editable here: a name
          that matches nothing disqualifies every candidate with no error to
          read, which looks the same as a week with no winners.
        </p>
        <dl className="grid gap-2 sm:grid-cols-2">
          <Fixed label="Winner is picked per" value={policy.dedup_level}
                 hint="one proposal per ad, or per concept" />
          <Fixed
            label="Copies are created in"
            value={[policy.target_campaign_name, policy.default_target_adset_name]
              .filter(Boolean).join("  ·  ")}
            hint="the scaling campaign, not where the ad earns today"
          />
          <Fixed
            label="Winners may come from campaigns named"
            value={policy.source_campaign_name_contains.join(", ")}
            hint={policy.source_campaign_name_excludes.length
              ? `never those containing: ${policy.source_campaign_name_excludes.join(", ")}`
              : ""}
          />
          <Fixed
            label="Page variants"
            value={policy.page_variants.length
              ? policy.page_variants.join(", ")
              : "every landing page in scope"}
            hint="matched against each language's page, e.g. Listicle 1 - DE"
          />
          <Fixed label="Copies are named" value={`… ${policy.target_ad_name_suffix.trim()}`}
                 hint="the source page in the name is swapped for the target's" />
          <Fixed label="Parent phases in scope"
                 value={policy.eligible_parent_phases.join(", ")} />
          <Fixed label="Campaign statuses in scope"
                 value={policy.active_campaign_statuses.join(", ")} />
          <Fixed label="Pixel" value={policy.pixel_id} />
        </dl>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={commit}
          disabled={!dirty || save.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save rules
        </button>
        {dirty && (
          <button type="button" onClick={() => setDraft({})}
                  className="text-xs text-faint underline-offset-2 hover:underline">
            Discard changes
          </button>
        )}
        {policy.updated_by && (
          <span className="ml-auto text-xs text-faint">
            Last changed by {policy.updated_by} <TimeAgo at={policy.updated_at} />
          </span>
        )}
      </div>
    </div>
  );
}

function Fixed({ label, value, hint }: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-faint">{label}</dt>
      <dd className="text-xs text-muted">{value || "—"}</dd>
      {hint && <p className="mt-0.5 text-[10px] text-faint">{hint}</p>}
    </div>
  );
}
