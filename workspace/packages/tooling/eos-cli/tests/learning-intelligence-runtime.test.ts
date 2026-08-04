import assert from "node:assert/strict";
import test from "node:test";

import { materializeDecisionImpactGraph } from "../src/decision-impact-runtime.js";
import { materializeDecisionLedgerEntry } from "../src/decision-ledger-runtime.js";
import {
  materializeDecisionLearningRecord,
  materializeDecisionOutcomeRecord,
} from "../src/decision-outcome-runtime.js";
import {
  materializeLearningIntelligenceArtifacts,
  materializeLearningIntelligenceReport,
} from "../src/learning-intelligence-runtime.js";
import type { DecisionSynthesis } from "../src/runtime-contracts/models/decision.js";

function createDecisionFixture(
  overrides?: Partial<DecisionSynthesis>,
): DecisionSynthesis {
  return {
    decision_id: "decision:release:learning",
    decision_type: "release-readiness",
    decision: "WARN",
    status: "APPROVED",
    trigger: {
      trigger_id: "trigger:release-learning",
      trigger_type: "release-review",
      description: "Release learning requires outcome review.",
      source_refs: [{ ref_id: "evidence:release:001", ref_kind: "evidence" }],
      triggered_at: "2026-08-03T10:00:00.000Z",
    },
    finding_refs: [{ ref_id: "finding:release:001", ref_kind: "finding" }],
    evidence_refs: [{ ref_id: "evidence:capability:001", ref_kind: "evidence" }],
    assumptions: [],
    recommendation: {
      recommendation_id: "recommendation:release:001",
      recommendation_type: "conditional-release",
      summary: "Proceed after architecture review.",
    },
    alternatives: [
      {
        option_id: "option:review-first",
        label: "Review First",
        description: "Review architecture first.",
        evidence_refs: [],
        tradeoffs: ["slower", "safer"],
      },
      {
        option_id: "option:ship-now",
        label: "Ship Now",
        description: "Ship with waiver.",
        evidence_refs: [],
        tradeoffs: ["faster", "riskier"],
      },
    ],
    selected_option: "option:review-first",
    expected_outcome: {
      outcome_id: "expected-outcome:release:001",
      hypothesis: "Earlier review reduces release instability.",
      success_metric: "unstable_dependency_count",
      target_description: "Dependency instability falls to zero.",
      measurement_window: "before_release",
    },
    owner: {
      owner_id: "owner:release",
      owner_type: "role",
      display_name: "Release Owner",
    },
    confidence: 0.8,
    reason_codes: ["REVIEW_FIRST"],
    reasons: [
      {
        code: "REVIEW_FIRST",
        source_evaluation_id: "evaluation:release:001",
        message: "Review is required before release.",
      },
    ],
    required_actions: [],
    affected_nodes: ["capability:release"],
    source_evaluation_ids: ["evaluation:release:001"],
    graph_digest: "graph-digest-release-001",
    policy_version: "1.0.0",
    created_at: "2026-08-03T10:05:00.000Z",
    outcome_tracking_ref: "decision-outcome:release:001",
    learning_ref: "decision-learning:release:001",
    ...overrides,
  };
}

