import { z } from "zod";

import { DecisionLedgerReferenceSchema } from "./ledger.js";
import {
  AutomationModeSchema,
  DeepReadonly,
  RuntimeIdentifierSchema,
  RuntimeTimestampSchema,
} from "./shared.js";

export const AutomationExecutionRequestSchema = z
  .object({
    consumer_id: RuntimeIdentifierSchema,
    decision_reference: DecisionLedgerReferenceSchema,
    mode: AutomationModeSchema,
    requested_at: RuntimeTimestampSchema,
    context: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export const AutomationExecutionPlanSchema = z
  .object({
    consumer_id: RuntimeIdentifierSchema,
    decision_reference: DecisionLedgerReferenceSchema,
    mode: AutomationModeSchema,
    blocking: z.boolean(),
    planned_actions: z.array(RuntimeIdentifierSchema),
    explanation: z.string().min(1),
  })
  .strict();

export const AutomationExecutionResultSchema = z
  .object({
    consumer_id: RuntimeIdentifierSchema,
    decision_reference: DecisionLedgerReferenceSchema,
    status: z.enum(["EXECUTED", "SKIPPED", "BLOCKED"]),
    executed_actions: z.array(RuntimeIdentifierSchema),
    published_at: RuntimeTimestampSchema,
  })
  .strict();

export type AutomationExecutionRequest = DeepReadonly<
  z.infer<typeof AutomationExecutionRequestSchema>
>;
export type AutomationExecutionPlan = DeepReadonly<
  z.infer<typeof AutomationExecutionPlanSchema>
>;
export type AutomationExecutionResult = DeepReadonly<
  z.infer<typeof AutomationExecutionResultSchema>
>;
