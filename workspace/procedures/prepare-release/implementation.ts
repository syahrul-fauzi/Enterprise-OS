import {
  requirementService,
} from "../../capabilities/requirement-management/implementation/services/index.js";
import type { AssessVerificationOutput } from "../../capabilities/requirement-management/implementation/contracts/index.js";
import { requirementsTraceabilityMatrixService } from "../../capabilities/requirements-traceability-matrix/implementation/services/index.js";
import type { AssessTraceabilityOutput } from "../../capabilities/requirements-traceability-matrix/implementation/contracts/index.js";
import {
  evidenceRegistryService,
} from "../../capabilities/evidence-registry/implementation/services/index.js";
import type { AssessEvidenceOutput } from "../../capabilities/evidence-registry/implementation/contracts/index.js";
import {
  buildExecutionIdentityV1,
} from "../contracts.js";
import {
  appendAttributionRecord,
} from "../attribution/implementation.js";
import {
  evaluatePrepareReleaseConditions,
} from "./contracts.js";
import type {
  PrepareReleaseInput,
  PrepareReleaseOutput,
  PrepareReleaseProcedureStep,
  PrepareReleaseRequirementPosture,
  PrepareReleaseTraceabilityPosture,
  PrepareReleaseEvidencePosture,
} from "./contracts.js";

function buildRequirementPosture(
  assessment: AssessVerificationOutput,
): PrepareReleaseRequirementPosture {
  return {
    total: assessment.totalRequirements,
    verified: assessment.verifiedRequirements,
    blocked: assessment.blockedRequirements,
    unknown: assessment.unknownRequirements,
  };
}

function buildTraceabilityPosture(
  traceabilityAssessment: ReturnType<typeof requirementsTraceabilityMatrixService.assess>,
): PrepareReleaseTraceabilityPosture {
  return {
    complete: traceabilityAssessment.complete,
    gaps: traceabilityAssessment.gapCount,
    gapRequirementIds: traceabilityAssessment.gaps.map((g) => g.requirementId),
  };
}

function buildEvidencePosture(
  assessment: AssessEvidenceOutput,
): PrepareReleaseEvidencePosture {
  return {
    complete: assessment.complete,
    total: assessment.totalEvidence,
    paths: assessment.evidencePaths,
  };
}

function buildBlockers(
  reqPosture: PrepareReleaseRequirementPosture,
  tracePosture: PrepareReleaseTraceabilityPosture,
  evPosture: PrepareReleaseEvidencePosture,
): string[] {
  const blockers: string[] = [];

  if (reqPosture.blocked > 0) {
    blockers.push(
      `${reqPosture.blocked} requirement(s) are in non-verifiable status`,
    );
  }

  if (reqPosture.unknown > 0) {
    blockers.push(
      `${reqPosture.unknown} requirement(s) are under AI investigation for ambiguous verification`,
    );
  }

  if (!tracePosture.complete) {
    blockers.push(
      `${tracePosture.gaps} traceability gap(s) must be resolved across ${tracePosture.gapRequirementIds.length} requirement(s)`,
    );
  }

  if (!evPosture.complete) {
    blockers.push(
      `Evidence coverage incomplete — ${evPosture.total} records found, but some requirements have no linked evidence`,
    );
  }

  return blockers;
}

