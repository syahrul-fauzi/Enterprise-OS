export { useWorkspaceSession } from "./use-workspace-session/index";
export { useToast, type Toast } from "./use-toast/index";
export { useLocale, LocaleProvider, type SupportedLocale } from "./use-locale/use-locale";

// R9 - My Reality hooks (presentation system integration layer)
export {
  useMyReality,
  getEmptyMyRealityModel,
  type UseMyRealityResult,
  type UseMyRealityOptions,
  type MyRealityStatus,
} from "./use-my-reality/useMyReality";

export {
  useRealtimeWorkUpdates,
  type UseRealtimeWorkUpdatesResult,
  type UseRealtimeWorkUpdatesOptions,
  type WorkUpdateEvent,
  type WorkUpdateType,
} from "./use-realtime-work-updates/useRealtimeWorkUpdates";

export {
  usePageStates,
  type UsePageStatesResult,
  type UsePageStatesOptions,
  type PageState,
  type PageStatus,
  type PaginationState,
} from "./use-page-states/index";