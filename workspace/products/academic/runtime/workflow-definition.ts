export const workflowDefinition = {
  label: "Academic Program Lifecycle: Proposal → Review → Approval → Implementation → Assessment → Certification",
  steps: [
    { id: "proposal_submitted", label: "Program Proposal Submitted", capability: "requirement-management" },
    { id: "peer_review_initiated", label: "Peer Review Initiated", capability: "workflow-engine" },
    { id: "departmental_approval", label: "Departmental Approval", capability: "governance-approval" },
    { id: "implementation_started", label: "Program Implementation Started", capability: "work-execution" },
    { id: "assessment_completed", label: "Program Assessment Completed", capability: "observability" },
    { id: "certification_granted", label: "Academic Certification Granted", capability: "governance-evidence" }
  ],
  transitions: [
    { from: "proposal_submitted", to: "peer_review_initiated" },
    { from: "peer_review_initiated", to: "departmental_approval" },
    { from: "departmental_approval", to: "implementation_started" },
    { from: "implementation_started", to: "assessment_completed" },
    { from: "assessment_completed", to: "certification_granted" }
  ]
};