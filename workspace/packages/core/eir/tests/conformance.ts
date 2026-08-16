import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import {
  ElsDocumentSchema,
  EirRecordSchema,
  CanonicalStatusSchema,
  SpecKindSchema,
} from "../src/schema";

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(join(TESTS_DIR, "..", "..", "..", ".."));

void describe("@repo/core-eir conformance", () => {
  void it("parses package types without runtime execution", () => {
    assert.ok(CanonicalStatusSchema.enum.DRAFT === "DRAFT");
    assert.ok(SpecKindSchema.enum.ELS_LANGUAGE_SPECIFICATION === "ELS_LANGUAGE_SPECIFICATION");
  });

  void it("validates REQ-0001 golden ELS document against ElsDocumentSchema", () => {
    const elsPath = join(
      WORKSPACE_ROOT,
      "examples",
      "vertical-slice",
      "REQ-0001",
      "req-0001.els.yaml",
    );
    const raw = readFileSync(elsPath, "utf8");
    const parsed = YAML.parse(raw);
    const result = ElsDocumentSchema.safeParse(parsed);
    assert.ok(
      result.success,
      `Golden REQ-0001 ELS parse failed: ${JSON.stringify(result.error?.errors ?? [], null, 2)}`,
    );
  });

  void it("rejects malformed EIR records with deterministic_nonce missing", () => {
    const badRecord = {
      eir_id: "eir-bad-001",
      transformation_id: "T001",
      source_els_id: "REQ-0001",
      source_els_version: "1.0.0",
      source_els_hash: "sha256:placeholder",
      instruction_set: [],
      capability_refs: [],
      emitted_at: "2026-07-30T00:00:00Z",
      status: "DRAFT",
      spec_kind: "EIR_INSTRUCTION_RECORD",
    } as const;
    const result = EirRecordSchema.safeParse(badRecord);
    assert.ok(!result.success, "Expected reject without determinism_context");
  });
});
