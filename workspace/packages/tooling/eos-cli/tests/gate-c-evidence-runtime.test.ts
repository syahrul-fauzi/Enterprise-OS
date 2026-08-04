import assert from "node:assert/strict";
import test from "node:test";

import {
  GATE_C_STATUS_EVIDENCE_PRODUCER,
  materializeGateCStatusProjection,
  persistGateCStatusArtifacts,
} from "../src/gate-c-evidence-runtime.js";

test("gate c evidence producer is registered on canonical producer runtime", () => {
  assert.equal(GATE_C_STATUS_EVIDENCE_PRODUCER.producer_id, "gate-c-status-producer");
  assert.equal(GATE_C_STATUS_EVIDENCE_PRODUCER.artifact_type, "gate-c-status-evidence");
  assert.equal(GATE_C_STATUS_EVIDENCE_PRODUCER.subject_type, "gate-c-status");
  assert.equal(GATE_C_STATUS_EVIDENCE_PRODUCER.schema_version, "1.0.0");
});

test("gate c status artifacts materialize canonical projection and evidence", () => {
  const payload = {
    governance_platform: {
      specification_system: {
        status: "PASS",
      },
    },
    coverage: {
      truth_table_row_completion_percent: 100,
      operational_completion_percent: 75,
    },
    acceptance_authority: {
      contract_id: "gate-c-acceptance",
    },
    overall: {
      gate_c1_status: "RATIFIABLE",
      specification_system_status: "PASS",
      decision_quality_status: "PARTIAL",
      capability_graph_evidence_health_status: "WARN",
    },
  };

  const projection = materializeGateCStatusProjection(
    payload,
    "2026-08-03T12:00:00.000Z",
  );
  const artifact = persistGateCStatusArtifacts({
    payload,
    projectionJsonPath: "/tmp/eos-gate-c-status-projection.json",
    evidencePath: "/tmp/eos-gate-c-status-evidence.json",
    generatedAtUtc: "2026-08-03T12:00:00.000Z",
    statusYamlRef: "enterprise/science/gate-c/execution/gate-c-status.yaml",
  });

  assert.equal(projection.projection_type, "GateCStatusProjection");
  assert.equal(artifact.artifact_type, "gate-c-status-evidence");
  assert.equal(artifact.subject.subject_type, "gate-c-status");
  assert.equal(artifact.summary.gate_c1_status, "RATIFIABLE");
  assert.equal(
    artifact.projection.projection_type,
    "GateCStatusProjection",
  );
  assert.ok(
    artifact.findings.includes("Decision quality status is PARTIAL."),
  );
});
