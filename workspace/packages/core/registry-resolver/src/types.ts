import type {
  TransformationId,
  TransformationStatus,
  TransformationPrecedence,
} from "@repo/core-transformation-registry";
import type { PredicateDeclaration } from "@repo/core-predicate-registry";
// Define ProofLevel locally to resolve import issues - matches @repo/core-proof-ledger/src/types.ts
export type ProofLevel =
  | "TRANSFORMATION_PROOF"
  | "EXECUTION_PROOF"
  | "REPOSITORY_PROOF";

export const FAILURE_STRATEGIES = [
  "FAIL_FAST",
  "RETRY_N",
  "FALLBACK_SUCCESSOR_SKIP",
  "EMIT_INCONCLUSIVE_PROOF",
] as const;
export type FailureStrategy = (typeof FAILURE_STRATEGIES)[number];

export const ROLLBACK_STRATEGIES = [
  "NO_ROLLBACK_PURE_FUNCTION",
  "DELETE_OUTPUT_ARTIFACTS",
  "EMIT_ROLLBACK_PROOF_ENTRY",
] as const;
export type RollbackStrategy = (typeof ROLLBACK_STRATEGIES)[number];

export const RESOLVER_CONTRACT_KIND = "CANONICAL_RESOLVER_CONTRACT";
export const RESOLVER_VERSION = "1.0.0";
export const RESOLVER_ID = "REGISTRY-RESOLVER-V1";
export const ROOT_OF_TRUST_TRANSFORMATION_ID: TransformationId = "T001";
export const KBE_MIN_PREDICATE_COUNT = 3;

export interface RetryConfig {
  readonly max_attempts: number;
  readonly backoff: string;
  readonly circuit_breaker_threshold?: number;
  readonly exponential_backoff_multiplier?: number;
  readonly circuit_breaker_cooldown_ms?: number;
}

export interface CompatibilityMatrix {
  readonly requires: Readonly<Record<string, string>>;
  readonly provides: Readonly<Record<string, string>>;
}

export interface ResolverProofSpec {
  readonly proof_id_pattern: string;
  readonly proof_level: ProofLevel;
  readonly proof_schema_zod_ref_path: string;
  readonly required_predicate_count: number;
}

export interface ResolverDagSpec {
  readonly predecessor_id: TransformationId | null;
  readonly successor_id: TransformationId | null;
  readonly precedence: TransformationPrecedence;
  readonly blocked: boolean;
  readonly blocked_reason_if_true: string | null;
}

export interface ResolverStrategySpec {
  readonly failure_strategy: FailureStrategy;
  readonly rollback_strategy: RollbackStrategy;
  readonly retry_config_if_retry_n: RetryConfig | null;
}

export interface ResolverContractRef {
  readonly ref_path: string;
  readonly contract_kind: string;
}

export interface ResolverResolutionBundle {
  readonly transformation_id: TransformationId;
  readonly name_long: string;
  readonly lifecycle: TransformationStatus;
  readonly contract: ResolverContractRef;
  readonly predicates_ordered: readonly PredicateDeclaration[];
  readonly implementation_ref: string;
  readonly proof: ResolverProofSpec;
  readonly dag: ResolverDagSpec;
  readonly strategy: ResolverStrategySpec;
  readonly semver: string;
  readonly compatibility_matrix: CompatibilityMatrix;
  readonly golden_reference_input_dir: string;
}

export interface BlockedStatus {
  readonly blocked: boolean;
  readonly reason?: string;
}