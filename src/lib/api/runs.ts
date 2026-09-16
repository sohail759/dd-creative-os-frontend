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
  /** How far through a step that iterates has got. Present only on those
   * steps — the Analyst's `analyze` walks every concept in the brand, and
   * without a count a ten-hour pass is one motionless spinner. */
  done?: number | null;
  total?: number | null;
}

/** Done / in progress / still to come for a pass's concepts. */
export interface RunConceptCounts {
  pending?: number;
  running?: number;
  done?: number;
  /** Nothing to analyse, nothing wrong — almost always a concept with no
   * Meta ads, because Notion carries every concept a batch planned and only
   * some were ever launched. */
  skipped?: number;
  failed?: number;
}

/** One concept's place in a pass, as the runs screen needs it. */
export interface RunConcept {
  creative_id: string;
  name: string;
  status: "pending" | "running" | "done" | "skipped" | "failed";
  classification?: string;
  blocked_code?: string;
  error?: string;
  duration_ms?: number | null;
}

export interface RunConceptPage {
  items: RunConcept[];
  total: number;
  counts: RunConceptCounts;
  /** How many concepts each blocker accounted for, keyed by blocker code.
   * A bare count of failures cannot be acted on; grouped by cause it can. */
  blockers?: Record<string, number>;
  limit: number;
  offset: number;
}

export interface RunConceptTiming {
  counted: number;
  average_ms?: number | null;
  total_ms?: number;
  slowest?: { name: string; duration_ms: number } | null;
  eta_ms?: number | null;
}

export interface JobRun {
  id: string;
  brand: string;
  kind: string;
  status: "running" | "ok" | "failed";
  progress: RunStep[];
  concept_counts?: RunConceptCounts;
  concept_timing?: RunConceptTiming;
  concept_blockers?: Record<string, number>;
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

/** The concepts of one pass, with where each got to and why.
 *
 * `status=skipped` is the "nothing to analyse" bucket and `status=failed` the
 * "something went wrong" one — the distinction the runs screen needs so a few
 * hundred unlaunched concepts do not bury a handful of real errors. */
export function getRunConcepts(
  runId: string,
  params: { status?: string; search?: string; limit?: number; offset?: number } = {},
): Promise<RunConceptPage> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.search) search.set("search", params.search);
  search.set("limit", String(params.limit ?? 50));
  search.set("offset", String(params.offset ?? 0));
  return get<RunConceptPage>(
    `/v1/analysis/weekly-runs/${encodeURIComponent(runId)}/concepts?${search.toString()}`,
  );
}

/** Analyst passes: read the snapshot, classify concepts, save and write back. */
export function getAnalystRuns(params: RunQuery): Promise<RunPage> {
  return get<RunPage>(`/v1/analysis/weekly-runs?${query(params)}`);
}
