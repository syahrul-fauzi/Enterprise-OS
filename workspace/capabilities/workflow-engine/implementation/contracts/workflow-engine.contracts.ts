export type WorkflowExecutionStatus = "passed" | "failed" | "skipped";
export type WorkflowStepStatus = WorkflowExecutionStatus | "requires_human";

export type WorkflowStepKind =
  | "input.validate"
  | "requirement.get"
  | "requirement.assess"
  | "requirement.update"
  | "traceability.get"
  | "traceability.assess"
  | "evidence.search"
  | "evidence.assess"
  | "verification.assess"
  | "ai.analyze"
  | "ai.investigate"
  | "posture.assess"
  | "result.validate";

export interface WorkflowStepDefinition {
  readonly id: string;
  readonly kind: WorkflowStepKind;
  readonly description: string;
}

export interface WorkflowDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly requiredInputs: readonly string[];
  readonly steps: readonly WorkflowStepDefinition[];
}

export interface WorkflowDefinitionRepository {
  readonly entityName: "WorkflowDefinition";
  readonly kind: "repository";
  list(): readonly WorkflowDefinition[];
  byId(id: string): WorkflowDefinition | undefined;
}

export interface WorkflowExecutionInput {
  readonly workflowId: string;
  readonly requirementId?: string;
  readonly runId?: string;
  readonly releaseId?: string;
  readonly limit?: number;
}

export interface WorkflowStepResult {
  readonly stepId: string;
  readonly kind: WorkflowStepKind;
  readonly status: WorkflowStepStatus;
  readonly summary: string;
  readonly output?: Readonly<Record<string, unknown>>;
}

export interface WorkflowExecutionResult {
  readonly workflowId: string;
  readonly status: WorkflowExecutionStatus;
  readonly steps: readonly WorkflowStepResult[];
  readonly output: Readonly<Record<string, unknown>>;
}

export interface GetWorkflowDefinitionInput {
  readonly workflowId: string;
}

export type GetWorkflowDefinitionOutput = WorkflowDefinition | undefined;

export interface ExecuteWorkflowInput extends WorkflowExecutionInput {}

export type ExecuteWorkflowOutput = WorkflowExecutionResult;
