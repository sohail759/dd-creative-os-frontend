import type { ApiClient } from "./client";
import type {
  AgentConfig,
  AgentConfigUpdate,
  AgentListResponse,
  AnalyticsResponse,
  ConceptDetail,
  ConceptListResponse,
  ConceptRunResult,
  ConceptRunDispatch,
  ConceptSummary,
  Creative,
  CreativeCounts,
  CreativeStatus,
  FetchAnalyticsResponse,
  GenerationResponse,
  MetaActionResponse,
  MetaProgress,
  MetaUploadOptions,
  ProductAnalyticsResponse,
  PromptSetting,
  UploadedProduct,
  IntelligenceAdList,
  IntelligenceDetail,
  MetaPageHealthResponse,
  MetaPageHealthRefreshResponse,
} from "./types";

/**
 * HTTP client for the backend REST API.
 *
 * Endpoints are configured through NEXT_PUBLIC_API_URL. The backend is the
 * source of truth (MongoDB); this layer never talks to the database directly.
 *
 * Contract (see Notion-Fetching app/api/routes_creatives.py):
 *   GET  /v1/products                 -> Creative[]   (?status=&search=&limit=&offset=)
 *   GET  /v1/products/counts          -> per-status totals
 *   GET  /v1/products/:id             -> Creative
 *   GET  /v1/products/:id/status      -> status payload
 *   POST /v1/products/:id/generate    -> { id, status, job? }
 */

function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!base) throw new Error("NEXT_PUBLIC_API_URL is not configured");
  return `${base}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  const token = process.env.NEXT_PUBLIC_API_TOKEN;
  if (token) headers["X-API-Token"] = token;
  if (init?.method === "POST" && path.endsWith("/launch")) {
    const adminToken = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN;
    if (adminToken) headers["X-Admin-Token"] = adminToken;
  }

  // The HttpOnly session cookie is the authentication mechanism; it must ride
  // along on every cross-origin API call.
  const res = await fetch(apiUrl(path), { ...init, headers, credentials: "include" });
  if (res.status === 401 && !path.startsWith("/v1/auth")) {
    // Session missing/expired/revoked: hard-redirect to sign-in. A full
    // navigation also clears any cached client state.
    if (typeof window !== "undefined") {
      const current = `${window.location.pathname}${window.location.search}`;
      const next = encodeURIComponent(current);
      window.location.assign(`/sign-in?next=${next}`);
    }
    throw new Error("Not authenticated");
  }
  if (!res.ok) {
    let detail = `Request failed with ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) {
        detail =
          typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail);
      }
    } catch {
      /* ignore parse errors */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

type RawCreative = Record<string, unknown>;

function toConceptSummary(raw: RawCreative): ConceptSummary {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    status: (raw.status ?? "not_started") as CreativeStatus,
    angle: (raw.angle as string | null) ?? undefined,
    awareness: (raw.awareness as string | null) ?? undefined,
  };
}

/** Map the backend's snake_case payload onto the frontend Creative type. */
function toCreative(raw: RawCreative): Creative {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    brand: String(raw.brand ?? ""),
    product: String(raw.product ?? ""),
    parentItem: Array.isArray(raw.parent_item)
      ? (raw.parent_item as string[])
      : [],
    conceptCount:
      typeof raw.concept_count === "number" ? raw.concept_count : undefined,
    concepts: Array.isArray(raw.concepts)
      ? (raw.concepts as RawCreative[]).map(toConceptSummary)
      : undefined,
    parentBatch: raw.parent_batch
      ? toCreative(raw.parent_batch as RawCreative)
      : undefined,
    status: (raw.status ?? "not_started") as Creative["status"],
    phase: (raw.phase as string | null) ?? undefined,
    generationStatus: (raw.generation_status ?? "idle") as Creative["generationStatus"],
    angle: (raw.angle as string | null) ?? null,
    awareness: (raw.awareness as string | null) ?? null,
    audience: (raw.audience as string | null) ?? null,
    problem: (raw.problem as string | null) ?? null,
    desire: (raw.desire as string | null) ?? null,
    hook: (raw.hook as string | null) ?? null,
    hypothesis: (raw.hypothesis as string | null) ?? null,
    headlines: Array.isArray(raw.headlines) ? (raw.headlines as string[]) : [],
    primary_texts: Array.isArray(raw.primary_texts)
      ? (raw.primary_texts as string[])
      : [],
    lastEditedAt: (raw.last_edited_at as string | null) ?? null,
    createdAt: (raw.created_at as string | null) ?? null,
    generatedAt: (raw.last_generated_at as string | null) ?? null,
    generationUpdatedAt: (raw.generation_updated_at as string | null) ?? null,
    model: (raw.model as string | null) ?? null,
    frameUrl: (raw.frame_url as string | null) ?? null,
    frameUrlSource:
      (raw.frame_url_source as Creative["frameUrlSource"]) ?? "missing",
    metaState: (raw.meta_state ?? "not_uploaded") as Creative["metaState"],
    metaIds:
      raw.meta_ids && typeof raw.meta_ids === "object"
        ? (raw.meta_ids as Record<string, string>)
        : {},
    metaError: (raw.meta_error as string | null) ?? null,
  };
}

