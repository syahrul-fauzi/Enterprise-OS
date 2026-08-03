import assert from "node:assert/strict";
import test from "node:test";
import { evidenceRegistryService } from "../implementation/service";

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
