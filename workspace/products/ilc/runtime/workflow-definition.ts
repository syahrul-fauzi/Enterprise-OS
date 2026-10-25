// @ts-nocheck
import type { WorkflowStep, WorkflowDefinition } from "@repo/core-kernel";

// Domain type alias only (preserves type safety without vertical-specific interface)
export type ILCWorkflowStep = WorkflowStep;
export type ILCWorkflowDefinition = WorkflowDefinition;
export type ACAWorkflowStep = WorkflowStep;
export type ACAWorkflowDefinition = WorkflowDefinition;

export const ILC_WORKFLOW: WorkflowDefinition = {
  id: "ilc-institutional-coordination",
  productId: "ilc",
  // 5 EXPLICIT BOUNDARIES (ALIGNED WITH CORE-KERNEL STANDARD)
  identityBoundary: {
    tenantId: "tenant-ilc-001",
    organizationId: "org-ilc-institutional-001",
    authorizedActors: ["institutional-representative", "department-head", "executive", "project-manager", "system"]
  },
  semanticBoundary: {
    domain: "institutional",
    primaryIntent: "Coordinate and execute institutional initiatives with dual approval workflow",
    workType: "institutional-coordination",
    requirements: ["departmental-approval", "executive-approval", "evidence-preservation", "work-continuity"]
  },
  authorityBoundary: {
    requiredCapabilities: ["requirement-management.create", "requirement-management.approve", "requirement-management.startDelivery", "requirement-management.markImplemented", "requirement-management.verify"],
    policyIds: ["ilc-institutional-governance-policy", "evidence-chain-integrity-policy"],
    delegable: true,
    approvalThreshold: 2
  },
  executionBoundary: {
    workspaceId: "workspace-ilc-institutional.anonymous",
    runtimeEnvironment: "production",
    assignedActors: ["system", "institutional-representative", "project-manager"],
    externalSystemIds: [],
    executionFrame: "constrained-gui"
  },
  presentationBoundary: {
    supportedFaces: ["human", "agent", "api"],
    defaultLayout: "institutional-dashboard",
    mobileEnabled: true,
    apiEnabled: true
  },
  // High-Value Work Graph Semantic References
  productRef: "product-ilc-001",
  caseRef: "case-institutional-coordination-template",
  label: "Institutional Need → Requirements Analyzed → Actors Composed → First Approval → Second Approval → Execution Initiated → Outcome Delivered → Work Closed",
  initialStep: "institutional-need-submitted",
  terminalStep: "institutional-work-closed",
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
      id: "requirements-analyzed",
      label: "Requirements Analysis Complete",
      capability: "requirement-management",
      command: "requirement.update",
      description: "All institutional requirements analyzed and documented (core-kernel aligned).",
      requiredRoles: ["system", "automated"]
    },
    {
      id: "actors-composed",
      label: "Multi-Actor Team Composed",
      capability: "requirement-management",
      command: "requirement.update",
      description: "Cross-role actor matrix assigned to execute work (core-kernel aligned).",
      requiredRoles: ["institutional-representative", "project-manager"]
    },
    {
      id: "first-approval",
      label: "Departmental Approval",
      capability: "requirement-management",
      command: "requirement.approve",
      description: "First-level departmental authority signs off (core-kernel aligned).",
      requiredRoles: ["department-head", "authorized-approver"]
    },
    {
      id: "second-approval",
      label: "Executive Approval",
      capability: "requirement-management",
      command: "requirement.approve",
      description: "Executive-level institutional approval obtained (core-kernel aligned).",
      requiredRoles: ["executive", "institutional-authority"]
    },
    {
      id: "execution-initiated",
      label: "Execution Initiated",
      capability: "requirement-management",
      command: "requirement.startDelivery",
      description: "Formal execution phase begins after all approvals (core-kernel aligned).",
      requiredRoles: ["project-manager", "execution-lead"]
    },
    {
      id: "outcome-delivered",
      label: "Institutional Outcome Delivered",
      capability: "requirement-management",
      command: "requirement.markImplemented",
      description: "All execution tasks completed, institutional objective achieved (core-kernel aligned).",
      requiredRoles: ["project-manager", "execution-lead"]
    },
    {
      id: "institutional-work-closed",
      label: "Work Closed & Archived",
      capability: "requirement-management",
      command: "requirement.verify",
      description: "Institutional work formally closed with complete evidence chain (core-kernel aligned).",
      requiredRoles: ["institutional-representative", "system"]
    }
  ],
  transitions: {
    "submitted-to-analyzed": {
      requiredRoles: ["system", "automated"],
      from: "institutional-need-submitted",
      to: "requirements-analyzed"
    },
    "analyzed-to-composed": {
      requiredRoles: ["system", "automated"],
      from: "requirements-analyzed",
      to: "actors-composed"
    },
    "composed-to-first-approval": {
      requiredRoles: ["department-head", "authorized-approver"],
      from: "actors-composed",
      to: "first-approval"
    },
    "first-to-second-approval": {
      requiredRoles: ["executive", "institutional-authority"],
      from: "first-approval",
      to: "second-approval"
    },
    "approved-to-execution": {
      requiredRoles: ["project-manager", "execution-lead"],
      from: "second-approval",
      to: "execution-initiated"
    },
    "execution-to-outcome": {
      requiredRoles: ["project-manager", "execution-lead"],
      from: "execution-initiated",
      to: "outcome-delivered"
    },
    "outcome-to-closed": {
      requiredRoles: ["institutional-representative", "system"],
      from: "outcome-delivered",
      to: "institutional-work-closed"
    }
  }
};

