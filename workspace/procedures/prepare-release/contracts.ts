import type { ExecutionId, CanonicalSubjectKey } from "../contracts";

export type PrepareReleaseReadinessStatus = "ready" | "blocked" | "pending_ai_investigation";

export type PrepareReleaseExecutionStatus = "passed" | "failed";

export type ProcedureStepStatus = "passed" | "failed" | "requires_human";

export interface PrepareReleaseRequirementPosture {
  readonly total: number;
  readonly verified: number;
  readonly blocked: number;
  readonly unknown: number;
}

export interface PrepareReleaseTraceabilityPosture {
  readonly complete: boolean;
  readonly gaps: number;
  readonly gapRequirementIds: readonly string[];
}

export interface PrepareReleaseEvidencePosture {
  readonly complete: boolean;
  readonly total: number;
  readonly paths: readonly string[];
}

export interface PrepareReleaseAiInvocation {
  readonly invoked: boolean;
  readonly planId: string | null;
  readonly ambiguousRequirements: readonly string[];
  readonly invocationStatus: string | null;
}

export interface PrepareReleaseProcedureStep {
  readonly stepId: string;
  readonly kind: string;
  readonly status: ProcedureStepStatus;
  readonly summary: string;
  readonly output?: Readonly<Record<string, unknown>>;
}

export interface PrepareReleaseInput {
  readonly releaseId: string;
  readonly limit?: number;
}

export interface PrepareReleaseOutput {
  readonly executionId: ExecutionId;
  readonly procedure: "prepare_release";
  readonly procedureId: "prepare_release";
  readonly canonicalSubject: CanonicalSubjectKey;
  readonly releaseId: string;
  readonly execution: {
    readonly status: PrepareReleaseExecutionStatus;
    readonly reason: string;
  };
  readonly readiness: {
    readonly status: PrepareReleaseReadinessStatus;
  };
  readonly requirements: PrepareReleaseRequirementPosture;
  readonly traceability: PrepareReleaseTraceabilityPosture;
  readonly evidence: PrepareReleaseEvidencePosture;
  readonly ai: PrepareReleaseAiInvocation;
  readonly blockers: readonly string[];
  readonly steps: readonly PrepareReleaseProcedureStep[];
  readonly generatedAt: string;
}
