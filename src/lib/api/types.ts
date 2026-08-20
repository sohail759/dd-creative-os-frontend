export type CreativeStatus =
  | "not_started"
  | "in_progress"
  | "checkpoint"
  | "revision";

/**
 * Copy-generation pipeline state — mirrors the backend `generation_status`.
 * Independent of the creative's Notion `status`.
 */
export type GenerationStatus = "idle" | "in_progress" | "completed" | "failed";

export type MetaState =
  | "not_uploaded"
  | "uploading"
  | "uploaded_paused"
  | "launching"
  | "active"
  | "failed";

export const CREATIVE_STATUSES: CreativeStatus[] = [
  "not_started",
  "in_progress",
  "checkpoint",
  "revision",
];

export const STATUS_LABELS: Record<CreativeStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  checkpoint: "Checkpoint",
  revision: "Revision",
};

/** Light summary of a concept nested under a batch product. */
export interface ConceptSummary {
  id: string;
  name: string;
  status: CreativeStatus;
  angle?: string | null;
  awareness?: string | null;
}

/** Creative record as exposed by the backend API (MongoDB-backed source of truth). */
export interface Creative {
  id: string;
  /** Notion "Creative Name" title (e.g. V48, B311). */
  name: string;
  brand: string;
  product: string;
  /**
   * Notion `Parent item` relation ids. Empty for batch/standalone creatives;
   * a concept carries its parent batch id here.
   */
  parentItem?: string[];
  /** Number of concepts nested under a batch (list payloads). */
  conceptCount?: number;
  /** Concepts nested under a batch (batch detail payload). */
  concepts?: ConceptSummary[];
  /**
   * Full parent batch Creative (concept detail payload), used for the
   * parent-data fallback when a concept lacks its own product details.
   */
  parentBatch?: Creative;
  /** Notion Status, 1:1 from MongoDB. */
  status: CreativeStatus;
  /** Notion Phase property (e.g. "Write"). Concepts generate only in Write. */
  phase?: string;
  /** Copy-generation pipeline state (idle / in_progress / completed / failed). */
  generationStatus?: GenerationStatus;
  angle?: string | null;
  awareness?: string | null;
  audience?: string | null;
  problem?: string | null;
  desire?: string | null;
  hook?: string | null;
  hypothesis?: string | null;
  headlines: string[];
  primary_texts: string[];
  /** Notion last-edited time. Used to sort the list (most recently edited first). */
  lastEditedAt?: string | null;
  /** Notion created time. */
  createdAt?: string | null;
  /*   * When the latest generation completed. */
  generatedAt?: string | null;
  generationUpdatedAt?: string | null;
  model?: string | null;
  frameUrl?: string | null;
  frameUrlSource?: "notion" | "child" | "override" | "missing";
  metaState?: MetaState;
  metaIds?: Record<string, string>;
  metaError?: string | null;
}

export interface MetaUploadPayload {
  ad_account_id?: string;
  campaign_id: string;
  adset_name: string;
  ad_name: string;
  page_id: string;
  body: string;
  title: string;
  bodies?: string[];
  titles?: string[];
  link_url: string;
  call_to_action: string;
  image?: string;
  video?: string;
  instagram_actor_id?: string;
  adset_daily_budget?: number;
  adset_billing_event?: string;
  adset_optimization_goal?: string;
  targeting?: Record<string, unknown>;
}

export interface MetaActionResponse {
  id: string;
  meta_state: MetaState;
  message: string;
  meta_ids: Record<string, string>;
  meta_error?: string | null;
}

export interface MetaProgress {
  meta_state: MetaState;
  progress_stage: string | null;
  ids: Record<string, string>;
  meta_error?: string | null;
}

export interface MetaUploadOptions {
  id: string;
  brand: string;
  ad_account_id?: string | null;
  default_cta: string;
  campaign_options: Record<string, string>;
  page_options: Array<{ id: string; name: string }>;
  defaults: Record<string, unknown>;
  product_url?: string | null;
  video_url?: string | null;
  creative_type_options?: Array<{ value: string; label: string }>;
}

export interface FrameUrlUpdate {
  url?: string | null;
}

export interface FrameUrlResponse {
  id: string;
  frame_url?: string | null;
  frame_url_source: "notion" | "override" | "missing";
}

