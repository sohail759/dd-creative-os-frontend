/**
 * One concept's Meta performance, read from the local mirror.
 *
 * Lifetime is what the Analyst classifies on, because its thresholds are
 * lifetime-scale. The trailing window sits beside it rather than replacing
 * it: a concept that spent everything eight months ago and one spending
 * steadily have the same lifetime total and very different recent behaviour.
 */

export interface PerfMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  conversion_value: number;
  thruplays: number;
  hook_actions: number;
  cpp: number;
  ctr: number;
  cpc: number;
  hold_rate: number;
  hook_rate: number;
  roas: number;
}

export interface TrendPoint {
  date: string;
  spend: number;
  purchases: number;
  conversion_value: number;
  impressions: number;
  clicks: number;
}

export interface ConceptAd {
  ad_id: string;
  ad_name: string;
  status: string;
  created_time: string;
  campaign_name: string;
  adset_name: string;
  persona_code: string;
  lifetime: PerfMetrics;
  window: PerfMetrics;
}

export interface ConceptPerformance {
  concept_name: string;
  brand: string;
  ad_count: number;
  lifetime: PerfMetrics;
  last_month: PerfMetrics;
  trend: TrendPoint[];
  ads: ConceptAd[];
  window_days: number;
}

function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!base) throw new Error("NEXT_PUBLIC_API_URL is not configured");
  return `${base}${path}`;
}

export async function getConceptPerformance(
  conceptName: string,
  brand: string,
): Promise<ConceptPerformance> {
  const res = await fetch(
    apiUrl(
      `/v1/intelligence/concepts/${encodeURIComponent(conceptName)}/performance?brand=${encodeURIComponent(brand)}`,
    ),
    { credentials: "include", cache: "no-store" },
  );
  if (!res.ok) {
    let detail = `Request failed with ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* keep the status-code message */
    }
    throw new Error(detail);
  }
  return (await res.json()) as ConceptPerformance;
}
