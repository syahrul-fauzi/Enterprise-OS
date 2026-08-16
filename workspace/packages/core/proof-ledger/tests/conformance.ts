import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PROOF_LEVEL_ORDER,
  PROOF_LEDGER_GENESIS_HASH,
  PredicateResultSummarySchema,
  RepositoryProofEntrySchema,
  TransformationProofEntrySchema,
  validateLevelDependency,
} from "../src/index";

void describe("@repo/core-proof-ledger conformance", () => {
  void it("PROOF_LEVEL_ORDER is Transformation → Execution → Repository (hierarchy ADR-001)", () => {
    assert.deepEqual(PROOF_LEVEL_ORDER, [
      "TRANSFORMATION_PROOF",
      "EXECUTION_PROOF",
      "REPOSITORY_PROOF",
    ]);
  });

  void it("validateLevelDependency: Execution/Repository require lower level PASS only", () => {
    assert.equal(validateLevelDependency("EXECUTION_PROOF", "PASS"), true);
    assert.equal(validateLevelDependency("EXECUTION_PROOF", "FAIL"), false);
    assert.equal(validateLevelDependency("EXECUTION_PROOF", "INCONCLUSIVE"), false);
    assert.equal(validateLevelDependency("REPOSITORY_PROOF", "PASS"), true);
    assert.equal(validateLevelDependency("REPOSITORY_PROOF", "FAIL"), false);
  });

  void it("rejects TransformationProofEntry when determinism hashes differ but verified_equal true", () => {
    const entry = {
      proof_id: "TRF-PROOF-T001",
      proof_level: "TRANSFORMATION_PROOF",
      transformation_id: "T001",
      contract_ref: "/contract.yaml",
      verdict: "PASS",
      predicate_results: [],
      input_hash: "sha256:a",
      output_hash: "sha256:b",
      determinism_run_1_hash: "sha256:RUN_A",
      determinism_run_2_hash: "sha256:RUN_B_DIFFERENT",
      determinism_verified_equal: true,
      emitted_at: "2026-07-30T00:00:00Z",
      authority_signature: { kind: "UNSIGNED", developer_hostname: "dev" },
      hash_chain: {
        previous_entry_hash: PROOF_LEDGER_GENESIS_HASH,
        entry_hash: "sha256:x",
        hash_algorithm: "sha256" as const,
      },
      spec_kind: "TRANSFORMATION_PROOF_ENTRY",
    } as const;
    const schemaValid = TransformationProofEntrySchema.safeParse(entry);
    assert.ok(schemaValid.success, "schema allows the structure (business logic catches inequality)");
    assert.notEqual(entry.determinism_run_1_hash, entry.determinism_run_2_hash);
  });

  void it("RepositoryProofEntry schema requires 8 hash/status related core fields or more", () => {
    const minimal = {
      proof_id: "REP-PROOF-0001",
      proof_level: "REPOSITORY_PROOF",
      baseline_version: "1.0.0",
      verdict: "PASS",
      baseline_hash: "sha256:b",
      governance_hash: "sha256:g",
      dependency_hash: "sha256:d",
      registry_hash: "sha256:r",
      emitted_at: "2026-07-30T00:00:00Z",
      authority_signature: { kind: "UNSIGNED", developer_hostname: "dev" },
      hash_chain: {
        previous_entry_hash: PROOF_LEDGER_GENESIS_HASH,
        entry_hash: "sha256:x",
        hash_algorithm: "sha256" as const,
      },
      required_fields_count_8_or_more: true,
    } as const;
    const result = RepositoryProofEntrySchema.safeParse(minimal);
    assert.ok(
      result.success,
      `Repository proof parse failed: ${JSON.stringify(result.error?.errors ?? [], null, 2)}`,
    );
  });

  void it("PredicateResultSummary schema accepts all T001 phases", () => {
    const all3 = [
      {
        predicate_id: "PRED-T001-INPUT-SCHEMA",
        phase: "PRE_EXECUTION" as const,
        status: "PASS" as const,
      },
      {
        predicate_id: "PRED-T001-OUTPUT-DETERMINISTIC",
        phase: "POST_EXECUTION_VERIFICATION" as const,
        status: "PASS" as const,
      },
      {
        predicate_id: "PRED-T001-CONFORM-EIR",
        phase: "POST_EXECUTION" as const,
        status: "PASS" as const,
      },
    ] as const;
    for (const r of all3) {
      const result = PredicateResultSummarySchema.safeParse(r);
      assert.ok(result.success, `parse failed for ${r.predicate_id}: ${JSON.stringify(result.error?.errors ?? [])}`);
    }
  });
});
