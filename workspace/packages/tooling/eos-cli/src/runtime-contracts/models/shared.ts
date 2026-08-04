import { z } from "zod";

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

export const RuntimeContractVersionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/);

export const RuntimeIdentifierSchema = z.string().min(1);
export const RuntimeTimestampSchema = z.string().min(1);

export const FactReferenceSchema = z
  .object({
    ref_id: RuntimeIdentifierSchema,
    ref_kind: RuntimeIdentifierSchema,
    digest: RuntimeIdentifierSchema.optional(),
  })
  .strict();

export const ArtifactReferenceSchema = FactReferenceSchema;

export const EvaluationStatusSchema = z.enum([
  "PASS",
  "WARN",
  "FAIL",
  "NOT_APPLICABLE",
]);

export const DecisionOutcomeSchema = z.enum([
  "ALLOW",
  "WARN",
  "BLOCK",
  "REVIEW_REQUIRED",
]);

export const DecisionConfidenceSchema = z.number().min(0).max(1);

export const AutomationModeSchema = z.enum(["DRY_RUN", "EXECUTE"]);

export type RuntimeContractVersion = DeepReadonly<
  z.infer<typeof RuntimeContractVersionSchema>
>;
export type FactReference = DeepReadonly<z.infer<typeof FactReferenceSchema>>;
export type ArtifactReference = DeepReadonly<
  z.infer<typeof ArtifactReferenceSchema>
>;
export type EvaluationStatus = DeepReadonly<
  z.infer<typeof EvaluationStatusSchema>
>;
export type DecisionOutcome = DeepReadonly<
  z.infer<typeof DecisionOutcomeSchema>
>;
export type DecisionConfidence = DeepReadonly<
  z.infer<typeof DecisionConfidenceSchema>
>;
export type AutomationMode = DeepReadonly<
  z.infer<typeof AutomationModeSchema>
>;
