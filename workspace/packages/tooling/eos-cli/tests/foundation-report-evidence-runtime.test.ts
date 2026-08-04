import assert from "node:assert/strict";
import test from "node:test";

import {
  FOUNDATION_REPORT_EVIDENCE_PRODUCER,
  materializeFoundationReportProjection,
  persistFoundationReportArtifacts,
} from "../src/foundation-report-evidence-runtime.js";

test("foundation report producer is registered on canonical producer runtime", () => {
  assert.equal(
    FOUNDATION_REPORT_EVIDENCE_PRODUCER.producer_id,
    "foundation-report-producer",
  );
  assert.equal(
    FOUNDATION_REPORT_EVIDENCE_PRODUCER.artifact_type,
    "foundation-report-evidence",
  );
  assert.equal(
    FOUNDATION_REPORT_EVIDENCE_PRODUCER.subject_type,
    "foundation-verification",
  );
  assert.equal(FOUNDATION_REPORT_EVIDENCE_PRODUCER.schema_version, "1.0.0");
});

test("foundation report artifacts materialize canonical projection and evidence", () => {
  const payload = {
    verification_result: {
      foundation_status: "PARTIAL_BASELINE",
      health_status: "PARTIAL",
    },
    foundation_metrics: {
      verified_products: 2,
    },
    execution_evidence_summary: {
      observed_capabilities: 7,
    },
    decision_quality: {
      status: "PARTIAL",
    },
    evidence_convergence: {
      status: "PASS",
    },
  };

  const projection = materializeFoundationReportProjection(
    payload,
    "2026-08-03T12:00:00.000Z",
  );
  const artifact = persistFoundationReportArtifacts({
    payload,
    projectionJsonPath: "/tmp/eos-foundation-report-projection.json",
    evidencePath: "/tmp/eos-foundation-report-evidence.json",
    generatedAtUtc: "2026-08-03T12:00:00.000Z",
  });

  assert.equal(projection.projection_type, "FoundationReportProjection");
  assert.equal(artifact.artifact_type, "foundation-report-evidence");
  assert.equal(artifact.subject.subject_type, "foundation-verification");
  assert.equal(artifact.summary.foundation_status, "PARTIAL_BASELINE");
  assert.equal(artifact.summary.health_status, "PARTIAL");
  assert.ok(artifact.findings.includes("Foundation status is PARTIAL_BASELINE."));
});
