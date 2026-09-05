import type { WorkflowStep, WorkflowDefinition } from "@repo/core-kernel";

export const ADMIN_SUPPORT_WORKFLOW: WorkflowDefinition = {
  id: "admin-support-universal-execution",
  productId: "admin-support",
  label: "Ticket Created → Triage → Assign → Resolve → Verify → Close",
  initialStep: "ticket_created",
  terminalStep: "completed",
  steps: [
    {
      id: "ticket_created",
      label: "Support Ticket Created",
      capability: "connector-ecosystem",
      command: "connector.ingest",
      description: "External ticket imported from Zendesk/Intercom/own ticketing as canonical Work.",
      requiredRoles: ["system", "support-engineer"]
    },
    {
      id: "triage",
      label: "Ticket Triage",
      capability: "consultation",
      command: "consultation.classify",
      description: "Classify ticket type (IT/HR/Finance), set priority, and add missing fields.",
      requiredRoles: ["support-lead", "system"]
    },
    {
      id: "assign",
      label: "Team Assignment",
      capability: "workflow-engine",
      command: "workflow.transition",
      description: "Assign ticket to correct team (IT Support/HR/Finance) based on classification.",
      requiredRoles: ["support-lead", "system"]
    },
    {
      id: "resolve",
      label: "Issue Resolution",
      capability: "incident-management",
      command: "incident.resolve",
      description: "Team resolves the issue, documents solution, and updates ticket status.",
      requiredRoles: ["it-support", "hr-admin", "finance-admin"]
    },
    {
      id: "verify",
      label: "Customer Verification",
      capability: "governance-approval",
      command: "approval.confirm",
      description: "Requester verifies resolution is complete and issue is fully resolved.",
      requiredRoles: ["requester", "support-engineer"]
    },
    {
      id: "completed",
      label: "Ticket Closed",
      capability: "governance-evidence",
      command: "evidence.archive",
      description: "Archive all ticket logs, solution, and evidence to close the Work.",
      requiredRoles: ["system"]
    }
  ] as const,
  transitions: {
    "ticket_created→triage": { from: "ticket_created", to: "triage", requiredRoles: ["support-lead", "system"] },
    "triage→assign": { from: "triage", to: "assign", requiredRoles: ["support-lead", "system"] },
    "assign→resolve": { from: "assign", to: "resolve", requiredRoles: ["it-support", "hr-admin", "finance-admin"] },
    "resolve→verify": { from: "resolve", to: "verify", requiredRoles: ["requester", "support-engineer"] },
    "verify→completed": { from: "verify", to: "completed", requiredRoles: ["system"] }
  } as const
};