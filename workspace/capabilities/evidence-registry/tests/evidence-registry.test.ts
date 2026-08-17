import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { evidenceRegistryService } from "../implementation/service.js";

test("evidence registry indexes core science ledger artifacts", () => {
  const result = evidenceRegistryService.searchEvidenceRegistry({
    kind: "ledger",
  });

  assert.ok(result.total >= 1);
  assert.ok(result.matched >= 1);
  assert.ok(
    result.items.some((item) => item.path === "enterprise/science/gate-c/execution/proof-ledger.yaml"),
  );
});

test("evidence registry can filter requirement-linked evidence", () => {
  const result = evidenceRegistryService.searchEvidenceRegistry({
    requirementRef: "REQ-0001",
  });

  assert.ok(result.matched >= 2);
  assert.ok(result.items.every((item) => item.requirementRefs.includes("REQ-0001")));
  assert.ok(
    result.items.some((item) =>
      item.path === "workspace/examples/vertical-slice/REQ-0001/eir-output/REQ-0001.eir.json",
    ),
  );
});

test("evidence registry retrieves record detail by id", () => {
  const listing = evidenceRegistryService.searchEvidenceRegistry({
    q: "proof-ledger",
    limit: 1,
  });

  assert.equal(listing.items.length, 1);

  const detail = evidenceRegistryService.getEvidenceRecord({
    id: listing.items[0].id,
  });

  assert.ok(detail);
  assert.equal(detail.kind, "ledger");
  assert.ok(detail.preview.includes("ledger_id"));
  assert.ok(detail.lineCount > 0);
});

test("evidence registry can rediscover durable external delivery evidence", () => {
  const previousRoot = process.env.EOS_EVIDENCE_STORAGE_ROOT;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "eos-evidence-registry-"));
  const artifactPath = path.join(
    tempRoot,
    "products",
    "services-id",
    "evidence",
    "delivery",
    "REQ-424",
    "run-req-424",
    "delivery-execution-evidence.json",
  );

  try {
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.writeFileSync(
      artifactPath,
      `${JSON.stringify(
        {
          artifact_id: "delivery-execution-evidence:req-424:test",
          requirement: {
            requirement_id: "req-424",
            requirement_ref: "REQ-424",
          },
          digest: "test-digest-424",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    process.env.EOS_EVIDENCE_STORAGE_ROOT = tempRoot;

    const result = evidenceRegistryService.searchEvidenceRegistry({
      requirementRef: "REQ-424",
      limit: 20,
      offset: 0,
    });

    assert.ok(result.matched >= 1);
    assert.ok(
      result.items.some(
        (item) =>
          item.path ===
            "products/services-id/evidence/delivery/REQ-424/run-req-424/delivery-execution-evidence.json" &&
          item.requirementRefs.includes("REQ-424"),
      ),
    );
  } finally {
    if (previousRoot === undefined) {
      delete process.env.EOS_EVIDENCE_STORAGE_ROOT;
    } else {
      process.env.EOS_EVIDENCE_STORAGE_ROOT = previousRoot;
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
