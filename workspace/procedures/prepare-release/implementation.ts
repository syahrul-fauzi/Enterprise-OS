import {
  requirementService,
} from "../../capabilities/requirement-management/implementation/services";
import type { AssessVerificationOutput } from "../../capabilities/requirement-management/implementation/contracts";
import { requirementsTraceabilityMatrixService } from "../../capabilities/requirements-traceability-matrix/implementation/services";
import type { AssessTraceabilityOutput } from "../../capabilities/requirements-traceability-matrix/implementation/contracts";
import {
  evidenceRegistryService,
} from "../../capabilities/evidence-registry/implementation/services";
import type { AssessEvidenceOutput } from "../../capabilities/evidence-registry/implementation/contracts";
import type {
  PrepareReleaseInput,
  PrepareReleaseOutput,
  PrepareReleaseProcedureStep,
  PrepareReleaseRequirementPosture,
  PrepareReleaseTraceabilityPosture,
  PrepareReleaseEvidencePosture,
} from "./contracts";

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
  const steps: PrepareReleaseProcedureStep[] = [];

  if (!input.releaseId) {
    return {
      procedureId: "prepare_release",
      releaseId: "(unknown)",
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
  // Dynamic SOP Branching — Handle Ambiguous/Unknown State
  // ────────────────────────────────────────────────────────────
  const allHardChecksPassed =
    verificationAssessment.isVerified &&
    traceabilityAssessment.complete &&
    evidenceAssessment.complete;

  const hasUnknown = verificationAssessment.hasUnknown;

  let readinessStatus: PrepareReleaseOutput["readiness"]["status"];
  let executionReason: PrepareReleaseOutput["execution"]["reason"];
  let aiInvoked = false;
  let aiPlanId: string | null = null;
  let aiInvocationStatus: string | null = null;
  const ambiguousReqs = [...verificationAssessment.unknownRequirementIds];

  if (hasUnknown) {
    // ── Intelligent exception path: AI-on-demand ──
    // We don't hard-block. We trigger AI investigation to disambiguate.
    // In a full runtime this would dispatch to agent-orchestration; for
    // this vertical slice we mark it as "investigation triggered" and
    // let the UI show the human-wait state.
    aiInvoked = true;
    aiPlanId = "investigate-ambiguous-requirement";
    aiInvocationStatus = "triggered_pending_result";

    readinessStatus = "pending_ai_investigation";
    executionReason = "intelligence_required";

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
  } else if (!allHardChecksPassed) {
    // ── Deterministic block path ──
    readinessStatus = "blocked";
    executionReason = "blockers_found";
  } else {
    // ── Deterministic happy path ──
    readinessStatus = "ready";
    executionReason = "all_checks_passed";
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

  return {
    procedureId: "prepare_release",
    releaseId: input.releaseId,
    execution: {
      status: "passed",
      reason: executionReason,
    },
    readiness: {
      status: readinessStatus,
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
    blockers,
    steps,
    generatedAt: new Date().toISOString(),
  };
}

export { type PrepareReleaseInput, type PrepareReleaseOutput } from "./contracts";
export * from "./contracts";
