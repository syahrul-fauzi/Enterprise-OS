import type { WorkflowStep, WorkflowDefinition } from "@repo/core-kernel";

export const WORDPRESS_BUSINESS_WORKFLOW: WorkflowDefinition = {
  id: "wordpress-universal-execution",
  productId: "wordpress-fix",
  label: "Report → Triage → Diagnose → Fix → Test → Deploy → Verify → Completed",
  initialStep: "report",
  terminalStep: "completed",
  steps: [
    {
      id: "report",
      label: "Issue Report",
      capability: "incident-management",
      command: "incident.create",
      description: "Submit website/WordPress issue with logs, URLs, and error details.",
      requiredRoles: ["site-owner", "content-manager"]
    },
    {
      id: "triage",
      label: "Triage Prioritization",
      capability: "workflow-engine",
      command: "workflow.transition",
      description: "Assess severity, classify issue type (plugin/theme/core/hosting).",
      requiredRoles: ["devops-engineer", "tech-lead"]
    },
    {
      id: "diagnose",
      label: "Root Cause Diagnose",
      capability: "observability",
      command: "observability.analyze",
      description: "Analyze logs, server metrics, and reproduce issue to find root cause.",
      requiredRoles: ["sre", "wordpress-developer"]
    },
    {
      id: "fix",
      label: "Implement Fix",
      capability: "requirement-management",
      command: "requirement.resolve",
      description: "Develop and stage fix for the identified root cause.",
      requiredRoles: ["wordpress-developer", "devops"]
    },
    {
      id: "test",
      label: "Staging Validation",
      capability: "governance-approval",
      command: "approval.request",
      description: "Test fix in staging environment to verify resolution and no regression.",
      requiredRoles: ["qa-engineer", "site-owner"]
    },
    {
      id: "deploy",
      label: "Production Deployment",
      capability: "web-deployment",
      command: "deployment.execute",
      description: "Deploy validated fix to production environment.",
      requiredRoles: ["devops-engineer", "sre"]
    },
    {
      id: "verify",
      label: "Post-Deployment Monitoring",
      capability: "observability",
      command: "observability.monitor",
      description: "Monitor production health, uptime, and issue recurrence for 72 hours.",
      requiredRoles: ["sre", "system"]
    },
    {
      id: "completed",
      label: "Work Completed",
      capability: "governance-evidence",
      command: "evidence.archive",
      description: "Archive all logs, fix details, and evidence to close the work.",
      requiredRoles: ["system"]
    }
  ] as const,
  transitions: {
    "report→triage": { from: "report", to: "triage", requiredRoles: ["tech-lead", "devops-engineer"] },
    "triage→diagnose": { from: "triage", to: "diagnose", requiredRoles: ["wordpress-developer", "sre"] },
    "diagnose→fix": { from: "diagnose", to: "fix", requiredRoles: ["wordpress-developer", "devops"] },
    "fix→test": { from: "fix", to: "test", requiredRoles: ["qa-engineer", "site-owner"] },
    "test→deploy": { from: "test", to: "deploy", requiredRoles: ["devops-engineer", "sre"] },
    "deploy→verify": { from: "deploy", to: "verify", requiredRoles: ["sre", "system"] },
    "verify→completed": { from: "verify", to: "completed", requiredRoles: ["system"] }
  } as const
};