import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

import { materializeSpecificationConformanceReport } from "../src/specification-conformance-runtime.js";
import {
  materializeSpecificationConformanceEvidence,
  materializeSpecificationConformanceProjection,
  persistSpecificationConformanceEvidence,
  persistSpecificationConformanceProjection,
} from "../src/specification-projection-runtime.js";

test("specification conformance materializes explicit projection layer", () => {
  const report = materializeSpecificationConformanceReport();
  const projection = materializeSpecificationConformanceProjection(report);
  const payload = projection.payload;

  assert.equal(
    projection.projection_type,
    "SpecificationConformanceProjection",
  );
  assert.equal(
    payload.report_id,
    "specification-conformance-report",
  );
  assert.equal(payload.summary.warn_count, 0);
  assert.equal(payload.summary.clause_count, 29);
});

test("specification conformance materializes canonical evidence artifact", () => {
  const report = materializeSpecificationConformanceReport();
  const projection = materializeSpecificationConformanceProjection(report);
  const artifact = materializeSpecificationConformanceEvidence({
    report,
    projection,
    projectionRef:
      "workspace/foundation/evidence/verification/specification-conformance-projection.json",
  });

  assert.equal(artifact.artifact_type, "specification-conformance-evidence");
  assert.equal(artifact.summary.status, "PASS");
  assert.equal(artifact.summary.clause_count, 29);
  assert.equal(artifact.summary.clause_pass_count, 29);
  assert.equal(
    artifact.subject.subject_ref,
    "enterprise/specifications/specification-registry.yaml",
  );
  assert.equal(
    artifact.projection.projection_type,
    "SpecificationConformanceProjection",
  );
  assert.equal(
    artifact.evidence.projection_payload_ref,
    "workspace/foundation/evidence/verification/specification-conformance-projection.json",
  );
  assert.equal(artifact.evidence.coverage.clause.total, 29);
  assert.equal(artifact.evidence.coverage.clause.passing, 29);
  assert.equal(artifact.findings.length, 0);
});

test("specification conformance projection and evidence can be persisted", () => {
  const projectionPath = resolve(
    tmpdir(),
    `specification-conformance-projection-${process.pid}.json`,
  );
  const evidencePath = resolve(
    tmpdir(),
    `specification-conformance-evidence-${process.pid}.json`,
  );

  const persistedProjection = persistSpecificationConformanceProjection({
    path: projectionPath,
  });
  const artifact = persistSpecificationConformanceEvidence({
    path: evidencePath,
    projection: persistedProjection.projection,
    projectionRef:
      "workspace/foundation/evidence/verification/specification-conformance-projection.json",
  });

  assert.ok(existsSync(projectionPath));
  assert.ok(existsSync(evidencePath));
  assert.equal(
    persistedProjection.projection.projection_type,
    "SpecificationConformanceProjection",
  );
  assert.equal(artifact.summary.status, "PASS");
});
