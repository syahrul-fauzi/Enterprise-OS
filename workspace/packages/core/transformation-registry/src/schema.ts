import { z } from "zod";
import type {
  TransformationId,
  TransformationPrecedence,
  TransformationStatus,
} from "./types.js";

export const TransformationIdSchema = z.enum([
  "T001",
  "T002",
  "T003",
  "T004",
  "T005",
]) satisfies z.ZodType<TransformationId>;

export const TransformationStatusSchema = z.enum([
  "DRAFT",
  "REVIEWED",
  "VERIFIED",
  "FROZEN",
  "DEPRECATED",
]) satisfies z.ZodType<TransformationStatus>;

export const TransformationPrecedenceSchema = z.enum([
  "ROOT",
  "AFTER_T001_PASS",
  "AFTER_T002_PASS",
  "AFTER_T003_PASS",
  "AFTER_T004_PASS",
]) satisfies z.ZodType<TransformationPrecedence>;

export const TransformationPredicateRefSchema = z.object({
  predicate_id: z.string().min(1),
  phase: z.enum(["PRE_EXECUTION", "POST_EXECUTION", "POST_EXECUTION_VERIFICATION"]),
});

export const TransformationDeclarationSchema = z.object({
  transformation_id: TransformationIdSchema,
  name_long: z.string().min(1),
  description: z.string().min(1),
  input_kind: z.string().min(1),
  output_kind: z.string().min(1),
  lifecycle: TransformationStatusSchema,
  contract_ref: z.string().min(1),
  predicate_refs: z.array(TransformationPredicateRefSchema),
  evidence_output_kind: z.enum(["TRANSFORMATION_PROOF", "REPOSITORY_PROOF"]),
  evidence_output_id: z.string().min(1),
  golden_reference_input: z.string().min(1).optional(),
  root_of_trust: z.boolean(),
  standalone_implementation_required: z.boolean(),
  engine_dependency_forbidden_until_gate_c_verified: z.boolean(),
  precedence: TransformationPrecedenceSchema,
  blocked_until_predecessor_verified: z.boolean(),
  predecessor_id: TransformationIdSchema.optional(),
});

export const TransformationRegistryDocumentSchema = z.object({
  registry_id: z.string().min(1),
  version: z.string().min(1),
  status: TransformationStatusSchema,
  catalog_canonical_ref: z.string().min(1),
  transformations: z.array(TransformationDeclarationSchema),
  count: z.number().int().nonnegative(),
  root_of_trust_transformation: TransformationIdSchema,
});
