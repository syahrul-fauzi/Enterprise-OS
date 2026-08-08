import type { ExecutionId, CanonicalSubjectKey } from "../contracts";

export type PrepareReleaseReadinessStatus = "ready" | "blocked" | "pending_ai_investigation";

export type PrepareReleaseExecutionStatus = "passed" | "failed";

export type ProcedureStepStatus = "passed" | "failed" | "requires_human";

export type PrepareReleaseConditionOutcome =
  | readonly [outcome: "ready", reason: "all_checks_passed"]
  | readonly [outcome: "blocked", reason: "blockers_found"]
  | readonly [
      outcome: "intelligence_required",
      reason: "intelligence_required",
      metadata: Readonly<{
        readonly ambiguousRequirementIds: readonly string[];
        readonly aiPlanId: "investigate-ambiguous-requirement";
      }>,
    ];

export type PrepareReleaseConditionInputs = Readonly<{
  readonly verification: Readonly<{
    readonly isVerified: boolean;
    readonly hasUnknown: boolean;
    readonly unknownRequirementIds: readonly string[];
  }>;
  readonly traceability: Readonly<{
    readonly complete: boolean;
  }>;
  readonly evidence: Readonly<{
    readonly complete: boolean;
  }>;
}>;

export function evaluatePrepareReleaseConditions(
  inputs: PrepareReleaseConditionInputs,
): PrepareReleaseConditionOutcome {
  const { verification, traceability, evidence } = inputs;

  const allHardChecksPassed =
    verification.isVerified && traceability.complete && evidence.complete;

  const hasUnknown = verification.hasUnknown;

  if (hasUnknown) {
    return [
      "intelligence_required",
      "intelligence_required",
      Object.freeze({
        ambiguousRequirementIds: [...verification.unknownRequirementIds],
        aiPlanId: "investigate-ambiguous-requirement" as const,
      }),
    ] as const;
  }

  if (!allHardChecksPassed) {
    return ["blocked", "blockers_found"] as const;
  }

  return ["ready", "all_checks_passed"] as const;
}

Object.freeze(evaluatePrepareReleaseConditions);

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
