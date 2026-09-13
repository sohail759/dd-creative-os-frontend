/**
 * The two kinds of page, which had no screen at all until now.
 *
 * A landing page is the URL an ad points AT. It was only ever visible through
 * a concept that referenced it.
 *
 * A Facebook page is the Meta object an ad posts FROM. It was a name in the
 * upload picker with nothing to say whether Meta would actually let an ad run
 * from it — which for two thirds of them it would not.
 */

export interface LandingPage {
  id: string;
  brand: string;
  name: string;
  url?: string | null;
  language?: string | null;
  angle?: string | null;
  sub_angle?: string | null;
  audience?: string | null;
  problem?: string | null;
  notion_url?: string | null;
  data_source_name?: string | null;
}

export interface AdsPage {
  id: string;
  page_id: string;
  brand: string;
  canonical_name: string;
  page_type?: string | null;
  declared_page_type?: string | null;
  page_url?: string | null;
  /** The registry's verdict. Everything else on this row explains it. */
  final_launch_eligible: boolean;
  drift_state: string;
  suppression_status?: string | null;
  suppression_reason?: string | null;
  meta_capacity_status?: string | null;
  ads_running_or_in_review?: number | null;
  page_limit?: number | null;
  ads_remaining?: number | null;
  meta_write_access?: boolean;
  meta_publication_status?: string | null;
  classification_complete?: boolean;
  last_verified_at?: string | null;
  last_refreshed_at?: string | null;
  owner?: string | null;
  operator_status?: string | null;
  has_meta_page_id?: boolean;
}

export interface PageHealthBrand {
  brand: string;
  known: number;
  eligible: number;
  drift_states: Record<string, number>;
  last_refreshed_at: string | null;
  stale: boolean;
  stale_after_hours: number;
  running_run_id: string | null;
}

export interface PageHealthRunStep {
  key: string;
  step: string;
  status: string;
  started_at?: string | null;
  finished_at?: string | null;
  error?: string | null;
}

export interface PageHealthRun {
  id: string;
  brand: string;
  status: string;
  progress: PageHealthRunStep[];
  started_at?: string | null;
  finished_at?: string | null;
  duration_ms?: number | null;
  error?: string | null;
  payload?: { trigger?: string } | null;
  cli_result?: Record<string, unknown> | null;
}

export interface Paged<T> {
  total: number;
  items: T[];
  limit: number;
  offset: number;
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

async function get<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) await fail(res);
  return (await res.json()) as T;
}

/** Drops empty values so a blank filter does not become `?angle=`. */
function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === null) continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function listLandingPages(params: {
  brand?: string;
  q?: string;
  language?: string;
  angle?: string;
  limit?: number;
  offset?: number;
}): Promise<Paged<LandingPage>> {
  return get(`/v1/pages/landing${query(params)}`);
}

export function landingPageFilters(brand?: string): Promise<{
  brands: string[];
  languages: string[];
  angles: string[];
}> {
  return get(`/v1/pages/landing/filters${query({ brand })}`);
}

export function listAdsPages(params: {
  brand?: string;
  q?: string;
  drift_state?: string;
  eligible?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Paged<AdsPage>> {
  return get(`/v1/pages/ads${query(params)}`);
}

export function pageHealthOverview(brand?: string): Promise<{ brands: PageHealthBrand[] }> {
  return get(`/v1/pages/health${query({ brand })}`);
}

export function pageHealthRuns(brand: string, limit = 20): Promise<{ runs: PageHealthRun[] }> {
  return get(`/v1/pages/health/runs${query({ brand, limit })}`);
}

/** Queue a refresh. Returns as soon as it is queued, like the Notion sync. */
export async function refreshPageHealth(
  brand: string,
): Promise<{ queued: boolean; reason?: string; run_id?: string; task_id?: string }> {
  const res = await fetch(apiUrl(`/v1/pages/health/refresh${query({ brand })}`), {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) await fail(res);
  return await res.json();
}

/* ---------------------------------------------------------------------------
 * Campaigns and ad sets
 *
 * Both were invisible: a campaign was a name in a dropdown and an ad set was
 * a string the uploader built that Meta either matched or created. The two
 * collections that back the upload path answer "which campaign is live for
 * this language" and "where did B438 go".
 * ------------------------------------------------------------------------ */

export interface Campaign {
  id: string;
  campaign_id: string;
  brand: string;
  ad_account_id?: string | null;
  name: string;
  status: string;
  /** What the campaign's own NAME declares. */
  language?: string | null;
  /** What the brand pack claims. The two disagreeing means a stale pack. */
  configured_language?: string | null;
  adset_count: number;
  last_seen_at?: string | null;
}

export interface AdSet {
  id: string;
  adset_id: string;
  campaign_id: string;
  campaign_name?: string | null;
  brand: string;
  name: string;
  status: string;
  effective_status?: string | null;
  language?: string | null;
  batch_name?: string | null;
  created_by?: string | null;
  last_seen_at?: string | null;
}

export interface MirrorFreshness {
  /** null when this brand has never been mirrored. */
  age_seconds: number | null;
  /** An upload re-reads anything older than this before it runs. */
  upload_refreshes_after_seconds: number;
}

export function listCampaigns(params: {
  brand?: string;
  q?: string;
  language?: string;
  status?: string;
}): Promise<{ total: number; items: Campaign[]; mirror: MirrorFreshness }> {
  return get(`/v1/meta/campaigns${query(params)}`);
}

export function listAdSets(params: {
  brand?: string;
  campaign_id?: string;
  q?: string;
  batch_name?: string;
  limit?: number;
  offset?: number;
}): Promise<Paged<AdSet>> {
  return get(`/v1/meta/adsets${query(params)}`);
}

/** Re-read this brand's campaigns and ad sets from Meta. Runs inline. */
export async function refreshTopology(
  brand: string,
): Promise<{ campaigns: number; ad_sets: number }> {
  const res = await fetch(apiUrl(`/v1/meta/topology/refresh${query({ brand })}`), {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) await fail(res);
  return await res.json();
}
