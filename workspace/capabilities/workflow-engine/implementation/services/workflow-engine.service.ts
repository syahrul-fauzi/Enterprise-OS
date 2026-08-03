import {
  RequirementId,
  requirementService,
} from "../../../requirement-management/implementation/service";
import { evidenceRegistryService } from "../../../evidence-registry/implementation/service";
import { requirementsTraceabilityMatrixService } from "../../../requirements-traceability-matrix/implementation/service";
import type {
  ExecuteWorkflowInput,
  ExecuteWorkflowOutput,
  GetWorkflowDefinitionInput,
  GetWorkflowDefinitionOutput,
  WorkflowExecutionResult,
  WorkflowExecutionStatus,
  WorkflowStepResult,
} from "../contracts";
import { WorkflowDefinitionRepositoryInMemory } from "../repository";
import { recordRuntimeInvocation } from "@repo/core-runtime";

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

function executeRequirementDeliveryReadiness(
  input: ExecuteWorkflowInput,
): WorkflowExecutionResult {
  const steps: WorkflowStepResult[] = [];

  if (!input.requirementId) {
    return {
      workflowId: input.workflowId,
      status: "failed",
      steps: [
        {
          stepId: "load-requirement",
          kind: "requirement.get",
          status: "failed",
          summary: "requirementId is required.",
        },
      ],
      output: { readyForWorkflow: false },
    };
  }

  const requirement = requirementService.getRequirement({
    id: RequirementId(input.requirementId),
  });

  if (requirement === undefined) {
    return {
      workflowId: input.workflowId,
      status: "failed",
      steps: [
        {
          stepId: "load-requirement",
          kind: "requirement.get",
          status: "failed",
          summary: `Requirement ${input.requirementId} was not found.`,
        },
      ],
      output: { readyForWorkflow: false },
    };
  }

  steps.push({
    stepId: "load-requirement",
    kind: "requirement.get",
    status: "passed",
    summary: `Loaded requirement ${requirement.id}.`,
    output: {
      requirementId: requirement.id,
      status: requirement.status,
      verificationStatus: requirement.verificationStatus,
      linkedCapabilityCount: requirement.linkedCapabilityIds.length,
    },
  });

  const traceability = requirementsTraceabilityMatrixService.getTraceabilityRow({
    requirementId: RequirementId(input.requirementId),
  });

  if (traceability === undefined) {
    steps.push({
      stepId: "resolve-traceability",
      kind: "traceability.get",
      status: "failed",
      summary: "No RTM row found for requirement.",
    });

    return {
      workflowId: input.workflowId,
      status: summarizeStatus(steps),
      steps,
      output: { readyForWorkflow: false },
    };
  }

  steps.push({
    stepId: "resolve-traceability",
    kind: "traceability.get",
    status: "passed",
    summary: `Resolved ${traceability.matchedArtifacts.length} traceability artifacts.`,
    output: {
      artifactCount: traceability.matchedArtifacts.length,
      coverageComplete: traceability.coverage.complete,
      gapCount: traceability.coverage.gapCount,
      gaps: [...traceability.coverage.gaps],
    },
  });

  const requirementRefs = Array.from(
    new Set(
      traceability.matchedArtifacts.flatMap(
        (artifact) => artifact.externalRequirementRefs ?? [],
      ),
    ),
  ).sort((left, right) => left.localeCompare(right));

  const evidenceMatches = dedupeById(
    requirementRefs.flatMap((requirementRef) =>
      evidenceRegistryService.searchEvidenceRegistry({
        requirementRef,
        limit: input.limit ?? 100,
      }).items,
    ),
  );

  steps.push({
    stepId: "collect-linked-evidence",
    kind: "evidence.search",
    status: evidenceMatches.length > 0 ? "passed" : "skipped",
    summary:
      evidenceMatches.length > 0
        ? `Collected ${evidenceMatches.length} evidence records.`
        : "No linked external evidence was found for this requirement.",
    output: {
      requirementRefs,
      evidenceCount: evidenceMatches.length,
      evidencePaths: evidenceMatches.map((item) => item.path),
    },
  });

  const readyForWorkflow =
    requirement.verificationStatus === "passed" &&
    traceability.coverage.complete &&
    evidenceMatches.length > 0;

  return {
    workflowId: input.workflowId,
    status: summarizeStatus(steps),
    steps,
    output: {
      readyForWorkflow,
      requirementId: requirement.id,
      requirementStatus: requirement.status,
      verificationStatus: requirement.verificationStatus,
      evidenceCount: evidenceMatches.length,
      traceabilityGapCount: traceability.coverage.gapCount,
    },
  };
}

function executeEvidenceRunReview(input: ExecuteWorkflowInput): WorkflowExecutionResult {
  const steps: WorkflowStepResult[] = [];

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
    summary:
      evidence.matched > 0
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
        input,
        result,
      });
      return result;
    }

    const result = input.workflowId === "requirement-delivery-readiness"
      ? executeRequirementDeliveryReadiness(input)
      : executeEvidenceRunReview(input);
    recordRuntimeInvocation({
      capabilityId: "workflow-engine",
      operationId: "execute-workflow",
      sourceRef: "WorkflowEngineService.executeWorkflow",
      success: result.status === "passed",
      input,
      result,
    });
    return result;
  }
}

export const workflowEngineService = new WorkflowEngineService();

export * from "../contracts";
export * from "../repository";
