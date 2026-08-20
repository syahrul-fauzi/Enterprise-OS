import { z } from "zod";
import {
  FAILURE_STRATEGIES,
  ROLLBACK_STRATEGIES,
  KBE_MIN_PREDICATE_COUNT,
  RESOLVER_VERSION,
  RESOLVER_ID,
  type ProofLevel,
} from "./types.js";
import {
  TransformationIdSchema,
  TransformationStatusSchema,
  TransformationPrecedenceSchema,
} from "@repo/core-transformation-registry";
import { PredicateDeclarationSchema } from "@repo/core-predicate-registry";

const _f: [string, ...string[]] = [...FAILURE_STRATEGIES];
export const FailureStrategySchema = z.enum(_f);
const _r: [string, ...string[]] = [...ROLLBACK_STRATEGIES];
export const RollbackStrategySchema = z.enum(_r);

const ProofLevelLiterals = ["TRANSFORMATION_PROOF", "EXECUTION_PROOF", "REPOSITORY_PROOF"] as [
  ProofLevel,
  ...ProofLevel[],
];
export const ProofLevelSchema = z.enum(ProofLevelLiterals);

export const RetryConfigSchema = z.object({
  max_attempts: z.number().int().positive(),
  backoff: z.string().min(1),
  circuit_breaker_threshold: z.number().int().positive().optional(),
  exponential_backoff_multiplier: z.number().positive().optional(),
  circuit_breaker_cooldown_ms: z.number().int().positive().optional(),
});

export const CompatibilityMatrixSchema = z.object({
  requires: z.record(z.string(), z.string()),
  provides: z.record(z.string(), z.string()),
});

export const ResolverContractRefSchema = z.object({
  ref_path: z.string().min(1),
  contract_kind: z.string().min(1),
});

export const ResolverProofSpecSchema = z.object({
  proof_id_pattern: z.string().min(3),
  proof_level: ProofLevelSchema,
  proof_schema_zod_ref_path: z.string().min(1),
  required_predicate_count: z.number().int().min(KBE_MIN_PREDICATE_COUNT),
});

export const ResolverDagSpecSchema = z.object({
  predecessor_id: TransformationIdSchema.nullable(),
  successor_id: TransformationIdSchema.nullable(),
  precedence: TransformationPrecedenceSchema,
  blocked: z.boolean(),
  blocked_reason_if_true: z.string().nullable(),
});

export const ResolverStrategySpecSchema = z.object({
  failure_strategy: FailureStrategySchema,
  rollback_strategy: RollbackStrategySchema,
  retry_config_if_retry_n: RetryConfigSchema.nullable(),
});

export const ResolverResolutionBundleSchema = z.object({
  transformation_id: TransformationIdSchema,
  name_long: z.string().min(3),
  lifecycle: TransformationStatusSchema,
  contract: ResolverContractRefSchema,
  predicates_ordered: z.array(PredicateDeclarationSchema).min(KBE_MIN_PREDICATE_COUNT),
  implementation_ref: z.string().min(5),
  proof: ResolverProofSpecSchema,
  dag: ResolverDagSpecSchema,
  strategy: ResolverStrategySpecSchema,
  semver: z.string().regex(/^(\d+\.\d+\.\d+)(-.+)?$/),
  compatibility_matrix: CompatibilityMatrixSchema,
  golden_reference_input_dir: z.string().min(5),
});

export const BlockedStatusSchema = z.object({
  blocked: z.boolean(),
  reason: z.string().optional(),
});

export const RegistryResolverRegistryDocumentSchema = z.object({
  resolver_id: z.literal(RESOLVER_ID),
  resolver_version: z.literal(RESOLVER_VERSION),
  bundles: z.array(ResolverResolutionBundleSchema),
  count: z.number().int().nonnegative(),
});