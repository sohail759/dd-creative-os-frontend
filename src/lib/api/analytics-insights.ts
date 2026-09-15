/**
 * Analytics, read straight from the `insights` / `meta_ledger` collections —
 * no live Meta call on the read path. `refreshInsights` below is the one
 * write action: it queues the async insights job and returns immediately:
 * everything else here only reads what that job already wrote.
 */

export type Window = "7d" | "14d" | "30d" | "90d" | "lifetime";

export interface Kpis {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  inline_link_clicks: number;
  purchases: number;
  initiated_checkouts: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  cost_per_purchase: number;
  frequency: number;
}

export interface TrendPoint extends Kpis {
  date: string;
}

export interface Overview {
  brand: string;
  window: Window;
  kpis: Kpis;
  trend: TrendPoint[];
  ad_count: number;
  campaign_count: number;
  days_available: number;
}

export interface CampaignRow {
  campaign_id: string;
  name: string;
  status: string;
  language: string;
  ad_count: number;
  kpis: Kpis;
}

export interface AdRow {
  ad_id: string;
  name: string;
  status: string;
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  campaign_name: string;
  kpis: Kpis;
}

export interface AdDetail {
  ad_id: string;
  ad_name: string;
  campaign_id: string;
  campaign_name: string;
  status: string;
  created_time: string;
  persona_code: string;
  lifetime: Record<string, number>;
  window_28d: Record<string, number>;
  daily: Array<{ date: string } & Record<string, number>>;
}

export interface Paged<T> {
  total: number;
  items: T[];
  limit: number;
  offset: number;
}

export interface SyncStatus {
  brand: string;
  running: boolean;
  running_run_id: string | null;
  latest_run: {
    status: string;
    started_at?: string | null;
    finished_at?: string | null;
    duration_ms?: number | null;
    error?: string | null;
    cli_result?: { rows_fetched?: number; ledger_ad_count?: number } | null;
    payload?: { trigger?: string; include_lifetime?: boolean } | null;
  } | null;
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
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    }
  } catch {
    /* keep the status-code message */
  }
  throw new Error(detail);
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), { credentials: "include", cache: "no-store" });
  if (!res.ok) await fail(res);
  return (await res.json()) as T;
}

function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === null) continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function getOverview(brand: string, window: Window): Promise<Overview> {
  return get(`/v1/analytics/insights/overview${query({ brand, window })}`);
}

export function listCampaigns(params: {
  brand: string;
  window: Window;
  q?: string;
  status?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}): Promise<Paged<CampaignRow>> {
  return get(`/v1/analytics/insights/campaigns${query(params)}`);
}

export function listCampaignAds(params: {
  brand: string;
  campaignId: string;
  window: Window;
  limit?: number;
  offset?: number;
}): Promise<Paged<AdRow>> {
  const { campaignId, ...rest } = params;
  return get(`/v1/analytics/insights/campaigns/${encodeURIComponent(campaignId)}/ads${query(rest)}`);
}

export function listAds(params: {
  brand: string;
  window: Window;
  q?: string;
  status?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}): Promise<Paged<AdRow>> {
  return get(`/v1/analytics/insights/ads${query(params)}`);
}

export function getAdDetail(brand: string, adId: string): Promise<AdDetail> {
  return get(`/v1/analytics/insights/ads/${encodeURIComponent(adId)}${query({ brand })}`);
}

export function getSyncStatus(brand: string): Promise<SyncStatus> {
  return get(`/v1/analytics/insights/sync-status${query({ brand })}`);
}

/** Queue a refresh. Admin only on the backend; returns as soon as it is queued. */
export async function refreshInsights(
  brand: string,
  includeLifetime = false,
): Promise<{ queued: boolean; reason?: string; run_id?: string; task_id?: string }> {
  const res = await fetch(
    apiUrl(`/v1/insights/refresh${query({ brand, include_lifetime: includeLifetime })}`),
    { method: "POST", credentials: "include" },
  );
  if (!res.ok) await fail(res);
  return await res.json();
}
