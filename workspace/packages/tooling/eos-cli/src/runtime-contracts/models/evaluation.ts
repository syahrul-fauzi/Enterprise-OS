import { z } from "zod";

import {
  DeepReadonly,
  EvaluationStatusSchema,
  FactReferenceSchema,
  RuntimeIdentifierSchema,
  RuntimeTimestampSchema,
} from "./shared.js";
import {
  EnterpriseControlGraphReferenceSchema,
  EnterpriseControlGraphSnapshotSchema,
} from "./graph.js";

export const PolicyEvaluationFindingSchema = z
  .object({
    finding_id: RuntimeIdentifierSchema,
    severity: z.enum(["INFO", "WARN", "FAIL"]),
    code: RuntimeIdentifierSchema,
    message: z.string().min(1),
    fact_refs: z.array(FactReferenceSchema).default([]),
  })
  .strict();

export const PolicyRuleResultSchema = z
  .object({
    policy_id: RuntimeIdentifierSchema,
    rule_id: RuntimeIdentifierSchema,
    status: EvaluationStatusSchema,
    reason_codes: z.array(RuntimeIdentifierSchema).default([]),
  })
  .strict();

export const PolicyEvaluatorInputSchema = z
  .object({
    graph_snapshot: EnterpriseControlGraphSnapshotSchema,
    scope: FactReferenceSchema.optional(),
    requested_at: RuntimeTimestampSchema,
  })
  .strict();

export const PolicyEvaluatorOutputSchema = z
  .object({
    evaluation_id: RuntimeIdentifierSchema,
    evaluator_id: RuntimeIdentifierSchema,
    evaluator_domain: RuntimeIdentifierSchema,
    evaluator_version: z.string().min(1),
    graph_reference: EnterpriseControlGraphReferenceSchema,
    evaluation_status: EvaluationStatusSchema,
    evaluated_scope: FactReferenceSchema.optional(),
    policy_results: z.array(PolicyRuleResultSchema),
    findings: z.array(PolicyEvaluationFindingSchema),
    required_actions: z.array(RuntimeIdentifierSchema).default([]),
    produced_at: RuntimeTimestampSchema,
  })
  .strict();

export type PolicyEvaluationFinding = DeepReadonly<
  z.infer<typeof PolicyEvaluationFindingSchema>
>;
export type PolicyRuleResult = DeepReadonly<
  z.infer<typeof PolicyRuleResultSchema>
>;
export type PolicyEvaluatorInput = DeepReadonly<
  z.infer<typeof PolicyEvaluatorInputSchema>
>;
export type PolicyEvaluatorOutput = DeepReadonly<
  z.infer<typeof PolicyEvaluatorOutputSchema>
>;
