import type { PolicyEvaluatorInput } from "../models/evaluation.js";
import type { EvaluatorPlugin } from "../plugins/evaluator-plugin.js";

export interface EvaluatorRegistry {
  list(): Promise<readonly EvaluatorPlugin[]> | readonly EvaluatorPlugin[];
  resolve(input: {
    readonly scope?: PolicyEvaluatorInput["scope"];
  }): Promise<readonly EvaluatorPlugin[]> | readonly EvaluatorPlugin[];
}
