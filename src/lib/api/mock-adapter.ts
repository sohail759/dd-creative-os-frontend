import type { ApiClient } from "./client";
import { MOCK_PRODUCTS } from "./mock-data";
import type {
  AgentConfig,
  AgentConfigUpdate,
  AgentListResponse,
  ConceptGroup,
  Creative,
  FetchAnalyticsResponse,
  FrameAssetsResponse,
  GenerateOptions,
  MetaActionResponse,
  MetaProgress,
  MetaUploadOptions,
  MetaUploadPayload,
  ProductAnalyticsResponse,
  PromptSetting,
  UploadedProduct,
  IntelligenceAdList,
  IntelligenceDetail,
  IntelligenceBlock,
} from "./types";

/**
 * In-memory demo adapter. Simulates the backend generation pipeline so the UI
 * can be developed and reviewed without a live backend.
 *
 * NEVER production: completion data is generated here, not by the real
 * pipeline. Switch to the HTTP client by setting NEXT_PUBLIC_API_URL and
 * NEXT_PUBLIC_USE_MOCK=false.
 */

const GENERATION_MS = 9000;

type MockStore = Map<string, Creative & { generationStatus: NonNullable<Creative["generationStatus"]> }>;

const store: MockStore = new Map(
  MOCK_PRODUCTS.map((p) => [
    p.id,
    { ...p, generationStatus: (p.generationStatus ?? "idle") as NonNullable<Creative["generationStatus"]> },
  ]),
);

const GENERATED_COPY: Record<
  string,
  { headlines: string[]; primary_texts: string[] }
> = {
  default: {
    headlines: [
      "Your daily reset, now in 10 minutes.",
      "The mechanism behind the magic.",
      "Stop scrolling. Start feeling.",
      "It's not you — it's biology.",
      "The nightly ritual you'll actually keep.",
    ],
    primary_texts: [
      "Every day your nervous system gets a vote — and stress usually wins. This is the nightly routine that tips the scale back, using the mechanism proven to switch your body out of 'survive' mode.",
      "You've tried the willpower version. This is the biological one. Simple, repeatable, and built around the exact trigger your body already knows how to respond to.",
    ],
  },
  sleep: {
    headlines: [
      "Wired but tired? Here's why.",
      "Your 10-minute nightly reset.",
      "Sleep isn't a luxury — it's mechanics.",
      "The off switch your brain forgot.",
      "Wake up restored, not recharged.",
    ],
    primary_texts: [
      "You fall into bed exhausted but your brain won't shut up. That's not a discipline problem — it's a chemistry problem. This routine gives your nervous system the signal it needs to actually power down.",
      "Cortisol spikes all day, melatonin never gets its turn. Reset the sequence at night and your body remembers how to sleep like it used to.",
    ],
  },
  confidence: {
    headlines: [
      "Desire isn't a switch — it's chemistry.",
      "Your body remembers how to feel good.",
      "Why 'just relax' never works.",
      "Reconnect with the version of you that felt alive.",
      "The 10-minute reset your evenings are missing.",
    ],
    primary_texts: [
      "When stress has kept you in 'survive' mode, desire doesn't come back just because you want it to. This rebuilds the chemistry your body needs to feel turned on again — without pressure, without performance.",
      "The more pressure you feel to 'fix' it, the more your nervous system digs in. That's why willpower alone fails. Work at the biological layer and your body can finally come back online.",
    ],
  },
  glow: {
    headlines: [
      "Glass skin, minus the damage.",
      "Your barrier is not a scrub pad.",
      "Glow that survives winter.",
      "The serum your skin accepts.",
      "Dullness out. Dew in.",
    ],
    primary_texts: [
      "Every 'glow' routine that strips your barrier is borrowing from tomorrow. This rebuilds the barrier first — so the glow you get is the glow you keep.",
      "Over-exfoliated skin doesn't need more actives, it needs repair. Feed the barrier, calm the reactivity, and let your natural glow come back on its own.",
    ],
  },
};

function copyFor(product: string, angle?: string | null) {
  const key = angle?.toLowerCase().includes("sleep")
    ? "sleep"
    : angle?.toLowerCase().includes("confid") ||
        angle?.toLowerCase().includes("desire")
      ? "confidence"
      : angle?.toLowerCase().includes("glow")
        ? "glow"
        : "default";
  return GENERATED_COPY[key] ?? GENERATED_COPY.default;
}

function nowIso() {
  return new Date().toISOString();
}

