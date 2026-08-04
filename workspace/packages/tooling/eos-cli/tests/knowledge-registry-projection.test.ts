import assert from "node:assert/strict";
import test from "node:test";

import { materializeKnowledgeProjectionArtifacts } from "../src/knowledge/registry/materializer.js";

test("knowledge projection groups learning events into reusable knowledge objects", () => {
  const artifacts = materializeKnowledgeProjectionArtifacts({
    generatedAtUtc: "2026-08-03T12:00:00.000Z",
    learningEvents: [
      {
        learning_id: "learning:001",
        decision_id: "decision:001",
        decision_entry_id: "decision-entry:001",
        outcome_tracking_id: "outcome:001",
        decision_type: "release-readiness",
        created_at_utc: "2026-08-03T10:00:00.000Z",
        lessons: ["Review architecture before release"],
        follow_up_actions: ["action:review-architecture"],
        hypotheses_validated: ["hypothesis:001"],
        hypotheses_invalidated: [],
        reused_by_decision_entry_id: "decision-entry:002",
        decision_pattern_changed: true,
        future_decision_improved: true,
        evidence_ref_count: 2,
        capability_ref_count: 1,
      },
      {
        learning_id: "learning:002",
        decision_id: "decision:002",
        decision_entry_id: "decision-entry:002",
        outcome_tracking_id: "outcome:002",
        decision_type: "release-readiness",
        created_at_utc: "2026-08-03T11:00:00.000Z",
        lessons: ["Review architecture before release"],
        follow_up_actions: ["action:review-architecture"],
        hypotheses_validated: [],
        hypotheses_invalidated: ["hypothesis:002"],
        reused_by_decision_entry_id: null,
        decision_pattern_changed: false,
        future_decision_improved: false,
        evidence_ref_count: 1,
        capability_ref_count: 1,
      },
    ],
  });

  assert.equal(artifacts.objects.length, 1);
  assert.equal(artifacts.objects[0]?.knowledge_status, "OPERATIONALIZED");
  assert.equal(artifacts.objects[0]?.current_stage, "IMPROVED");
  assert.deepEqual(artifacts.objects[0]?.source_learning_ids, [
    "learning:001",
    "learning:002",
  ]);
  assert.equal(artifacts.registry.summary.knowledge_object_count, 1);
  assert.equal(artifacts.registry.summary.operationalized_knowledge_count, 1);
  assert.equal(artifacts.registry.summary.reused_knowledge_object_count, 1);
  assert.equal(artifacts.registry.summary.improved_knowledge_object_count, 1);
  assert.equal(artifacts.registry.evolution.entries[0]?.evolution_stage, "IMPROVED");
  assert.equal(artifacts.lineagePreview[0]?.reuse_count, 1);
});
