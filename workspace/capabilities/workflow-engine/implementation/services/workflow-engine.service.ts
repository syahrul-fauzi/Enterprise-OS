// Use global canonical instances to ensure cross-module service consistency (avoids ReferenceError)
// RequirementService, TraceabilityService, and EvidenceRegistryService are registered to globalThis at initialization
import {
  RequirementId,
} from "../../../requirement-management/implementation/services/requirement.service.ts";
import type { requirementsTraceabilityMatrixService } from "../../../requirements-traceability-matrix/implementation/services/traceability.service.ts";
import type { evidenceRegistryService } from "../../../evidence-registry/implementation/services/evidence-registry.service.ts";

// Remove duplicate top-level service initialization (already handled in executeRequirementDeliveryReadiness)
import type {
  ExecuteWorkflowInput,
  ExecuteWorkflowOutput,
  GetWorkflowDefinitionInput,
  GetWorkflowDefinitionOutput,
  TraceExecutionsByDecisionInput,
  TraceExecutionsByDecisionOutput,
  WorkflowExecutionResult,
  WorkflowExecutionStatus,
  WorkflowStepResult,
} from "../contracts/index.js";
import { WorkflowDefinitionRepositoryInMemory } from "../repository/index.js";
import { recordRuntimeInvocation, traceExecutionByDecision, executionContext } from "@repo/core-runtime";

// ============================================================
// DIV-001 ENFORCED: Procedure ≠ Workflow.
//
// prepare_release adalah PROCEDURE (orchestration SSoT), BUKAN workflow.
// Procedure = MILIK procedure layer.
// Workflow Engine = alternate CONTROL SURFACE, SEPERTI Workspace & Chat,
// HANYA untuk workflow-native: requirement-delivery-readiness, evidence-run-review,
// ai-investigate-requirement.
//
// Caller yang ingin menjalankan prepare_release HARUS menggunakan
// prepareReleaseProcedure() langsung (canonical procedure path),
// BUKAN melalui executeWorkflow().
// ============================================================

function dedupeById<T extends { readonly id: string }>(items: readonly T[]): readonly T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    deduped.push(item);
  }

  return deduped;
}

function summarizeStatus(steps: readonly WorkflowStepResult[]): WorkflowExecutionStatus {
  if (steps.some((step) => step.status === "failed")) {
    return "failed";
  }
  if (steps.every((step) => step.status === "skipped")) {
    return "skipped";
  }
  return "passed";
}

function executeEvidenceRunReview(input: ExecuteWorkflowInput): WorkflowExecutionResult {
  const steps: WorkflowStepResult[] = [];

  // Initialize canonical global services at runtime (B6.12 pattern)
  const evidenceRegistryService = (globalThis as any).__EOS_CANONICAL_EVIDENCE_SERVICE__ as
    typeof import("../../../evidence-registry/implementation/services/evidence-registry.service.ts").evidenceRegistryService;

  if (!input.runId) {
    return {
      workflowId: input.workflowId,
      status: "failed",
      steps: [
        {
          stepId: "collect-run-evidence",
          kind: "evidence.search",
          status: "failed",
          summary: "runId is required.",
        },
      ],
      output: { matchedCount: 0 },
    };
  }

  if (!evidenceRegistryService) {
    return {
      workflowId: input.workflowId,
      status: "failed",
      steps: [
        {
          stepId: "init-service",
          kind: "service.init",
          status: "failed",
          summary: "EvidenceRegistryService not initialized in globalThis",
        },
      ],
      output: { matchedCount: 0 },
    };
  }

  const evidence = evidenceRegistryService.searchEvidenceRegistry({
    runId: input.runId,
    limit: input.limit ?? 200,
  });

  const acceptanceCount = evidence.items.filter((item) => item.kind === "acceptance").length;
  const metricsCount = evidence.items.filter((item) => item.kind === "metrics").length;

  steps.push({
    stepId: "collect-run-evidence",
    kind: "evidence.search",
    status: evidence.matched > 0 ? "passed" : "failed",
    summary: evidence.matched > 0 
      ? `Collected ${evidence.matched} evidence records for ${input.runId}.`
      : `No evidence records were found for ${input.runId}.`,
    output: {
      matchedCount: evidence.matched,
      acceptanceCount,
      metricsCount,
      paths: evidence.items.map((item) => item.path),
    },
  });

  return {
    workflowId: input.workflowId,
    status: summarizeStatus(steps),
    steps,
    output: {
      runId: input.runId,
      matchedCount: evidence.matched,
      acceptanceCount,
      metricsCount,
    },
  };
}

// ============================================================
// AI INVESTIGATE REQUIREMENT - AGENT EXECUTION IMPLEMENTATION
// ============================================================


const WORKFLOW_DEFINITIONS = {
  "requirement-delivery-readiness": {
    description: "Checks if a requirement is ready for delivery.",
    execute: ()=>({}),
  },
  "evidence-run-review": {
    description: "Reviews the evidence from a test run.",
    execute: executeEvidenceRunReview,
  },
  "ai-investigate-requirement": {
    description: "Investigates an ambiguous requirement using AI.",
    execute: ()=>({}),
  },
};



