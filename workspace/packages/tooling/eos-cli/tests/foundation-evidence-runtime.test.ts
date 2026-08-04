import assert from "node:assert/strict";
import test from "node:test";

import { materializeDecisionQualityReport } from "../src/decision/runtime/quality-runtime.js";
import { materializeLearningIntelligenceArtifacts } from "../src/learning/runtime/intelligence-runtime.js";
import { loadGateCAcceptanceClosedLoopArtifacts } from "../src/foundation/runtime/evidence-runtime.js";

test("foundation evidence runtime loads Gate C acceptance closed-loop artifacts", () => {
  const artifacts = loadGateCAcceptanceClosedLoopArtifacts();

  assert.ok(artifacts.ledgerEntries.length > 0);
  assert.equal(artifacts.ledgerEntries.length, artifacts.outcomeRecords.length);
  assert.equal(artifacts.ledgerEntries.length, artifacts.learningRecords.length);
  assert.equal(artifacts.ledgerEntries.length, artifacts.impactGraphs.length);
  assert.ok(
    artifacts.ledgerEntries.some(
      (entry) => typeof entry.supersedes_decision_entry_id === "string",
    ),
  );
  assert.ok(
    artifacts.outcomeRecords.some((record) => record.status === "ACHIEVED"),
  );
  assert.ok(
    artifacts.learningRecords.every((record) => record.lessons.length > 0),
  );
  assert.match(artifacts.claim_boundary, /Gate C closed-loop artifacts/i);
});

test("Gate C closed-loop artifacts feed decision and learning runtimes", () => {
  const artifacts = loadGateCAcceptanceClosedLoopArtifacts();
  const learning = materializeLearningIntelligenceArtifacts({
    ledgerEntries: artifacts.ledgerEntries,
    outcomeRecords: artifacts.outcomeRecords,
    learningRecords: artifacts.learningRecords,
    impactGraphs: artifacts.impactGraphs,
    generatedAtUtc: "2026-08-03T12:00:00.000Z",
  });
  const decision = materializeDecisionQualityReport({
    ledgerEntries: artifacts.ledgerEntries,
    outcomeRecords: artifacts.outcomeRecords,
    learningRecords: artifacts.learningRecords,
    impactGraphs: artifacts.impactGraphs,
    knowledgeRegistryEntries: learning.knowledgeRegistry.entries,
    generatedAtUtc: "2026-08-03T12:00:00.000Z",
  });

  assert.ok(learning.report.summary.decision_count > 0);
  assert.ok(learning.knowledgeRegistry.summary.knowledge_object_count > 0);
  assert.ok(decision.summary.decision_count > 0);
  assert.ok(decision.summary.knowledge_weighted_quality_index >= 0);
});