/** Creatives whose `Parent item` points at a given batch id. */
function childrenOf(parentId: string) {
  return [...store.values()].filter((p) =>
    (p.parentItem ?? []).includes(parentId),
  );
}

/** Attach the Batch -> Concept hierarchy to a single creative. */
function withHierarchy(c: Creative): Creative {
  if ((c.parentItem?.length ?? 0) > 0) {
    const parent = store.get(c.parentItem![0]);
    return {
      ...c,
      parentBatch: parent ? withHierarchy(parent) : undefined,
    };
  }
  const children = childrenOf(c.id);
  return {
    ...c,
    conceptCount: children.length,
    concepts: children.map((child) => ({
      id: child.id,
      name: child.name,
      status: child.status,
      angle: child.angle,
      awareness: child.awareness,
    })),
  };
}

function scheduleCompletion(id: string) {
  const product = store.get(id);
  if (!product || product.generationStatus === "in_progress") return;

  const copy = copyFor(product.product, product.angle);
  product.generationStatus = "in_progress";
  product.headlines = [];
  product.primary_texts = [];
  product.generatedAt = null;

  setTimeout(() => {
    const current = store.get(id);
    if (!current) return;
    current.generationStatus = "completed";
    current.headlines = [...copy.headlines];
    current.primary_texts = [...copy.primary_texts];
    current.generatedAt = nowIso();
    current.lastEditedAt = nowIso();
  }, GENERATION_MS);
}

function sorted(list: Creative[]): Creative[] {
  return [...list].sort((a, b) => {
    const at = new Date(a.lastEditedAt ?? 0).getTime();
    const bt = new Date(b.lastEditedAt ?? 0).getTime();
    return bt - at;
  });
}

/** Kick off generation for any in_progress creative that has no copy yet. */
function bootstrap() {
  for (const product of store.values()) {
    if (
      product.status === "in_progress" &&
      product.generationStatus === "idle"
    ) {
      scheduleCompletion(product.id);
    }
  }
}

bootstrap();

