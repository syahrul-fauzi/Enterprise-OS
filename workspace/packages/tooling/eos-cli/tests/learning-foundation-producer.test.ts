import assert from "node:assert/strict";
import test from "node:test";

import { executeEvidenceProducer } from "../src/evidence-producer-spi.js";
import { materializeDecisionImpactGraph } from "../src/decision-impact-runtime.js";
import { materializeDecisionLedgerEntry } from "../src/decision-ledger-runtime.js";
import {
  materializeDecisionLearningRecord,
  materializeDecisionOutcomeRecord,
} from "../src/decision-outcome-runtime.js";
import { LEARNING_FOUNDATION_PRODUCER } from "../src/learning-foundation-producer.js";
import type { DecisionSynthesis } from "../src/runtime-contracts/models/decision.js";

function createDecisionFixture(): DecisionSynthesis {
  return {
    decision_id: "decision:foundation:learning",
    decision_type: "foundation-review",
    decision: "WARN",
    status: "APPROVED",
    trigger: {
      trigger_id: "trigger:foundation:learning",
      trigger_type: "review",
      description: "Foundation review requires learning capture.",
      source_refs: [{ ref_id: "evidence:foundation:001", ref_kind: "evidence" }],
      triggered_at: "2026-08-03T10:00:00.000Z",
    },
    finding_refs: [{ ref_id: "finding:foundation:001", ref_kind: "finding" }],
    evidence_refs: [{ ref_id: "evidence:foundation:002", ref_kind: "evidence" }],
    assumptions: [],
    recommendation: {
      recommendation_id: "recommendation:foundation:001",
      recommendation_type: "review-first",
      summary: "Review first.",
    },
    alternatives: [
      {
        option_id: "option:review",
        label: "Review",
        description: "Review before continuing.",
        evidence_refs: [],
        tradeoffs: ["slower", "safer"],
      },
      {
        option_id: "option:waive",
        label: "Waive",
        description: "Proceed with waiver.",
        evidence_refs: [],
        tradeoffs: ["faster", "riskier"],
      },
    ],
    selected_option: "option:review",
    expected_outcome: {
      outcome_id: "expected-outcome:foundation:001",
      hypothesis: "Review improves foundation quality.",
      success_metric: "quality_score",
      target_description: "Quality score improves.",
      measurement_window: "same-run",
    },
    owner: {
      owner_id: "owner:foundation",
      owner_type: "role",
      display_name: "Foundation Owner",
    },
    confidence: 0.88,
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
    graph_digest: "graph-digest-foundation-learning-001",
    policy_version: "1.0.0",
    created_at: "2026-08-03T10:05:00.000Z",
    outcome_tracking_ref: "decision-outcome:foundation:001",
    learning_ref: "decision-learning:foundation:001",
  };
}

test("learning foundation producer encapsulates learning intelligence", async () => {
  const decisionEntry = materializeDecisionLedgerEntry({
    decision: createDecisionFixture(),
    createdAt: "2026-08-03T10:06:00.000Z",
  });
  const outcomeRecord = materializeDecisionOutcomeRecord({
    decisionEntry,
    observedMetrics: [
      {
        metric_id: "metric:foundation:quality",
        metric_name: "quality_score",
        unit: "score",
        observed_value: 1,
        target_description: "Quality improves in the same run.",
        status: "MET",
        observed_at: "2026-08-03T10:10:00.000Z",
      },
    ],
    evidenceRefs: decisionEntry.decision_snapshot.evidence_refs,
    capabilityRefs: decisionEntry.decision_snapshot.affected_nodes,
    leverageDelta: {
      metric_id: "engineering_leverage",
      baseline_value: 0.5,
      current_value: 0.7,
      delta_value: 0.2,
      interpretation: "Foundation review improved leverage.",
    },
  });
  const learningRecord = materializeDecisionLearningRecord({
    decisionEntry,
    outcomeRecord,
    lessons: ["Capture learning as a first-class producer."],
  });
  const impactGraph = materializeDecisionImpactGraph({
    decisionEntry,
    outcomeRecord,
    learningRecord,
  });

  const execution = await executeEvidenceProducer(LEARNING_FOUNDATION_PRODUCER, {
    ledgerEntries: [decisionEntry],
    outcomeRecords: [outcomeRecord],
    learningRecords: [learningRecord],
    impactGraphs: [impactGraph],
    reportRef:
      "workspace/foundation/evidence/verification/learning-intelligence-report.json",
  });

  assert.equal(execution.producer_id, "learning-producer");
  assert.equal(execution.projection.status, "PARTIAL");
  assert.equal(execution.projection.decision_count, 1);
  assert.equal(execution.projection.outcome_count, 1);
  assert.equal(execution.projection.outcome_registry_coverage, 1);
  assert.equal(execution.projection.decision_quality_index, 0);
  assert.equal(execution.projection.learning_velocity_ms, null);
  assert.equal(execution.projection.knowledge_gain_units, 2);
  assert.equal(execution.projection.knowledge_gain, 2);
  assert.equal(execution.projection.knowledge_object_count, 1);
  assert.equal(execution.projection.operationalized_knowledge_count, 0);
  assert.equal(execution.projection.knowledge_availability_rate, 0);
  assert.equal(execution.projection.knowledge_reuse_rate, 0);
  assert.equal(execution.projection.reused_knowledge_object_count, 0);
  assert.equal(execution.projection.improved_knowledge_object_count, 0);
  assert.equal(execution.projection.knowledge_lineage_count, 1);
  assert.equal(execution.projection.knowledge_lineage_preview.length, 1);
  assert.equal(execution.projection.knowledge_used_rate, 0);
  assert.equal(execution.projection.evidence_strength_index, 1);
  assert.equal(execution.projection.outcome_improvement_rate, 0);
  assert.equal(execution.projection.decision_confidence_index, 0.88);
  assert.equal(execution.projection.recommendation_effectiveness_rate, null);
  assert.equal(execution.projection.recommendation_acceptance_rate, null);
  assert.equal(execution.projection.decision_pattern_change_rate, null);
  assert.equal(execution.projection.behavior_change_rate, null);
  assert.equal(execution.projection.engineering_leverage_ratio, 1);
  assert.equal(execution.projection.repeated_mistake_count, 0);
  assert.equal(execution.projection.future_decision_improvement_rate, null);
  assert.equal(
    execution.projection.learning_registry_ref,
    "workspace/foundation/evidence/verification/learning-registry.json",
  );
  assert.equal(
    execution.projection.knowledge_registry_ref,
    "workspace/foundation/evidence/verification/knowledge-registry.json",
  );
  assert.equal(execution.materialized.learningRegistry.summary.learning_record_count, 1);
  assert.equal(execution.materialized.knowledgeRegistry.summary.knowledge_object_count, 1);
  assert.equal(execution.materialized.knowledgeRegistry.evolution.lineage_entry_count, 1);
});
