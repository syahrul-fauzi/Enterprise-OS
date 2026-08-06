import type {
  OrchestrationPlan,
  OrchestrationPlanRepository,
} from "../contracts";

const PLANS: readonly OrchestrationPlan[] = Object.freeze([
  {
    id: "orchestrate-requirement-delivery",
    name: "Orchestrate Requirement Delivery",
    description:
      "Coordinates requirement readiness and supporting evidence collection before downstream delivery steps.",
    status: "ready",
    workItems: [
      {
        id: "delivery-readiness",
        workflowId: "requirement-delivery-readiness",
        agentRole: "delivery-agent",
        description: "Validate requirement readiness through RTM and evidence coverage.",
        defaultInputs: { requirementId: "req-003" },
      },
    ],
  },
  {
    id: "orchestrate-evidence-review",
    name: "Orchestrate Evidence Review",
    description:
      "Coordinates a review pass over run-scoped evidence and acceptance artifacts.",
    status: "ready",
    workItems: [
      {
        id: "evidence-review",
        workflowId: "evidence-run-review",
        agentRole: "evidence-agent",
        description: "Review run evidence, acceptance count, and metrics count.",
        defaultInputs: { runId: "run-007" },
      },
    ],
  },
  {
    id: "investigate-ambiguous-requirement",
    name: "Investigate Ambiguous Requirement (AI-on-Demand)",
    description:
      "AI-powered investigation of requirements with unknown verification status to resolve ambiguity and determine true readiness.",
    status: "ready",
    workItems: [
      {
        id: "requirement-investigation",
        workflowId: "ai-investigate-requirement",
        agentRole: "ai-investigation-agent",
        description: "Perform deep root cause analysis on requirement with unknown verification status.",
        defaultInputs: {},
      },
    ],
  },
]);

export const OrchestrationPlanRepositoryInMemory: OrchestrationPlanRepository = {
  kind: "repository",
  entityName: "OrchestrationPlan",
  list() {
    return PLANS.map((plan) => ({
      ...plan,
      workItems: plan.workItems.map((item) => ({
        ...item,
        defaultInputs: { ...item.defaultInputs },
      })),
    }));
  },
  byId(id) {
    const plan = PLANS.find((item) => item.id === id);
    return plan === undefined
      ? undefined
      : {
          ...plan,
          workItems: plan.workItems.map((item) => ({
            ...item,
            defaultInputs: { ...item.defaultInputs },
          })),
        };
  },
} as const;