export const mockApi: ApiClient = {
  async getProducts(status, limit, offset, brand, phase, search) {
    await delay(150);
    const list = [...store.values()];
    const topLevel = list.filter((p) => (p.parentItem?.length ?? 0) === 0);
    const brandFiltered = brand ? topLevel.filter((p) => p.brand === brand) : topLevel;
    const phaseFiltered = phase ? brandFiltered.filter((p) => p.phase === phase) : brandFiltered;
    const searchFiltered = search
      ? phaseFiltered.filter((p) =>
          [p.name, p.brand, p.product]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase())
        )
      : phaseFiltered;
    const filtered = status ? searchFiltered.filter((p) => p.status === status) : searchFiltered;
    const withCounts = filtered.map((p) => ({
      ...p,
      conceptCount: childrenOf(p.id).length,
    }));
    const start = offset ?? 0;
    const all = sorted(withCounts);
    if (limit == null) return all.slice(start);
    return all.slice(start, start + limit);
  },

  async getProductCounts(brand, phase) {
    await delay(50);
    const list = [...store.values()].filter(
      (p) => (p.parentItem?.length ?? 0) === 0,
    );
    const brandFiltered = brand ? list.filter((p) => p.brand === brand) : list;
    const phaseFiltered = phase ? brandFiltered.filter((p) => p.phase === phase) : brandFiltered;
    const counts = (status?: string) =>
      status ? phaseFiltered.filter((p) => p.status === status).length : phaseFiltered.length;
    return {
      all: counts(),
      not_started: counts("not_started"),
      in_progress: counts("in_progress"),
      checkpoint: counts("checkpoint"),
      revision: counts("revision"),
    };
  },

  async getProduct(id) {
    await delay(100);
    const product = store.get(id);
    if (!product) throw new Error(`Creative ${id} not found`);
    return withHierarchy(product);
  },

  async generateProduct(id, options?: GenerateOptions) {
    await delay(100);
    const product = store.get(id);
    if (!product) throw new Error(`Creative ${id} not found`);
    if (options?.angle) product.angle = options.angle;
    scheduleCompletion(id);
    return { id, status: "in_progress" };
  },

  async getProductStatus(id) {
    await delay(80);
    const product = store.get(id);
    if (!product) throw new Error(`Creative ${id} not found`);
    return { ...product };
  },

  async getCopywriterPrompt(): Promise<PromptSetting> {
    await delay(30);
    const value = mockPrompt.value || ""
    return { key: "copywriter_prompt", value, is_default: !mockPrompt.overridden };
  },

  async updateCopywriterPrompt(payload): Promise<PromptSetting> {
    await delay(40);
    mockPrompt.value = (payload.value || "").trim();
    mockPrompt.overridden = Boolean(mockPrompt.value);
    return {
      key: "copywriter_prompt",
      value: mockPrompt.value,
      is_default: !mockPrompt.overridden,
    };
  },

  async updateCreativeCopy(id, payload): Promise<Creative> {
    await delay(80);
    const product = store.get(id);
    if (!product) throw new Error(`Creative ${id} not found`);
    product.headlines = [...payload.headlines];
    product.primary_texts = [...payload.primary_texts];
    product.generationStatus = "completed";
    product.generatedAt = new Date().toISOString();
    return withHierarchy({ ...product });
  },

  async updateFrameUrl(id, payload) {
    await delay(80);
    const product = store.get(id);
    if (!product) throw new Error(`Creative ${id} not found`);
    const url = (payload.url || "").trim();
    product.frameUrl = url || null;
    product.frameUrlSource = url ? "override" : "missing";
    return {
      id,
      frame_url: product.frameUrl,
      frame_url_source: product.frameUrlSource,
    };
  },

  async getFrameAssets(id): Promise<FrameAssetsResponse> {
    await delay(80);
    const product = store.get(id);
    if (!product) throw new Error(`Creative ${id} not found`);
    const raw = (product.frameUrl || "").trim();
    const urls = raw.match(/https?:\/\/[^\s,]+/g) ?? (raw ? [raw] : []);
    const assets: FrameAssetsResponse["assets"] = urls
      .map((url) => url.trim().replace(/[),.;]+$/, ""))
      .filter(Boolean)
      .map((url, index) => {
        const path = (() => {
          try {
            return new URL(url).pathname.toLowerCase();
          } catch {
            return "";
          }
        })();
        const type = /\.(jpg|jpeg|png|gif|webp|avif)$/.test(path)
          ? "image"
          : "video";
        return {
          id: `${id}-${index + 1}`,
          type: type as "video" | "image",
          url,
          thumbnail_url: type === "image" ? url : null,
          name: `Mock ${type === "video" ? "Video" : "Image"} ${index + 1}`,
        };
      });
    return {
      id,
      frame_url: product.frameUrl ?? null,
      assets,
    };
  },

  async getUploadOptions(id): Promise<MetaUploadOptions> {
    await delay(80);
    const product = store.get(id);
    if (!product) throw new Error(`Creative ${id} not found`);
    return {
      id,
      brand: product.brand,
      ad_account_id: "act_mock_123",
      default_cta: "SHOP_NOW",
      campaign_options: { ENG: "cmp_mock_001" },
      page_options: [{ id: "page_mock_001", name: "Mock Page" }],
      defaults: {},
      product_url: "https://example.com/product",
      video_url: product.frameUrl ?? "https://f.io/mock-video",
      creative_type_options: [
        { value: "standard", label: "Standard (Non-Dynamic) Creative" },
        { value: "dco", label: "Dynamic Creative (DCO)" },
      ],
    };
  },

  async getMetaProgress(id): Promise<MetaProgress> {
    await delay(30);
    const product = store.get(id);
    if (!product) throw new Error(`Creative ${id} not found`);
    return {
      meta_state: product.metaState as MetaProgress["meta_state"],
      progress_stage: null,
      ids: product.metaIds ?? {},
      meta_error: product.metaError,
    };
  },

  async uploadProduct(id, payload: MetaUploadPayload): Promise<MetaActionResponse> {
    await delay(250);
    const product = store.get(id);
    if (!product) throw new Error(`Creative ${id} not found`);
    product.metaState = "uploaded_paused";
    product.metaIds = {
      campaign_id: payload.campaign_id,
      adset_id: `adset_${id.slice(0, 8)}`,
      creative_id: `creative_${id.slice(0, 8)}`,
      ad_id: `ad_${id.slice(0, 8)}`,
    };
    product.metaError = null;
    product.lastEditedAt = nowIso();
    return {
      id,
      meta_state: "uploaded_paused",
      message: "Uploaded and paused",
      meta_ids: product.metaIds,
      meta_error: null,
    };
  },

  async launchProduct(id): Promise<MetaActionResponse> {
    await delay(180);
    const product = store.get(id);
    if (!product) throw new Error(`Creative ${id} not found`);
    if (!product.metaIds?.ad_id) {
      throw new Error("Creative is not uploaded")
    }
    product.metaState = "active";
    product.metaError = null;
    product.lastEditedAt = nowIso();
    return {
      id,
      meta_state: "active",
      message: "Launched",
      meta_ids: product.metaIds,
      meta_error: null,
    };
  },

  async getAnalytics(_brand?: string, _limit?: number, _offset?: number) {
    return {
      kpis: {
        spend: 0,
        impressions: 0,
        clicks: 0,
        reach: 0,
        purchases: 0,
        purchase_value: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        roas: 0,
        cpp: 0,
      },
      campaigns: [],
      ads: [],
      insights: [],
      last_fetched_at: null,
      product_count: 0,
    };
  },

  async getUploadedProducts(): Promise<UploadedProduct[]> {
    await delay(100);
    return [...store.values()]
      .filter((p) => p.metaState === "uploaded_paused" || p.metaState === "active")
      .map((p) => ({
        creative_id: p.id,
        product_name: p.product,
        brand_slug: p.brand,
        meta_state: p.metaState ?? "not_uploaded",
        campaign_id: p.metaIds?.campaign_id ?? null,
        adset_id: p.metaIds?.adset_id ?? null,
        creative_meta_id: p.metaIds?.creative_id ?? null,
        ad_id: p.metaIds?.ad_id ?? null,
        ad_account_id: null,
        ad_name: null,
        adset_name: null,
        campaign_name: null,
        uploaded_at: p.lastEditedAt ?? null,
        launched_at: p.metaState === "active" ? p.lastEditedAt ?? null : null,
        last_error: p.metaError ?? null,
      }));
  },

  async getProductAnalytics(creativeId: string): Promise<ProductAnalyticsResponse> {
    await delay(80);
    const product = store.get(creativeId);
    if (!product) throw new Error(`Creative ${creativeId} not found`);
    return {
      creative_id: creativeId,
      product_name: product.product,
      kpis: {
        spend: 0, impressions: 0, clicks: 0, reach: 0,
        purchases: 0, purchase_value: 0, ctr: 0, cpc: 0,
        cpm: 0, roas: 0, cpp: 0,
      },
      insights: [],
      last_fetched_at: null,
    };
  },

  async fetchProductAnalytics(creativeId: string): Promise<ProductAnalyticsResponse> {
    await delay(200);
    const product = store.get(creativeId);
    if (!product) throw new Error(`Creative ${creativeId} not found`);
    return {
      creative_id: creativeId,
      product_name: product.product,
      kpis: {
        spend: 42.5, impressions: 8200, clicks: 215, reach: 5100,
        purchases: 3, purchase_value: 89.97, ctr: 2.62, cpc: 0.2,
        cpm: 5.18, roas: 2.12, cpp: 14.17,
      },
      insights: [],
      last_fetched_at: new Date().toISOString(),
    };
  },

  async fetchBulkAnalytics(): Promise<FetchAnalyticsResponse> {
    await delay(300);
    return { success: true, message: "Fetched analytics for 0 product(s)" };
  },

  async getAgents(): Promise<AgentListResponse> {
    await delay(200);
    return {
      agents: [
        {
          id: "copywriter",
          name: "Copyright Agent",
          fields: [
            { key: "role", label: "Role", type: "text", required: true },
            { key: "goal", label: "Goal", type: "textarea", required: true },
            { key: "system_prompt", label: "System Prompt", type: "textarea", required: true },
            { key: "model", label: "Model", type: "select", required: true },
          ],
          tools: [
            { id: "knowledge_base", name: "Knowledge Base", description: "Access product knowledge and brand guidelines", enabled: true },
            { id: "web_search", name: "Web Search", description: "Search the web for trending topics", enabled: false },
            { id: "analytics", name: "Analytics", description: "Access ad performance data", enabled: false },
          ],
          config: {
            model: "google/gemini-3-flash-preview",
            role: "Direct Response Copywriter",
            goal: "Convert a structured Ad Brief into persuasive Meta ad copy.",
            system_prompt: DEFAULT_COPYWRITER_PROMPT,
          },
          is_default: true,
        },
        {
          id: "deconstruct",
          name: "Deconstruct Agent",
          fields: [
            { key: "system_prompt", label: "System Prompt", type: "textarea", required: true },
            { key: "model", label: "Model", type: "select", required: true },
          ],
          tools: [
            { id: "frame_analysis", name: "Frame Analysis", description: "Analyze video frames for visual elements", enabled: true },
            { id: "transcription", name: "Transcription", description: "Extract text from video audio", enabled: true },
          ],
          config: {
            model: "google/gemini-3-flash-preview",
            system_prompt: "You are a senior Meta creative strategist deconstructing a video ad.",
          },
           is_default: true,
          },
          {
            id: "analytics",
            name: "Analytics Agent",
            fields: [
              { key: "system_prompt", label: "System Prompt", type: "textarea", required: true },
              { key: "model", label: "Model", type: "select", required: true },
            ],
            tools: [],
            config: {
              model: "google/gemini-3-flash-preview",
              system_prompt: "You are a senior Meta Ads performance analyst.",
            },
            is_default: true,
          },
        ],
        available_models: [
          "google/gemini-3-flash-preview",
          "anthropic/claude-3.5-sonnet",
          "openai/gpt-4o",
          "deepseek/deepseek-chat",
        ],
      };
    },

  async getAgent(id: string): Promise<AgentConfig> {
    const list = await this.getAgents();
    return list.agents.find((a) => a.id === id) ?? list.agents[0];
  },

  async updateAgent(id: string, payload: AgentConfigUpdate): Promise<AgentConfig> {
    await delay(300);
    const list = await this.getAgents();
    const agent = list.agents.find((a) => a.id === id) ?? list.agents[0];
    return { ...agent, config: { ...agent.config, ...payload.config }, is_default: false };
  },

  async getIntelligenceAds(_brand?, _limit?, _offset?) {
    await delay(150);
    const ad = MOCK_INTELLIGENCE_ADS[0];
    return {
      ads: MOCK_INTELLIGENCE_ADS,
      total: MOCK_INTELLIGENCE_ADS.length,
      limit: 30,
      offset: 0,
      has_more: false,
    };
  },

  async getIntelligenceConcepts(_brand?, search?, limit?, offset?) {
    await delay(150);
    let all = MOCK_INTELLIGENCE_ADS;
    if (search) {
      const q = search.toLowerCase();
      all = all.filter((a) => a.name.toLowerCase().includes(q));
    }
    const groups = new Map<string, ConceptGroup>();
    for (const ad of all) {
      const concept = ad.name.replace(/\s*-\s*(ENG|DE|v\d+).*$/i, "").toLowerCase();
      const key = concept.split(" ").slice(0, 2).join(" ");
      if (!groups.has(key)) {
        groups.set(key, { concept_name: key, ads: [], ad_count: 0, kpis: { ...MOCK_ANALYTICS.kpis } });
      }
      groups.get(key)!.ads.push(ad);
      groups.get(key)!.ad_count += 1;
    }
    let concepts = [...groups.values()].sort((a, b) => a.concept_name.localeCompare(b.concept_name));
    const total = concepts.length;
    concepts = concepts.slice(offset ?? 0, (offset ?? 0) + (limit ?? 50));
    return { concepts, total, limit: limit ?? 50, offset: offset ?? 0, has_more: (offset ?? 0) + (limit ?? 50) < total };
  },

  async getIntelligenceConcept(conceptName) {
    await delay(100);
    const ads = MOCK_INTELLIGENCE_ADS.filter((a) =>
      a.name.toLowerCase().includes(conceptName.toLowerCase())
    );
    return {
      concept_name: conceptName,
      ads: ads.length ? ads : [MOCK_INTELLIGENCE_ADS[0]],
      ad_count: Math.max(ads.length, 1),
      kpis: { ...MOCK_ANALYTICS.kpis },
      insights: [],
      last_fetched_at: MOCK_ANALYTICS.fetched_at,
      total: Math.max(ads.length, 1),
      limit: 200,
      offset: 0,
      has_more: false,
    };
  },

  async runIntelligenceConcept(conceptName) {
    await delay(1200);
    return {
      task_id: `mock-task-${Date.now()}`,
      status: "queued",
      started_at: new Date().toISOString(),
      brand: "numy",
      concept_name: conceptName,
      date_preset: "last_30d",
      since: "",
      until: "",
    };
  },

  async getIntelligenceConceptRun(_taskId, conceptName) {
    await delay(1200);
    const name = conceptName ?? "";
    return {
      task_id: _taskId,
      brand: "numy",
      ok: true,
      status: "success",
      message: `Weekly analysis complete for ${name}`,
      run_id: `mock-${Date.now()}`,
      started_at: new Date(Date.now() - 1000).toISOString(),
      finished_at: new Date().toISOString(),
      analyzed_creatives: [],
      audit: { passed: true, checks: [] },
      hard_stops: [],
      gated: false,
      gate_message: "",
      receipt_path: "",
      report_path: "",
      coverage: {},
      date_preset: "last_30d",
      since: "",
      until: "",
      creative_name: name,
    };
  },

  async getIntelligenceAd(adId) {
    await delay(100);
    const ad = MOCK_INTELLIGENCE_ADS.find((a) => a.id === adId) ?? MOCK_INTELLIGENCE_ADS[0];
    return {
      ad,
      analytics: MOCK_ANALYTICS,
      intelligence: ad === MOCK_INTELLIGENCE_ADS[0] ? MOCK_INTELLIGENCE : null,
    };
  },

  async fetchIntelligenceAd(adId) {
    await delay(800);
    const ad = MOCK_INTELLIGENCE_ADS.find((a) => a.id === adId) ?? MOCK_INTELLIGENCE_ADS[0];
    // Simulate a fresh fetch: bump the timestamp.
    const intelligence: IntelligenceBlock[] = MOCK_INTELLIGENCE.value_blocks;
    const fresh = {
      ...MOCK_INTELLIGENCE,
      generated_at: new Date().toISOString(),
    };
    return {
      ad,
      analytics: { ...MOCK_ANALYTICS, fetched_at: new Date().toISOString() },
      intelligence: fresh,
    };
  },
};

