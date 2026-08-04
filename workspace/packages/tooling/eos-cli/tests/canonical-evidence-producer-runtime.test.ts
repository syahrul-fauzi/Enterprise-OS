import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_CANONICAL_EVIDENCE_PRODUCER_TARGETS,
  materializeCanonicalEvidenceProducerReport,
  produceCanonicalEvidenceFromProducer,
} from "../src/canonical-evidence-producer-runtime.js";
import { DECISION_IMPACT_EVIDENCE_PRODUCER } from "../src/decision-impact-runtime.js";
import { DECISION_OUTCOME_EVIDENCE_PRODUCER } from "../src/decision-outcome-runtime.js";
import { FOUNDATION_REPORT_EVIDENCE_PRODUCER } from "../src/foundation-report-evidence-runtime.js";
import { GATE_C_STATUS_EVIDENCE_PRODUCER } from "../src/gate-c-evidence-runtime.js";
import { PRODUCT_RUNTIME_EVIDENCE_PRODUCER } from "../src/product-runtime-evidence-runtime.js";
import { createProjection } from "../src/projection-domain.js";
import { SPECIFICATION_CONFORMANCE_EVIDENCE_PRODUCER } from "../src/specification-projection-runtime.js";

test("canonical evidence producer report shows converged registered producers", () => {
  const report = materializeCanonicalEvidenceProducerReport([
    FOUNDATION_REPORT_EVIDENCE_PRODUCER,
    GATE_C_STATUS_EVIDENCE_PRODUCER,
    PRODUCT_RUNTIME_EVIDENCE_PRODUCER,
    SPECIFICATION_CONFORMANCE_EVIDENCE_PRODUCER,
    DECISION_OUTCOME_EVIDENCE_PRODUCER,
    DECISION_IMPACT_EVIDENCE_PRODUCER,
  ], DEFAULT_CANONICAL_EVIDENCE_PRODUCER_TARGETS);

  assert.equal(report.status, "WARN");
  assert.equal(report.summary.producer_count, 6);
  assert.deepEqual(report.summary.canonical_schema_versions, ["1.0.0"]);
  assert.equal(report.summary.artifact_type_count, 6);
  assert.equal(report.summary.target_producer_count, 9);
  assert.equal(report.summary.registered_target_producer_count, 6);
  assert.equal(report.summary.target_coverage_ratio, 0.6667);
  assert.deepEqual(
    report.missing_target_producers.map((producer) => producer.producer_id),
    ["doctor-producer", "policy-producer", "build-producer"],
  );
  assert.equal(
    report.producers.every(
      (producer) =>
        producer.canonical_envelope.subject &&
        producer.canonical_envelope.projection &&
        producer.canonical_envelope.digest &&
        producer.canonical_envelope.signature,
    ),
    true,
  );
});

test("canonical evidence producer runtime materializes shared evidence envelope", () => {
  const projection = createProjection({
    projectionType: "DecisionOutcomeProjection",
    schemaVersion: "1.0.0",
    generatedFrom: [
      {
        source_type: "decision_ledger_entry",
        source_ref: "decision-entry:001",
        source_digest: "decision-digest:001",
      },
    ],
    generatedAtUtc: "2026-08-03T12:00:00.000Z",
    payload: {
      decision_id: "decision:001",
      outcome_status: "ACHIEVED",
    },
  });

  const artifact = produceCanonicalEvidenceFromProducer({
    producer: DECISION_OUTCOME_EVIDENCE_PRODUCER,
    generated_at_utc: "2026-08-03T12:00:00.000Z",
    subject: {
      subject_ref: "workspace/foundation/evidence/verification/nonexistent.json",
    },
    projection,
    summary: {
      decision_id: "decision:001",
      outcome_status: "ACHIEVED",
      learning_status: "CAPTURED",
      observed_metric_count: 1,
    },
    findings: ["Outcome achieved."],
    evidence: {
      decision_reference: {
        decision_entry_id: "decision-entry:001",
        decision_id: "decision:001",
      },
      expected_outcome: {
        outcome_id: "outcome:001",
        hypothesis: "Test hypothesis",
        success_metric: "metric",
        target_description: "Target met",
        measurement_window: "release_window",
      },
      observed_metrics: [],
      leverage_delta: null,
      learning: {
        learning_id: "decision-learning:001",
        decision_reference: {
          decision_entry_id: "decision-entry:001",
          decision_id: "decision:001",
        },
        outcome_tracking_id: "decision-outcome:001",
        status: "CAPTURED",
        hypotheses_validated: ["Test hypothesis"],
        hypotheses_invalidated: [],
        lessons: ["Capture learning."],
        follow_up_actions: [],
        created_at: "2026-08-03T12:00:00.000Z",
      },
      projection_payload_ref: null,
    },
  });

  assert.equal(artifact.artifact_type, "decision-outcome-evidence");
  assert.equal(artifact.subject.subject_type, "decision_ledger_entry");
  assert.equal(artifact.projection.projection_type, "DecisionOutcomeProjection");
  assert.equal(artifact.signature.status, "UNSIGNED");
});
