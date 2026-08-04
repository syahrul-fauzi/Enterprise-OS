import assert from "node:assert/strict";
import test from "node:test";

import {
  AutomationExecutionRequestSchema,
  DecisionEngineInputSchema,
  DecisionImpactGraphSchema,
  DecisionLedgerEntrySchema,
  DecisionOutcomeTrackingRecordSchema,
  EnterpriseControlGraphSnapshotSchema,
  PolicyEvaluatorOutputSchema,
} from "../src/runtime-contracts/index.js";

test("runtime contracts accept canonical graph, evaluator, and decision ledger shapes", () => {
  const graph = EnterpriseControlGraphSnapshotSchema.parse({
    graph_id: "enterprise-control-graph:foundation",
    graph_digest: "graph-digest-001",
    captured_at: "2026-08-03T08:00:00Z",
    nodes: [
      {
        node_id: "capability:governance-evidence",
        node_kind: "capability",
        display_name: "governance-evidence",
        digest: "digest-capability",
        attributes: {
          lifecycle_stage: "active",
        },
      },
    ],
    edges: [],
  });

  const evaluation = PolicyEvaluatorOutputSchema.parse({
    evaluation_id: "evaluation:capability:001",
    evaluator_id: "capability-evaluator",
    evaluator_domain: "capability",
    evaluator_version: "1.0.0",
    graph_reference: {
      graph_id: graph.graph_id,
      graph_digest: graph.graph_digest,
      captured_at: graph.captured_at,
    },
    evaluation_status: "WARN",
    evaluated_scope: {
      ref_id: "capability:governance-read-model",
      ref_kind: "capability",
      digest: "digest-read-model",
    },
    policy_results: [
      {
        policy_id: "dependency-health",
        rule_id: "unstable-coupling-threshold",
        status: "WARN",
        reason_codes: ["UNSTABLE_DEPENDENCY"],
      },
    ],
    findings: [
      {
        finding_id: "finding:001",
        severity: "WARN",
        code: "UNSTABLE_DEPENDENCY",
        message: "Capability depends on unstable provider.",
        fact_refs: [
          {
            ref_id: "capability:governance-read-model",
            ref_kind: "capability",
          },
        ],
      },
    ],
    required_actions: ["require-architecture-review"],
    produced_at: "2026-08-03T08:01:00Z",
  });

  const decisionInput = DecisionEngineInputSchema.parse({
    decision_scope: {
      scope_id: "release:foundation",
      scope_kind: "release",
    },
    graph_digest: graph.graph_digest,
    evaluator_outputs: [evaluation],
    policy_version: "1.0.0",
    trigger: {
      trigger_id: "trigger:release-readiness",
      trigger_type: "release-readiness-review",
      description: "Release readiness evidence requires a decision.",
      source_refs: [
        {
          ref_id: "capability:governance-read-model",
          ref_kind: "capability",
        },
      ],
      triggered_at: "2026-08-03T08:01:30Z",
    },
    finding_refs: [
      {
        ref_id: "finding:001",
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
        statement: "Architecture review can resolve the unstable dependency before release.",
        source_refs: [
          {
            ref_id: "evaluation:capability:001",
            ref_kind: "evaluation",
          },
        ],
        validation_status: "DECLARED",
      },
    ],
    decision_owner: {
      owner_id: "owner:release-manager",
      owner_type: "role",
      display_name: "Release Manager",
    },
    requested_at: "2026-08-03T08:02:00Z",
  });

  const ledgerEntry = DecisionLedgerEntrySchema.parse({
    decision_entry_id: "decision-entry:001",
    decision_id: "decision:001",
    decision_time: "2026-08-03T08:03:00Z",
    decision_type: "release-readiness",
    inputs: {
      ecg_snapshot_digest: graph.graph_digest,
      evaluator_result_digests: ["evaluation:capability:001"],
    },
    decision_snapshot: {
      decision_id: "decision:001",
      decision_type: "release-readiness",
      decision: "WARN",
      status: "APPROVED",
      trigger: decisionInput.trigger,
      finding_refs: decisionInput.finding_refs,
      evidence_refs: decisionInput.evidence_refs,
      assumptions: decisionInput.assumptions,
      recommendation: {
        recommendation_id: "recommendation:001",
        recommendation_type: "conditional-release",
        summary: "Proceed only after architecture review closes the unstable dependency.",
      },
      alternatives: [
        {
          option_id: "option:review-before-release",
          label: "Review Before Release",
          description: "Hold release until architecture review validates dependency health.",
          evidence_refs: decisionInput.evidence_refs,
          tradeoffs: ["Slower release", "Lower architectural risk"],
        },
        {
          option_id: "option:release-with-waiver",
          label: "Release With Waiver",
          description: "Proceed with explicit operational waiver and follow-up remediation.",
          evidence_refs: decisionInput.evidence_refs,
          tradeoffs: ["Faster release", "Higher architectural risk"],
        },
      ],
      selected_option: "option:review-before-release",
      expected_outcome: {
        outcome_id: "expected-outcome:001",
        hypothesis: "Architecture review reduces release regression risk.",
        success_metric: "unstable_dependency_count",
        target_description: "Unstable dependency count returns to zero before release.",
        measurement_window: "before_release",
      },
      owner: decisionInput.decision_owner,
      confidence: 0.82,
      reason_codes: ["UNSTABLE_DEPENDENCY"],
      reasons: [
        {
          code: "UNSTABLE_DEPENDENCY",
          source_evaluation_id: "evaluation:capability:001",
          message: "Capability depends on unstable provider.",
        },
      ],
      required_actions: [
        {
          action_id: "action:001",
          action_type: "ARCHITECTURE_REVIEW",
          description: "Require architecture review before release.",
          target_refs: ["capability:governance-read-model"],
        },
      ],
      affected_nodes: ["capability:governance-read-model"],
      source_evaluation_ids: ["evaluation:capability:001"],
      graph_digest: decisionInput.graph_digest,
      policy_version: decisionInput.policy_version,
      created_at: "2026-08-03T08:03:00Z",
      outcome_tracking_ref: "decision-outcome:001",
      learning_ref: "decision-learning:001",
    },
    decision_digest: "decision-digest:001",
    confidence: 0.82,
    created_at: "2026-08-03T08:03:00Z",
    outcome_ref: "decision-outcome:001",
    learning_ref: "decision-learning:001",
  });

  assert.equal(ledgerEntry.inputs.ecg_snapshot_digest, graph.graph_digest);
  assert.deepEqual(ledgerEntry.decision_snapshot.reason_codes, ["UNSTABLE_DEPENDENCY"]);
  assert.equal(
    ledgerEntry.decision_snapshot.selected_option,
    "option:review-before-release",
  );

  const outcomeTracking = DecisionOutcomeTrackingRecordSchema.parse({
    outcome: {
      outcome_tracking_id: "decision-outcome:001",
      decision_reference: {
        decision_entry_id: ledgerEntry.decision_entry_id,
        decision_id: ledgerEntry.decision_id,
      },
      decision_id: ledgerEntry.decision_id,
      expected_outcome: ledgerEntry.decision_snapshot.expected_outcome,
      status: "PARTIALLY_ACHIEVED",
      summary:
        "Architecture review reduced unstable dependencies but did not fully close them.",
      observed_metrics: [
        {
          metric_id: "metric:unstable_dependency_count",
          metric_name: "unstable_dependency_count",
          unit: "count",
          observed_value: 1,
          target_description: "Return to zero before release.",
          status: "PARTIAL",
          observed_at: "2026-08-03T10:00:00Z",
        },
      ],
      evidence_refs: decisionInput.evidence_refs,
      capability_refs: ["capability:governance-read-model"],
      leverage_delta: {
        metric_id: "engineering_leverage",
        baseline_value: 0.41,
        current_value: 0.58,
        delta_value: 0.17,
        interpretation: "Leverage improved after architecture review.",
      },
      observed_at: "2026-08-03T10:00:00Z",
    },
    learning: {
      learning_id: "decision-learning:001",
      decision_reference: {
        decision_entry_id: ledgerEntry.decision_entry_id,
        decision_id: ledgerEntry.decision_id,
      },
      outcome_tracking_id: "decision-outcome:001",
      status: "CAPTURED",
      hypotheses_validated: [],
      hypotheses_invalidated: [],
      lessons: ["Early review reduced risk, but release timing still needs slack."],
      follow_up_actions: ["action:stabilize-provider"],
      created_at: "2026-08-03T10:01:00Z",
    },
  });

  assert.equal(outcomeTracking.outcome.status, "PARTIALLY_ACHIEVED");
  assert.equal(outcomeTracking.learning.status, "CAPTURED");

  const impactGraph = DecisionImpactGraphSchema.parse({
    graph_id: "decision-impact-graph:001",
    graph_digest: "decision-impact-graph-digest:001",
    decision_reference: {
      decision_entry_id: ledgerEntry.decision_entry_id,
      decision_id: ledgerEntry.decision_id,
    },
    summary: {
      node_count: 5,
      edge_count: 4,
      capability_count: 1,
      evidence_count: 1,
      learning_count: 1,
      leverage_measurement_status: "IMPROVED",
      leverage_delta_value: 0.17,
    },
    nodes: [
      {
        node_id: ledgerEntry.decision_id,
        node_kind: "decision",
        display_name: "release-readiness",
        digest: ledgerEntry.decision_digest,
        status: "APPROVED",
        attributes: {},
      },
      {
        node_id: "capability:governance-read-model",
        node_kind: "capability",
        display_name: "capability:governance-read-model",
        digest: "digest-capability",
        status: "PARTIALLY_ACHIEVED",
        attributes: {},
      },
      {
        node_id: "decision-outcome:001",
        node_kind: "outcome",
        display_name: "expected-outcome:001",
        digest: "digest-outcome",
        status: "PARTIALLY_ACHIEVED",
        attributes: {},
      },
      {
        node_id: "decision-learning:001",
        node_kind: "learning",
        display_name: "decision-learning:001",
        digest: "digest-learning",
        status: "CAPTURED",
        attributes: {},
      },
      {
        node_id: "leverage:engineering_leverage",
        node_kind: "leverage_metric",
        display_name: "engineering_leverage",
        digest: "digest-leverage",
        status: "IMPROVED",
        attributes: {},
      },
    ],
    edges: [
      {
        edge_id: "decision-impact-edge:1",
        edge_kind: "IMPACTS_CAPABILITY",
        from_node_id: ledgerEntry.decision_id,
        to_node_id: "capability:governance-read-model",
        rationale: "Decision changes capability behavior.",
      },
      {
        edge_id: "decision-impact-edge:2",
        edge_kind: "REALIZES_OUTCOME",
        from_node_id: ledgerEntry.decision_id,
        to_node_id: "decision-outcome:001",
        rationale: "Decision is evaluated through outcome tracking.",
      },
      {
        edge_id: "decision-impact-edge:3",
        edge_kind: "CAPTURES_LEARNING",
        from_node_id: "decision-outcome:001",
        to_node_id: "decision-learning:001",
        rationale: "Outcome produces learning.",
      },
      {
        edge_id: "decision-impact-edge:4",
        edge_kind: "MEASURES_LEVERAGE",
        from_node_id: "decision-outcome:001",
        to_node_id: "leverage:engineering_leverage",
        rationale: "Outcome records leverage movement.",
      },
    ],
    claim_boundary:
      "Impact graph claims only the traced relationship from decision to outcome and learning.",
  });

  assert.equal(impactGraph.summary.leverage_measurement_status, "IMPROVED");
});

test("automation contract consumes decision references rather than graph facts", () => {
  const request = AutomationExecutionRequestSchema.parse({
    consumer_id: "gate-c",
    decision_reference: {
      decision_entry_id: "decision-entry:001",
      decision_id: "decision:001",
    },
    mode: "DRY_RUN",
    requested_at: "2026-08-03T08:04:00Z",
    context: {
      gate: "C",
    },
  });

  assert.equal(request.consumer_id, "gate-c");
  assert.equal(request.decision_reference.decision_id, "decision:001");
});

test("automation contract rejects embedded graph or evaluator payloads", () => {
  assert.throws(() =>
    AutomationExecutionRequestSchema.parse({
      consumer_id: "scheduler",
      decision_reference: {
        decision_entry_id: "decision-entry:002",
        decision_id: "decision:002",
      },
      mode: "EXECUTE",
      requested_at: "2026-08-03T08:05:00Z",
      context: {},
      graph_snapshot: {
        graph_id: "enterprise-control-graph:foundation",
      },
    }),
  );
});
