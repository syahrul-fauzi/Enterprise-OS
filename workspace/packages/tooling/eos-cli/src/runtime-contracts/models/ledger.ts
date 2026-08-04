import { z } from "zod";

import { DecisionObjectSchema } from "./decision.js";
import {
  DecisionConfidenceSchema,
  DeepReadonly,
  RuntimeIdentifierSchema,
  RuntimeTimestampSchema,
} from "./shared.js";

export const DecisionLedgerReferenceSchema = z
  .object({
    decision_entry_id: RuntimeIdentifierSchema,
    decision_id: RuntimeIdentifierSchema,
  })
  .strict();

export const DecisionLedgerEntrySchema = z
  .object({
    decision_entry_id: RuntimeIdentifierSchema,
    decision_id: RuntimeIdentifierSchema,
    decision_time: RuntimeTimestampSchema,
    decision_type: RuntimeIdentifierSchema,
    inputs: z
      .object({
        ecg_snapshot_digest: RuntimeIdentifierSchema,
        evaluator_result_digests: z.array(RuntimeIdentifierSchema),
      })
      .strict(),
    decision_snapshot: DecisionObjectSchema,
    decision_digest: RuntimeIdentifierSchema,
    confidence: DecisionConfidenceSchema,
    created_at: RuntimeTimestampSchema,
    outcome_ref: RuntimeIdentifierSchema.optional(),
    learning_ref: RuntimeIdentifierSchema.optional(),
    supersedes_decision_entry_id: RuntimeIdentifierSchema.optional(),
  })
  .strict();

export const DecisionReplayRequestSchema = z
  .object({
    reference: DecisionLedgerReferenceSchema,
    policy_version: z.string().min(1).optional(),
  })
  .strict();

export type DecisionLedgerReference = DeepReadonly<
  z.infer<typeof DecisionLedgerReferenceSchema>
>;
export type DecisionLedgerEntry = DeepReadonly<
  z.infer<typeof DecisionLedgerEntrySchema>
>;
export type DecisionReplayRequest = DeepReadonly<
  z.infer<typeof DecisionReplayRequestSchema>
>;
