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
  force?: boolean;
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

export interface AdAnalytics {
  kpis: AnalyticsKpis;
  insights: AnalyticsInsight[];
  fetched_at?: string | null;
}

export interface CampaignAnalytics extends AdAnalytics {
  ad_count: number;
}

export interface AnalyticsCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string | null;
  daily_budget: number | null;
  start_time: string | null;
  stop_time: string | null;
  analytics?: CampaignAnalytics;
  ads?: AnalyticsAd[];
}

export interface AnalyticsAd {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
  adset_id: string;
  creative_id: string;
  campaign_name?: string;
  analytics?: AdAnalytics;
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

export interface AnalystClassification {
  label: string;
  reason?: string;
  thresholds_used?: Record<string, unknown>;
}

export interface AnalystValueBlocks {
  ok?: boolean;
  blocked_reason?: string;
  card_count?: number;
  cards?: Array<Record<string, unknown>>;
}

export interface AnalystLearning {
  verdict?: string;
  next_tests?: string[];
  why_it_worked?: string;
  weak_point?: string;
  benchmark_comparison?: string;
  hypothesis_closure?: string;
  feedback_loop?: string;
}

export interface AnalystPayload {
  run_id?: string;
  creative_id?: string;
  creative_name?: string;
  notion_page_id?: string;
  date_preset?: string;
  since?: string;
  until?: string;
  decided?: boolean;
  blocked_code?: string;
  skipped_reason?: string;
  updated_in_notion?: boolean;
  matching_method?: string;
  classification?: AnalystClassification;
  value_blocks?: AnalystValueBlocks | null;
  learnings?: AnalystLearning[];
  notion_properties_written?: Record<string, unknown>;
}

export interface IntelligenceAd {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
  adset_id: string;
  creative_id: string;
  campaign_name?: string | null;
  analyst?: AnalystPayload | null;
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
  analyst?: AnalystPayload | null;
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

// --------------------------------------------------------------------------
// Intelligence concept grouping
// --------------------------------------------------------------------------

/** A concept (e.g. "B321 C1") with all its ad variants and aggregated KPIs. */
export interface ConceptGroup {
  concept_name: string;
  ads: IntelligenceAd[];
  ad_count: number;
  runnable: boolean;
  kpis: AnalyticsKpis;
}

export interface ConceptListResponse {
  concepts: ConceptGroup[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface ConceptDetail {
  concept_name: string;
  ads: IntelligenceAd[];
  ad_count: number;
  kpis: AnalyticsKpis;
  insights: AnalyticsInsight[];
  analyst_by_ad?: Record<string, AnalystPayload>;
  last_fetched_at?: string | null;
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/** Result of running the Analyst Agent for one concept. */
export interface ConceptRunResult {
  brand: string;
  ok: boolean;
  status: string;
  message: string;
  run_id: string;
  started_at?: string | null;
  finished_at?: string | null;
  analyzed_creatives?: Array<Record<string, unknown>>;
  audit?: {
    passed: boolean;
    checks: Array<{ key: string; label: string; ok: boolean; detail: string }>;
  } | null;
  hard_stops: string[];
  gated: boolean;
  gate_message: string;
  receipt_path: string;
  report_path: string;
  coverage: Record<string, unknown>;
  date_preset: string;
  since: string;
  until: string;
  creative_name: string;
}

/** Immediate response from dispatching a concept analysis to Celery. */
export interface ConceptRunDispatch {
  task_id: string;
  status: string;
  started_at?: string | null;
  brand: string;
  concept_name: string;
  date_preset: string;
  since: string;
  until: string;
}

// --------------------------------------------------------------------------
// Meta Page Health
// --------------------------------------------------------------------------

export interface MetaPageHealthCampaign {
  campaign_id: string;
  campaign_name?: string;
  total_ads: number;
  running_ads: number;
}

export interface MetaPageHealthSummary {
  page_count: number;
  active_launch_eligible_count: number;
  excluded_count: number;
  total_running_ads: number;
  account_total_ads?: number;
  account_running_ads?: number;
  account_ads_remaining?: number;
  account_ad_limit?: number;
  campaigns?: MetaPageHealthCampaign[];
  ad_account_id?: string;
  source?: string;
  attribution_level?: string;
}

export interface MetaPageHealthPage {
  id: string;
  name: string;
  canonical_name: string;
  running_or_in_review_ads: number;
  total_ads: number;
  page_limit: number;
  ads_remaining: number;
  suppression_status: string;
  drift_state: string;
  launch_status: string;
  launch_block_reason: string;
  brand_scope: string;
  type: string;
  lang_affinity: string[];
  meta_publication_status: string;
  meta_restriction_status: string;
  followers?: number | null;
  new_likes?: number | null;
  talking_about?: number | null;
  unread_messages?: number | null;
  unread_notifications?: number | null;
}

export interface MetaPageHealthResponse {
  pages: MetaPageHealthPage[];
  summary: MetaPageHealthSummary;
  errors: string[];
  ad_account_id?: string | null;
  last_fetched_at?: string | null;
}

export interface MetaPageHealthRefreshResponse {
  success: boolean;
  message: string;
  pages: MetaPageHealthPage[];
  summary: MetaPageHealthSummary;
  errors: string[];
  last_fetched_at?: string | null;
}
