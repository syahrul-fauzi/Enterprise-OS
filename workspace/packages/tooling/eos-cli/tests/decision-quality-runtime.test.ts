import assert from "node:assert/strict";
import test from "node:test";

import { materializeDecisionImpactGraph } from "../src/decision-impact-runtime.js";
import { materializeDecisionLedgerEntry } from "../src/decision-ledger-runtime.js";
import { materializeDecisionQualityReport } from "../src/decision-quality-runtime.js";
import {
  materializeDecisionLearningRecord,
  materializeDecisionOutcomeRecord,
} from "../src/decision-outcome-runtime.js";
import { materializeLearningIntelligenceArtifacts } from "../src/learning-intelligence-runtime.js";
import type { DecisionSynthesis } from "../src/runtime-contracts/models/decision.js";
import type { DecisionLedgerEntry } from "../src/runtime-contracts/models/ledger.js";

function createDecisionFixture(
  overrides?: Partial<DecisionSynthesis>,
): DecisionSynthesis {
  return {
    decision_id: "decision:release:001",
    decision_type: "release-readiness",
    decision: "WARN",
    status: "APPROVED",
    trigger: {
      trigger_id: "trigger:release-readiness",
      trigger_type: "release-review",
      description: "Release evidence requires decision review.",
      source_refs: [
        {
          ref_id: "evidence:release:001",
          ref_kind: "evidence",
        },
      ],
      triggered_at: "2026-08-03T10:00:00.000Z",
    },
    finding_refs: [
      {
        ref_id: "finding:unstable-dependency",
        ref_kind: "finding",
      },
    ],
    evidence_refs: [
      {
        ref_id: "evidence:capability-graph:001",
        ref_kind: "evidence",
      },
    ],
    assumptions: [
      {
        assumption_id: "assumption:001",
        statement: "Architecture review closes dependency drift before release.",
        source_refs: [],
        validation_status: "DECLARED",
      },
    ],
    recommendation: {
      recommendation_id: "recommendation:001",
      recommendation_type: "conditional-release",
      summary: "Proceed after architecture review.",
    },
    alternatives: [
      {
        option_id: "option:review-before-release",
        label: "Review Before Release",
        description: "Block release until review is complete.",
        evidence_refs: [],
        tradeoffs: ["Slower release", "Lower risk"],
      },
      {
        option_id: "option:release-with-waiver",
        label: "Release With Waiver",
        description: "Release with explicit debt acknowledgment.",
        evidence_refs: [],
        tradeoffs: ["Faster release", "Higher risk"],
      },
    ],
    selected_option: "option:review-before-release",
    expected_outcome: {
      outcome_id: "expected-outcome:001",
      hypothesis: "Review reduces release instability.",
      success_metric: "unstable_dependency_count",
      target_description: "Dependency instability falls to zero.",
      measurement_window: "before_release",
    },
    owner: {
      owner_id: "owner:release-manager",
      owner_type: "role",
      display_name: "Release Manager",
    },
    confidence: 0.81,
    reason_codes: ["UNSTABLE_DEPENDENCY"],
    reasons: [
      {
        code: "UNSTABLE_DEPENDENCY",
        source_evaluation_id: "evaluation:001",
        message: "Capability graph shows unstable dependency.",
      },
    ],
    required_actions: [
      {
        action_id: "action:review",
        action_type: "ARCHITECTURE_REVIEW",
        description: "Run architecture review before release.",
        target_refs: ["capability:governance-read-model"],
      },
    ],
    affected_nodes: ["capability:governance-read-model"],
    source_evaluation_ids: ["evaluation:001"],
    graph_digest: "graph-digest-001",
    policy_version: "1.0.0",
    created_at: "2026-08-03T10:05:00.000Z",
    outcome_tracking_ref: "decision-outcome:001",
    learning_ref: "decision-learning:001",
    ...overrides,
  };
}

