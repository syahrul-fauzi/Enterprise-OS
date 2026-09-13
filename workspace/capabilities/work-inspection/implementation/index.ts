/**
 * Work Inspection Capability Public API
 * Maintains substrate freeze - only export what's necessary for external use
 * All operations are grounded in Work ID to maintain work-as-boundary principle
 */

export { WorkInspectionAgent, workInspectionAgent } from "./services/inspection.agent.service";
export type {
  WorkId,
  WorkContext,
  WorkInspectionResult,
  DetectedBottleneck,
  MissingAction,
  InspectionRecommendation,
  WorkActor,
} from "./contracts/work-inspection.contracts";
export {
  DEFAULT_INSPECTION_CONFIG,
} from "./contracts/work-inspection.contracts";