const DEFAULT_COPYWRITER_PROMPT =
  "You are a world-class direct-response copywriter for Meta ads. " +
  "Write concise, scroll-stopping headlines (25-40 chars) and one-sentence " +
  "primary texts (max 400 chars) in GBP structure. Output ONLY valid JSON with " +
  "keys 'headlines' and 'primary_texts'.";

const MOCK_INTELLIGENCE_ADS: IntelligenceAdList["ads"] = [
  {
    id: "2323812345678200504",
    name: "B321 C1 - ENG",
    status: "ACTIVE",
    campaign_id: "120330000000000001",
    adset_id: "120330000000000002",
    creative_id: "creative_mock_001",
    campaign_name: "Q3 Acquisition",
  },
  {
    id: "2323812345678200505",
    name: "B321 C1 - DE",
    status: "ACTIVE",
    campaign_id: "120330000000000001",
    adset_id: "120330000000000003",
    creative_id: "creative_mock_001",
    campaign_name: "Q3 Acquisition",
  },
  {
    id: "2323812345678200506",
    name: "B103 C2 - ENG",
    status: "PAUSED",
    campaign_id: "120330000000000002",
    adset_id: "120330000000000004",
    creative_id: "creative_mock_002",
    campaign_name: "Retargeting",
  },
  {
    id: "2323812345678200507",
    name: "Hero Product Demo - Hook A",
    status: "ACTIVE",
    campaign_id: "120330000000000001",
    adset_id: "120330000000000002",
    creative_id: "creative_mock_003",
    campaign_name: "Q3 Acquisition",
  },
];