function createHealthyDecisionChain() {
  const decisionEntry = materializeDecisionLedgerEntry({
    decision: createDecisionFixture(),
    createdAt: "2026-08-03T10:06:00.000Z",
  });
  const outcomeRecord = materializeDecisionOutcomeRecord({
    decisionEntry,
    observedMetrics: [
      {
        metric_id: "metric:unstable_dependency_count",
        metric_name: "unstable_dependency_count",
        unit: "count",
        observed_value: 0,
        target_description: "Return to zero before release.",
        status: "MET",
        observed_at: "2026-08-03T10:10:00.000Z",
      },
    ],
    evidenceRefs: decisionEntry.decision_snapshot.evidence_refs,
    capabilityRefs: decisionEntry.decision_snapshot.affected_nodes,
    leverageDelta: {
      metric_id: "engineering_leverage",
      baseline_value: 0.41,
      current_value: 0.67,
      delta_value: 0.26,
      interpretation: "Decision improved engineering leverage.",
    },
  });
  const learningRecord = materializeDecisionLearningRecord({
    decisionEntry,
    outcomeRecord,
    lessons: ["Earlier review shortened remediation time."],
  });
  const impactGraph = materializeDecisionImpactGraph({
    decisionEntry,
    outcomeRecord,
    learningRecord,
  });

  return { decisionEntry, outcomeRecord, learningRecord, impactGraph };
}

test("decision quality runtime reports HEALTHY for a fully materialized decision chain", () => {
  const chain = createHealthyDecisionChain();

  const report = materializeDecisionQualityReport({
    ledgerEntries: [chain.decisionEntry],
    outcomeRecords: [chain.outcomeRecord],
    learningRecords: [chain.learningRecord],
    impactGraphs: [chain.impactGraph],
    generatedAtUtc: "2026-08-03T11:00:00.000Z",
  });

  assert.equal(report.status, "HEALTHY");
  assert.equal(report.summary.decision_traceability_coverage.ratio, 1);
  assert.equal(report.summary.decision_reproducibility.ratio, 1);
  assert.equal(report.summary.decision_impact_graph_completeness.ratio, 1);
  assert.equal(
    report.summary.engineering_leverage_measurement_coverage.ratio,
    1,
  );
  assert.equal(report.summary.decision_effectiveness.score, 1);
  assert.equal(report.summary.decision_success_rate.ratio, 1);
  assert.equal(report.summary.false_decision_rate.ratio, 0);
  assert.equal(report.summary.decision_reversal_rate.ratio, 0);
  assert.equal(report.summary.evidence_utilization_rate.ratio, 1);
  assert.equal(report.summary.knowledge_reuse_rate.ratio, 0);
  assert.equal(report.summary.mean_time_to_outcome_ms, 300000);
  assert.equal(report.summary.learning_velocity_ms, 0);
  assert.equal(report.summary.decision_confidence_growth, null);
  assert.deepEqual(report.decisions[0]?.blocking_conditions, []);
});

test("decision quality runtime reports BLOCKED when traceability and reproducibility break", () => {
  const brokenDecision = createDecisionFixture({
    finding_refs: [],
    evidence_refs: [],
    source_evaluation_ids: [],
  });
  const decisionEntry = materializeDecisionLedgerEntry({
    decision: brokenDecision,
    createdAt: "2026-08-03T10:06:00.000Z",
  });
  const tamperedEntry: DecisionLedgerEntry = {
    ...decisionEntry,
    decision_digest: "decision-digest:tampered",
  };

  const report = materializeDecisionQualityReport({
    ledgerEntries: [tamperedEntry],
    generatedAtUtc: "2026-08-03T11:00:00.000Z",
  });

  assert.equal(report.status, "BLOCKED");
  assert.equal(report.summary.decision_traceability_coverage.ratio, 0);
  assert.equal(report.summary.decision_reproducibility.ratio, 0);
  assert.ok(
    report.decisions[0]?.blocking_conditions.includes(
      "decision_traceability_incomplete",
    ),
  );
  assert.ok(
    report.decisions[0]?.blocking_conditions.includes(
      "decision_replay_not_reproducible",
    ),
  );
});

