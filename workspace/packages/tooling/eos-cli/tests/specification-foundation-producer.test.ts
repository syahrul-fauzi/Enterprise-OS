import assert from "node:assert/strict";
import test from "node:test";

import { executeEvidenceProducer } from "../src/evidence-producer-spi.js";
import { SPECIFICATION_FOUNDATION_PRODUCER } from "../src/specification-foundation-producer.js";

test("specification foundation producer encapsulates specification summary materialization", async () => {
  const execution = await executeEvidenceProducer(
    SPECIFICATION_FOUNDATION_PRODUCER,
    {
      reportRef:
        "workspace/foundation/evidence/verification/specification-conformance-report.json",
      projectionRef:
        "workspace/foundation/evidence/verification/specification-conformance-projection.json",
    },
  );

  assert.equal(execution.producer_id, "specification-producer");
  assert.equal(typeof execution.projection.overall_status, "string");
  assert.equal(typeof execution.projection.registry_artifacts, "number");
  assert.equal(typeof execution.projection.registry_edges, "number");
  assert.equal(typeof execution.projection.rfc_count, "number");
  assert.equal(typeof execution.projection.conf_count, "number");
  assert.equal(typeof execution.projection.spec_count, "number");
  assert.equal(
    execution.projection.report_ref,
    "workspace/foundation/evidence/verification/specification-conformance-report.json",
  );
  assert.equal(
    execution.projection.projection_ref,
    "workspace/foundation/evidence/verification/specification-conformance-projection.json",
  );
  assert.equal(
    execution.materialized.conformanceProjection.projection_type,
    "SpecificationConformanceProjection",
  );
});
