import { workflowEngineService } from "../../../workflow-engine/implementation/services/workflow-engine.service.js";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import type {
  DispatchOrchestrationInput,
  GetOrchestrationPlanInput,
  GetOrchestrationPlanOutput,
  OrchestrationDispatchResult,
  OrchestrationDispatchStep,
  OrchestrationPlan,
  OrchestrationPlanStatus,
} from "../contracts/index.js";
import { OrchestrationPlanRepositoryInMemory } from "../repository/index.js";

function summarizeStatus(steps: readonly OrchestrationDispatchStep[]): OrchestrationPlanStatus {
  return steps.every((step) => step.status === "passed") ? "completed" : "failed";
}

function mergeInputs(
  base: Readonly<Record<string, unknown>>,
  override: Readonly<Record<string, unknown>> | undefined,
): Readonly<Record<string, unknown>> {
  return {
    ...base,
    ...(override ?? {}),
  };
}

export class AgentOrchestrationService {
  readonly repositories = {
    OrchestrationPlan: OrchestrationPlanRepositoryInMemory,
  } as const;

  listPlans(): readonly OrchestrationPlan[] {
    const result = OrchestrationPlanRepositoryInMemory.list();
    recordRuntimeInvocation({
      capabilityId: "agent-orchestration",
      operationId: "list-plans",
      sourceRef: "AgentOrchestrationService.listPlans",
      success: true,
      input: {},
      result: {
        count: result.length,
        planIds: result.map((plan) => plan.id),
      },
    });
    return result;
  }

  getPlan(input: GetOrchestrationPlanInput): GetOrchestrationPlanOutput {
    const result = OrchestrationPlanRepositoryInMemory.byId(input.planId);
    recordRuntimeInvocation({
      capabilityId: "agent-orchestration",
      operationId: "get-plan",
      sourceRef: "AgentOrchestrationService.getPlan",
      success: result !== undefined,
      input,
      result: result ?? { error: "plan_not_found", planId: input.planId },
    });
    return result;
  }

  dispatch(input: DispatchOrchestrationInput): OrchestrationDispatchResult {
    const plan = OrchestrationPlanRepositoryInMemory.byId(input.planId);
    if (plan === undefined) {
      const result: OrchestrationDispatchResult = {
        planId: input.planId,
        status: "failed",
        steps: [],
        output: { error: "plan_not_found" },
      };
      recordRuntimeInvocation({
        capabilityId: "agent-orchestration",
        operationId: "dispatch",
        sourceRef: "AgentOrchestrationService.dispatch",
        success: false,
        input,
        result,
      });
      return result;
    }

    const steps = plan.workItems
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id))
      .map<OrchestrationDispatchStep>((item) => {
        const mergedInputs = mergeInputs(item.defaultInputs, input.inputs);
        const result = workflowEngineService.executeWorkflow({
          workflowId: item.workflowId,
          requirementId:
            typeof mergedInputs.requirementId === "string"
              ? mergedInputs.requirementId
              : undefined,
          runId: typeof mergedInputs.runId === "string" ? mergedInputs.runId : undefined,
          limit: typeof mergedInputs.limit === "number" ? mergedInputs.limit : undefined,
        });

        return {
          workItemId: item.id,
          workflowId: item.workflowId,
          agentRole: item.agentRole,
          status: result.status === "passed" ? "passed" : "failed",
          summary: `${item.agentRole} executed ${item.workflowId} with status ${result.status}.`,
          output: {
            workflowStatus: result.status,
            ...result.output,
          },
        };
      });

    const result: OrchestrationDispatchResult = {
      planId: plan.id,
      status: summarizeStatus(steps),
      steps,
      output: {
        totalSteps: steps.length,
        passedSteps: steps.filter((step) => step.status === "passed").length,
        failedSteps: steps.filter((step) => step.status === "failed").length,
      },
    };
    recordRuntimeInvocation({
      capabilityId: "agent-orchestration",
      operationId: "dispatch",
      sourceRef: "AgentOrchestrationService.dispatch",
      success: result.status === "completed",
      input,
      result,
    });
    return result;
  }
}

export const agentOrchestrationService = new AgentOrchestrationService();

export * from "../contracts/index.js";
export * from "../repository/index.js";
