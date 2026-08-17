import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolve,
  resolveAll,
  resolveRootOfTrust,
  isBlocked,
  RESOLVER_REGISTRY_DOCUMENT,
  KBE_MIN_PREDICATE_COUNT,
  TRANSFORMATION_COUNT_SPRINT0_REQUIRED,
  ResolverResolutionBundleSchema,
  RegistryResolverRegistryDocumentSchema,
} from "../src/index.js";
import type { TransformationId } from "@repo/core-transformation-registry";

void describe("@repo/core-registry-resolver conformance", () => {
  void it("resolveAll returns exactly TRANSFORMATION_COUNT_SPRINT0_REQUIRED bundles", () => {
    const all = resolveAll();
    assert.equal(all.length, TRANSFORMATION_COUNT_SPRINT0_REQUIRED);
  });

  void it("resolveRootOfTrust returns T001 bundle", () => {
    const r = resolveRootOfTrust();
    assert.equal(r.transformation_id, "T001");
    assert.equal(r.dag.predecessor_id, null);
    assert.equal(r.dag.successor_id, "T002");
    assert.equal(r.proof.proof_level, "TRANSFORMATION_PROOF");
  });

  void it(`KBE invariant: every bundle has >= KBE_MIN_PREDICATE_COUNT (= ${KBE_MIN_PREDICATE_COUNT}) predicates_ordered`, () => {
    for (const b of resolveAll()) {
      assert.ok(
        b.predicates_ordered.length >= KBE_MIN_PREDICATE_COUNT,
        `${b.transformation_id} predicate count = ${b.predicates_ordered.length}`,
      );
    }
  });

  void it("T001 predicates array phase order invariant: PRE_EXECUTION → POST_EXECUTION_VERIFICATION → POST_EXECUTION", () => {
    const t001 = resolve("T001");
    assert.equal(t001.predicates_ordered[0].phase, "PRE_EXECUTION");
    assert.equal(
      t001.predicates_ordered[1].phase,
      "POST_EXECUTION_VERIFICATION",
    );
    assert.equal(t001.predicates_ordered[2].phase, "POST_EXECUTION");
  });

  void it("DAG linear chain: T001→T002→T003→T004→T005 predecessor_id/successor_id correct", () => {
    const ids = ["T001", "T002", "T003", "T004", "T005"] as const;
    for (let i = 0; i < ids.length; i += 1) {
      const b = resolve(ids[i] as TransformationId);
      assert.equal(b.dag.predecessor_id, i === 0 ? null : ids[i - 1]);
      assert.equal(b.dag.successor_id, i === ids.length - 1 ? null : ids[i + 1]);
    }
  });

  void it("T002-T005 blocked status = true because predecessors lifecycle != VERIFIED (T002/T003/T004/T005 = DRAFT)", () => {
    assert.equal(isBlocked("T001").blocked, false, "T001 = VERIFIED, NOT blocked");
    for (const id of ["T002", "T003", "T004", "T005"] as const) {
      const s = isBlocked(id as TransformationId);
      assert.ok(s.blocked, `${id} expected blocked=true`);
      assert.ok(
        typeof s.reason === "string" && s.reason.length > 0,
        `${id} blocked with reason`,
      );
    }
  });

  void it("Semver format: every bundle.semver matches regex ^(\\d+.\\d+.\\d+)(-.+)?$", () => {
    for (const b of resolveAll()) {
      assert.match(
        b.semver,
        /^(\d+\.\d+\.\d+)(-.+)?$/,
        `${b.transformation_id} semver = ${b.semver}`,
      );
    }
  });

  void it("Implementation ref has :: separator between path and runT<NNN> function (per catalog enriched fields)", () => {
    for (const b of resolveAll()) {
      assert.ok(
        b.implementation_ref.includes("::"),
        `${b.transformation_id} implementation_ref missing ::function suffix`,
      );
    }
  });

  void it("Each bundle parses cleanly through ResolverResolutionBundleSchema Zod", () => {
    for (const b of resolveAll()) {
      const r = ResolverResolutionBundleSchema.safeParse(b);
      assert.ok(
        r.success,
        `${b.transformation_id} schema parse failed: ${JSON.stringify(r.error?.errors ?? []).slice(0, 400)}`,
      );
    }
  });

  void it("RESOLVER_REGISTRY_DOCUMENT parses via RegistryResolverRegistryDocumentSchema", () => {
    const r = RegistryResolverRegistryDocumentSchema.safeParse(
      RESOLVER_REGISTRY_DOCUMENT,
    );
    assert.ok(
      r.success,
      `resolver document parse failed: ${JSON.stringify(r.error?.errors ?? []).slice(0, 400)}`,
    );
  });
});