export const httpApi: ApiClient = {
  async getProducts(status, limit, offset, brand, phase, search) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (brand) params.set("brand", brand);
    if (phase) params.set("phase", phase);
    if (search) params.set("search", search);
    if (limit != null) params.set("limit", String(limit));
    if (offset != null) params.set("offset", String(offset));
    const res = await request<RawCreative[]>(`/v1/products?${params}`);
    return res.map(toCreative);
  },

  async getProductCounts(brand, phase) {
    const params = new URLSearchParams();
    if (brand) params.set("brand", brand);
    if (phase) params.set("phase", phase);
    const qs = params.toString();
    return request<CreativeCounts>(`/v1/products/counts${qs ? `?${qs}` : ""}`);
  },

  async getProduct(id) {
    const res = await request<RawCreative>(`/v1/products/${encodeURIComponent(id)}`);
    return toCreative(res);
  },

  async generateProduct(id, options) {
    const body: Record<string, unknown> = {};
    if (options?.angle) body.angle = options.angle;
    if (options?.language) body.language = options.language;
    const params = new URLSearchParams();
    if (options?.force) params.set("force", "true");
    const qs = params.toString();
    return request<GenerationResponse>(
      `/v1/products/${encodeURIComponent(id)}/generate${qs ? `?${qs}` : ""}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  },

  async getProductStatus(id) {
    const res = await request<RawCreative>(
      `/v1/products/${encodeURIComponent(id)}/status`,
    );
    return toCreative(res);
  },

  async getCopywriterPrompt() {
    return request<PromptSetting>("/v1/settings/copywriter-prompt");
  },

  async updateCopywriterPrompt(payload) {
    return request<PromptSetting>("/v1/settings/copywriter-prompt", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async updateCreativeCopy(id, payload) {
    const res = await request<RawCreative>(
      `/v1/products/${encodeURIComponent(id)}/copy`,
      { method: "PUT", body: JSON.stringify(payload) },
    );
    return toCreative(res);
  },

  async updateFrameUrl(id, payload) {
    return request(`/v1/products/${encodeURIComponent(id)}/frame-url`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async getFrameAssets(id) {
    return request(`/v1/products/${encodeURIComponent(id)}/frame-assets`);
  },

  async getUploadOptions(id) {
    return request<MetaUploadOptions>(
      `/v1/products/${encodeURIComponent(id)}/upload-options`,
    );
  },

  async getMetaProgress(id) {
    return request<MetaProgress>(
      `/v1/products/${encodeURIComponent(id)}/meta-progress`,
    );
  },

  async uploadProduct(id, payload) {
    return request<MetaActionResponse>(
      `/v1/products/${encodeURIComponent(id)}/upload`,
      { method: "POST", body: JSON.stringify(payload) },
    );
  },

  async launchProduct(id) {
    return request<MetaActionResponse>(
      `/v1/products/${encodeURIComponent(id)}/launch`,
      { method: "POST", body: JSON.stringify({}) },
    );
  },

  async getAnalytics(brand = "numy", limit = 30, offset = 0) {
    const params = new URLSearchParams({ brand, limit: String(limit), offset: String(offset) });
    return request<AnalyticsResponse>(`/v1/analytics?${params}`);
  },

  async getUploadedProducts(brand?: string) {
    const params = new URLSearchParams();
    if (brand) params.set("brand", brand);
    const qs = params.toString();
    return request<UploadedProduct[]>(`/v1/products/uploaded${qs ? `?${qs}` : ""}`);
  },

  async getProductAnalytics(creativeId: string) {
    return request<ProductAnalyticsResponse>(
      `/v1/analytics/${encodeURIComponent(creativeId)}`,
    );
  },

  async fetchProductAnalytics(creativeId: string, brand = "numy") {
    const params = new URLSearchParams({ brand });
    return request<ProductAnalyticsResponse>(
      `/v1/analytics/${encodeURIComponent(creativeId)}/fetch?${params}`,
      { method: "POST", body: JSON.stringify({}) },
    );
  },

  async fetchBulkAnalytics(brand = "numy") {
    const params = new URLSearchParams({ brand });
    return request<FetchAnalyticsResponse>(
      `/v1/analytics/fetch?${params}`,
      { method: "POST", body: JSON.stringify({}) },
    );
  },

  async getAgents() {
    return request<AgentListResponse>("/v1/agents");
  },

  async getAgent(id: string) {
    return request<AgentConfig>(`/v1/agents/${encodeURIComponent(id)}`);
  },

  async updateAgent(id: string, payload: AgentConfigUpdate) {
    return request<AgentConfig>(`/v1/agents/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async getIntelligenceAds(brand?, limit?, offset?) {
    const params = new URLSearchParams({ brand: brand || "numy" });
    if (limit) params.set("limit", String(limit));
    if (offset) params.set("offset", String(offset));
    return request<IntelligenceAdList>(
      `/v1/intelligence/ads?${params.toString()}`
    );
  },

  async getIntelligenceConcept(conceptName, brand?) {
    const params = new URLSearchParams({ brand: brand || "numy" });
    return request<ConceptDetail>(
      `/v1/intelligence/concepts/${encodeURIComponent(conceptName)}?${params.toString()}`
    );
  },

  async getIntelligenceConcepts(brand?, search?, limit?, offset?) {
    const params = new URLSearchParams({ brand: brand || "numy" });
    if (search) params.set("search", search);
    if (limit) params.set("limit", String(limit));
    if (offset) params.set("offset", String(offset));
    return request<ConceptListResponse>(
      `/v1/intelligence/concepts?${params.toString()}`
    );
  },

  async runIntelligenceConcept(conceptName, brand?, datePreset?, since?, until?) {
    const params = new URLSearchParams({ brand: brand || "numy" });
    if (datePreset) params.set("date_preset", datePreset);
    if (since) params.set("since", since);
    if (until) params.set("until", until);
    return request<ConceptRunDispatch>(
      `/v1/intelligence/concepts/${encodeURIComponent(conceptName)}/run?${params.toString()}`,
      { method: "POST", body: JSON.stringify({}) }
    );
  },

  async getIntelligenceConceptRun(
    taskId,
    conceptName?,
    brand?,
    datePreset?,
    since?,
    until?
  ) {
    const params = new URLSearchParams();
    if (conceptName) params.set("concept_name", conceptName);
    if (brand) params.set("brand", brand);
    if (datePreset) params.set("date_preset", datePreset);
    if (since) params.set("since", since);
    if (until) params.set("until", until);
    return request<ConceptRunResult & { task_id?: string; status?: string }>(
      `/v1/intelligence/concepts/${encodeURIComponent(conceptName ?? "")}/run/${encodeURIComponent(taskId)}?${params.toString()}`
    );
  },

  async getIntelligenceAd(adId, brand?) {
    const params = new URLSearchParams({ brand: brand || "numy" });
    return request<IntelligenceDetail>(
      `/v1/intelligence/ads/${encodeURIComponent(adId)}?${params.toString()}`
    );
  },

  async fetchIntelligenceAd(adId, brand?, datePreset?) {
    const params = new URLSearchParams({ brand: brand || "numy" });
    if (datePreset) params.set("date_preset", datePreset);
    return request<IntelligenceDetail>(
      `/v1/intelligence/ads/${encodeURIComponent(adId)}/fetch?${params.toString()}`,
      { method: "POST", body: JSON.stringify({}) }
    );
  },

  async getPageHealth(brand = "numy") {
    const params = new URLSearchParams({ brand });
    return request<MetaPageHealthResponse>(`/v1/meta-page-health?${params}`);
  },

  async refreshPageHealth(brand = "numy") {
    const params = new URLSearchParams({ brand });
    return request<MetaPageHealthRefreshResponse>(
      `/v1/meta-page-health?${params}`,
      { method: "POST", body: JSON.stringify({}) },
    );
  },
};
