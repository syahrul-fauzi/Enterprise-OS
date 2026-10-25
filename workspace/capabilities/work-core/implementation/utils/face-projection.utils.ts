// FACE Projection Utilities - Shared WorkFaceProjection builder for all vertical slices
// Implements core invariant: "FACE is a projection, not owner" of core Work data
// Complies with Rule of Two reuse pattern and 5-boundary architecture mandate
import type {
  WorkId,
  TenantId,
  WorkspaceId,
  ActorId,
  WorkStatus,
  ExecutionFrame,
  IdentityBoundary,
  SemanticBoundary,
  AuthorityBoundary,
  ExecutionBoundary,
  PresentationBoundary,
  WorkProjectionConfig,
  WorkFaceProjection
} from "@capabilities/work-core/contracts/work.contracts";

/**
 * buildWorkFaceProjection - SERVER-ONLY utility to construct canonical WorkFaceProjection
 * from raw canonical work data. This function MUST ONLY be called on the server to maintain
 * invariant that all state derivation happens server-side; presentation layer receives
 * only the final projection and never constructs state from raw data.
 * 
 * @param params Raw canonical work parameters from core Work aggregate
 * @returns Canonical WorkFaceProjection ready to be sent to presentation layer
 */
export function buildWorkFaceProjection(params: {
  // Core Work identifiers
  workId: WorkId;
  // Identity boundary data
  tenantId: TenantId;
  organizationId: string;
  principalId: ActorId;
  ownerIds: readonly ActorId[];
  institutionId?: string;
  // Semantic boundary data
  domain: string;
  intent: string;
  currentState: WorkStatus;
  requirements: readonly string[];
  constraints: readonly string[];
  decisions: readonly string[];
  // Authority boundary data
  actorCapabilities: ReadonlyMap<ActorId, readonly string[]>;
  policyEnforcements: readonly string[];
  authorizations: ReadonlyMap<ActorId, readonly string[]>;
  delegations: readonly { from: ActorId; to: ActorId; actions: readonly string[]; expiresAt: Date }[];
  // Execution boundary data
  workspaceId?: WorkspaceId;
  runtimeEnvironment: "web" | "agent" | "edge" | "external-system";
  executorIds: readonly ActorId[];
  executionFrame: ExecutionFrame;
  deviceIds?: readonly string[];
  // Presentation boundary data
  supportedFaces: readonly ("web" | "agent" | "api" | "mobile" | "mcp")[];
  defaultLayout: string;
  mobileEnabled: boolean;
  apiEnabled: boolean;
  // Projection configuration (all derived from core data)
  displayName: string;
  summary: string;
  priority: "low" | "medium" | "high" | "critical";
  dueDate?: Date;
  uiFilters: readonly string[];
  hideFromSurfaces: readonly string[];
  // Derived state inputs (server-calculated only)
  currentActorId: ActorId;
  canCurrentActorAct: boolean;
  nextAvailableActions: readonly string[];
  evidenceCount: number;
  actorCount: number;
}): WorkFaceProjection {
  // ① Construct Identity Boundary
  const identity: IdentityBoundary = {
    tenantId: params.tenantId,
    organizationId: params.organizationId,
    ...(params.institutionId && { institutionId: params.institutionId }),
    principalId: params.principalId,
    ownerIds: params.ownerIds
  };

  // ② Construct Semantic Boundary
  const semantic: SemanticBoundary = {
    domain: params.domain,
    intent: params.intent,
    currentState: params.currentState,
    requirements: params.requirements,
    constraints: params.constraints,
    decisions: params.decisions
  };

  // ③ Construct Authority Boundary
  const authority: AuthorityBoundary = {
    actorCapabilities: params.actorCapabilities,
    policyEnforcements: params.policyEnforcements,
    authorizations: params.authorizations,
    delegations: params.delegations
  };

  // ④ Construct Execution Boundary (canonical 5-boundary implementation)
  const execution: ExecutionBoundary = {
    ...(params.workspaceId && { workspaceId: params.workspaceId }),
    runtimeEnvironment: params.runtimeEnvironment,
    executorIds: params.executorIds,
    ...(params.deviceIds && { deviceIds: params.deviceIds }),
    executionFrame: params.executionFrame
  };

  // ⑤ Construct Presentation Boundary with projection config (canonical 5-boundary implementation)
  const projectionConfig: WorkProjectionConfig = {
    displayName: params.displayName,
    summary: params.summary,
    priority: params.priority,
    ...(params.dueDate && { dueDate: params.dueDate }),
    uiFilters: params.uiFilters,
    hideFromSurfaces: params.hideFromSurfaces
  };

  const presentation: PresentationBoundary = {
    supportedFaces: params.supportedFaces,
    defaultLayout: params.defaultLayout,
    mobileEnabled: params.mobileEnabled,
    apiEnabled: params.apiEnabled,
    projectionConfig
  };

  // Return final canonical WorkFaceProjection
  return {
    workId: params.workId,
    identity,
    semantic,
    authority,
    execution,
    presentation,
    derivedState: {
      canCurrentActorAct: params.canCurrentActorAct,
      nextAvailableActions: params.nextAvailableActions,
      evidenceCount: params.evidenceCount,
      actorCount: params.actorCount
    }
  };
}