test("learning intelligence materializes outcome registry and learning KPIs", () => {
  const originalDecision = materializeDecisionLedgerEntry({
    decision: createDecisionFixture(),
    createdAt: "2026-08-03T10:06:00.000Z",
  });
  const originalOutcome = materializeDecisionOutcomeRecord({
    decisionEntry: originalDecision,
    observedMetrics: [
      {
        metric_id: "metric:release:stability",
        metric_name: "stability",
        unit: "count",
        observed_value: 1,
        target_description: "Incidents fall to zero.",
        status: "MISSED",
        observed_at: "2026-08-03T10:10:00.000Z",
      },
    ],
    evidenceRefs: originalDecision.decision_snapshot.evidence_refs,
    capabilityRefs: originalDecision.decision_snapshot.affected_nodes,
    leverageDelta: {
      metric_id: "engineering_leverage",
      baseline_value: 1,
      current_value: 0.8,
      delta_value: -0.2,
      interpretation: "Initial decision reduced leverage.",
    },
  });
  const originalLearning = materializeDecisionLearningRecord({
    decisionEntry: originalDecision,
    outcomeRecord: originalOutcome,
    lessons: ["Review must start before freeze."],
    followUpActions: ["action:review-earlier"],
    createdAt: "2026-08-03T10:12:00.000Z",
  });
  const originalImpact = materializeDecisionImpactGraph({
    decisionEntry: originalDecision,
    outcomeRecord: originalOutcome,
    learningRecord: originalLearning,
  });

  const improvedDecision = materializeDecisionLedgerEntry({
    decision: createDecisionFixture({
      confidence: 0.92,
      created_at: "2026-08-03T10:20:00.000Z",
        selected_option: "option:ship-now",
        required_actions: [
          {
            action_id: "action:review-earlier",
            action_type: "process-update",
            description: "Start the review earlier in the cycle.",
            target_refs: ["capability:release"],
          },
        ],
    }),
    createdAt: "2026-08-03T10:21:00.000Z",
    supersedesDecisionEntryId: originalDecision.decision_entry_id,
  });
  const improvedOutcome = materializeDecisionOutcomeRecord({
    decisionEntry: improvedDecision,
    observedMetrics: [
      {
        metric_id: "metric:release:stability",
        metric_name: "stability",
        unit: "count",
        observed_value: 0,
        target_description: "Incidents fall to zero.",
        status: "MET",
        observed_at: "2026-08-03T10:28:00.000Z",
      },
    ],
    evidenceRefs: improvedDecision.decision_snapshot.evidence_refs,
    capabilityRefs: improvedDecision.decision_snapshot.affected_nodes,
    leverageDelta: {
      metric_id: "engineering_leverage",
      baseline_value: 0.8,
      current_value: 1.1,
      delta_value: 0.3,
      interpretation: "Captured learning improved leverage.",
    },
  });
  const improvedLearning = materializeDecisionLearningRecord({
    decisionEntry: improvedDecision,
    outcomeRecord: improvedOutcome,
    lessons: ["Use freeze-window review checklist."],
    followUpActions: ["action:reuse-review-checklist"],
    createdAt: "2026-08-03T10:29:00.000Z",
  });
  const improvedImpact = materializeDecisionImpactGraph({
    decisionEntry: improvedDecision,
    outcomeRecord: improvedOutcome,
    learningRecord: improvedLearning,
  });

  const report = materializeLearningIntelligenceReport({
    ledgerEntries: [originalDecision, improvedDecision],
    outcomeRecords: [originalOutcome, improvedOutcome],
    learningRecords: [originalLearning, improvedLearning],
    impactGraphs: [originalImpact, improvedImpact],
    generatedAtUtc: "2026-08-03T11:00:00.000Z",
  });

    assert.equal(report.status, "HEALTHY");
  assert.equal(report.summary.decision_count, 2);
  assert.equal(report.summary.outcome_count, 2);
  assert.equal(report.summary.validated_outcome_count, 1);
  assert.equal(report.summary.false_decision_count, 1);
  assert.equal(report.summary.reverted_decision_count, 1);
  assert.equal(report.summary.repeated_mistake_count, 0);
  assert.equal(report.summary.closed_learning_count, 2);
  assert.equal(report.summary.outcome_registry_coverage, 1);
    assert.equal(report.summary.learning_velocity_ms, 600000);
  assert.equal(report.summary.knowledge_gain_units, 4);
  assert.equal(report.summary.knowledge_gain, 2);
  assert.equal(report.summary.knowledge_object_count, 2);
  assert.equal(report.summary.operationalized_knowledge_count, 1);
  assert.equal(report.summary.knowledge_reuse_rate, 0.5);
  assert.equal(report.summary.knowledge_used_rate, 1);
  assert.equal(report.summary.evidence_strength_index, 1);
  assert.equal(report.summary.outcome_improvement_rate, 1);
  assert.equal(report.summary.decision_confidence_index, 0.86);
  assert.equal(report.summary.recommendation_effectiveness_rate, 1);
    assert.equal(report.summary.recommendation_acceptance_rate, 1);
    assert.equal(report.summary.decision_pattern_change_rate, 1);
    assert.equal(report.summary.behavior_change_rate, 1);
  assert.equal(report.summary.engineering_leverage_ratio, 0.5);
  assert.equal(report.summary.future_decision_improvement_rate, 1);
    assert.equal(report.summary.decision_quality_index, 0.86);
    assert.equal(report.outcome_registry[0]?.recommendation_accepted, true);
    assert.equal(report.outcome_registry[0]?.behavior_changed, true);
  assert.equal(report.outcome_registry[1]?.reused_prior_learning, true);
    assert.equal(report.outcome_registry[0]?.future_decision_improved, true);
});