test("decision quality runtime reports PARTIAL when learning and leverage are not closed", () => {
  const decisionEntry = materializeDecisionLedgerEntry({
    decision: createDecisionFixture(),
    createdAt: "2026-08-03T10:06:00.000Z",
  });
  const outcomeRecord = materializeDecisionOutcomeRecord({
    decisionEntry,
    observedMetrics: [
      {
        metric_id: "metric:unstable_dependency_count",
        metric_name: "unstable_dependency_count",
        unit: "count",
        observed_value: 1,
        target_description: "Return to zero before release.",
        status: "PARTIAL",
        observed_at: "2026-08-03T10:10:00.000Z",
      },
    ],
    capabilityRefs: decisionEntry.decision_snapshot.affected_nodes,
  });
  const learningRecord = materializeDecisionLearningRecord({
    decisionEntry,
    outcomeRecord,
    lessons: ["Remediation started too late in the release window."],
  });
  const incompleteLearning = {
    ...learningRecord,
    status: "OPEN" as const,
  };
  const impactGraph = materializeDecisionImpactGraph({
    decisionEntry,
    outcomeRecord,
    learningRecord,
  });

  const report = materializeDecisionQualityReport({
    ledgerEntries: [decisionEntry],
    outcomeRecords: [outcomeRecord],
    learningRecords: [incompleteLearning],
    impactGraphs: [impactGraph],
    generatedAtUtc: "2026-08-03T11:00:00.000Z",
  });

  assert.equal(report.status, "PARTIAL");
  assert.equal(report.summary.decision_learning_closure.ratio, 0);
  assert.equal(
    report.summary.engineering_leverage_measurement_coverage.ratio,
    0,
  );
  assert.equal(report.summary.decision_effectiveness.score, 0.5);
  assert.equal(report.summary.decision_success_rate.ratio, 0);
  assert.equal(report.summary.false_decision_rate.ratio, 0);
  assert.equal(report.summary.decision_reversal_rate.ratio, 0);
  assert.equal(report.summary.evidence_utilization_rate.ratio, 0);
  assert.equal(report.summary.knowledge_reuse_rate.ratio, 0);
  assert.equal(report.summary.mean_time_to_outcome_ms, 300000);
  assert.equal(report.summary.learning_velocity_ms, null);
  assert.equal(report.summary.decision_confidence_growth, null);
  assert.ok(
    report.decisions[0]?.blocking_conditions.includes(
      "decision_learning_not_closed",
    ),
  );
  assert.ok(
    report.decisions[0]?.blocking_conditions.includes(
      "engineering_leverage_not_measured",
    ),
  );
});

test("decision quality runtime reports outcome effectiveness and reversal metrics", () => {
  const originalDecision = materializeDecisionLedgerEntry({
    decision: createDecisionFixture({
      decision_id: "decision:release:002",
      created_at: "2026-08-03T12:00:00.000Z",
    }),
    createdAt: "2026-08-03T12:01:00.000Z",
  });
  const reversedDecision = materializeDecisionLedgerEntry({
    decision: createDecisionFixture({
      decision_id: "decision:release:002",
      created_at: "2026-08-03T12:10:00.000Z",
      confidence: 0.74,
    }),
    createdAt: "2026-08-03T12:11:00.000Z",
    supersedesDecisionEntryId: originalDecision.decision_entry_id,
  });
  const missedOutcome = materializeDecisionOutcomeRecord({
    decisionEntry: reversedDecision,
    observedMetrics: [
      {
        metric_id: "metric:release:stability",
        metric_name: "stability",
        unit: "count",
        observed_value: 2,
        target_description: "Incidents fall to zero.",
        status: "MISSED",
        observed_at: "2026-08-03T12:30:00.000Z",
      },
    ],
  });

  const report = materializeDecisionQualityReport({
    ledgerEntries: [originalDecision, reversedDecision],
    outcomeRecords: [missedOutcome],
    generatedAtUtc: "2026-08-03T13:00:00.000Z",
  });

  assert.equal(report.summary.decision_effectiveness.score, 0);
  assert.equal(report.summary.decision_success_rate.ratio, 0);
  assert.equal(report.summary.false_decision_rate.ratio, 1);
  assert.equal(report.summary.decision_reversal_rate.ratio, 0.5);
  assert.equal(report.summary.evidence_utilization_rate.ratio, 0);
  assert.equal(report.summary.knowledge_reuse_rate.ratio, 0);
  assert.equal(report.summary.mean_time_to_outcome_ms, 1200000);
  assert.equal(report.summary.learning_velocity_ms, null);
  assert.equal(report.summary.decision_confidence_growth, -0.07);
});

