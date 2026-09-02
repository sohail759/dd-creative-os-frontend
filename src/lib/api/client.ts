import type {
  AnalyticsResponse,
  AgentConfig,
  AgentConfigUpdate,
  AgentListResponse,
  ConceptDetail,
  ConceptListResponse,
  ConceptRunResult,
  ConceptRunDispatch,
  Creative,
  CreativeCounts,
  CreativeCopyUpdate,
  FetchAnalyticsResponse,
  FrameAssetsResponse,
  FrameUrlResponse,
  FrameUrlUpdate,
  GenerationResponse,
  GenerateOptions,
  MetaActionResponse,
  MetaProgress,
  MetaUploadOptions,
  MetaUploadPayload,
  ProductAnalyticsResponse,
  PromptSetting,
  PromptSettingUpdate,
  UploadedProduct,
  IntelligenceAdList,
  IntelligenceDetail,
  MetaPageHealthResponse,
  MetaPageHealthRefreshResponse,
} from "./types";

export interface ApiClient {
  getProducts(
    status?: string,
    limit?: number,
    offset?: number,
    brand?: string,
    phase?: string,
    search?: string,
  ): Promise<Creative[]>;
  getProduct(id: string): Promise<Creative>;
  generateProduct(id: string, options?: GenerateOptions): Promise<GenerationResponse>;
  getProductStatus(id: string): Promise<Creative>;
  getProductCounts(brand?: string, phase?: string): Promise<CreativeCounts>;

  getCopywriterPrompt(): Promise<PromptSetting>;
  updateCopywriterPrompt(payload: PromptSettingUpdate): Promise<PromptSetting>;
  updateCreativeCopy(id: string, payload: CreativeCopyUpdate): Promise<Creative>;
  updateFrameUrl(id: string, payload: FrameUrlUpdate): Promise<FrameUrlResponse>;
  getFrameAssets(id: string): Promise<FrameAssetsResponse>;
  getUploadOptions(id: string): Promise<MetaUploadOptions>;
  getMetaProgress(id: string): Promise<MetaProgress>;
  uploadProduct(id: string, payload: MetaUploadPayload): Promise<MetaActionResponse>;
  launchProduct(id: string): Promise<MetaActionResponse>;

  getAnalytics(brand?: string, limit?: number, offset?: number): Promise<AnalyticsResponse>;
  getUploadedProducts(brand?: string): Promise<UploadedProduct[]>;
  getProductAnalytics(creativeId: string): Promise<ProductAnalyticsResponse>;
  fetchProductAnalytics(creativeId: string, brand?: string): Promise<ProductAnalyticsResponse>;
  fetchBulkAnalytics(brand?: string): Promise<FetchAnalyticsResponse>;

  getAgents(): Promise<AgentListResponse>;
  getAgent(id: string): Promise<AgentConfig>;
  updateAgent(id: string, payload: AgentConfigUpdate): Promise<AgentConfig>;

  getIntelligenceConcepts(
    brand?: string,
    search?: string,
    limit?: number,
    offset?: number,
  ): Promise<ConceptListResponse>;
  getIntelligenceConcept(conceptName: string, brand?: string): Promise<ConceptDetail>;
  runIntelligenceConcept(
    conceptName: string,
    brand?: string,
    datePreset?: string,
    since?: string,
    until?: string,
  ): Promise<ConceptRunDispatch>;
  getIntelligenceConceptRun(
    taskId: string,
    conceptName?: string,
    brand?: string,
    datePreset?: string,
    since?: string,
    until?: string,
  ): Promise<ConceptRunResult & { task_id?: string; status?: string }>;

  getIntelligenceAds(
    brand?: string,
    limit?: number,
    offset?: number,
  ): Promise<IntelligenceAdList>;
  getIntelligenceAd(adId: string, brand?: string): Promise<IntelligenceDetail>;
  fetchIntelligenceAd(
    adId: string,
    brand?: string,
    datePreset?: string,
  ): Promise<IntelligenceDetail>;

  getPageHealth(brand?: string): Promise<MetaPageHealthResponse>;
  refreshPageHealth(brand?: string): Promise<MetaPageHealthRefreshResponse>;
}
