// @ts-nocheck
import type { WorkflowStep, WorkflowDefinition } from "@repo/core-kernel";

// Domain type alias only (preserves type safety without vertical-specific interface)
export type ILCWorkflowStep = WorkflowStep;
export type ILCWorkflowDefinition = WorkflowDefinition;

export const ILC_WORKFLOW: WorkflowDefinition = {
  id: "ilc-institutional-coordination",
  productId: "ilc",
  label: "Institutional Need → Submission → Review → Authorization → Execution → Delivery → Completion",
  initialStep: "institutional-need-submitted",
  terminalStep: "institutional-outcome-delivered",
  steps: [
    {
      id: "institutional-need-submitted",
      label: "Institutional Need Submitted",
      capability: "requirement-management",
      command: "requirement.create",
      description: "Formal institutional requirement captured and registered in the canonical work lifecycle.",
      requiredRoles: ["institutional-representative", "authorized-user"]
    },
    {
      id: "review-initiated",
      label: "Departmental Review Initiated",
      capability: "workflow-engine",
      command: "workflow.transition",
      description: "Departmental heads begin review of the institutional initiative.",
      requiredRoles: ["department-head", "executive-authority"]
    },
    {
      id: "authorized-for-execution",
      label: "Executive Authorization Granted",
      capability: "governance-evidence",
      command: "evidence.recordApproval",
      description: "Executive authority has approved execution of the institutional initiative.",
      requiredRoles: ["executive-authority"]
    },
    {
      id: "project-execution",
      label: "Project Execution Active",
      capability: "workflow-engine",
      command: "workflow.updateStatus",
      description: "Project team is executing on the approved institutional initiative.",
      requiredRoles: ["project-manager", "authorized-executor"]
    },
    {
      id: "outcome-documented",
      label: "Institutional Outcome Documented",
      capability: "document-management",
      command: "document.uploadOutcome",
      description: "All deliverables and outcomes have been documented and archived.",
      requiredRoles: ["project-manager", "institutional-representative"]
    },
    {
      id: "institutional-outcome-delivered",
      label: "Institutional Outcome Delivered",
      capability: "governance-evidence",
      command: "evidence.finalize",
      description: "The institutional initiative has been successfully completed and all evidence is preserved.",
      requiredRoles: ["executive-authority", "institutional-representative"]
    }
  ],
  transitions: {
    "need-submitted→review": { from: "institutional-need-submitted", to: "review-initiated", requiredRoles: ["institutional-representative", "department-head"] },
    "review→authorized": { from: "review-initiated", to: "authorized-for-execution", requiredRoles: ["executive-authority"] },
    "authorized→execution": { from: "authorized-for-execution", to: "project-execution", requiredRoles: ["project-manager", "executive-authority"] },
    "execution→documented": { from: "project-execution", to: "outcome-documented", requiredRoles: ["project-manager"] },
    "documented→delivered": { from: "outcome-documented", to: "institutional-outcome-delivered", requiredRoles: ["executive-authority", "institutional-representative"] }
  }
};