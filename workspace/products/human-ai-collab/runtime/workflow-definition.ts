import type { WorkflowStep, WorkflowDefinition } from "@repo/core-kernel";

export interface HumanAICollabWorkflowStep extends WorkflowStep {
  readonly id: "work-created" | "requirements-defined" | "composition-executed" | "assignments-distributed" | "ai-tasks-executing" | "human-tasks-executing" | "all-completed" | "economic-report-generated" | "work-archived";
}

export interface HumanAICollabWorkflowDefinition extends WorkflowDefinition {
  readonly id: "human-ai-business-launch";
  readonly productId: "human-ai-collab";
  readonly steps: readonly HumanAICollabWorkflowStep[];
}

export const HUMAN_AI_COLLAB_WORKFLOW: HumanAICollabWorkflowDefinition = {
  id: "human-ai-business-launch",
  productId: "human-ai-collab",
  label: "Work Created → Requirements → Composition → AI+Human Execution → Economic Report → Archived",
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
    "requirements-defined→composition-executed": { from: "requirements-defined", to: "composition-executed", requiredRoles: ["system"] },
    "composition-executed→assignments-distributed": { from: "composition-executed", to: "assignments-distributed", requiredRoles: ["system"] },
    "assignments-distributed→ai-tasks-executing": { from: "assignments-distributed", to: "ai-tasks-executing", requiredRoles: ["system"] },
    "assignments-distributed→human-tasks-executing": { from: "assignments-distributed", to: "human-tasks-executing", requiredRoles: ["system"] },
    "ai-tasks-executing→all-completed": { from: "ai-tasks-executing", to: "all-completed", requiredRoles: ["system"] },
    "human-tasks-executing→all-completed": { from: "human-tasks-executing", to: "all-completed", requiredRoles: ["human-professional"] },
    "all-completed→economic-report-generated": { from: "all-completed", to: "economic-report-generated", requiredRoles: ["system"] },
    "economic-report-generated→work-archived": { from: "economic-report-generated", to: "work-archived", requiredRoles: ["system"] }
  } as const
};

export function getHumanAICollabWorkflow(): HumanAICollabWorkflowDefinition {
  return HUMAN_AI_COLLAB_WORKFLOW;
}

export type HumanAICollabWorkflowStepId = HumanAICollabWorkflowStep["id"];