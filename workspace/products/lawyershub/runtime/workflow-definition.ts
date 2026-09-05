// @ts-nocheck
import type { WorkflowStep, WorkflowDefinition } from "@repo/core-kernel";

// Domain type alias only (preserves type safety without vertical-specific interface)
export type LawyersHubWorkflowStep = WorkflowStep;
export type LawyersHubWorkflowDefinition = WorkflowDefinition;

export const LAWYERSHUB_WORKFLOW: WorkflowDefinition = {
  id: "lawyershub-case-to-payment",
  productId: "lawyershub",
  label: "Case Filed → Documentation → External Response → Inspection → Review → Approval → Payment → Completion",
  initialStep: "case",
  terminalStep: "completed",
  steps: [
    {
      id: "case",
      label: "Legal Case Opened",
      capability: "legal-case",
      command: "legal.createCase",
      description: "Create new legal case in lawyershub workflow.",
      requiredRoles: ["client", "attorney"]
    },
    {
      id: "document",
      label: "Case Documentation Complete",
      capability: "legal-document",
      command: "legal.uploadDocuments",
      description: "All required case documents uploaded and indexed.",
      requiredRoles: ["paralegal", "attorney"]
    },
    {
      id: "external-response",
      label: "External Parties Notified",
      capability: "legal-case",
      command: "legal.notifyOpposing",
      description: "Opposing counsel or parties notified per legal requirements.",
      requiredRoles: ["attorney"]
    },
    {
      id: "inspection",
      label: "Evidence Inspection Complete",
      capability: "legal-document",
      command: "legal.inspectEvidence",
      description: "All evidence reviewed for admissibility and completeness.",
      requiredRoles: ["attorney", "forensic-expert"]
    },
    {
      id: "review",
      label: "Case Review Complete",
      capability: "legal-case",
      command: "legal.reviewCase",
      description: "Senior attorney completes case strategy review.",
      requiredRoles: ["senior-partner"]
    },
    {
      id: "approval",
      label: "Settlement/Resolution Approved",
      capability: "governance-approval",
      command: "governance.approveSettlement",
      description: "Settlement terms or court judgment approved by all parties.",
      requiredRoles: ["client", "attorney"]
    },
    {
      id: "payment",
      label: "Legal Fees Paid",
      capability: "legal-payment",
      command: "legal.processPayment",
      description: "Legal fees and expenses processed and reconciled.",
      requiredRoles: ["client", "finance"]
    },
    {
      id: "completed",
      label: "Case Completed & Archived",
      capability: "governance-evidence",
      description: "Case archived with full evidence chain for legal compliance.",
      requiredRoles: ["system"]
    }
  ] as const,
  transitions: {
    "case→document": { from: "case", to: "document", requiredRoles: ["attorney"] },
    "document→external-response": { from: "document", to: "external-response", requiredRoles: ["attorney"] },
    "external-response→inspection": { from: "external-response", to: "inspection", requiredRoles: ["attorney"] },
    "inspection→review": { from: "inspection", to: "review", requiredRoles: ["forensic-expert"] },
    "review→approval": { from: "review", to: "approval", requiredRoles: ["senior-partner"] },
    "approval→payment": { from: "approval", to: "payment", requiredRoles: ["client"] },
    "payment→completed": { from: "payment", to: "completed", requiredRoles: ["finance"] }
  } as const
};

export function getLawyersHubWorkflow(): WorkflowDefinition {
  return LAWYERSHUB_WORKFLOW;
}

export type LawyersHubWorkflowStepId = WorkflowStep["id"];