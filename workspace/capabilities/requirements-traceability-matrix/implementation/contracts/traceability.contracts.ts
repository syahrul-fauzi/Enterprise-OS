import type {
  RequirementId,
  RequirementPriority,
  RequirementStatus,
  RequirementVerificationStatus,
} from "../../../requirement-management/implementation/contracts";

export type TraceabilityArtifactKind =
  | "capability"
  | "api"
  | "source"
  | "test"
  | "specification"
  | "evidence";

export type TraceabilityReferenceKind = "repo_path" | "api_route" | "external_id";

export type TraceabilityArtifactVerification =
  | "not_applicable"
  | "pending"
  | "passed";

export interface TraceabilityArtifact {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly kind: TraceabilityArtifactKind;
  readonly reference: string;
  readonly referenceKind: TraceabilityReferenceKind;
  readonly requirementIds: readonly string[];
  readonly linkedCapabilityIds: readonly string[];
  readonly verification: TraceabilityArtifactVerification;
  readonly externalRequirementRefs?: readonly string[];
}

export interface TraceabilityArtifactRepository {
  readonly entityName: "TraceabilityArtifact";
  readonly kind: "repository";
  list(): readonly TraceabilityArtifact[];
}

export type TraceabilityMatchReason = "requirement_id" | "linked_capability";

export interface RequirementTraceabilityLink extends TraceabilityArtifact {
  readonly matchedBy: readonly TraceabilityMatchReason[];
}

export interface RequirementTraceabilityCoverage {
  readonly hasCapabilityLinks: boolean;
  readonly hasDeliveryArtifacts: boolean;
  readonly hasVerificationArtifacts: boolean;
  readonly hasEvidenceArtifacts: boolean;
  readonly artifactCount: number;
  readonly gapCount: number;
  readonly complete: boolean;
  readonly gaps: readonly string[];
}

export interface RequirementTraceabilityRow {
  readonly requirementId: RequirementId;
  readonly title: string;
  readonly status: RequirementStatus;
  readonly priority: RequirementPriority;
  readonly verificationStatus: RequirementVerificationStatus;
  readonly linkedCapabilityIds: readonly string[];
  readonly matchedArtifacts: readonly RequirementTraceabilityLink[];
  readonly coverage: RequirementTraceabilityCoverage;
}

export interface SearchTraceabilityMatrixInput {
  readonly requirementId?: string;
  readonly linkedCapabilityId?: string;
  readonly artifactKind?: TraceabilityArtifactKind | "all";
  readonly coverage?: "all" | "complete" | "gaps";
}

export interface TraceabilityMatrixSummary {
  readonly requirementCount: number;
  readonly completeCount: number;
  readonly gapCount: number;
  readonly artifactCount: number;
  readonly evidenceCount: number;
  readonly verificationCount: number;
}

export interface SearchTraceabilityMatrixOutput {
  readonly items: readonly RequirementTraceabilityRow[];
  readonly total: number;
  readonly summary: TraceabilityMatrixSummary;
}

export interface GetTraceabilityRowInput {
  readonly requirementId: RequirementId;
}

export type GetTraceabilityRowOutput = RequirementTraceabilityRow | undefined;

export interface AssessTraceabilityInput {
  readonly releaseId: string;
}

export interface TraceabilityGap {
  readonly requirementId: RequirementId;
  readonly missing: readonly TraceabilityArtifactKind[];
}

export interface AssessTraceabilityOutput {
  readonly complete: boolean;
  readonly gaps: readonly TraceabilityGap[];
  readonly gapCount: number;
  readonly requirementCount: number;
  readonly artifactCount: number;
}