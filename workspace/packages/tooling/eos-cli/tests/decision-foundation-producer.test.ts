import assert from "node:assert/strict";
import test from "node:test";

import { executeEvidenceProducer } from "../src/evidence-producer-spi.js";
import { DECISION_FOUNDATION_PRODUCER } from "../src/decision-foundation-producer.js";
import { materializeDecisionImpactGraph } from "../src/decision-impact-runtime.js";
import { materializeDecisionLedgerEntry } from "../src/decision-ledger-runtime.js";
import {
  materializeDecisionLearningRecord,
  materializeDecisionOutcomeRecord,
} from "../src/decision-outcome-runtime.js";
import type { DecisionSynthesis } from "../src/runtime-contracts/models/decision.js";

function createDecisionFixture(): DecisionSynthesis {
  return {
    decision_id: "decision:release:foundation",
    decision_type: "release-readiness",
    decision: "WARN",
    status: "APPROVED",
    trigger: {
      trigger_id: "trigger:release-foundation",
      trigger_type: "release-review",
      description: "Foundation evidence requires review.",
      source_refs: [{ ref_id: "evidence:foundation:001", ref_kind: "evidence" }],
      triggered_at: "2026-08-03T10:00:00.000Z",
    },
    finding_refs: [{ ref_id: "finding:foundation:001", ref_kind: "finding" }],
    evidence_refs: [{ ref_id: "evidence:capability:001", ref_kind: "evidence" }],
    assumptions: [],
    recommendation: {
      recommendation_id: "recommendation:foundation:001",
      recommendation_type: "conditional-release",
      summary: "Proceed after foundation review.",
    },
    alternatives: [
      {
        option_id: "option:foundation:review",
        label: "Review First",
        description: "Review before continuing.",
        evidence_refs: [],
        tradeoffs: ["slower", "safer"],
      },
      {
        option_id: "option:foundation:waiver",
        label: "Waiver",
        description: "Proceed with explicit waiver.",
        evidence_refs: [],
        tradeoffs: ["faster", "riskier"],
      },
    ],
    selected_option: "option:foundation:review",
    expected_outcome: {
      outcome_id: "expected-outcome:foundation:001",
      hypothesis: "Review improves readiness quality.",
      success_metric: "readiness_score",
      target_description: "Readiness score improves.",
      measurement_window: "same-run",
    },
    owner: {
      owner_id: "owner:foundation",
      owner_type: "role",
      display_name: "Foundation Owner",
    },
    confidence: 0.9,
    reason_codes: ["FOUNDATION_REVIEW"],
    reasons: [
      {
        code: "FOUNDATION_REVIEW",
        source_evaluation_id: "evaluation:foundation:001",
        message: "Foundation review is required.",
      },
    ],
    required_actions: [],
    affected_nodes: ["capability:foundation"],
    source_evaluation_ids: ["evaluation:foundation:001"],
    graph_digest: "graph-digest-foundation-001",
    policy_version: "1.0.0",
    created_at: "2026-08-03T10:05:00.000Z",
    outcome_tracking_ref: "decision-outcome:foundation:001",
    learning_ref: "decision-learning:foundation:001",
  };
}

test("decision foundation producer encapsulates decision quality evaluation", async () => {
  const decisionEntry = materializeDecisionLedgerEntry({
    decision: createDecisionFixture(),
    createdAt: "2026-08-03T10:06:00.000Z",
  });
  const outcomeRecord = materializeDecisionOutcomeRecord({
    decisionEntry,
    observedMetrics: [
      {
        metric_id: "metric:foundation:readiness",
        metric_name: "readiness_score",
        unit: "score",
        observed_value: 1,
        target_description: "Readiness improves in the same run.",
        status: "MET",
        observed_at: "2026-08-03T10:10:00.000Z",
      },
    ],
    evidenceRefs: decisionEntry.decision_snapshot.evidence_refs,
    capabilityRefs: decisionEntry.decision_snapshot.affected_nodes,
    leverageDelta: {
      metric_id: "engineering_leverage",
      baseline_value: 0.5,
      current_value: 0.8,
      delta_value: 0.3,
      interpretation: "Foundation review improved leverage.",
    },
  });
  const learningRecord = materializeDecisionLearningRecord({
    decisionEntry,
    outcomeRecord,
    lessons: ["Producer boundary keeps the orchestrator smaller."],
  });
  const impactGraph = materializeDecisionImpactGraph({
    decisionEntry,
    outcomeRecord,
    learningRecord,
  });

  const execution = await executeEvidenceProducer(DECISION_FOUNDATION_PRODUCER, {
    ledgerEntries: [decisionEntry],
    outcomeRecords: [outcomeRecord],
    learningRecords: [learningRecord],
    impactGraphs: [impactGraph],
    reportRef:
      "workspace/foundation/evidence/verification/decision-quality-report.json",
  });

  assert.equal(execution.producer_id, "decision-producer");
  assert.equal(execution.projection.status, "HEALTHY");
  assert.equal(execution.projection.decision_count, 1);
  assert.equal(execution.projection.decision_outcome_coverage, 1);
  assert.equal(execution.projection.decision_learning_closure, 1);
  assert.equal(execution.projection.decision_effectiveness, 1);
  assert.equal(execution.projection.decision_success_rate, 1);
  assert.equal(execution.projection.false_decision_rate, 0);
  assert.equal(execution.projection.decision_reversal_rate, 0);
  assert.equal(execution.projection.evidence_utilization_rate, 1);
  assert.equal(execution.projection.knowledge_reuse_rate, 0);
  assert.equal(execution.projection.mean_time_to_outcome_ms, 300000);
  assert.equal(execution.projection.learning_velocity_ms, 0);
  assert.equal(execution.projection.decision_confidence_growth, null);
  assert.equal(
    execution.materialized.report.summary.decision_impact_graph_completeness.ratio,
    1,
  );
});
