import type {
  DecisionEngineInput,
  DecisionSynthesis,
} from "../models/decision.js";

export interface PolicyEngine {
  evaluate(input: DecisionEngineInput): Promise<DecisionSynthesis>;
  merge(input: DecisionEngineInput): Promise<DecisionSynthesis>;
  materialize(input: DecisionSynthesis): Promise<DecisionSynthesis>;
}
