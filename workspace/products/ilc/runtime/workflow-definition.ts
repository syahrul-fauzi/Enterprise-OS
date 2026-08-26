import type { WorkflowStep, WorkflowDefinition } from "@repo/core-kernel";

export interface ILCWorkflowStep extends WorkflowStep {
  readonly id: "case" | "document" | "matching" | "external-response" | "inspection" | "review" | "approval" | "completed";
}

export interface ILCWorkflowDefinition extends WorkflowDefinition {
  readonly id: "ilc-legal-aid-workflow";
  readonly productId: "ilc";
  readonly steps: readonly ILCWorkflowStep[];
}

export const ILC_LEGAL_AID_WORKFLOW: ILCWorkflowDefinition = {
  id: "ilc-legal-aid-workflow",
  productId: "ilc",
  label: "Case → Document → Lawyer Matching → External Response → Inspection → Review → Approval → Completed",
  initialStep: "case",
  terminalStep: "completed",
  steps: [
    {
      id: "case",
      label: "Case Registration",
      capability: "legal-case",
      command: "case.create",
      description: "Register legal aid case and anchor Work identity.",
      requiredRoles: ["customer", "agent"]
    },
    {
      id: "document",
      label: "Document Collection",
      capability: "legal-document",
      command: "document.create",
      description: "Collect and verify all required identity and case documents.",
      requiredRoles: ["agent", "clerk"]
    },
    {
      id: "matching",
      label: "Lawyer Matching",
      capability: "consultation",
      command: "case.assignLawyer",
      description: "Match pro bono lawyer to the legal aid case.",
      requiredRoles: ["admin", "matching-system"]
    },
    {
      id: "external-response",
      label: "Court/Institution Response",
      capability: "legal-case",
      description: "Wait for response from court, police, or related institution.",
      requiredRoles: ["assigned-lawyer", "agent"]
    },
    {
      id: "inspection",
      label: "Case Inspection",
      capability: "legal-case",
      description: "System inspection: verify work identity, documents, and external response.",
      requiredRoles: ["system"]
    },
    {
      id: "review",
      label: "Lawyer Review",
      capability: "legal-case",
      command: "case.markCompleted",
      description: "Assigned lawyer reviews all developments and approves case resolution.",
      requiredRoles: ["assigned-lawyer"]
    },
    {
      id: "approval",
      label: "Client Approval",
      capability: "governance-approval",
      command: "approval.request",
      description: "Client approves the case outcome and resolution.",
      requiredRoles: ["customer"]
    },
    {
      id: "completed",
      label: "Case Completed",
      capability: "legal-case",
      description: "Legal aid case is fully resolved, archived with complete evidence chain.",
      requiredRoles: ["system"]
    }
  ] as const,
  transitions: {
    "case→document": { from: "case", to: "document", requiredRoles: ["agent", "admin"] },
    "document→matching": { from: "document", to: "matching", requiredRoles: ["admin"] },
    "matching→external-response": { from: "matching", to: "external-response", requiredRoles: ["assigned-lawyer", "agent"] },
    "external-response→inspection": { from: "external-response", to: "inspection", requiredRoles: ["system"] },
    "inspection→review": { from: "inspection", to: "review", requiredRoles: ["assigned-lawyer"] },
    "review→approval": { from: "review", to: "approval", requiredRoles: ["assigned-lawyer"] },
    "approval→completed": { from: "approval", to: "completed", requiredRoles: ["system"] }
  } as const
};

export function getILCWorkflow(): ILCWorkflowDefinition {
  return ILC_LEGAL_AID_WORKFLOW;
}

export type ILCWorkflowStepId = ILCWorkflowStep["id"];