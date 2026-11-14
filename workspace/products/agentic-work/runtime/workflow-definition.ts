// @ts-nocheck
import type { WorkflowStep, WorkflowDefinition } from "../../../packages/core/kernel/src/registry/capability-command-registry.ts";

// Domain type alias only (preserves type safety without vertical-specific interface)
export type AgenticWorkflowStep = WorkflowStep;
export type AgenticWorkflowDefinition = WorkflowDefinition;

export const AGENTIC_WORK_WORKFLOW: WorkflowDefinition = {
  id: "agentic-work-business-launch",
  productId: "agentic-work",
  label: "Work Created → Requirements → Provider Selected → Composition → AI+Human Execution → Economic Report → Archived",
  // CORE-001: 5 EXPLICIT BOUNDARIES IMPLEMENTED (ALIGNED WITH ILC/LawyersHub STANDARD)
  identityBoundary: {
    tenantId: "tenant-agentic-work-001",
    organizationId: "org-agentic-work-001",
    authorizedActors: ["customer", "work-owner", "project-manager", "ai-agent", "human-professional", "system"]
  },
  semanticBoundary: {
    domain: "agentic-orchestration",
    primaryIntent: "Execute business launch work with mixed human+AI execution providers",
    workType: "business-launch",
    requirements: ["dynamic-provider-selection", "cross-actor-composition", "economic-reporting", "evidence-preservation"]
  },
  authorityBoundary: {
    requiredCapabilities: ["work-core.create", "atomic-composition.define", "agent-orchestration.select", "work-core.markCompleted", "governance-evidence.archive"],
    policyIds: ["agentic-work-data-privacy", "cross-actor-execution-policy"],
    delegable: true,
    approvalThreshold: 1
  },
  executionBoundary: {
    workspaceId: "workspace-agentic-work.anonymous",
    runtimeEnvironment: "production",
    assignedActors: ["system", "ai-agent", "human-professional", "work-owner"],
    externalSystemIds: ["paperclip-provider", "ruflo-provider", "default-execution-engine"],
    executionFrame: "constrained-gui"
  },
  presentationBoundary: {
    supportedFaces: ["human", "agent", "api"],
    defaultLayout: "agentic-work-dashboard",
    mobileEnabled: true,
    apiEnabled: true
  },
  productRef: "product-agentic-work-001",
  caseRef: "case-business-launch-template",
  initialStep: "work-created",
  terminalStep: "work-archived",
  steps: [
    {
      id: "work-created",
      label: "Work Created",
      capability: "work-core",
      command: "work.create",
      description: "Create new work item and anchor identity in core work system.",
      requiredRoles: ["customer", "work-owner"]
    },
    {
      id: "requirements-defined",
      label: "Requirements Defined",
      capability: "atomic-composition",
      command: "requirements.define",
      description: "Define all capability requirements for work completion.",
      requiredRoles: ["work-owner", "project-manager"]
    },
    {
      id: "provider-selected",
      label: "Execution Provider Selected",
      capability: "agent-orchestration",
      command: "provider.select",
      description: "Dynamically select execution provider (Paperclip/Ruflo/Default) based on work complexity. Stores selection metadata (provider, reason, timestamp) to Work.metadata for audit trail.",
      requiredRoles: ["system"]
    },
    {
      id: "composition-executed",
      label: "Team Composed",
      capability: "atomic-composition",
      command: "composition.execute",
      description: "Atomic composition engine matches requirements to available actors.",
      requiredRoles: ["system"]
    },
    {
      id: "assignments-distributed",
      label: "Assignments Distributed",
      capability: "atomic-composition",
      command: "bindings.create",
      description: "WorkBindings created and distributed to all assigned actors (human+AI).",
      requiredRoles: ["system"]
    },
    {
      id: "ai-tasks-executing",
      label: "AI Tasks Executing",
      capability: "ai-agent-execution",
      command: "ai.executeTasks",
      description: "AI agents autonomously execute their assigned capabilities.",
      requiredRoles: ["ai-agent"]
    },
    {
      id: "human-tasks-executing",
      label: "Human Tasks Executing",
      capability: "work-execution",
      command: "human.executeTasks",
      description: "Human professionals execute complex/strategic assignments.",
      requiredRoles: ["human-professional"]
    },
    {
      id: "all-completed",
      label: "All Tasks Completed",
      capability: "work-core",
      command: "work.markCompleted",
      description: "All work requirements fulfilled, all actors report completion.",
      requiredRoles: ["system"]
    },
    {
      id: "economic-report-generated",
      label: "Economic Report Generated",
      capability: "atomic-composition",
      command: "economic.generateReport",
      description: "Layer3 economic engine generates cost breakdown and value analysis.",
      requiredRoles: ["system"]
    },
    {
      id: "work-archived",
      label: "Work Archived",
      capability: "governance-evidence",
      description: "Work archived with complete evidence chain for audit and compliance.",
      requiredRoles: ["system"]
    }
  ] as const,
  transitions: {
    "work-created→requirements-defined": { from: "work-created", to: "requirements-defined", requiredRoles: ["work-owner"] },
    "requirements-defined→provider-selected": { from: "requirements-defined", to: "provider-selected", requiredRoles: ["system"] },
    "provider-selected→composition-executed": { from: "provider-selected", to: "composition-executed", requiredRoles: ["system"] },
    "composition-executed→assignments-distributed": { from: "composition-executed", to: "assignments-distributed", requiredRoles: ["system"] },
    "assignments-distributed→ai-tasks-executing": { from: "assignments-distributed", to: "ai-tasks-executing", requiredRoles: ["system"] },
    "assignments-distributed→human-tasks-executing": { from: "assignments-distributed", to: "human-tasks-executing", requiredRoles: ["system"] },
    "ai-tasks-executing→all-completed": { from: "ai-tasks-executing", to: "all-completed", requiredRoles: ["system"] },
    "human-tasks-executing→all-completed": { from: "human-tasks-executing", to: "all-completed", requiredRoles: ["human-professional"] },
    "all-completed→economic-report-generated": { from: "all-completed", to: "economic-report-generated", requiredRoles: ["system"] },
    "economic-report-generated→work-archived": { from: "economic-report-generated", to: "work-archived", requiredRoles: ["system"] }
  } as const
};

export function getAgenticWorkflow(): WorkflowDefinition {
  return AGENTIC_WORK_WORKFLOW;
}

export type HumanAICollabWorkflowStepId = WorkflowStep["id"];