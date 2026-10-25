// Import canonical identity + CMBCD types dari work-core (single source of truth - anti-drift)
// Semua CMBCD core types (ActorMetadata, AuthorizationScope, ContextMetadata, RiskAssessment)
// didefinisikan sekali di work-core untuk menghindari duplikasi antar vertical slices (Rule of Two compliance)
import type { 
  TenantId, 
  WorkspaceId, 
  ActorId, 
  ExecutionFrame,
  ContextMetadata,
  ActorMetadata,
  AuthorizationScope as CoreAuthorizationScope,
  RiskAssessment as CoreRiskAssessment
} from "../../work-core/contracts/work.contracts.js";
// Import canonical branded types + factory functions dari @repo/contracts-core (source of truth)
import { WorkId, createWorkId } from "../../../packages/contracts-core/dist/index.js";

export type CaseStatus = "draft" | "open" | "submitted" | "reviewed" | "approved" | "in_progress" | "under_review" | "closed";
export type CasePriority = "low" | "medium" | "high" | "critical";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type CaseId = string & {
    readonly __caseId: unique symbol;
};
export function CaseId(value: string): CaseId {
    return value as CaseId;
}

// Legal-case specific extensions of canonical CMBCD types
// Hanya menambahkan field khusus domain legal yang tidak ada di work-core ContextMetadata
export interface CaseContextMetadata extends ContextMetadata {
    readonly caseCategory: string; // Domain-specific field hanya untuk legal-case
}

export interface RiskAssessment extends CoreRiskAssessment {
    mitigationSteps?: string[]; // Domain-specific risk mitigation hanya untuk legal-case (mutabel sesuai zod schema)
}

export interface AuthorizationScope extends CoreAuthorizationScope {
    readonly expiryTimestamp?: string; // Domain-specific auth expiry hanya untuk legal-case
    readonly delegatedBy?: ActorId; // Domain-specific delegation trace hanya untuk legal-case
}

// Import canonical CMBCD execution frame calculator dari shared Work Continuity Substrate
// Implements user mandate: Reuse existing primitives (Rule of Two compliance) - eliminates duplicate logic
import { calculateExecutionFrame } from "../../work-core/implementation/utils/index.js";

export interface ExecutionContextMetadata {
    readonly decision_id?: string | null;
    readonly last_invocation_digest?: string | null;
    readonly propagated_from: "cross-capability" | "direct-api";
    readonly calculatedExecutionFrame?: ExecutionFrame; // Dynamically computed from CMBCD
}

export interface CaseAggregate {
    readonly id: CaseId;
    readonly workId: WorkId; // CORE-001: WAJIB link ke core Work primitive ID (satu-satunya sumber truth untuk semua boundary metadata)
    readonly title: string;
    readonly description?: string;
    readonly status: CaseStatus;
    readonly priority: CasePriority;
    readonly lawyerId?: string;
    readonly sourceDiscussionId?: string;
    readonly deadline?: string;
    readonly createdAt: Readonly<Date>;
    readonly updatedAt: Readonly<Date>;
    readonly closedAt?: Readonly<Date>;
    readonly underReviewAt?: Readonly<Date>;
    readonly paymentAmount?: number;
    
    // PROD-002-10: FULL CMBCD FRAMEWORK IMPLEMENTATION (actor-capability-authority-context-risk-evidence)
    readonly actorMetadata: ActorMetadata; // Current responsible actor metadata
    readonly allowedCapabilities: readonly string[]; // List of capabilities authorized for this case
    readonly authorization: AuthorizationScope; // Granular authorization boundaries
    readonly context: CaseContextMetadata; // 5-boundary compliant context metadata
    readonly risk: RiskAssessment; // Dynamic risk assessment per actor/context changes
    readonly executionFrame?: ExecutionFrame; // LH-LEGAL-001: CMBCD execution frame (canonical type from work-core)
    readonly executionContext?: ExecutionContextMetadata;
    readonly evidence?: readonly any[]; // Immutable evidence trail for all state transitions
}
export interface CreateCaseInput {
    readonly title: string;
    readonly description?: string;
    readonly priority?: CasePriority;
    readonly sourceDiscussionId?: string;
    readonly lawyerId?: string;
    readonly sessionId: string;
    readonly linkedIntentId: string;
    readonly tenantId: TenantId; // Required core identity field (sesuai ContextMetadata dari work-core)
    readonly workId: WorkId; // CORE-001: WAJIB link ke core Work primitive ID (satu-satunya sumber truth untuk semua boundary metadata)
    // PROD-002-10: Required CMBCD initialization fields (must be set at case creation)
    readonly initialActorMetadata: ActorMetadata;
    readonly initialCapabilities: readonly string[];
    readonly initialAuthorization: AuthorizationScope;
    readonly caseContext: CaseContextMetadata;
    readonly initialRiskAssessment: RiskAssessment;
}
import type { WorkFaceProjection } from "../../work-core/contracts/work.contracts.js";
export interface CreateCaseOutput {
    readonly id: CaseId;
    readonly status: CaseStatus;
    readonly workId: string;
    readonly faceProjection: WorkFaceProjection;
}
export interface CloseCaseInput {
    readonly id: CaseId;
    readonly reason?: string;
    readonly sessionId: string;
}
export interface CloseCaseOutput {
    readonly id: CaseId;
    readonly status: "closed";
    readonly closedAt: Date;
}
export interface AssignLawyerInput {
    readonly id: CaseId;
    readonly lawyerId: string;
    readonly transferReason?: string;
    readonly parentContextTraceId?: string;
    readonly sessionId: string;
    // PROD-002-10: onActorChange hook requirements - re-validate CMBCD after actor change
    readonly newActorMetadata: ActorMetadata;
    readonly updatedCapabilities?: readonly string[];
    readonly updatedAuthorization?: AuthorizationScope;
    readonly updatedRiskAssessment?: RiskAssessment;
}
export interface AssignLawyerOutput {
    readonly id: CaseId;
    readonly lawyerId: string;
    readonly status: CaseStatus;
}
export interface GetCaseInput {
    readonly id: CaseId;
}
export type GetCaseOutput = CaseAggregate | undefined;
export interface SearchCasesInput {
    readonly query?: string;
    readonly status?: CaseStatus | "all";
    readonly priority?: CasePriority | "all";
    readonly limit?: number;
    readonly offset?: number;
}
export interface SearchCasesOutput {
    readonly items: readonly CaseAggregate[];
    readonly total: number;
    readonly matched: number;
    readonly offset: number;
    readonly limit: number;
}
export type CaseRepository = {
    readonly entityName: "Case";
    readonly kind: "repository";
    byId(id: CaseId, context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<CaseAggregate | undefined>;
    list(context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<readonly CaseAggregate[]>;
    listByWorkIds(workIds: readonly string[], context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<readonly CaseAggregate[]>;
    save(entity: CaseAggregate, context?: { tenantId: string; workspaceId?: string; actorId?: string }): Promise<CaseAggregate>;
    remove(id: CaseId, context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<boolean>;
    clear?(): void; // Optional method for in-memory repository testing
    stopScanner?(): void; // Optional method for in-memory repository testing
    loadFromDisk?(filePath: string): Promise<void>; // Optional method for in-memory repository testing
}