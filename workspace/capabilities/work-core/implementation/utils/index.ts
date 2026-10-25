// Work Continuity Substrate - Shared Utilities Index
// Exports all canonical primitives used across vertical slices (LawyersHub, Services.ID, ILC)
// Complies with Rule of Two reuse pattern and user's 6-boundary architecture mandate
// Re-export ALL boundary types from canonical contracts to make them available to vertical slices
export type { 
  IdentityBoundary, 
  SemanticBoundary, 
  AuthorityBoundary, 
  ExecutionBoundary, 
  EvidenceBoundary, 
  PresentationBoundary 
} from "@capabilities/work-core/contracts/work.contracts";

// Export factory functions dari canonical contracts (createSessionId, createDeviceId, createActorId, createTenantId, createWorkspaceId)
// Menambahkan createSessionId dan createDeviceId yang dibutuhkan oleh websocket-adapter untuk validasi session
export { 
  createSessionId, 
  createDeviceId, 
  createActorId, 
  createTenantId, 
  createWorkspaceId, 
  newSessionId, 
  newDeviceId, 
  newActorId, 
  newTenantId, 
  newWorkspaceId, 
  createWorkId, 
  newWorkId 
} from "@capabilities/work-core/contracts/work.contracts";

// Export types for autonomy boundary checks
export type { AutonomyBoundaryCheck, AutonomyBoundaryResult, DecisionLogEntry, ConsultationStageEvidence } from "./boundary-checks.types.js";

// Export boundary check functions
export { checkAutonomyBoundary } from "./boundary-checks.utils.js";

// Export utility functions
export { calculateExecutionFrame } from "./cmbdc.utils.js";
export { safeRecordEvidence } from "./evidence.utils.js";
export { safeNotifyWorkspaceListeners } from "./realtime.utils.js";
export { buildWorkFaceProjection } from "./face-projection.utils.js";
export { validateAllBoundaries, validateIdentityBoundary, validateAuthorityBoundary, validateNoCircularDependencies } from "@capabilities/work-core/contracts/work.contracts";
export { runArchitectureFitnessChecks } from "./architecture-fitness-checks.js";
export type { FitnessCheckResult } from "@capabilities/work-core/contracts/work.contracts";

// Export RuleBasedProvider dan IntentUnderstanding utilities untuk AI fallback
// Gate A compliance: Reuse provider yang sudah ada, semua import dari work-core
export { RuleBasedProvider, getIntentUnderstandingService } from "./intent-understanding.utils.js";
export type { IntentUnderstandingProvider, IntentUnderstanding, IntentRawInput } from "./intent-understanding.utils.js";