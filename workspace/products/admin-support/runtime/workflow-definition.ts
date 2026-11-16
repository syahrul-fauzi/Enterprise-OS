export const workflowDefinition = {
  label: "Ticket Support Lifecycle: Created → Triage → Assign → Resolve → Verify → Close",
  steps: [
    { id: "ticket_created", label: "Support Ticket Created", capability: "connector-ecosystem" },
    { id: "triage", label: "Ticket Triage", capability: "consultation" },
    { id: "assign", label: "Team Assignment", capability: "workflow-engine" },
    { id: "resolve", label: "Issue Resolution", capability: "incident-management" },
    { id: "verify", label: "Customer Verification", capability: "governance-approval" },
    { id: "completed", label: "Ticket Closed", capability: "governance-evidence" }
  ],
  transitions: [
    { from: "ticket_created", to: "triage" },
    { from: "triage", to: "assign" },
    { from: "assign", to: "resolve" },
    { from: "resolve", to: "verify" },
    { from: "verify", to: "completed" }
  ]
};