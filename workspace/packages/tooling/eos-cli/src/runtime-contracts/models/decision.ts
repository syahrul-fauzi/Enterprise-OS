import { z } from "zod";

import { PolicyEvaluatorOutputSchema } from "./evaluation.js";
import {
  ArtifactReferenceSchema,
  DecisionConfidenceSchema,
  DecisionOutcomeSchema,
  DeepReadonly,
  RuntimeIdentifierSchema,
  RuntimeTimestampSchema,
} from "./shared.js";

export const DecisionActionSchema = z
  .object({
    action_id: RuntimeIdentifierSchema,
    action_type: RuntimeIdentifierSchema,
    description: z.string().min(1),
    target_refs: z.array(RuntimeIdentifierSchema).default([]),
  })
  .strict();

export const DecisionReasonSchema = z
  .object({
    code: RuntimeIdentifierSchema,
    source_evaluation_id: RuntimeIdentifierSchema,
    message: z.string().min(1),
  })
  .strict();

export const DecisionLifecycleStatusSchema = z.enum([
  "PROPOSED",
  "APPROVED",
  "REJECTED",
  "SUPERSEDED",
  "OBSERVING",
  "CLOSED",
]);

export const DecisionTriggerSchema = z
  .object({
    trigger_id: RuntimeIdentifierSchema,
    trigger_type: RuntimeIdentifierSchema,
    description: z.string().min(1),
    source_refs: z.array(ArtifactReferenceSchema).default([]),
    triggered_at: RuntimeTimestampSchema,
  })
  .strict();

export const DecisionAssumptionSchema = z
  .object({
    assumption_id: RuntimeIdentifierSchema,
    statement: z.string().min(1),
    source_refs: z.array(ArtifactReferenceSchema).default([]),
    validation_status: z
      .enum(["DECLARED", "VALIDATED", "INVALIDATED", "EXPIRED"])
      .default("DECLARED"),
  })
  .strict();

export const DecisionAlternativeSchema = z
  .object({
    option_id: RuntimeIdentifierSchema,
    label: z.string().min(1),
    description: z.string().min(1),
    evidence_refs: z.array(ArtifactReferenceSchema).default([]),
    tradeoffs: z.array(z.string().min(1)).default([]),
  })
  .strict();

export const DecisionExpectedOutcomeSchema = z
  .object({
    outcome_id: RuntimeIdentifierSchema,
    hypothesis: z.string().min(1),
    success_metric: z.string().min(1),
    target_description: z.string().min(1),
    measurement_window: z.string().min(1),
  })
  .strict();

export const DecisionOwnerSchema = z
  .object({
    owner_id: RuntimeIdentifierSchema,
    owner_type: RuntimeIdentifierSchema,
    display_name: z.string().min(1),
  })
  .strict();

export const DecisionRecommendationSchema = z
  .object({
    recommendation_id: RuntimeIdentifierSchema,
    recommendation_type: RuntimeIdentifierSchema,
    summary: z.string().min(1),
  })
  .strict();

export const DecisionEngineInputSchema = z
  .object({
    decision_scope: z
      .object({
        scope_id: RuntimeIdentifierSchema,
        scope_kind: RuntimeIdentifierSchema,
      })
      .strict(),
    graph_digest: RuntimeIdentifierSchema,
    evaluator_outputs: z.array(PolicyEvaluatorOutputSchema),
    policy_version: z.string().min(1),
    trigger: DecisionTriggerSchema,
    finding_refs: z.array(ArtifactReferenceSchema).default([]),
    evidence_refs: z.array(ArtifactReferenceSchema).default([]),
    assumptions: z.array(DecisionAssumptionSchema).default([]),
    decision_owner: DecisionOwnerSchema,
    requested_at: RuntimeTimestampSchema,
  })
  .strict();

export const DecisionObjectSchema = z
  .object({
    decision_id: RuntimeIdentifierSchema,
    decision_type: RuntimeIdentifierSchema,
    decision: DecisionOutcomeSchema,
    status: DecisionLifecycleStatusSchema,
    trigger: DecisionTriggerSchema,
    finding_refs: z.array(ArtifactReferenceSchema).default([]),
    evidence_refs: z.array(ArtifactReferenceSchema).default([]),
    assumptions: z.array(DecisionAssumptionSchema).default([]),
    recommendation: DecisionRecommendationSchema,
    alternatives: z.array(DecisionAlternativeSchema).min(1),
    selected_option: RuntimeIdentifierSchema,
    expected_outcome: DecisionExpectedOutcomeSchema,
    owner: DecisionOwnerSchema,
    confidence: DecisionConfidenceSchema,
    reason_codes: z.array(RuntimeIdentifierSchema),
    reasons: z.array(DecisionReasonSchema),
    required_actions: z.array(DecisionActionSchema),
    affected_nodes: z.array(RuntimeIdentifierSchema),
    source_evaluation_ids: z.array(RuntimeIdentifierSchema),
    graph_digest: RuntimeIdentifierSchema,
    policy_version: z.string().min(1),
    created_at: RuntimeTimestampSchema,
    outcome_tracking_ref: RuntimeIdentifierSchema.optional(),
    learning_ref: RuntimeIdentifierSchema.optional(),
  })
  .strict();

export const DecisionSynthesisSchema = DecisionObjectSchema;

export type DecisionAction = DeepReadonly<z.infer<typeof DecisionActionSchema>>;
export type DecisionReason = DeepReadonly<z.infer<typeof DecisionReasonSchema>>;
export type DecisionLifecycleStatus = DeepReadonly<
  z.infer<typeof DecisionLifecycleStatusSchema>
>;
export type DecisionTrigger = DeepReadonly<z.infer<typeof DecisionTriggerSchema>>;
export type DecisionAssumption = DeepReadonly<
  z.infer<typeof DecisionAssumptionSchema>
>;
export type DecisionAlternative = DeepReadonly<
  z.infer<typeof DecisionAlternativeSchema>
>;
export type DecisionExpectedOutcome = DeepReadonly<
  z.infer<typeof DecisionExpectedOutcomeSchema>
>;
export type DecisionOwner = DeepReadonly<z.infer<typeof DecisionOwnerSchema>>;
export type DecisionRecommendation = DeepReadonly<
  z.infer<typeof DecisionRecommendationSchema>
>;
export type DecisionEngineInput = DeepReadonly<
  z.infer<typeof DecisionEngineInputSchema>
>;
export type DecisionObject = DeepReadonly<z.infer<typeof DecisionObjectSchema>>;
export type DecisionSynthesis = DeepReadonly<
  z.infer<typeof DecisionSynthesisSchema>
>;