export const ACA_WORKFLOW: WorkflowDefinition = {
  id: "aca-academic-certification",
  productId: "ilc",
  // 5 BOUNDARY MAPPINGS (reused from ILC, adapted for academic domain - CORE-001 compliant)
  // ① Identity Boundary (explicit structure per isValidWorkflowDefinition requirement)
  identityBoundary: {
    tenantId: "tenant-aca-001",
    organizationId: "org-journal-peer-review-001",
    authorizedActors: ["academic-author", "journal-reviewer", "certification-body", "authorized-user"]
  },
  // ② Semantic Boundary (explicit structure per isValidWorkflowDefinition requirement)
  semanticBoundary: {
    domain: "academic-certification",
    primaryIntent: "Certify academic paper peer review process with full evidence chain",
    workType: "certification-workflow",
    requirements: ["peer-review-evidence", "certification-approval", "author-notification"]
  },
  // ③ Authority Boundary (explicit structure per isValidWorkflowDefinition requirement)
  authorityBoundary: {
    requiredCapabilities: ["requirement-management", "workflow-engine", "governance-evidence"],
    policyIds: ["academic-certification-policy-001"],
    delegable: false,
    approvalThreshold: 1
  },
  // ④ Execution Boundary (explicit structure per isValidWorkflowDefinition requirement)
  executionBoundary: {
    workspaceId: "workspace-aca-journal-001",
    runtimeEnvironment: "proxy",
    assignedActors: ["journal-reviewer-001", "certification-body-001"],
    externalSystemIds: ["journal-submission-platform-001"],
    executionFrame: "proxy"
  },
  // ⑤ Presentation Boundary (explicit structure per isValidWorkflowDefinition requirement)
  presentationBoundary: {
    supportedFaces: ["human", "agent", "api"],
    defaultLayout: "academic-dashboard",
    mobileEnabled: true,
    apiEnabled: true
  },
  // High-Value Work Graph Semantic References
  productRef: "product-ilc-001",           // Product node reference (reused ILC product)
  caseRef: "case-academic-certification-template", // New case template for academic domain
  label: "Paper Submitted → Peer Review → Certification Pending → Certification Granted",
  initialStep: "paper-submitted",
  terminalStep: "certification-granted",
  steps: [
    {
      id: "paper-submitted",
      label: "Academic Paper Submitted",
      capability: "requirement-management",
      command: "requirement.create",
      description: "Formal paper submission captured and registered in the canonical work lifecycle.",
      requiredRoles: ["academic-author", "authorized-user"]
    },
    {
      id: "review-initiated",
      label: "Peer Review Initiated",
      capability: "workflow-engine",
      command: "workflow.transition",
      description: "Journal reviewers begin review of the submitted academic paper.",
      requiredRoles: ["journal-reviewer", "academic-author"]
    },
    {
      id: "certification-pending",
      label: "Certification Pending",
      capability: "governance-evidence",
      command: "evidence.recordApproval",
      description: "Peer review complete, paper awaiting final certification.",
      requiredRoles: ["certification-body"]
    },
    {
      id: "certification-granted",
      label: "Academic Certification Granted",
      capability: "governance-evidence",
      command: "evidence.finalize",
      description: "Paper has been successfully certified and all evidence is preserved.",
      requiredRoles: ["certification-body", "academic-author"]
    }
  ],
  transitions: {
    "submitted→review": { from: "paper-submitted", to: "review-initiated", requiredRoles: ["academic-author", "journal-reviewer"] },
    "review→certification": { from: "review-initiated", to: "certification-pending", requiredRoles: ["journal-reviewer"] },
    "certification→granted": { from: "certification-pending", to: "certification-granted", requiredRoles: ["certification-body", "academic-author"] }
  }
};