test("decision quality runtime consumes knowledge registry for knowledge-weighted quality", () => {
  const originalDecision = materializeDecisionLedgerEntry({
    decision: createDecisionFixture({
      decision_id: "decision:release:003",
      created_at: "2026-08-03T14:00:00.000Z",
      confidence: 0.76,
    }),
    createdAt: "2026-08-03T14:01:00.000Z",
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
        observed_at: "2026-08-03T14:10:00.000Z",
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
    createdAt: "2026-08-03T14:12:00.000Z",
  });
  const originalImpact = materializeDecisionImpactGraph({
    decisionEntry: originalDecision,
    outcomeRecord: originalOutcome,
    learningRecord: originalLearning,
  });
  const improvedDecision = materializeDecisionLedgerEntry({
    decision: createDecisionFixture({
      decision_id: "decision:release:003",
      created_at: "2026-08-03T14:20:00.000Z",
      confidence: 0.9,
      selected_option: "option:release-with-waiver",
      required_actions: [
        {
          action_id: "action:review-earlier",
          action_type: "ARCHITECTURE_REVIEW",
          description: "Run architecture review before release.",
          target_refs: ["capability:governance-read-model"],
        },
      ],
    }),
    createdAt: "2026-08-03T14:21:00.000Z",
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
        observed_at: "2026-08-03T14:30:00.000Z",
      },
    ],
    evidenceRefs: improvedDecision.decision_snapshot.evidence_refs,
    capabilityRefs: improvedDecision.decision_snapshot.affected_nodes,
  });
  const improvedLearning = materializeDecisionLearningRecord({
    decisionEntry: improvedDecision,
    outcomeRecord: improvedOutcome,
    lessons: ["Freeze-window checklist removes late review churn."],
    createdAt: "2026-08-03T14:31:00.000Z",
  });
  const improvedImpact = materializeDecisionImpactGraph({
    decisionEntry: improvedDecision,
    outcomeRecord: improvedOutcome,
    learningRecord: improvedLearning,
  });
  const learningArtifacts = materializeLearningIntelligenceArtifacts({
    ledgerEntries: [originalDecision, improvedDecision],
    outcomeRecords: [originalOutcome, improvedOutcome],
    learningRecords: [originalLearning, improvedLearning],
    impactGraphs: [originalImpact, improvedImpact],
    generatedAtUtc: "2026-08-03T15:00:00.000Z",
  });

  const report = materializeDecisionQualityReport({
    ledgerEntries: [originalDecision, improvedDecision],
    outcomeRecords: [originalOutcome, improvedOutcome],
    learningRecords: [originalLearning, improvedLearning],
    impactGraphs: [originalImpact, improvedImpact],
    knowledgeRegistryEntries: learningArtifacts.knowledgeRegistry.entries,
    generatedAtUtc: "2026-08-03T15:00:00.000Z",
  });

  assert.equal(report.summary.knowledge_reuse_rate.ratio, 1);
  assert.equal(report.summary.evidence_strength_index, 1);
  assert.equal(report.summary.outcome_improvement_rate.ratio, 1);
  assert.equal(report.summary.decision_confidence_index, 0.83);
  assert.equal(report.summary.knowledge_weighted_quality_index, 0.83);
  assert.equal(report.decisions[1]?.knowledge_reused, true);
});