const MOCK_ANALYTICS = {
  creative_id: "creative_mock_001",
  ad_id: "2323812345678200504",
  kpis: {
    spend: 42.5,
    impressions: 8200,
    clicks: 215,
    reach: 5100,
    purchases: 3,
    purchase_value: 89.97,
    ctr: 2.62,
    cpc: 0.2,
    cpm: 5.18,
    roas: 2.12,
    cpp: 14.17,
  },
  insights: [],
  fetched_at: new Date(0).toISOString(),
};

const MOCK_INTELLIGENCE = {
  value_blocks: [
    {
      title: "Hook drives high CTR",
      description:
        "The opening line ('This rewires how your body holds stress') is driving a 2.62% CTR, well above the account average of 1.4%.",
    },
    {
      title: "ROAS concentrated in sleep angle",
      description:
        "ROAS 2.12 is supported by purchase_value $89.97 from 3 purchases; the sleep-themed creative variant historically outperforms.",
    },
  ],
  learnings: [
    {
      title: "Double down on sleep angle",
      description:
        "Allocate 70% of next-day budget to the sleep variant; it produced 3x the conversions of the confidence variant at equal spend.",
    },
    {
      title: "Expand hook testing",
      description:
        "A/B test 5 new Caples-03 style hooks against the current winner to push CTR past 3%.",
    },
  ],
  model: "google/gemini-3-flash-preview",
  generated_at: new Date(0).toISOString(),
};

const mockPrompt: { value: string; overridden: boolean } = {
  value: DEFAULT_COPYWRITER_PROMPT,
  overridden: false,
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
