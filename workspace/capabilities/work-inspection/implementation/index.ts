/**
 * Work Inspection Capability Public API
 * Maintains substrate freeze - only export what's necessary for external use
 * All operations are grounded in Work ID to maintain work-as-boundary principle
 */

export { WorkInspectionAgent, workInspectionAgent } from "./services/inspection.agent.service.js";
export {
  WorkId,
  WorkContext,
  WorkInspectionResult,
  DetectedBottleneck,
  MissingAction,
  InspectionRecommendation,
  DEFAULT_INSPECTION_CONFIG,
} from "./contracts/work-inspection.contracts.js";