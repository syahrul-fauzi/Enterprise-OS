import type {
  PolicyEvaluatorInput,
  PolicyEvaluatorOutput,
} from "../models/evaluation.js";

export interface EvaluatorPlugin {
  readonly evaluator_id: string;
  readonly evaluator_domain: string;
  version(): string;
  supports(input: {
    readonly scope?: PolicyEvaluatorInput["scope"];
  }): boolean | Promise<boolean>;
  evaluate(input: PolicyEvaluatorInput): Promise<PolicyEvaluatorOutput>;
}
