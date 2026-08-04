import assert from "node:assert/strict";
import test from "node:test";

import {
  createDecisionLedgerReference,
  InMemoryDecisionLedger,
  materializeDecisionLedgerEntry,
} from "../src/decision-ledger-runtime.js";
import type { DecisionSynthesis } from "../src/runtime-contracts/models/decision.js";

function createDecisionFixture(
  input?: Partial<DecisionSynthesis>,
): DecisionSynthesis {
  return {
    decision_id: input?.decision_id ?? "decision:release:001",
    decision_type: input?.decision_type ?? "release-readiness",
    decision: input?.decision ?? "WARN",
    status: input?.status ?? "APPROVED",
    trigger: input?.trigger ?? {
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
    finding_refs: input?.finding_refs ?? [
      {
        ref_id: "finding:unstable-dependency",
        ref_kind: "finding",
      },
    ],
    evidence_refs: input?.evidence_refs ?? [
      {
        ref_id: "evidence:capability-graph:001",
        ref_kind: "evidence",
      },
    ],
    assumptions: input?.assumptions ?? [
      {
        assumption_id: "assumption:001",
        statement: "Architecture review closes dependency drift before release.",
        source_refs: [],
        validation_status: "DECLARED",
      },
    ],
    recommendation: input?.recommendation ?? {
      recommendation_id: "recommendation:001",
      recommendation_type: "conditional-release",
      summary: "Proceed after architecture review.",
    },
    alternatives: input?.alternatives ?? [
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
    selected_option: input?.selected_option ?? "option:review-before-release",
    expected_outcome: input?.expected_outcome ?? {
      outcome_id: "expected-outcome:001",
      hypothesis: "Review reduces release instability.",
      success_metric: "unstable_dependency_count",
      target_description: "Dependency instability falls to zero.",
      measurement_window: "before_release",
    },
    owner: input?.owner ?? {
      owner_id: "owner:release-manager",
      owner_type: "role",
      display_name: "Release Manager",
    },
    confidence: input?.confidence ?? 0.81,
    reason_codes: input?.reason_codes ?? ["UNSTABLE_DEPENDENCY"],
    reasons: input?.reasons ?? [
      {
        code: "UNSTABLE_DEPENDENCY",
        source_evaluation_id: "evaluation:001",
        message: "Capability graph shows unstable dependency.",
      },
    ],
    required_actions: input?.required_actions ?? [
      {
        action_id: "action:review",
        action_type: "ARCHITECTURE_REVIEW",
        description: "Run architecture review before release.",
        target_refs: ["capability:governance-read-model"],
      },
    ],
    affected_nodes: input?.affected_nodes ?? ["capability:governance-read-model"],
    source_evaluation_ids: input?.source_evaluation_ids ?? ["evaluation:001"],
    graph_digest: input?.graph_digest ?? "graph-digest-001",
    policy_version: input?.policy_version ?? "1.0.0",
    created_at: input?.created_at ?? "2026-08-03T10:05:00.000Z",
    outcome_tracking_ref: input?.outcome_tracking_ref ?? "decision-outcome:001",
    learning_ref: input?.learning_ref ?? "decision-learning:001",
  };
}

test("decision ledger materialization is deterministic for identical governed inputs", () => {
  const decision = createDecisionFixture();

  const entryA = materializeDecisionLedgerEntry({
    decision,
    createdAt: "2026-08-03T10:06:00.000Z",
  });
  const entryB = materializeDecisionLedgerEntry({
    decision,
    createdAt: "2026-08-03T10:06:00.000Z",
  });

  assert.equal(entryA.decision_digest, entryB.decision_digest);
  assert.equal(entryA.decision_entry_id, entryB.decision_entry_id);
  assert.equal(entryA.decision_snapshot.selected_option, decision.selected_option);
});

test("in-memory decision ledger preserves append-only history and replay", async () => {
  const ledger = new InMemoryDecisionLedger();
  const firstDecision = createDecisionFixture();
  const firstEntry = await ledger.append(firstDecision);

  const secondDecision = createDecisionFixture({
    status: "OBSERVING",
    decision: "ALLOW",
    selected_option: "option:release-with-waiver",
    confidence: 0.67,
    created_at: "2026-08-03T10:08:00.000Z",
  });
  const secondEntry = await ledger.append(secondDecision);

  assert.equal(secondEntry.supersedes_decision_entry_id, firstEntry.decision_entry_id);

  const latest = await ledger.getLatest({
    decision_id: firstDecision.decision_id,
  });
  assert.equal(latest?.decision_entry_id, secondEntry.decision_entry_id);

  const replayed = await ledger.replay({
    reference: createDecisionLedgerReference(firstEntry),
    policy_version: "1.0.0",
  });
  assert.equal(replayed.decision_entry_id, firstEntry.decision_entry_id);

  await assert.rejects(() =>
    ledger.replay({
      reference: createDecisionLedgerReference(secondEntry),
      policy_version: "2.0.0",
    }),
  );
});
