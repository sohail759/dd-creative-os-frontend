/**
 * Scheduled Meta job runs, for the two run screens.
 *
 * Both screens read the same shape because both jobs record the same way: a
 * run is one attempt, with stages, a duration and a failure mode. What
 * differs is which steps it carries and what its payload says it was asked
 * to do.
 */

/** One stage of a run, in execution order. */
export interface RunStep {
  key: string;
  step: string;
  status: "pending" | "in_progress" | "done" | "failed" | "skipped";
  error?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface JobRun {
  id: string;
  brand: string;
  kind: string;
  status: "running" | "ok" | "failed";
  progress: RunStep[];
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  ad_account_id?: string | null;
  error?: string | null;
  error_details?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  duration_ms?: number | null;
}

export interface RunPage {
  total: number;
  items: JobRun[];
  limit: number;
  offset: number;
}

export type RunStatusFilter = "" | "running" | "ok" | "failed";

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

export interface RunQuery {
  brand?: string;
  status?: RunStatusFilter;
  limit: number;
  offset: number;
}

function query(params: RunQuery): string {
  const search = new URLSearchParams();
  if (params.brand) search.set("brand", params.brand);
  if (params.status) search.set("status", params.status);
  search.set("limit", String(params.limit));
  search.set("offset", String(params.offset));
  return search.toString();
}

/** Meta snapshot runs: inventory, the daily pass, and the lifetime pass. */
export function getSyncRuns(params: RunQuery): Promise<RunPage> {
  return get<RunPage>(`/v1/insights/sync-runs?${query(params)}`);
}

/** Analyst passes: read the snapshot, classify concepts, save and write back. */
export function getAnalystRuns(params: RunQuery): Promise<RunPage> {
  return get<RunPage>(`/v1/analysis/weekly-runs?${query(params)}`);
}
