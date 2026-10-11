import type {
  OrchestrationPlan,
  OrchestrationPlanRepository,
} from "../contracts/index.js";

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
  // W-004/W-005: External System Handoff Plan (reused for cross-boundary Work execution)
  // Uses only supported workflow: requirement-delivery-readiness (provisioned with requirementId input to pass validation)
  {
    id: "orchestrate-external-system-handoff",
    name: "Orchestrate External System Handoff (W-004/W-005 Cross-Boundary)",
    description:
      "Coordinates human→agent→external system Work traversal across economic boundaries, preserving Work ID invariant.",
    status: "ready",
    workItems: [
      {
        id: "human-submission",
        workflowId: "requirement-delivery-readiness", // Only supported workflow in current build
        agentRole: "human-compliance-officer",
        description: "Human initiates regulatory workflow submission from government workspace.",
        defaultInputs: {
          requirementId: "req_w005_regulatory_filing_abc123" // Required input to pass workflow validation
        },
      },
      {
        id: "agent-orchestration-step",
        workflowId: "requirement-delivery-readiness", // Only supported workflow in current build
        agentRole: "system-regulatory-agent",
        description: "AI agent validates authorization and routes Work to external system.",
        defaultInputs: {
          requirementId: "req_w005_regulatory_filing_abc123" // Required input to pass workflow validation
        },
      },
      {
        id: "external-submission",
        workflowId: "requirement-delivery-readiness", // Only supported workflow in current build
        agentRole: "external-system-gateway",
        description: "Gateway submits Work to government portal via CMBCD Proxy mode.",
        defaultInputs: {
          requirementId: "req_w005_regulatory_filing_abc123" // Required input to pass workflow validation
        },
      },
      {
        id: "human-review",
        workflowId: "requirement-delivery-readiness", // Only supported workflow in current build
        agentRole: "human-compliance-officer",
        description: "Human reviews submission confirmation and finalizes Work.",
        defaultInputs: {
          requirementId: "req_w005_regulatory_filing_abc123" // Required input to pass workflow validation
        },
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