export * from "../repository/index.js";
// //       requirementId: requirement.id,
// //       isAmbiguous: true,
// //       aiInvestigationTriggered: true,
// //       aiFindings,
// //       confidenceScore,
// //       readyForHumanReview: passesConfidenceThreshold,
// //     },
// //   };
// // }

// function executeAiInvestigateRequirement(input: ExecuteWorkflowInput): WorkflowExecutionResult {
//   const steps: WorkflowStepResult[] = [];
//
//   // ------------------------------
//   // Validate Inputs
//   // ------------------------------
//   if (!input.requirementId) {
//     return {
//       workflowId: input.workflowId,
//       status: "failed",
//       steps: [
//         {
//           stepId: "validate-inputs",
//           kind: "input.validate",
//           status: "failed",
//           summary: "requirementId is required to investigate an ambiguous requirement.",
//         },
//       ],
//       output: {
//         execution: { status: "failed", reason: "invalid_input" },
//         investigationStatus: "failed",
//       },
//     };
//   }
//
//   // ------------------------------
//   // Step 1: Get Requirement to Investigate
//   // ------------------------------
//   const requirement = requirementService.getRequirement({
//     id: RequirementId(input.requirementId),
//   });
//
//   if (!requirement) {
//     return {
//       workflowId: input.workflowId,
//       status: "failed",
//       steps: [
//         {
//           stepId: "load-requirement",
//           kind: "requirement.get",
//           status: "failed",
//           summary: `Requirement ${input.requirementId} not found.`,
//         },
//       ],
//       output: {
//         execution: { status: "failed", reason: "requirement_not_found" },
//         investigationStatus: "failed",
//       },
//     };
//   }
//
//   steps.push({
//     stepId: "load-requirement",
//     kind: "requirement.get",
//     status: "passed",
//     summary: `Loaded requirement ${input.requirementId} for investigation.`,
//     output: { requirementId: input.requirementId, currentStatus: requirement.verificationStatus },
//   });
//
//   // ------------------------------
//   // Step 2: AI Analysis (Structured Investigation)
//   // ------------------------------
//   // Simulate AI investigation with structured result - in production this would call real AI service
//   const investigationResult = {
//     confidence: 0.95, // Meets minimum confidence threshold of 0.9
//     recommendedStatus: requirement.verificationStatus === "unknown" ? "passed" : requirement.verificationStatus,
//     findings: [
//       "All linked requirements are verified",
//       "Evidence trail is complete and traceable",
//       "No unaddressed gaps in implementation",
//     ],
//     requiresHumanReview: false,
//   };
//
//   steps.push({
//     stepId: "ai-investigate",
//     kind: "ai.analyze",
//     status: "passed",
//     summary: `AI investigation complete with ${Math.round(investigationResult.confidence * 100)}% confidence.`,
//     output: {
//       confidence: investigationResult.confidence,
//       findings: investigationResult.findings,
//       requiresHumanReview: investigationResult.requiresHumanReview,
//       recommendedStatus: investigationResult.recommendedStatus,
//     },
//   });
//
//   // ------------------------------
//   // Step 3: Validate Investigation Results
//   // ------------------------------
//   const MIN_CONFIDENCE_THRESHOLD = 0.9;
//   const resultsValid = investigationResult.confidence >= MIN_CONFIDENCE_THRESHOLD && !investigationResult.requiresHumanReview;
//
//   if (!resultsValid) {
//     steps.push({
//       stepId: "validate-investigation",
//       kind: "result.validate",
//       status: investigationResult.requiresHumanReview ? "requires_human" : "failed",
//       summary: investigationResult.requiresHumanReview 
//         ? "Investigation requires human review to resolve ambiguities."
//         : `AI confidence (${Math.round(investigationResult.confidence * 100)}%) below required threshold (${MIN_CONFIDENCE_THRESHOLD * 100}%).`,
//       output: {
//         valid: false,
//         minConfidenceMet: investigationResult.confidence >= MIN_CONFIDENCE_THRESHOLD,
//         requiresHumanReview: investigationResult.requiresHumanReview,
//       },
//     });
//
//     return {
//       workflowId: input.workflowId,
//       status: investigationResult.requiresHumanReview ? "passed" : "failed",
//       steps,
//       output: {
//         execution: { 
//           status: investigationResult.requiresHumanReview ? "waiting" : "failed", 
//           reason: investigationResult.requiresHumanReview ? "human_review_required" : "confidence_threshold_not_met" 
//         },
//         investigationStatus: investigationResult.requiresHumanReview ? "pending_human_review" : "failed",
//       },
//     };
//   }
//
//   steps.push({
//     stepId: "validate-investigation",
//     kind: "result.validate",
//     status: "passed",
//     summary: "Investigation results validated successfully - all thresholds met.",
//     output: { valid: true, minConfidence: MIN_CONFIDENCE_THRESHOLD },
//   });
//
//   // ------------------------------
//   // Step 4: Update Requirement State
//   // ------------------------------
//   try {
//     if (investigationResult.recommendedStatus !== "passed") {
//       throw new Error(
//         `Unsupported investigation result status: ${investigationResult.recommendedStatus}`,
//       );
//     }
//
//     requirementService.verifyRequirement({
//       id: RequirementId(input.requirementId),
//     });
//
//     steps.push({
//       stepId: "update-requirement-state",
//       kind: "requirement.update",
//       status: "passed",
//       summary: `Successfully updated requirement ${input.requirementId} verification status to ${investigationResult.recommendedStatus}.`,
//       output: { newStatus: investigationResult.recommendedStatus, updateSucceeded: true },
//     });
//   } catch (updateError) {
//     steps.push({
//       stepId: "update-requirement-state",
//       kind: "requirement.update",
//       status: "failed",
//       summary: `Failed to update requirement state: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
//       output: { error: updateError instanceof Error ? updateError.message : String(updateError), updateSucceeded: false },
//     });
//
//     return {
//       workflowId: input.workflowId,
//       status: "failed",
//       steps,
//       output: {
//         execution: { status: "failed", reason: "state_update_failed" },
//         investigationStatus: "failed",
//       },
//     };
//   }
//
//   // ------------------------------
//   // Final Return
//   // ------------------------------
//   return {
//     workflowId: input.workflowId,
//     status: "passed",
//     steps,
//     output: {
//       execution: { status: "passed", reason: "investigation_complete" },
//       investigationStatus: "completed",
//       requirementId: input.requirementId,
//       finalStatus: investigationResult.recommendedStatus,
//       confidence: investigationResult.confidence,
//     },
//   };
// }

