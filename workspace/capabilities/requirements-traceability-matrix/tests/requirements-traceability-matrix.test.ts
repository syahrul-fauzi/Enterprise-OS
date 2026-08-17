import assert from "node:assert/strict";
import test from "node:test";
import { RequirementId } from "../../requirement-management/implementation/contracts/index.js";
import {
  requirementsTraceabilityMatrixService,
} from "../implementation/service.js";

test("rtm returns a traceability row for requirement delivery artifacts", () => {
  const row = requirementsTraceabilityMatrixService.getTraceabilityRow({
    requirementId: RequirementId("req-001"),
  });

  assert.ok(row);
  assert.equal(row.requirementId, "req-001");
  assert.ok(row.matchedArtifacts.some((artifact) => artifact.reference === "/api/requirements"));
  assert.ok(
    row.matchedArtifacts.some(
      (artifact) =>
        artifact.reference ===
        "workspace/capabilities/requirement-management/tests/requirement-management.test.ts",
    ),
  );
  assert.equal(row.coverage.hasDeliveryArtifacts, true);
  assert.equal(row.coverage.hasVerificationArtifacts, true);
});

test("rtm search can isolate complete evidence-backed rows for EOS-002", () => {
  const result = requirementsTraceabilityMatrixService.searchTraceabilityMatrix({
    linkedCapabilityId: "EOS-002",
    coverage: "complete",
  });

  assert.ok(result.total >= 1);
  assert.ok(result.items.some((row) => row.requirementId === "req-003"));

  const req003 = result.items.find((row) => row.requirementId === "req-003");
  assert.ok(req003);
  assert.equal(req003.coverage.complete, true);
  assert.ok(
    req003.matchedArtifacts.some(
      (artifact) =>
        artifact.reference ===
        "workspace/examples/vertical-slice/REQ-0001/eir-output/REQ-0001.eir.json",
    ),
  );
});

test("rtm search can filter only evidence artifacts", () => {
  const result = requirementsTraceabilityMatrixService.searchTraceabilityMatrix({
    linkedCapabilityId: "EOS-002",
    artifactKind: "evidence",
  });

  assert.ok(result.total >= 1);
  assert.ok(result.items.every((row) => row.matchedArtifacts.every((artifact) => artifact.kind === "evidence")));
  assert.ok(
    result.items.some((row) =>
      row.matchedArtifacts.some((artifact) => artifact.reference.endsWith("REQ-0001.eir.json")),
    ),
  );
});
