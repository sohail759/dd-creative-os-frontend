/**
 * Meta performance pulls: start one, and read how the last one went.
 *
 * A pull reads every ad on the account — the last took 7.4 minutes across
 * 19,206 ads — so it runs as a background job. Starting it returns at once;
 * status comes from the sync record.
 */
export interface MetaSync {
  id: string;
  brand: string;
  scope: string;
  date_preset?: string | null;
  status: "running" | "ok" | "partial" | "failed" | string;
  /** Who or what started it: an email, or "weekly" for the schedule. */
  trigger?: string | null;
  campaigns?: number | null;
  ads?: number | null;
  insight_rows?: number | null;
  snapshots_written?: number | null;
  rate_limited?: boolean;
  error?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  duration_ms?: number | null;
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
        typeof body.detail === "string"
          ? body.detail
          : body.detail.message || JSON.stringify(body.detail);
    }
  } catch {
    /* keep the status-code message */
  }
  throw new Error(detail);
}

/** The most recent pull for a brand, running or finished. */
export async function latestMetaSync(brand: string): Promise<MetaSync | null> {
  const res = await fetch(
    apiUrl(`/v1/analytics/syncs/latest?brand=${encodeURIComponent(brand)}`),
    { credentials: "include", cache: "no-store" },
  );
  if (!res.ok) await fail(res);
  const body = await res.json();
  return (body ?? null) as MetaSync | null;
}

/** Queue a pull. Rejected with 409 if one is already running for the brand. */
export async function startMetaSync(
  brand: string,
  datePreset = "last_30d",
): Promise<{ task_id: string }> {
  const params = new URLSearchParams({ brand, date_preset: datePreset });
  const res = await fetch(apiUrl(`/v1/analytics/fetch?${params}`), {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) await fail(res);
  return (await res.json()) as { task_id: string };
}