export interface FrameAsset {
  id: string;
  type: "video" | "image";
  url: string;
  thumbnail_url?: string | null;
  name?: string | null;
}

export interface FrameAssetsResponse {
  id: string;
  frame_url?: string | null;
  assets: FrameAsset[];
  error?: string | null;
}

/** Optional parameters the frontend may pass when triggering generation. */
export interface GenerateOptions {
  angle?: string | null;
  language?: string | null;
}

/** Response of POST /v1/products/{id}/generate (job enqueued). */
export interface GenerationResponse {
  id: string;
  status: string;
  job?: string | null;
}

/** Per-status totals served by GET /v1/products/counts. */
export interface CreativeCounts {
  all: number;
  not_started: number;
  in_progress: number;
  checkpoint: number;
  revision: number;
}

/** Admin-editable copywriter (copyright-agent) system prompt. */
export interface PromptSetting {
  key: string;
  value: string;
  /** True when `value` is the built-in default (nothing overridden yet). */
  is_default?: boolean;
}

export interface PromptSettingUpdate {
  value: string;
}

/** Editable headline + primary-text set for a creative. */
export interface CreativeCopyUpdate {
  headlines: string[];
  primary_texts: string[];
}

// ---------------------------------------------------------------------------
// Analytics types
// ---------------------------------------------------------------------------

export interface AnalyticsKpis {
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  purchases: number;
  purchase_value: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  cpp: number;
}

export interface AnalyticsCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget: number | null;
  start_time: string | null;
  stop_time: string | null;
}

export interface AnalyticsAd {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
  adset_id: string;
  creative_id: string;
}

export interface AnalyticsInsight {
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  reach: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
}

export interface AnalyticsResponse {
  kpis: AnalyticsKpis;
  campaigns: AnalyticsCampaign[];
  ads: AnalyticsAd[];
  insights: AnalyticsInsight[];
  last_fetched_at?: string | null;
  total_campaigns?: number;
  total_ads?: number;
  limit?: number;
  offset?: number;
}

// --------------------------------------------------------------------------
// Agent Configuration (Copyright Agent + Deconstruct Agent)
// --------------------------------------------------------------------------
export type AgentFieldType = "text" | "textarea" | "select";

export interface AgentField {
  key: string;
  label: string;
  type: AgentFieldType;
  required: boolean;
}

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface AgentConfig {
  id: string;
  name: string;
  fields: AgentField[];
  tools: AgentTool[];
  config: Record<string, string>;
  is_default: boolean;
}

export interface AgentListResponse {
  agents: AgentConfig[];
  available_models: string[];
}

export interface AgentConfigUpdate {
  config: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Uploaded Products types
// ---------------------------------------------------------------------------

export interface UploadedProduct {
  creative_id: string;
  product_name: string;
  brand_slug: string;
  meta_state: MetaState;
  campaign_id?: string | null;
  adset_id?: string | null;
  creative_meta_id?: string | null;
  ad_id?: string | null;
  ad_account_id?: string | null;
  ad_name?: string | null;
  adset_name?: string | null;
  campaign_name?: string | null;
  uploaded_at?: string | null;
  launched_at?: string | null;
  last_error?: string | null;
}

export interface ProductAnalyticsResponse {
  creative_id: string;
  product_name: string;
  kpis: AnalyticsKpis;
  insights: AnalyticsInsight[];
  last_fetched_at?: string | null;
}

export interface FetchAnalyticsResponse {
  success: boolean;
  message: string;
}

// --------------------------------------------------------------------------
// Intelligence (DB-first Meta ad intelligence)
// --------------------------------------------------------------------------

export interface IntelligenceBlock {
  title: string;
  description: string;
}

export interface IntelligenceAd {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
  adset_id: string;
  creative_id: string;
  campaign_name?: string | null;
}

export interface IntelligenceAdList {
  ads: IntelligenceAd[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface IntelligenceAnalytics {
  creative_id: string | null;
  ad_id: string | null;
  kpis: AnalyticsKpis;
  insights: AnalyticsInsight[];
  fetched_at?: string | null;
}

export interface IntelligenceData {
  value_blocks: IntelligenceBlock[];
  learnings: IntelligenceBlock[];
  model?: string | null;
  generated_at?: string | null;
}

export interface IntelligenceDetail {
  ad: IntelligenceAd;
  analytics: IntelligenceAnalytics | null;
  intelligence: IntelligenceData | null;
}
