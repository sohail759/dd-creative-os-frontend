/**
 * Ad Scaling: the rules, the proposals, and the decisions made on them.
 *
 * A proposal is a (winning ad, target page) pair the planner produced. Nothing
 * here launches anything by itself — approving marks a proposal ready, and
 * executing it is a separate, explicit action.
 */

export type ProposalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "revised"
  | "expired";

/** Where execution got to. The two "…_orphaned"/"…_unverified" states mean an
 *  object exists on Meta that someone has to look at. */
export type ExecutionStatus =
  | "not_started"
  | "waiting_for_limit"
  | "creative_orphaned"
  | "created_unverified"
  | "verified_paused"
  | "activated"
  | "blocked";

export interface Proposal {
  _id: string;
  brand: string;
  run_id: string;
  status: ProposalStatus;
  created_at: string;
  expires_at: string;

  source_ad_id: string;
  source_ad_name: string;
  source_creative_id: string;
  source_campaign_id?: string;
  source_campaign_name?: string;
  source_adset_id?: string;
  source_adset_name?: string;
  source_page_name?: string;
  concept?: string;

  /** The LANDING page: where the ad points. */
  target_page_name: string;
  target_url: string;
  /** The FACEBOOK page: what it posts from. */
  target_page_id: string;
  editorial_page_name?: string;
  /** Where the copy is CREATED — the scaling campaign, not the source's. */
  target_campaign_id?: string;
  target_campaign_name?: string;
  target_adset_id?: string;
  target_adset_name?: string;
  new_ad_name: string;

  purchases: number;
  spend: number;
  cpa: number;
  roas: number;

  blockers?: string[];
  decided_at?: string | null;
  decided_by?: string;
  decision_note?: string;
  revision?: Record<string, string>;

  execution_status?: ExecutionStatus;
  created_ad_id?: string;
  created_creative_id?: string;
  execution_error?: string;
  deferred_reason?: string;
  deferred_at?: string | null;
  activated?: boolean;
}

export interface ProposalPage {
  total: number;
  count: number;
  offset: number;
  proposals: Proposal[];
}

export interface ScalingPolicy {
  brand: string;
  enabled: boolean;
  purchase_threshold: number;
  dedup_level: "ad" | "concept";
  lookback_days: number;
  max_ads_per_page: number;
  page_health_stale_hours: number;
  proposal_expiry_hours: number;
  max_proposals_per_run: number;
  auto_build_after_approval: boolean;
  auto_activate_after_verification: boolean;
  /** The landing-page variants a winner may be copied onto. */
  page_variants: string[];
  source_page_rules: Record<string, string[]>;
  /** Which campaigns a winner may be taken FROM, matched on name. */
  source_campaign_name_contains: string[];
  source_campaign_name_excludes: string[];
  /** Where the copy is created — the scaling campaign, not the source's. */
  target_campaign_id: string;
  target_campaign_name: string;
  default_target_adset_id: string;
  default_target_adset_name: string;
  pixel_id: string;
  target_ad_name_suffix: string;
  eligible_parent_phases: string[];
  active_campaign_statuses: string[];
  eligible_campaign_ids: string[];
  excluded_campaign_ids: string[];
  unusable_page_health_statuses: string[];
  language_labels: string[];
  updated_at?: string | null;
  updated_by?: string;
  /** Sent by the API so the UI never hardcodes which fields are editable. */
  editable_fields: string[];
  locked_fields: string[];
  configured: boolean;
  warnings: string[];
}

export interface PlanResult {
  brand: string;
  run_id: string;
  dry_run: boolean;
  written: number;
  skipped?: string;
  capped_at?: number;
  counts?: Record<string, number>;
  proposals: Array<Pick<Proposal,
    "_id" | "source_ad_name" | "target_page_name" | "new_ad_name"
    | "purchases" | "spend" | "cpa" | "status">>;
}

export interface BulkResult {
  ok: boolean;
  reason: string;
  applied: number;
  failed: Array<{ id: string; reason: string }>;
}

function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!base) throw new Error("NEXT_PUBLIC_API_URL is not configured");
  return `${base}${path}`;
}

async function fail(res: Response): Promise<never> {
  let detail = `Request failed with ${res.status}`;
  try {
    const body = await res.json();
    if (body?.detail) {
      detail =
        typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    }
  } catch {
    /* keep the status-code message */
  }
  throw new Error(detail);
}

/** Drops empty values so a blank filter does not become `?max_cpa=`. */
function query(
  params: Record<string, string | number | boolean | string[] | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === null) continue;
    if (Array.isArray(value)) {
      // Repeated key, which is what FastAPI reads as a list.
      for (const item of value) if (item) search.append(key, String(item));
      continue;
    }
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), { credentials: "include", cache: "no-store" });
  if (!res.ok) await fail(res);
  return (await res.json()) as T;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) await fail(res);
  return (await res.json()) as T;
}

export function getPolicy(brand: string): Promise<ScalingPolicy> {
  return get(`/v1/scaling/policy/${encodeURIComponent(brand)}`);
}

export async function updatePolicy(
  brand: string,
  changes: Partial<ScalingPolicy>,
): Promise<ScalingPolicy> {
  const res = await fetch(apiUrl(`/v1/scaling/policy/${encodeURIComponent(brand)}`), {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
  if (!res.ok) await fail(res);
  return (await res.json()) as ScalingPolicy;
}

export function runPlan(brand: string, dryRun = true): Promise<PlanResult> {
  return post(`/v1/scaling/plan${query({ brand, dry_run: dryRun })}`);
}

export function listProposals(params: {
  brand?: string;
  run_id?: string;
  status?: string[];
  min_purchases?: number;
  max_cpa?: number;
  limit?: number;
  offset?: number;
}): Promise<ProposalPage> {
  return get(`/v1/scaling/proposals${query(params)}`);
}

export function proposalCounts(
  brand?: string,
  runId?: string,
): Promise<Record<ProposalStatus, number>> {
  return get(`/v1/scaling/proposals/counts${query({ brand, run_id: runId })}`);
}

export function decideProposal(
  id: string,
  decision: "approved" | "rejected" | "revised",
  options: { note?: string; revision?: Record<string, string> } = {},
): Promise<{ ok: boolean; proposal: Proposal }> {
  return post(`/v1/scaling/proposals/${encodeURIComponent(id)}/decide`, {
    decision,
    note: options.note ?? "",
    revision: options.revision,
  });
}

export function decideSelection(
  ids: string[],
  decision: "approved" | "rejected",
  note = "",
): Promise<BulkResult> {
  return post(`/v1/scaling/proposals/decide`, { ids, decision, note });
}

export function executeProposal(
  id: string,
  dryRun = false,
): Promise<{ ok: boolean; created_ad_id?: string; activated?: boolean }> {
  return post(
    `/v1/scaling/proposals/${encodeURIComponent(id)}/execute${query({ dry_run: dryRun })}`,
  );
}


export type RunStatus = "running" | "ok" | "nothing_to_do" | "blocked" | "failed";

export interface ScalingRun {
  _id: string;
  brand: string;
  status: RunStatus;
  dry_run: boolean;
  trigger: string;
  started_at: string;
  finished_at?: string | null;
  proposals: number;
  written?: number;
  capped_at?: number | null;
  skipped: string;
  error: string;
  counts: Record<string, number>;
}

export function listRuns(brand?: string, limit = 20): Promise<{ runs: ScalingRun[] }> {
  return get(`/v1/scaling/runs${query({ brand, limit })}`);
}
