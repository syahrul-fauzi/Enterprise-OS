import type {
  AutomationExecutionPlan,
  AutomationExecutionRequest,
  AutomationExecutionResult,
} from "../models/automation.js";

export interface AutomationExecutor {
  dryRun(input: AutomationExecutionRequest): Promise<AutomationExecutionPlan>;
  execute(
    input: AutomationExecutionRequest,
  ): Promise<AutomationExecutionResult>;
  explain(input: {
    readonly decision_reference: AutomationExecutionRequest["decision_reference"];
  }): Promise<AutomationExecutionPlan>;
}
