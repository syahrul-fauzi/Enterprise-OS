export type RequirementStatus =
  | "draft"
  | "approved"
  | "in_delivery"
  | "implemented"
  | "verified";

export type RequirementPriority = "low" | "medium" | "high" | "critical";

export type RequirementVerificationStatus =
  | "not_ready"
  | "pending"
  | "passed"
  | "failed";

export type RequirementId = string & { readonly __requirementId: unique symbol };

export function RequirementId(value: string): RequirementId {
  return value as RequirementId;
}

export interface RequirementAggregate {
  readonly id: RequirementId;
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
  readonly createdAt: Readonly<Date>;
  readonly updatedAt: Readonly<Date>;
  readonly approvedAt?: Readonly<Date>;
  readonly implementedAt?: Readonly<Date>;
  readonly verifiedAt?: Readonly<Date>;
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
}

export interface UpdateRequirementOutput {
  readonly id: RequirementId;
  readonly status: RequirementStatus;
  readonly updatedAt: Date;
}

export interface ApproveRequirementInput {
  readonly id: RequirementId;
}

export interface ApproveRequirementOutput {
  readonly id: RequirementId;
  readonly status: "approved";
  readonly approvedAt: Date;
}

export interface StartRequirementDeliveryInput {
  readonly id: RequirementId;
}

export interface StartRequirementDeliveryOutput {
  readonly id: RequirementId;
  readonly status: "in_delivery";
}

export interface MarkRequirementImplementedInput {
  readonly id: RequirementId;
}

export interface MarkRequirementImplementedOutput {
  readonly id: RequirementId;
  readonly status: "implemented";
  readonly implementedAt: Date;
}

export interface VerifyRequirementInput {
  readonly id: RequirementId;
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

export interface RequirementRepository {
  readonly entityName: "Requirement";
  readonly kind: "repository";
  byId(id: RequirementId): RequirementAggregate | undefined;
  list(): readonly RequirementAggregate[];
  save(entity: RequirementAggregate): RequirementAggregate;
  remove(id: RequirementId): boolean;
}
