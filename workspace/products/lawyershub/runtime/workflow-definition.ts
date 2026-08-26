import type { WorkflowStep, WorkflowDefinition } from "@repo/core-kernel";

export interface LawyersHubWorkflowStep extends WorkflowStep {
  readonly id: "case" | "document" | "external-response" | "inspection" | "review" | "approval" | "payment" | "completed";
}

export interface LawyersHubWorkflowDefinition extends WorkflowDefinition {
  readonly id: "lawyershub-case-to-payment";
  readonly productId: "lawyershub";
  readonly steps: readonly LawyersHubWorkflowStep[];
}

export const LAWYERSHUB_WORKFLOW: LawyersHubWorkflowDefinition = {
  id: "lawyershub-case-to-payment",
  productId: "lawyershub",
  label: "Case → Document → External Response → Inspection → Lawyer Review → Approval → Payment",
  initialStep: "case",
  terminalStep: "completed",
  steps: [
    {
      id: "case",
      label: "Case",
      capability: "legal-case",
      command: "case.create",
      description: "Open a case and anchor the Work identity.",
      requiredRoles: ["customer", "agent"]
    },
    {
      id: "document",
      label: "Document",
      capability: "legal-document",
      command: "document.create",
      description: "Draft and attach all required legal documents.",
      requiredRoles: ["lawyer", "notary"]
    },
    {
      id: "external-response",
      label: "External Response",
      capability: "legal-case",
      description: "Wait for response from external institution (AHU, Kemenkumham).",
      requiredRoles: ["agent"]
    },
    {
      id: "inspection",
      label: "Inspection",
      capability: "legal-case",
      description: "System inspection: verify work identity, context, and all required documents.",
      requiredRoles: ["system"]
    },
    {
      id: "review",
      label: "Lawyer Review",
      capability: "legal-case",
      command: "case.markCompleted",
      description: "Lawyer reviews external response and approves Work completion.",
      requiredRoles: ["lawyer"]
    },
    {
      id: "approval",
      label: "Approval",
      capability: "governance-approval",
      command: "approval.request",
      description: "Client approves the final Work outcome.",
      requiredRoles: ["customer"]
    },
    {
      id: "payment",
      label: "Payment",
      capability: "legal-payment",
      command: "payment.initiate",
      description: "Settle final payment for completed Work.",
      requiredRoles: ["customer"]
    },
    {
      id: "completed",
      label: "Completed",
      capability: "legal-case",
      description: "Work is fully completed, archived with complete evidence chain.",
      requiredRoles: ["system"]
    }
  ] as const,
  transitions: {
    "case→document": { from: "case", to: "document", requiredRoles: ["admin", "lawyer"] },
    "document→external-response": { from: "document", to: "external-response", requiredRoles: ["notary", "agent"] },
    "external-response→inspection": { from: "external-response", to: "inspection", requiredRoles: ["system"] },
    "inspection→review": { from: "inspection", to: "review", requiredRoles: ["lawyer"] },
    "review→approval": { from: "review", to: "approval", requiredRoles: ["lawyer"] },
    "approval→payment": { from: "approval", to: "payment", requiredRoles: ["admin"] },
    "payment→completed": { from: "payment", to: "completed", requiredRoles: ["system"] }
  } as const
};

export function getLawyersHubWorkflow(): LawyersHubWorkflowDefinition {
  return LAWYERSHUB_WORKFLOW;
}

export type LawyersHubWorkflowStepId = LawyersHubWorkflowStep["id"];