test("learning intelligence materializes learning and knowledge registries", () => {
  const originalDecision = materializeDecisionLedgerEntry({
    decision: createDecisionFixture(),
    createdAt: "2026-08-03T10:06:00.000Z",
  });
  const originalOutcome = materializeDecisionOutcomeRecord({
    decisionEntry: originalDecision,
    observedMetrics: [
      {
        metric_id: "metric:release:stability",
        metric_name: "stability",
        unit: "count",
        observed_value: 1,
        target_description: "Incidents fall to zero.",
        status: "MISSED",
        observed_at: "2026-08-03T10:10:00.000Z",
      },
    ],
    evidenceRefs: originalDecision.decision_snapshot.evidence_refs,
    capabilityRefs: originalDecision.decision_snapshot.affected_nodes,
  });
  const originalLearning = materializeDecisionLearningRecord({
    decisionEntry: originalDecision,
    outcomeRecord: originalOutcome,
    lessons: ["Review must start before freeze."],
    followUpActions: ["action:review-earlier"],
    createdAt: "2026-08-03T10:12:00.000Z",
  });
  const originalImpact = materializeDecisionImpactGraph({
    decisionEntry: originalDecision,
    outcomeRecord: originalOutcome,
    learningRecord: originalLearning,
  });
  const improvedDecision = materializeDecisionLedgerEntry({
    decision: createDecisionFixture({
      confidence: 0.92,
      created_at: "2026-08-03T10:20:00.000Z",
      selected_option: "option:ship-now",
      required_actions: [
        {
          action_id: "action:review-earlier",
          action_type: "process-update",
          description: "Start the review earlier in the cycle.",
          target_refs: ["capability:release"],
        },
      ],
    }),
    createdAt: "2026-08-03T10:21:00.000Z",
    supersedesDecisionEntryId: originalDecision.decision_entry_id,
  });
  const improvedOutcome = materializeDecisionOutcomeRecord({
    decisionEntry: improvedDecision,
    observedMetrics: [
      {
        metric_id: "metric:release:stability",
        metric_name: "stability",
        unit: "count",
        observed_value: 0,
        target_description: "Incidents fall to zero.",
        status: "MET",
        observed_at: "2026-08-03T10:28:00.000Z",
      },
    ],
    evidenceRefs: improvedDecision.decision_snapshot.evidence_refs,
    capabilityRefs: improvedDecision.decision_snapshot.affected_nodes,
  });
  const improvedLearning = materializeDecisionLearningRecord({
    decisionEntry: improvedDecision,
    outcomeRecord: improvedOutcome,
    lessons: ["Use freeze-window review checklist."],
    followUpActions: ["action:reuse-review-checklist"],
    createdAt: "2026-08-03T10:29:00.000Z",
  });
  const improvedImpact = materializeDecisionImpactGraph({
    decisionEntry: improvedDecision,
    outcomeRecord: improvedOutcome,
    learningRecord: improvedLearning,
  });

  const artifacts = materializeLearningIntelligenceArtifacts({
    ledgerEntries: [originalDecision, improvedDecision],
    outcomeRecords: [originalOutcome, improvedOutcome],
    learningRecords: [originalLearning, improvedLearning],
    impactGraphs: [originalImpact, improvedImpact],
    generatedAtUtc: "2026-08-03T11:00:00.000Z",
  });

  assert.equal(artifacts.learningRegistry.summary.learning_record_count, 2);
  assert.equal(artifacts.learningRegistry.summary.reused_learning_count, 1);
  assert.equal(artifacts.learningRegistry.entries[0]?.knowledge_key.startsWith("knowledge-key:"), true);
  assert.equal(artifacts.knowledgeRegistry.summary.knowledge_object_count, 2);
  assert.equal(artifacts.knowledgeRegistry.summary.operationalized_knowledge_count, 1);
  assert.equal(artifacts.knowledgeRegistry.summary.knowledge_availability_rate, 0.5);
  assert.equal(artifacts.knowledgeRegistry.summary.reused_knowledge_object_count, 1);
  assert.equal(artifacts.knowledgeRegistry.summary.improved_knowledge_object_count, 1);
  assert.equal(artifacts.knowledgeRegistry.summary.total_reuse_count, 1);
  assert.equal(artifacts.knowledgeRegistry.evolution.lineage_entry_count, 2);
  assert.equal(
    artifacts.knowledgeRegistry.entries.some(
      (entry) => entry.knowledge_status === "OPERATIONALIZED",
    ),
    true,
  );
  assert.equal(
    artifacts.knowledgeRegistry.evolution.entries.some(
      (entry) => entry.evolution_stage === "IMPROVED",
    ),
    true,
  );
  assert.equal(artifacts.report.knowledge_lineage_preview.length, 2);
  assert.equal(
    artifacts.report.knowledge_lineage_preview[0]?.knowledge_id,
    artifacts.knowledgeRegistry.evolution.entries[0]?.knowledge_id,
  );
});
