import assert from "node:assert/strict";
import test from "node:test";

import { materializeDecisionImpactEvidence, materializeDecisionImpactGraph, materializeDecisionImpactProjection } from "../src/decision-impact-runtime.js";
import { materializeDecisionLedgerEntry } from "../src/decision-ledger-runtime.js";
import {
  materializeDecisionLearningRecord,
  materializeDecisionOutcomeRecord,
} from "../src/decision-outcome-runtime.js";
import type { DecisionSynthesis } from "../src/runtime-contracts/models/decision.js";

function createDecisionFixture(): DecisionSynthesis {
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
  };
}

test("decision impact runtime links decision to capability, outcome, learning, and leverage", () => {
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

  const graph = materializeDecisionImpactGraph({
    decisionEntry,
    outcomeRecord,
    learningRecord,
  });

  assert.equal(graph.summary.capability_count, 1);
  assert.equal(graph.summary.evidence_count, 1);
  assert.equal(graph.summary.leverage_measurement_status, "IMPROVED");
  assert.ok(
    graph.edges.some(
      (edge) =>
        edge.edge_kind === "IMPACTS_CAPABILITY" &&
        edge.to_node_id === "capability:governance-read-model",
    ),
  );
  assert.ok(
    graph.nodes.some(
      (node) =>
        node.node_kind === "leverage_metric" &&
        node.status === "IMPROVED",
    ),
  );
});

test("decision impact runtime materializes projection and canonical evidence", () => {
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
        observed_value: 2,
        target_description: "Return to zero before release.",
        status: "MISSED",
        observed_at: "2026-08-03T10:10:00.000Z",
      },
    ],
    capabilityRefs: decisionEntry.decision_snapshot.affected_nodes,
  });
  const learningRecord = materializeDecisionLearningRecord({
    decisionEntry,
    outcomeRecord,
    lessons: ["Dependency stabilization must start before release window."],
  });
  const graph = materializeDecisionImpactGraph({
    decisionEntry,
    outcomeRecord,
    learningRecord,
  });
  const projection = materializeDecisionImpactProjection({
    graph,
    decisionEntry,
    outcomeRecord,
    learningRecord,
    generatedAtUtc: "2026-08-03T10:11:00.000Z",
  });
  const evidence = materializeDecisionImpactEvidence({
    graph,
    projection,
    decisionEntry,
    outcomeRecord,
    learningRecord,
    projectionRef:
      "workspace/foundation/evidence/verification/decision-impact-projection.json",
  });

  assert.equal(projection.projection_type, "DecisionImpactProjection");
  assert.equal(evidence.artifact_type, "decision-impact-evidence");
  assert.equal(evidence.summary.leverage_measurement_status, "NOT_MATERIALIZED");
  assert.ok(
    evidence.findings.includes(
      "Engineering leverage status is NOT_MATERIALIZED.",
    ),
  );
});
