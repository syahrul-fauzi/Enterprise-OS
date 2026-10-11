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
} from "../../contracts/work.contracts";

// Export factory functions dari canonical contracts (createActorId, createTenantId, createWorkspaceId)
export { 
  createActorId,
  createTenantId,
  createWorkspaceId
} from "../../contracts/work.contracts";

// Export utility functions (tanpa ekstensi untuk Turbopack kompatibilitas)
export { calculateExecutionFrame } from "./cmbdc.utils";
export { safeRecordEvidence } from "./evidence.utils";
export { safeNotifyWorkspaceListeners } from "./realtime.utils";
export { buildWorkFaceProjection } from "./face-projection.utils";
export { validateAllBoundaries, validateIdentityBoundary, validateAuthorityBoundary } from "../../contracts/work.contracts";