export function prepareReleaseProcedure(
  input: PrepareReleaseInput,
): PrepareReleaseOutput {
  const PROCEDURE_NAME = "prepare_release";
  const CANONICAL_SUBJECT_PREFIX = "release";
  const effectiveReleaseId = input.releaseId ?? "(unknown)";
  const canonicalSubject = `${CANONICAL_SUBJECT_PREFIX}/${effectiveReleaseId}`;
  const identity = buildExecutionIdentityV1(PROCEDURE_NAME, canonicalSubject);

  const steps: PrepareReleaseProcedureStep[] = [];

  if (!input.releaseId) {
    const result: PrepareReleaseOutput = {
      executionId: identity.executionId,
      procedure: identity.procedure as "prepare_release",
      procedureId: "prepare_release",
      canonicalSubject: identity.canonicalSubject,
      releaseId: effectiveReleaseId,
      execution: {
        status: "failed",
        reason: "invalid_input",
      },
      readiness: {
        status: "blocked",
      },
      requirements: { total: 0, verified: 0, blocked: 0, unknown: 0 },
      traceability: { complete: false, gaps: 0, gapRequirementIds: [] },
      evidence: { complete: false, total: 0, paths: [] },
      ai: {
        invoked: false,
        planId: null,
        ambiguousRequirements: [],
        invocationStatus: null,
      },
      blockers: ["releaseId is required to prepare a release."],
      steps: [
        {
          stepId: "validate-inputs",
          kind: "input.validate",
          status: "failed",
          summary: "releaseId is required to prepare a release.",
        },
      ],
      generatedAt: new Date().toISOString(),
    };
    appendAttributionRecord({
      executionId: result.executionId,
      procedure: PROCEDURE_NAME,
      canonicalSubject: result.canonicalSubject,
      input,
      output: result,
      evaluatedAt: result.generatedAt,
    });
    return result;
  }

  // ────────────────────────────────────────────────────────────
  // STEP 1: Assess Requirements State (delegated to Capability)
  // ────────────────────────────────────────────────────────────
  const verificationAssessment = requirementService.assessVerification({
    releaseId: input.releaseId,
  });

  steps.push({
    stepId: "assess-requirements",
    kind: "requirement.assess",
    status: "passed",
    summary: `Requirement assessment: ${verificationAssessment.verifiedRequirements}/${verificationAssessment.totalRequirements} verified, ${verificationAssessment.unknownRequirements} unknown, ${verificationAssessment.blockedRequirements} blocked.`,
    output: verificationAssessment as unknown as Readonly<Record<string, unknown>>,
  });

  // ────────────────────────────────────────────────────────────
  // STEP 2: Assess Traceability Posture (delegated to Capability)
  // ────────────────────────────────────────────────────────────
  const traceabilityAssessment = requirementsTraceabilityMatrixService.assess({
    releaseId: input.releaseId,
  });

  steps.push({
    stepId: "assess-traceability",
    kind: "traceability.assess",
    status: "passed",
    summary: `Traceability assessment: ${traceabilityAssessment.gapCount} gap(s) across ${traceabilityAssessment.requirementCount} requirement(s), ${traceabilityAssessment.artifactCount} artifact(s) linked.`,
    output: traceabilityAssessment as unknown as Readonly<Record<string, unknown>>,
  });

  // ────────────────────────────────────────────────────────────
  // STEP 3: Assess Evidence Coverage (delegated to Capability)
  // ────────────────────────────────────────────────────────────
  const evidenceAssessment = evidenceRegistryService.assessEvidence({
    releaseId: input.releaseId,
  });

  steps.push({
    stepId: "assess-evidence",
    kind: "evidence.assess",
    status: "passed",
    summary: `Evidence assessment: ${evidenceAssessment.totalEvidence} traceable evidence record(s) found. ${evidenceAssessment.complete ? "All requirements have evidence coverage." : "Some requirements lack linked evidence."}`,
    output: evidenceAssessment as unknown as Readonly<Record<string, unknown>>,
  });

  // ────────────────────────────────────────────────────────────
  // Build Posture Objects
  // ────────────────────────────────────────────────────────────
  const reqPosture = buildRequirementPosture(verificationAssessment);
  const tracePosture = buildTraceabilityPosture(traceabilityAssessment);
  const evPosture = buildEvidencePosture(evidenceAssessment);

  // ────────────────────────────────────────────────────────────
  // Dynamic SOP Branching — Single Semantic Authority
  // (evaluatePrepareReleaseConditions = frozen canonical evaluator)
  // ────────────────────────────────────────────────────────────
  const conditionResult = evaluatePrepareReleaseConditions({
    verification: verificationAssessment,
    traceability: traceabilityAssessment,
    evidence: evidenceAssessment,
  });

  const [outcome, executionReason] = conditionResult;

  let readinessStatus: PrepareReleaseOutput["readiness"]["status"];
  let aiInvoked = false;
  let aiPlanId: string | null = null;
  let aiInvocationStatus: string | null = null;
  let ambiguousReqs: readonly string[] = [];

  switch (outcome) {
    case "intelligence_required": {
      const [, , meta] = conditionResult;
      aiInvoked = true;
      aiPlanId = meta.aiPlanId;
      aiInvocationStatus = "triggered_pending_result";
      ambiguousReqs = meta.ambiguousRequirementIds;
      readinessStatus = "pending_ai_investigation";
      steps.push({
        stepId: "trigger-ai-investigation",
        kind: "ai.investigate",
        status: "requires_human",
        summary: `Triggered AI investigation workflow (${aiPlanId}) for ${ambiguousReqs.length} ambiguous requirement(s): ${ambiguousReqs.join(", ")}. Procedure will wait for investigation results before re-evaluation.`,
        output: {
          planId: aiPlanId,
          ambiguousRequirements: ambiguousReqs,
          nextAction: "WAIT_FOR_AI_OR_HUMAN",
        },
      });
      break;
    }
    case "blocked":
      readinessStatus = "blocked";
      break;
    case "ready":
      readinessStatus = "ready";
      break;
  }

  const blockers = buildBlockers(reqPosture, tracePosture, evPosture);

  // ────────────────────────────────────────────────────────────
  // STEP 4: Final Posture Determination
  // ────────────────────────────────────────────────────────────
  steps.push({
    stepId: "determine-final-posture",
    kind: "posture.assess",
    status: "passed",
    summary:
      readinessStatus === "ready"
        ? "Release is READY for deployment. All readiness criteria met."
        : readinessStatus === "blocked"
          ? "Release is BLOCKED. Resolve listed blockers before proceeding."
          : "Release is PENDING AI INVESTIGATION. Waiting for intelligence results before final readiness call.",
    output: {
      finalReadiness: readinessStatus,
      blockers,
      executionReason,
    },
  });

  // Handle potential attribution failure before freezing result object
  let finalReadinessStatus = readinessStatus;
  const finalBlockers = [...blockers];
  
  try {
    appendAttributionRecord({
      executionId: identity.executionId,
      procedure: PROCEDURE_NAME,
      canonicalSubject: identity.canonicalSubject,
      input,
      output: null, // Temporary value, will update with final result
      evaluatedAt: new Date().toISOString(),
    });
  } catch (e) {
    // G5: Failure semantics - parent menangkap error dari child procedure
    finalReadinessStatus = "blocked";
    finalBlockers.push(`Attribution failed: ${e instanceof Error ? e.message : "Unknown error writing attribution record"}`);
  }

  const result: PrepareReleaseOutput = {
    executionId: identity.executionId,
    procedure: identity.procedure as "prepare_release",
    procedureId: "prepare_release",
    canonicalSubject: identity.canonicalSubject,
    releaseId: input.releaseId,
    execution: {
      status: "passed",
      reason: executionReason,
    },
    readiness: {
      status: finalReadinessStatus,
    },
    requirements: reqPosture,
    traceability: tracePosture,
    evidence: evPosture,
    ai: {
      invoked: aiInvoked,
      planId: aiPlanId,
      ambiguousRequirements: ambiguousReqs,
      invocationStatus: aiInvocationStatus,
    },
    blockers: finalBlockers,
    steps,
    generatedAt: new Date().toISOString(),
  };
  
  // Update the attribution record with the final result
  try {
    appendAttributionRecord({
      executionId: result.executionId,
      procedure: PROCEDURE_NAME,
      canonicalSubject: result.canonicalSubject,
      input,
      output: result,
      evaluatedAt: result.generatedAt,
    });
  } catch (e) {
    // If still fails, we already set the final status before creating the result
  }
  return result;
}

export { type PrepareReleaseInput, type PrepareReleaseOutput } from "./contracts.js";
export * from "./contracts.js";