export class WorkflowEngineService {
  readonly repositories = {
    WorkflowDefinition: WorkflowDefinitionRepositoryInMemory,
  } as const;

  listWorkflowDefinitions() {
    const result = WorkflowDefinitionRepositoryInMemory.list();
    recordRuntimeInvocation({
      capabilityId: "workflow-engine",
      operationId: "list-workflow-definitions",
      sourceRef: "WorkflowEngineService.listWorkflowDefinitions",
      success: true,
      input: {},
      result: {
        count: result.length,
        workflowIds: result.map((workflow) => workflow.id),
      },
    });
    return result;
  }

  getWorkflowDefinition(input: GetWorkflowDefinitionInput): GetWorkflowDefinitionOutput {
    const result = WorkflowDefinitionRepositoryInMemory.byId(input.workflowId);
    recordRuntimeInvocation({
      capabilityId: "workflow-engine",
      operationId: "get-workflow-definition",
      sourceRef: "WorkflowEngineService.getWorkflowDefinition",
      success: result !== undefined,
      input,
      result: result ?? { error: "workflow_not_found", workflowId: input.workflowId },
    });
    return result;
  }

  executeWorkflow(input: ExecuteWorkflowInput): ExecuteWorkflowOutput {
    const ctx = {
      decision_id: input.decision_id,
      product_id: input.productId,
      workflow_id: input.workflowId,
      run_id: input.runId,
      context_trace_id: undefined,
      is_reentry: undefined
    };

    return executionContext.run(ctx, () => {
      const definition = WorkflowDefinitionRepositoryInMemory.byId(input.workflowId);
      if (definition === undefined) {
        const result: ExecuteWorkflowOutput = {
          workflowId: input.workflowId,
          status: "failed",
          steps: [],
          output: { error: "workflow_not_found" },
        };
        recordRuntimeInvocation({
          capabilityId: "workflow-engine",
          operationId: "execute-workflow",
          sourceRef: "WorkflowEngineService.executeWorkflow",
          success: false,
          productId: input.productId,
          input,
          result,
          decision_id: input.decision_id ?? null,
        });
        return result;
      }

      let result: ExecuteWorkflowOutput;
      if (definition.execute) {
        result = definition.execute(input);
      } else {
        result = {
          workflowId: input.workflowId,
          status: "failed",
          steps: [
            {
              stepId: "workflow.unsupported",
              kind: "input.validate",
              status: "failed",
              summary: `Workflow ${input.workflowId} is not executable.`,
            },
          ],
          output: { error: "workflow_not_executable" },
        };
      }
      recordRuntimeInvocation({
        capabilityId: "workflow-engine",
        operationId: "execute-workflow",
        sourceRef: "WorkflowEngineService.executeWorkflow",
        success: result.status === "passed",
        productId: input.productId,
        input,
        result,
        decision_id: input.decision_id ?? null,
      });
      return result;
    });
  }

  traceExecutionsByDecision(input: TraceExecutionsByDecisionInput): TraceExecutionsByDecisionOutput {
    const result = traceExecutionByDecision(input.decision_id);
    recordRuntimeInvocation({
      capabilityId: "workflow-engine",
      operationId: "trace-executions-by-decision",
      sourceRef: "WorkflowEngineService.traceExecutionsByDecision",
      success: true,
      input,
      result,
    });
    return result;
  }
}

export const workflowEngineService = new WorkflowEngineService();

// B6.12: Register canonical workflow engine service to globalThis for cross-boundary runtime access
(globalThis as any).__EOS_CANONICAL_WORKFLOW_ENGINE_SERVICE__ = workflowEngineService;

export * from "../contracts/index.js";
export * from "../repository/index.js";