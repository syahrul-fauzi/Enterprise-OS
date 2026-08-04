import assert from "node:assert/strict";
import test from "node:test";

import { executeEvidenceProducer } from "../src/evidence-producer-spi.js";
import { EVIDENCE_CONVERGENCE_FOUNDATION_PRODUCER } from "../src/evidence-convergence-foundation-producer.js";

test("evidence convergence foundation producer encapsulates canonical producer discovery", async () => {
  const execution = await executeEvidenceProducer(
    EVIDENCE_CONVERGENCE_FOUNDATION_PRODUCER,
    {
      reportRef:
        "workspace/foundation/evidence/verification/evidence-producer-convergence-report.json",
    },
  );

  assert.equal(execution.producer_id, "evidence-convergence-producer");
  assert.equal(execution.projection.producer_count, 6);
  assert.deepEqual(execution.projection.canonical_schema_versions, ["1.0.0"]);
  assert.equal(execution.projection.target_producer_count, 9);
  assert.equal(execution.projection.registered_target_producer_count, 6);
  assert.equal(execution.projection.target_coverage_ratio, 0.6667);
  assert.equal(execution.materialized.report.status, "WARN");
});
