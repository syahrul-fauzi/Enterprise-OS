export type OrchestrationPlanStatus =
  | "ready"
  | "running"
  | "completed"
  | "failed";

export interface OrchestrationWorkItem {
  readonly id: string;
  readonly workflowId: string;
  readonly agentRole: string;
  readonly description: string;
  readonly defaultInputs: Readonly<Record<string, unknown>>;
}

export interface OrchestrationPlan {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: OrchestrationPlanStatus;
  readonly workItems: readonly OrchestrationWorkItem[];
}

export interface OrchestrationPlanRepository {
  readonly entityName: "OrchestrationPlan";
  readonly kind: "repository";
  list(): readonly OrchestrationPlan[];
  byId(id: string): OrchestrationPlan | undefined;
}

export interface DispatchOrchestrationInput {
  readonly planId: string;
  readonly inputs?: Readonly<Record<string, unknown>>;
}

export interface OrchestrationDispatchStep {
  readonly workItemId: string;
  readonly workflowId: string;
  readonly agentRole: string;
  readonly status: "passed" | "failed";
  readonly summary: string;
  readonly output?: Readonly<Record<string, unknown>>;
}

export interface OrchestrationDispatchResult {
  readonly planId: string;
  readonly status: OrchestrationPlanStatus;
  readonly steps: readonly OrchestrationDispatchStep[];
  readonly output: Readonly<Record<string, unknown>>;
}

export interface GetOrchestrationPlanInput {
  readonly planId: string;
}

export type GetOrchestrationPlanOutput = OrchestrationPlan | undefined;
