// Revert to local definitions temporarily to fix import resolution issues (dependency paths need workspace configuration)
// Previously tried importing from @repo/core-capability-registry and @repo/core-proof-ledger, but module resolution fails in current setup
export type ProofLevel = "TRANSFORMATION_PROOF" | "EXECUTION_PROOF" | "REPOSITORY_PROOF";
export interface CapabilityDescriptor {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly contracts?: unknown;
  readonly presentation?: unknown;
  ui?: unknown;
}

// Import canonical types from transformation-registry to fix cross-module type mismatches
import type { TransformationId, TransformationStatus, TransformationPrecedence } from "../../transformation-registry/src/types.js";
// Import canonical PredicateDeclaration from predicate-registry to fix type mismatch
import type { PredicateDeclaration } from "../../predicate-registry/src/interfaces.js";
export { type TransformationId, type TransformationStatus, type TransformationPrecedence, type PredicateDeclaration };

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


export interface BlockedStatus {
  readonly blocked: boolean;
  readonly reason?: string;
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

// Map ResolverResolutionBundle to CapabilityDescriptor for capability-registry integration
// Inherits all CapabilityDescriptor properties (id, version, name, contracts, presentation, etc.) while maintaining backward compatibility
// Maps: transformation_id → id, semver → version, name_long → name (preserves both for backward compatibility)
export interface ResolverResolutionBundle extends CapabilityDescriptor {
  // Backward compatibility aliases for CapabilityDescriptor properties
  readonly transformation_id: TransformationId; // Maps to id (duplicate to maintain existing code compatibility)
  readonly name_long: string; // Maps to name (duplicate to maintain existing code compatibility)
  semver: string; // Maps to version (duplicate to maintain existing code compatibility)
  
  // Resolver-specific additional properties
  readonly lifecycle: TransformationStatus;
  readonly contract: ResolverContractRef;
  readonly predicates_ordered: readonly PredicateDeclaration[];
  readonly implementation_ref: string;
  readonly proof: ResolverProofSpec;
  readonly dag: ResolverDagSpec;
  readonly strategy: ResolverStrategySpec;
  readonly compatibility_matrix: CompatibilityMatrix;
  readonly golden_reference_input_dir: string;
}

export interface TransformationDeclaration {
  readonly transformation_id: TransformationId;
  readonly name_long: string;
  readonly lifecycle: TransformationStatus;
  readonly contract_ref: string;
  readonly predicate_refs: readonly string[];
  readonly golden_reference_input?: string;
  readonly predecessor_id?: TransformationId | null;
  readonly successor_id?: TransformationId | null;
  readonly precedence: TransformationPrecedence;
  readonly blocked_until_predecessor_verified?: boolean;
  readonly blocked_until_t001_verified?: boolean;
  readonly blocked_until_t002_verified?: boolean;
  readonly blocked_until_t003_verified?: boolean;
  readonly blocked_until_t004_verified?: boolean;
  readonly evidence_output_id?: string;
  readonly evidence_output_id_pattern?: string;
  readonly evidence_output_kind?: string;
}

export interface BlockedStatus {
  readonly blocked: boolean;
  readonly reason?: string;
}