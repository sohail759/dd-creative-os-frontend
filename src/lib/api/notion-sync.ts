/**
 * Notion sync: start one, and read what past ones did.
 *
 * A brand sync reads every row of that brand's Notion database plus each
 * page's blocks, so it runs as a background job. Starting one returns
 * immediately; progress is read from the run records.
 */
export interface SyncRun {
  _id: string;
  brand: string | null;
  scope: string;
  status: string;
  stage?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  duration_seconds?: number | null;
  rows_read?: number;
  written?: Record<string, number> | null;
  counters?: {
    /** How far through the current phase, written as the sync goes. */
    progress?: {
      phase: string; done: number; total: number;
      /** Which phase of the sync this is, e.g. 2 of 6. */
      step?: number; steps?: number;
    };
    [key: string]: unknown;
  } | null;
  triggered_by?: string | null;
  task_id?: string | null;
  edited_since?: string | null;
  cancel_requested?: boolean;
  failure?: { message?: string; cancelled?: boolean } | null;
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

/**
 * Queue a sync for one brand. Returns as soon as it is queued.
 *
 * `editedSince` narrows it to rows Notion changed on or after that instant.
 * On holy-mouthwash the whole database is 5,326 rows and 162 seconds; the
 * last two days is 773 rows and 14 seconds.
 */
export async function startBrandSync(
  brand: string,
  editedSince?: string,
): Promise<{ task_id: string }> {
  const params = new URLSearchParams({ brand, background: "true" });
  if (editedSince) params.set("edited_since", editedSince);
  const res = await fetch(apiUrl(`/v1/notion/sync?${params}`), {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) await fail(res);
  return (await res.json()) as { task_id: string };
}

/** Stop a running sync: revokes the job and asks it to stop at a checkpoint. */
export async function cancelSync(runId: string): Promise<void> {
  const res = await fetch(
    apiUrl(`/v1/notion/sync/${encodeURIComponent(runId)}/cancel`),
    { method: "POST", credentials: "include" },
  );
  if (!res.ok) await fail(res);
}

/**
 * Recent syncs. Defaults to database-wide runs; per-batch syncs are a
 * different event and would otherwise bury these.
 */
export async function listSyncRuns(limit = 50): Promise<SyncRun[]> {
  const res = await fetch(apiUrl(`/v1/notion/sync/runs?limit=${limit}`), {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) await fail(res);
  return ((await res.json()) as { runs: SyncRun[] }).runs ?? [];
}
