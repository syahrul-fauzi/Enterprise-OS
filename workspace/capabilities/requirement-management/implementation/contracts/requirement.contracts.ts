export type RequirementStatus =
  | "draft"
  | "in_review"
  | "review_completed"
  | "review_rejected"
  | "approved"
  | "in_delivery"
  | "implemented"
  | "verified";
export type RequirementPriority = "low" | "medium" | "high" | "critical";

export type RequirementVerificationStatus =
  | "not_ready"
  | "pending"
  | "passed"
  | "failed"
  | "unknown";

export type RequirementId = string & { readonly __requirementId: unique symbol };

export function RequirementId(value: string): RequirementId {
  return value as RequirementId;
}

export interface RequirementDependency {
  readonly requirementId: string;
  readonly relationType: "enables" | "supports" | "depends-on" | "derived-from";
}

export interface RequirementAggregate {
  readonly id: RequirementId;
  readonly workId?: string;
  readonly title: string;
  readonly summary?: string;
  readonly description?: string;
  readonly status: RequirementStatus;
  readonly priority: RequirementPriority;
  readonly owner?: string;
  readonly source?: string;
  readonly linkedCapabilityIds: readonly string[];
  readonly acceptanceCriteria: readonly string[];
  readonly verificationStatus: RequirementVerificationStatus;
  readonly dependsOn: readonly RequirementDependency[];
  readonly createdAt: Readonly<Date>;
  readonly updatedAt: Readonly<Date>;
  readonly approvedBy?: string;
  readonly approvedAt?: Readonly<Date>;
  readonly implementedAt?: Readonly<Date>;
  readonly verifiedAt?: Readonly<Date>;
  // C12/C13/C18 review metadata (C18: support multiple parallel reviewers)
  readonly reviewerIds?: string[];
  readonly reviewRequestedBy?: string;
  readonly requestedAt?: Readonly<Date>;
  readonly reviewCompletedBy?: string;
  readonly reviewCompletedAt?: Readonly<Date>;
  readonly reviewRejectedBy?: string;
  readonly reviewRejectedAt?: Readonly<Date>;
  readonly rejectionReason?: string;
  // Version tracking for evidence
  readonly version?: number;
}

export interface CreateRequirementInput {
  readonly title: string;
  readonly summary?: string;
  readonly description?: string;
  readonly priority?: RequirementPriority;
  readonly owner?: string;
  readonly source?: string;
  readonly linkedCapabilityIds?: readonly string[];
  readonly acceptanceCriteria?: readonly string[];
  // Work identity binding (from decision_id)
  readonly workId?: string;
  // Required context for tenant isolation
  readonly sessionId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
}

export interface CreateRequirementOutput {
  readonly id: RequirementId;
  readonly status: RequirementStatus;
  readonly verificationStatus: RequirementVerificationStatus;
  readonly createdAt: Date;
}

export interface UpdateRequirementInput {
  readonly id: RequirementId;
  readonly title?: string;
  readonly summary?: string;
  readonly description?: string;
  readonly priority?: RequirementPriority;
  readonly owner?: string;
  readonly source?: string;
  readonly linkedCapabilityIds?: readonly string[];
  readonly acceptanceCriteria?: readonly string[];
  // Required context for tenant isolation
  readonly sessionId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
}

export interface UpdateRequirementOutput {
  readonly id: RequirementId;
  readonly status: RequirementStatus;
  readonly updatedAt: Date;
}

export interface ApproveRequirementInput {
  readonly id: RequirementId;
  // Required context for tenant isolation
  readonly sessionId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
}

export interface ApproveRequirementOutput {
  readonly id: RequirementId;
  readonly status: "approved";
  readonly approvedAt: Date;
}

export interface StartRequirementDeliveryInput {
  readonly id: RequirementId;
  // Required context for tenant isolation
  readonly sessionId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
}

export interface StartRequirementDeliveryOutput {
  readonly id: RequirementId;
  readonly status: "in_delivery";
}

export interface MarkRequirementImplementedInput {
  readonly id: RequirementId;
  // Required context for tenant isolation
  readonly sessionId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
}

export interface MarkRequirementImplementedOutput {
  readonly id: RequirementId;
  readonly status: "implemented";
  readonly implementedAt: Date;
}

export interface VerifyRequirementInput {
  readonly id: RequirementId;
  // Required context for tenant isolation
  readonly sessionId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
}

export interface VerifyRequirementOutput {
  readonly id: RequirementId;
  readonly status: "verified";
  readonly verificationStatus: "passed";
  readonly verifiedAt: Date;
}

export interface GetRequirementInput {
  readonly id: RequirementId;
}

export type GetRequirementOutput = RequirementAggregate | undefined;

export interface SearchRequirementsInput {
  readonly query?: string;
  readonly status?: RequirementStatus | "all";
  readonly priority?: RequirementPriority | "all";
  readonly verificationStatus?: RequirementVerificationStatus | "all";
  readonly linkedCapabilityId?: string;
  readonly owner?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export interface SearchRequirementsOutput {
  readonly items: readonly RequirementAggregate[];
  readonly total: number;
  readonly matched: number;
  readonly offset: number;
  readonly limit: number;
}

export interface AssessVerificationInput {
  readonly releaseId: string;
}

export interface AssessVerificationOutput {
  readonly totalRequirements: number;
  readonly verifiedRequirements: number;
  readonly unknownRequirements: number;
  readonly blockedRequirements: number;
  readonly isVerified: boolean;
  readonly hasUnknown: boolean;
  readonly unknownRequirementIds: readonly RequirementId[];
}

export interface RequirementRepository {
  readonly entityName: "Requirement";
  readonly kind: "repository";
  byId(id: RequirementId): Promise<RequirementAggregate | undefined>;
  list(): Promise<readonly RequirementAggregate[]>;
  save(entity: RequirementAggregate): Promise<RequirementAggregate>;
  remove(id: RequirementId): Promise<boolean>;
}