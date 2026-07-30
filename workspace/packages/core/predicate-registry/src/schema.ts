import { z } from "zod";
import type { PredicatePhase, PredicateStatus } from "./types.js";

export const PredicateStatusSchema = z.enum([
  "PASS",
  "FAIL",
  "INCONCLUSIVE",
  "UNRESOLVED",
]) satisfies z.ZodType<PredicateStatus>;

export const PredicatePhaseSchema = z.enum([
  "PRE_EXECUTION",
  "POST_EXECUTION",
  "POST_EXECUTION_VERIFICATION",
  "LEDGER_APPEND_VERIFICATION",
]) satisfies z.ZodType<PredicatePhase>;

export const PredicateDeclarationSchema = z.object({
  predicate_id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  phase: PredicatePhaseSchema,
  transformation_id: z.string().min(1).optional(),
  applies_to: z.enum(["ALL", "SPECIFIC_TRANSFORMATIONS"]),
  failure_mode: z.string().min(1),
  severity: z.enum(["BLOCKER", "WARNING"]),
  schema_ref: z.string().min(1).optional(),
  order: z.number().int().nonnegative(),
});

export const PredicateEvaluationResultSchema = z.object({
  predicate_id: z.string().min(1),
  phase: PredicatePhaseSchema,
  status: PredicateStatusSchema,
  observed_at: z.string().min(1),
  evidence: z.record(z.unknown()).optional(),
  violations: z.array(z.string()).optional(),
  predicate_ref: z.object({
    predicate_id: z.string().min(1),
    transformation_id: z.string().min(1).optional(),
    order: z.number().int().nonnegative(),
  }),
});

export const PredicateRegistryDocumentSchema = z.object({
  registry_id: z.string().min(1),
  version: z.string().min(1),
  status: z.string().min(1),
  predicates: z.array(PredicateDeclarationSchema),
  count: z.number().int().nonnegative(),
});
