import { z } from "zod";
import type { AuthoritySignature, HashChainLink, PredicateResultSummary } from "./types";

const AuthoritySignatureUnsignedSchema = z.object({
  kind: z.literal("UNSIGNED"),
  developer_hostname: z.string().min(1),
}) satisfies z.ZodType<Extract<AuthoritySignature, { kind: "UNSIGNED" }>>;

const AuthoritySignatureSignedSchema = z.object({
  kind: z.literal("SIGNED_ECDSA_P256"),
  key_id: z.string().min(1),
  signature_hex: z.string().min(1),
}) satisfies z.ZodType<Extract<AuthoritySignature, { kind: "SIGNED_ECDSA_P256" }>>;

export const AuthoritySignatureSchema = z.union([
  AuthoritySignatureUnsignedSchema,
  AuthoritySignatureSignedSchema,
]) satisfies z.ZodType<AuthoritySignature>;

export const HashChainLinkSchema = z.object({
  previous_entry_hash: z.string().min(1),
  entry_hash: z.string().min(1),
  hash_algorithm: z.literal("sha256"),
}) satisfies z.ZodType<HashChainLink>;

export const PredicateResultSummarySchema = z.object({
  predicate_id: z.string().min(1),
  phase: z.enum(["PRE_EXECUTION", "POST_EXECUTION", "POST_EXECUTION_VERIFICATION"]),
  status: z.enum(["PASS", "FAIL", "INCONCLUSIVE", "UNRESOLVED"]),
}) satisfies z.ZodType<PredicateResultSummary>;

export const ProofVerdictSchema = z.enum(["PASS", "FAIL", "INCONCLUSIVE"]);

export const TransformationProofEntrySchema = z.object({
  proof_id: z.string().min(1),
  proof_level: z.literal("TRANSFORMATION_PROOF"),
  transformation_id: z.string().min(1),
  contract_ref: z.string().min(1),
  verdict: ProofVerdictSchema,
  predicate_results: z.array(PredicateResultSummarySchema),
  input_hash: z.string().min(1),
  output_hash: z.string().min(1),
  determinism_run_1_hash: z.string().min(1),
  determinism_run_2_hash: z.string().min(1),
  determinism_verified_equal: z.boolean(),
  emitted_at: z.string().min(1),
  authority_signature: AuthoritySignatureSchema,
  hash_chain: HashChainLinkSchema,
  spec_kind: z.literal("TRANSFORMATION_PROOF_ENTRY"),
});

export const RepositoryProofEntrySchema = z.object({
  proof_id: z.string().min(1),
  proof_level: z.literal("REPOSITORY_PROOF"),
  baseline_version: z.string().min(1),
  verdict: ProofVerdictSchema,
  baseline_hash: z.string().min(1),
  governance_hash: z.string().min(1),
  dependency_hash: z.string().min(1),
  registry_hash: z.string().min(1),
  emitted_at: z.string().min(1),
  authority_signature: AuthoritySignatureSchema,
  hash_chain: HashChainLinkSchema,
  required_fields_count_8_or_more: z.literal(true),
});
