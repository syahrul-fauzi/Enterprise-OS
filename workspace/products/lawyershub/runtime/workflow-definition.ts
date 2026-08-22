export interface LawyersHubWorkflowStep {
  readonly id: "case" | "document" | "review" | "approval" | "payment";
  readonly label: string;
  readonly capability: string;
  readonly command?: string;
  readonly description: string;
}

export interface LawyersHubWorkflowDefinition {
  readonly id: "lawyershub-case-to-payment";
  readonly productId: "lawyershub";
  readonly label: string;
  readonly steps: readonly LawyersHubWorkflowStep[];
}

export const LAWYERSHUB_WORKFLOW: LawyersHubWorkflowDefinition = {
  id: "lawyershub-case-to-payment",
  productId: "lawyershub",
  label: "Case → Document → Review → Approval → Payment",
  steps: [
    {
      id: "case",
      label: "Case",
      capability: "legal-case",
      command: "case.create",
      description: "Open a case and anchor the Work identity.",
    },
    {
      id: "document",
      label: "Document",
      capability: "legal-document",
      command: "document.create",
      description: "Draft and attach documents to the Work.",
    },
    {
      id: "review",
      label: "Review",
      capability: "consultation",
      command: "review.submit",
      description: "Lawyer reviews documents and Work context.",
    },
    {
      id: "approval",
      label: "Approval",
      capability: "governance-approval",
      command: "approval.request",
      description: "Client or reviewer approves the Work state.",
    },
    {
      id: "payment",
      label: "Payment",
      capability: "legal-payment",
      command: "payment.initiate",
      description: "Settle payment for completed Work.",
    },
  ] as const,
};

export function getLawyersHubWorkflow(): LawyersHubWorkflowDefinition {
  return LAWYERSHUB_WORKFLOW;
}

export type LawyersHubWorkflowStepId = LawyersHubWorkflowStep["id"];
