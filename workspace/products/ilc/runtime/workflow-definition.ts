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
  // 5 BOUNDARY MAPPINGS (mandat EOS High-Value Work - aligned with core-kernel definition)
  tenantId: "tenant-ilc-001",              // ① Identity Boundary: Tenant ownership
  domain: "institutional",                // ② Semantic Boundary: Domain classification
  executionFrame: "proxy",                 // ④ Execution Boundary: CMBCD mechanism
  presentationConfig: {                    // ⑤ Presentation Boundary: FACE projection
    supportedFaces: ["human", "agent", "api"],
    defaultLayout: "institutional-dashboard"
  },
  // High-Value Work Graph Semantic References
  productRef: "product-ilc-001",           // Product node reference
  caseRef: "case-institutional-coordination-template", // Case template reference
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