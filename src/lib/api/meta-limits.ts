/**
 * What Meta's rate limiter currently thinks of us.
 *
 * Two sources, kept apart on purpose. `usage_percent` is Meta's own figure,
 * present only when it has told us recently; `calls_remaining` is our local
 * estimate, which is a guess at a limit Meta computes differently per account.
 * A screen showing one confident number sourced from the guess would be worse
 * than one that says which it is.
 */

export type LimitState = "ok" | "moderate" | "high" | "cooling" | "estimated";

export interface BrandLimit {
  brand: string;
  account_id: string;
  known: boolean;
  state: LimitState;

  /** Meta's own percentage of ITS limit, 0-100. Null when not recently told. */
  usage_percent: number | null;
  usage_source: string;
  usage_age_seconds: number | null;
  call_count_percent: number | null;
  cputime_percent: number | null;
  total_time_percent: number | null;
  access_tier: string;

  /** Our fallback estimate. */
  calls_remaining: number;
  calls_per_hour: number;
  calls_remaining_percent: number | null;

  cooling: boolean;
  cooldown_seconds_remaining: number;
  cooldown_total_seconds: number;
  last_throttle_reason: string;

  snapshot_ceiling: number;
  mutation_ceiling: number;
}

export interface RateLimitStatus {
  brands: BrandLimit[];
  worst_state: LimitState | "";
}

function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!base) throw new Error("NEXT_PUBLIC_API_URL is not configured");
  return `${base}${path}`;
}

export async function getRateLimitStatus(): Promise<RateLimitStatus> {
  const res = await fetch(apiUrl("/v1/meta/rate-limit"), {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Request failed with ${res.status}`);
  return (await res.json()) as RateLimitStatus;
}
