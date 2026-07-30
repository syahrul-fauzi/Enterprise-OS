import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PREDICATE_COUNT_T001_REQUIRED,
  T001_PREDICATES,
  ALL_PREDICATES,
  PredicateRegistryDocumentSchema,
  getPredicateById,
} from "../src/index.js";

void describe("@repo/core-predicate-registry conformance", () => {
  void it("declares exactly PREDICATE_COUNT_T001_REQUIRED predicates for T001", () => {
    assert.equal(T001_PREDICATES.length, PREDICATE_COUNT_T001_REQUIRED);
  });

  void it("PRED-T001-INPUT-SCHEMA is phase PRE_EXECUTION blocker order 1", () => {
    const p = getPredicateById("PRED-T001-INPUT-SCHEMA");
    assert.ok(p, "predicate found");
    assert.equal(p.phase, "PRE_EXECUTION");
    assert.equal(p.severity, "BLOCKER");
    assert.equal(p.order, 1);
  });

  void it("PRED-T001-OUTPUT-DETERMINISTIC is POST_EXECUTION_VERIFICATION blocker order 2", () => {
    const p = getPredicateById("PRED-T001-OUTPUT-DETERMINISTIC");
    assert.ok(p);
    assert.equal(p.phase, "POST_EXECUTION_VERIFICATION");
    assert.equal(p.order, 2);
  });

  void it("PRED-T001-CONFORM-EIR is POST_EXECUTION blocker order 3", () => {
    const p = getPredicateById("PRED-T001-CONFORM-EIR");
    assert.ok(p);
    assert.equal(p.phase, "POST_EXECUTION");
    assert.equal(p.order, 3);
  });

  void it("predicate registry document schema accepts all predicates", () => {
    const doc = {
      registry_id: "test-reg",
      version: "1.0.0",
      status: "DRAFT",
      predicates: ALL_PREDICATES as unknown as Array<Record<string, unknown>>,
      count: ALL_PREDICATES.length,
    };
    const result = PredicateRegistryDocumentSchema.safeParse(doc);
    assert.ok(
      result.success,
      `Registry doc parse failed: ${JSON.stringify(result.error?.errors ?? [], null, 2)}`,
    );
  });
});
