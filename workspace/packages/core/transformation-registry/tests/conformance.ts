import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TRANSFORMATION_COUNT_SPRINT0_REQUIRED,
  TRANSFORMATIONS,
  TRANSFORMATION_REGISTRY_DOCUMENT,
  getTransformationById,
  getRootOfTrustTransformation,
  TransformationRegistryDocumentSchema,
} from "../src/index.js";

void describe("@repo/core-transformation-registry conformance", () => {
  void it("declares exactly TRANSFORMATION_COUNT_SPRINT0_REQUIRED entries = 5", () => {
    assert.equal(TRANSFORMATIONS.length, TRANSFORMATION_COUNT_SPRINT0_REQUIRED);
  });

  void it("T001 is root of trust, requires standalone, engine dependency forbidden until Gate C", () => {
    const t001 = getTransformationById("T001");
    assert.ok(t001);
    assert.equal(t001.root_of_trust, true);
    assert.equal(t001.standalone_implementation_required, true);
    assert.equal(t001.engine_dependency_forbidden_until_gate_c_verified, true);
    assert.equal(t001.precedence, "ROOT");
    assert.equal(t001.blocked_until_predecessor_verified, false);
    assert.equal(t001.predicate_refs.length, 3);
  });

  void it("T002..T005 declare blocked_until_predecessor_verified = true with predecessor_id", () => {
    const expected = [
      ["T002", "T001", "AFTER_T001_PASS"],
      ["T003", "T002", "AFTER_T002_PASS"],
      ["T004", "T003", "AFTER_T003_PASS"],
      ["T005", "T004", "AFTER_T004_PASS"],
    ] as const;
    for (const [id, pred, prec] of expected) {
      const t = getTransformationById(id);
      assert.ok(t, `found ${id}`);
      assert.equal(t.blocked_until_predecessor_verified, true, `${id} blocked`);
      assert.equal(t.predecessor_id, pred, `${id} predecessor ${pred}`);
      assert.equal(t.precedence, prec, `${id} precedence ${prec}`);
    }
  });

  void it("root of trust transformation resolves to T001 with 3 predicates", () => {
    const rot = getRootOfTrustTransformation();
    assert.equal(rot.transformation_id, "T001");
    assert.equal(rot.predicate_refs.length, 3);
    assert.deepEqual(
      rot.predicate_refs.map((p) => p.predicate_id),
      ["PRED-T001-INPUT-SCHEMA", "PRED-T001-OUTPUT-DETERMINISTIC", "PRED-T001-CONFORM-EIR"],
    );
  });

  void it("registry document schema parse succeeds on TRANSFORMATION_REGISTRY_DOCUMENT", () => {
    const result = TransformationRegistryDocumentSchema.safeParse(
      TRANSFORMATION_REGISTRY_DOCUMENT,
    );
    assert.ok(
      result.success,
      `Registry doc parse failed: ${JSON.stringify(result.error?.errors ?? [], null, 2)}`,
    );
  });
});
