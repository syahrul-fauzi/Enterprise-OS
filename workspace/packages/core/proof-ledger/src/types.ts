export type ProofVerdict = "PASS" | "FAIL" | "INCONCLUSIVE";

export type ProofLevel =
  | "TRANSFORMATION_PROOF"
  | "EXECUTION_PROOF"
  | "REPOSITORY_PROOF";

export type AuthoritySignature =
  | { readonly kind: "UNSIGNED"; readonly developer_hostname: string }
  | {
      readonly kind: "SIGNED_ECDSA_P256";
      readonly key_id: string;
      readonly signature_hex: string;
    };

export interface HashChainLink {
  readonly previous_entry_hash: string;
  readonly entry_hash: string;
  readonly hash_algorithm: "sha256";
}

export interface PredicateResultSummary {
  readonly predicate_id: string;
  readonly phase: "PRE_EXECUTION" | "POST_EXECUTION" | "POST_EXECUTION_VERIFICATION";
  readonly status: "PASS" | "FAIL" | "INCONCLUSIVE" | "UNRESOLVED";
}
