import type {
  AuthoritySignature,
  HashChainLink,
  PredicateResultSummary,
  ProofVerdict,
} from "./types";

export interface TransformationProofEntry {
  readonly proof_id: string;
  readonly proof_level: "TRANSFORMATION_PROOF";
  readonly transformation_id: string;
  readonly contract_ref: string;
  readonly verdict: ProofVerdict;
  readonly predicate_results: readonly PredicateResultSummary[];
  readonly input_hash: string;
  readonly output_hash: string;
  readonly determinism_run_1_hash: string;
  readonly determinism_run_2_hash: string;
  readonly determinism_verified_equal: boolean;
  readonly emitted_at: string;
  readonly authority_signature: AuthoritySignature;
  readonly hash_chain: HashChainLink;
  readonly spec_kind: "TRANSFORMATION_PROOF_ENTRY";
}

export interface ExecutionProofEntry {
  readonly proof_id: string;
  readonly proof_level: "EXECUTION_PROOF";
  readonly pipeline_id: string;
  readonly requirement_id?: string;
  readonly verdict: ProofVerdict;
  readonly transformation_proofs_required: readonly string[];
  readonly transformation_proofs_all_pass: boolean;
  readonly emitted_at: string;
  readonly authority_signature: AuthoritySignature;
  readonly hash_chain: HashChainLink;
}

export interface RepositoryProofEntry {
  readonly proof_id: string;
  readonly proof_level: "REPOSITORY_PROOF";
  readonly baseline_version: string;
  readonly verdict: ProofVerdict;
  readonly baseline_hash: string;
  readonly governance_hash: string;
  readonly dependency_hash: string;
  readonly registry_hash: string;
  readonly emitted_at: string;
  readonly authority_signature: AuthoritySignature;
  readonly hash_chain: HashChainLink;
  readonly required_fields_count_8_or_more: true;
}

export interface ProofLedgerDocument {
  readonly ledger_id: string;
  readonly version: string;
  readonly status: "ACTIVE";
  readonly append_only_enforced: true;
  readonly entries: readonly (
    | TransformationProofEntry
    | ExecutionProofEntry
    | RepositoryProofEntry
  )[];
  readonly count: number;
  readonly last_entry_hash: string;
  readonly genesis_hash: string;
}
