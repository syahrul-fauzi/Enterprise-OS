// Canonical workflow gateway - consumes workflow-engine service to avoid static import cycles
// Mengikuti pola gateway lain (governance-read-gateway, governance-evidence-gateway)
// B6.9: Local structural type definitions to avoid static workflow-engine source inclusion
// Semantic shapes preserved exactly from canonical workflow-engine contracts
export interface WorkflowStepDefinition {
  readonly id: string;
  readonly kind: string;
  readonly description: string;
}

export interface WorkflowDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly requiredInputs: readonly string[];
  readonly steps: readonly WorkflowStepDefinition[];
}

export interface GetWorkflowDefinitionInput {
  readonly workflowId: string;
}

export type GetWorkflowDefinitionOutput = WorkflowDefinition | undefined;

export interface ExecuteWorkflowInput {
  readonly workflowId: string;
  readonly requirementId?: string;
  readonly runId?: string;
  readonly releaseId?: string;
  readonly limit?: number;
  readonly decision_id?: string;
  readonly productId?: string;
}

export interface WorkflowStepResult {
  readonly stepId: string;
  readonly kind: string;
  readonly status: string;
  readonly summary: string;
  readonly output?: Readonly<Record<string, unknown>>;
}

export interface WorkflowExecutionResult {
  readonly workflowId: string;
  readonly status: string;
  readonly steps: readonly WorkflowStepResult[];
  readonly output: Readonly<Record<string, unknown>>;
}

export type ExecuteWorkflowOutput = WorkflowExecutionResult;

export interface TraceExecutionsByDecisionInput {
  readonly decision_id: string;
}
export type TraceExecutionsByDecisionOutput = any;

export interface WorkflowEngineService {
  listWorkflowDefinitions(): readonly WorkflowDefinition[];
  getWorkflowDefinition(input: GetWorkflowDefinitionInput): GetWorkflowDefinitionOutput;
  executeWorkflow(input: ExecuteWorkflowInput): ExecuteWorkflowOutput;
  traceExecutionsByDecision(input: TraceExecutionsByDecisionInput): TraceExecutionsByDecisionOutput;
}

export class WorkflowReadGatewayService {
  constructor(
    private readonly provider: WorkflowEngineService = (globalThis as any).__EOS_CANONICAL_WORKFLOW_ENGINE_SERVICE__,
  ) {}

  listWorkflowDefinitions() {
    return this.provider.listWorkflowDefinitions();
  }

  getWorkflowDefinition(input: GetWorkflowDefinitionInput) {
    return this.provider.getWorkflowDefinition(input);
  }

  executeWorkflow(input: ExecuteWorkflowInput) {
    return this.provider.executeWorkflow(input);
  }

  traceExecutionsByDecision(input: TraceExecutionsByDecisionInput) {
    return this.provider.traceExecutionsByDecision(input);
  }
}

export const workflowReadGatewayService = new WorkflowReadGatewayService();

// B6.9: Runtime-only canonical provider binding (loaded via separate runtime loader, no static import)
// Import dihilangkan untuk menghindari source inclusion workflow-engine ke compilation graph api-platform
// Provider diisi oleh runtime EOS yang memuat workflow-engine sebelum api-platform
(globalThis as any).__EOS_CANONICAL_WORKFLOW_ENGINE_SERVICE__ = (globalThis as any).__EOS_CANONICAL_WORKFLOW_ENGINE_SERVICE__ || {
  listWorkflowDefinitions: () => [],
  getWorkflowDefinition: () => undefined,
  executeWorkflow: () => { throw new Error("Workflow engine not available - runtime loader not executed"); },
  traceExecutionsByDecision: () => [],
};