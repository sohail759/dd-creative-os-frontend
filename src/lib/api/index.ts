import type { ApiClient } from "./client";
import { mockApi } from "./mock-adapter";
import { httpApi } from "./products";

export type { ApiClient } from "./client";
export type {
  Creative,
  ConceptSummary,
  ConceptGroup,
  ConceptListResponse,
  ConceptDetail,
  ConceptRunResult,
  ConceptRunDispatch,
  CreativeCounts,
  CreativeCopyUpdate,
  FetchAnalyticsResponse,
  FrameUrlResponse,
  FrameUrlUpdate,
  CreativeStatus,
  GenerationStatus,
  GenerateOptions,
  GenerationResponse,
  ProductAnalyticsResponse,
  PromptSetting,
  PromptSettingUpdate,
  MetaState,
  MetaActionResponse,
  MetaProgress,
  MetaUploadOptions,
  MetaUploadPayload,
  UploadedProduct,
   AgentConfig,
   AgentConfigUpdate,
   AgentListResponse,
   AgentField,
   IntelligenceAd,
   IntelligenceAdList,
   AnalystPayload,
   IntelligenceBlock,
   IntelligenceData,
   IntelligenceDetail,
} from "./types";
export { CREATIVE_STATUSES, STATUS_LABELS } from "./types";

/**
 * Selects the data adapter:
 *  - mock: NEXT_PUBLIC_USE_MOCK !== "false" AND no NEXT_PUBLIC_API_URL
 *  - real HTTP: NEXT_PUBLIC_API_URL set (and NEXT_PUBLIC_USE_MOCK !== "true")
 */
const useMock =
  process.env.NEXT_PUBLIC_USE_MOCK === "true" ||
  (process.env.NEXT_PUBLIC_USE_MOCK !== "false" &&
    !process.env.NEXT_PUBLIC_API_URL);

export const api: ApiClient = useMock ? mockApi : httpApi;
