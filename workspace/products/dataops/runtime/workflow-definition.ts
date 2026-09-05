import type { WorkflowStep, WorkflowDefinition } from "@repo/core-kernel";

export const DATAOPS_BUSINESS_WORKFLOW: WorkflowDefinition = {
  id: "dataops-universal-execution",
  productId: "dataops",
  label: "Input → Validation → Processing → Review → Approval → Execution → Monitoring → Completed",
  initialStep: "input",
  terminalStep: "completed",
  steps: [
    {
      id: "input",
      label: "Data Input",
      capability: "requirement-management",
      command: "requirement.create",
      description: "Submit data operation request and anchor Work identity.",
      requiredRoles: ["data-engineer", "ops-analyst"]
    },
    {
      id: "validation",
      label: "Schema Validation",
      capability: "governance-approval",
      command: "approval.request",
      description: "Validate input data schema, format, and business rules compliance.",
      requiredRoles: ["data-quality-officer"]
    },
    {
      id: "processing",
      label: "Data Processing",
      capability: "data-processing",
      command: "processing.execute",
      description: "Run ETL/ELT pipeline or data transformation workload.",
      requiredRoles: ["system", "processor"]
    },
    {
      id: "review",
      label: "Output Review",
      capability: "work-inspection",
      description: "Inspect processing output quality and completeness.",
      requiredRoles: ["data-scientist", "ops-lead"]
    },
    {
      id: "approval",
      label: "Production Approval",
      capability: "governance-approval",
      command: "approval.approve",
      description: "Approve processed data for production deployment.",
      requiredRoles: ["engineering-manager"]
    },
    {
      id: "execution",
      label: "Production Execution",
      capability: "data-processing",
      command: "processing.promote",
      description: "Promote validated workload to production environment.",
      requiredRoles: ["system", "sre"]
    },
    {
      id: "monitoring",
      label: "Runtime Monitoring",
      capability: "observability",
      description: "Monitor production workload health, performance, and SLA compliance.",
      requiredRoles: ["sre", "system"]
    },
    {
      id: "completed",
      label: "Work Completed",
      capability: "governance-evidence",
      command: "evidence.archive",
      description: "Archive all execution evidence and mark work as complete.",
      requiredRoles: ["system"]
    }
  ] as const,
  transitions: {
    "input→validation": { from: "input", to: "validation", requiredRoles: ["data-quality-officer"] },
    "validation→processing": { from: "validation", to: "processing", requiredRoles: ["processor", "system"] },
    "processing→review": { from: "processing", to: "review", requiredRoles: ["data-scientist", "ops-lead"] },
    "review→approval": { from: "review", to: "approval", requiredRoles: ["engineering-manager"] },
    "approval→execution": { from: "approval", to: "execution", requiredRoles: ["sre", "system"] },
    "execution→monitoring": { from: "execution", to: "monitoring", requiredRoles: ["sre", "system"] },
    "monitoring→completed": { from: "monitoring", to: "completed", requiredRoles: ["system"] }
  } as const
};