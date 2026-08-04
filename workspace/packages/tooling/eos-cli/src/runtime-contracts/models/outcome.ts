import { z } from "zod";

import { DecisionExpectedOutcomeSchema } from "./decision.js";
import { DecisionLedgerReferenceSchema } from "./ledger.js";
import {
  ArtifactReferenceSchema,
  DeepReadonly,
  RuntimeIdentifierSchema,
  RuntimeTimestampSchema,
} from "./shared.js";

export const DecisionObservedMetricSchema = z
  .object({
    metric_id: RuntimeIdentifierSchema,
    metric_name: z.string().min(1),
    unit: z.string().min(1),
    observed_value: z.number(),
    target_description: z.string().min(1),
    status: z.enum(["MET", "MISSED", "PARTIAL", "NOT_APPLICABLE"]),
    observed_at: RuntimeTimestampSchema,
  })
  .strict();

export const EngineeringLeverageDeltaSchema = z
  .object({
    metric_id: RuntimeIdentifierSchema,
    baseline_value: z.number(),
    current_value: z.number(),
    delta_value: z.number(),
    interpretation: z.string().min(1),
  })
  .strict();

export const DecisionOutcomeTrackingStatusSchema = z.enum([
  "PENDING",
  "ACHIEVED",
  "PARTIALLY_ACHIEVED",
  "MISSED",
  "SUPERSEDED",
]);

export const DecisionOutcomeRecordSchema = z
  .object({
    outcome_tracking_id: RuntimeIdentifierSchema,
    decision_reference: DecisionLedgerReferenceSchema,
    decision_id: RuntimeIdentifierSchema,
    expected_outcome: DecisionExpectedOutcomeSchema,
    status: DecisionOutcomeTrackingStatusSchema,
    summary: z.string().min(1),
    observed_metrics: z.array(DecisionObservedMetricSchema).min(1),
    evidence_refs: z.array(ArtifactReferenceSchema).default([]),
    capability_refs: z.array(RuntimeIdentifierSchema).default([]),
    leverage_delta: EngineeringLeverageDeltaSchema.optional(),
    observed_at: RuntimeTimestampSchema,
  })
  .strict();

export const DecisionLearningStatusSchema = z.enum([
  "OPEN",
  "CAPTURED",
  "APPLIED",
]);

export const DecisionLearningRecordSchema = z
  .object({
    learning_id: RuntimeIdentifierSchema,
    decision_reference: DecisionLedgerReferenceSchema,
    outcome_tracking_id: RuntimeIdentifierSchema,
    status: DecisionLearningStatusSchema,
    hypotheses_validated: z.array(z.string().min(1)).default([]),
    hypotheses_invalidated: z.array(z.string().min(1)).default([]),
    lessons: z.array(z.string().min(1)).min(1),
    follow_up_actions: z.array(RuntimeIdentifierSchema).default([]),
    created_at: RuntimeTimestampSchema,
  })
  .strict();

export const DecisionOutcomeTrackingRecordSchema = z
  .object({
    outcome: DecisionOutcomeRecordSchema,
    learning: DecisionLearningRecordSchema,
  })
  .strict();

export type DecisionObservedMetric = DeepReadonly<
  z.infer<typeof DecisionObservedMetricSchema>
>;
export type EngineeringLeverageDelta = DeepReadonly<
  z.infer<typeof EngineeringLeverageDeltaSchema>
>;
export type DecisionOutcomeTrackingStatus = DeepReadonly<
  z.infer<typeof DecisionOutcomeTrackingStatusSchema>
>;
export type DecisionOutcomeRecord = DeepReadonly<
  z.infer<typeof DecisionOutcomeRecordSchema>
>;
export type DecisionLearningStatus = DeepReadonly<
  z.infer<typeof DecisionLearningStatusSchema>
>;
export type DecisionLearningRecord = DeepReadonly<
  z.infer<typeof DecisionLearningRecordSchema>
>;
export type DecisionOutcomeTrackingRecord = DeepReadonly<
  z.infer<typeof DecisionOutcomeTrackingRecordSchema>
>;
