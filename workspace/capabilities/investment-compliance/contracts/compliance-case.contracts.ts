// Import canonical identity + CMBCD types dari work-core (single source of truth - anti-drift)
import { calculateExecutionFrame } from "../../work-core/implementation/utils/index.js";
import type { TenantId, WorkspaceId, ActorId, ActorMetadata, AuthorizationScope, RiskAssessment, ExecutionFrame, ContextMetadata, WorkId, WorkFaceProjection } from "../../work-core/contracts/work.contracts.js";

export type ComplianceCaseStatus = "draft" | "open" | "in_review" | "closed";
export type ComplianceCasePriority = "low" | "medium" | "high" | "critical";
export type RiskRating = "low" | "medium" | "high";
export type ComplianceCaseId = string & {
    readonly __complianceCaseId: unique symbol;
};
export function ComplianceCaseId(value: string): ComplianceCaseId {
    return value as ComplianceCaseId;
}
// ILC-003: ComplianceCaseContextMetadata extends canonical ContextMetadata dari work-core
// Mempertahankan domain-specific fields tanpa menduplikasi CMBCD core types
export interface ComplianceCaseContextMetadata extends ContextMetadata {
    // Hanya tambahkan field khusus ILC yang tidak ada di ContextMetadata canonical
}
export interface ExecutionContextMetadata {
    readonly decision_id?: string | null;
    readonly last_invocation_digest?: string | null;
    readonly propagated_from: "cross-capability" | "direct-api";
}
export interface ComplianceCaseAggregate {
    readonly id: ComplianceCaseId;
    readonly workId: string; // CORE-001: WAJIB link ke core Work primitive ID (satu-satunya sumber truth untuk semua boundary metadata)
    readonly actorId: ActorId; // Canonical actor identity from work-core
    readonly tenantId: TenantId; // Canonical tenant isolation from work-core
    readonly workspaceId: WorkspaceId; // Canonical workspace context from work-core
    readonly title: string;
    readonly description?: string;
    readonly status: ComplianceCaseStatus;
    readonly priority: ComplianceCasePriority;
    readonly auditorId?: string | null;
    readonly investmentAmount: number;
    readonly sector: string;
    readonly riskRating: RiskRating;
    readonly sourceDiscussionId?: string;
    readonly deadline?: string;
    readonly createdAt: Readonly<Date>;
    readonly updatedAt: Readonly<Date>;
    readonly closedAt?: Readonly<Date>;
    readonly executionFrame?: ExecutionFrame; // Gunakan canonical ExecutionFrame type dari work-core
    readonly executionContext?: ExecutionContextMetadata;
    readonly evidence?: readonly any[];
}
export interface CreateComplianceCaseInput {
    readonly title: string;
    readonly description?: string;
    readonly priority?: ComplianceCasePriority;
    readonly investmentAmount: number;
    readonly sector: string;
    readonly riskRating: RiskRating;
    readonly sourceDiscussionId?: string;
    readonly auditorId?: string;
    readonly workId: string; // CORE-001: WAJIB link ke core Work primitive ID (satu-satunya sumber truth untuk semua boundary metadata)
    readonly sessionId: string;
}
export interface CreateComplianceCaseOutput {
    readonly id: ComplianceCaseId;
    readonly status: ComplianceCaseStatus;
    readonly workId: WorkId;
    readonly faceProjection: WorkFaceProjection;
}
export interface CloseComplianceCaseInput {
    readonly id: ComplianceCaseId;
    readonly reason?: string;
    readonly sessionId: string;
    readonly workId: string; // CORE-001: WAJIB link ke core Work primitive ID
}
export interface CloseComplianceCaseOutput {
    readonly id: ComplianceCaseId;
    readonly status: "closed";
    readonly closedAt: Date;
}
export interface AssignAuditorInput {
    readonly id: ComplianceCaseId;
    readonly auditorId: string;
    readonly transferReason?: string;
    readonly workId: string; // CORE-001: WAJIB link ke core Work primitive ID
    readonly parentContextTraceId?: string;
    readonly sessionId: string;
}
export interface AssignAuditorOutput {
    readonly id: ComplianceCaseId;
    readonly auditorId: string;
    readonly status: ComplianceCaseStatus;
}
export interface GetComplianceCaseInput {
    readonly id: ComplianceCaseId;
}
export type GetComplianceCaseOutput = ComplianceCaseAggregate | undefined;
export interface SearchComplianceCasesInput {
    readonly query?: string;
    readonly status?: ComplianceCaseStatus | "all";
    readonly priority?: ComplianceCasePriority | "all";
    readonly riskRating?: RiskRating | "all";
    readonly limit?: number;
    readonly offset?: number;
}
export interface SearchComplianceCasesOutput {
    readonly items: readonly ComplianceCaseAggregate[];
    readonly total: number;
    readonly matched: number;
    readonly offset: number;
    readonly limit: number;
}
export type ComplianceCaseRepository = {
    readonly entityName: "ComplianceCase";
    readonly kind: "repository";
    byId(id: ComplianceCaseId, context?: { tenantId: string; workspaceId: string }): Promise<ComplianceCaseAggregate | undefined>;
    listByWorkIds(workIds: readonly string[]): Promise<readonly ComplianceCaseAggregate[]>;
    save(entity: ComplianceCaseAggregate, context?: { tenantId: string; workspaceId: string; actorId: string }): Promise<ComplianceCaseAggregate>;
};