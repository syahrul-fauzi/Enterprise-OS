import assert from "node:assert/strict";
import test from "node:test";

import {
  materializeProductVerificationProjection,
  persistProductRuntimeVerificationArtifacts,
  PRODUCT_RUNTIME_EVIDENCE_PRODUCER,
} from "../src/product-runtime-evidence-runtime.js";
import { createProjection } from "../src/projection-domain.js";

test("product runtime producer is registered on canonical producer runtime", () => {
  assert.equal(
    PRODUCT_RUNTIME_EVIDENCE_PRODUCER.producer_id,
    "product-runtime-producer",
  );
  assert.equal(
    PRODUCT_RUNTIME_EVIDENCE_PRODUCER.artifact_type,
    "product-runtime-verification-evidence",
  );
  assert.equal(PRODUCT_RUNTIME_EVIDENCE_PRODUCER.subject_type, "product");
  assert.equal(PRODUCT_RUNTIME_EVIDENCE_PRODUCER.schema_version, "1.0.0");
});

test("product runtime artifacts materialize canonical projection and evidence", () => {
  const executionChainReport = createProjection({
    projectionType: "ExecutionChainProjection",
    schemaVersion: "1.0.0",
    generatedAtUtc: "2026-08-03T12:00:00.000Z",
    generatedFrom: [],
    payload: {
      summary: {
        reproducible_chains: 2,
      },
    },
  });
  const executionTimelineReport = createProjection({
    projectionType: "ExecutionTimelineProjection",
    schemaVersion: "1.0.0",
    generatedAtUtc: "2026-08-03T12:00:00.000Z",
    generatedFrom: [],
    payload: {
      summary: {
        total_events: 24,
      },
    },
  });
  const testReport = {
    status: "PASS",
    summary: {
      total: 8,
      pass: 8,
    },
  };
  const runtimeInvocationReport = {
    summary: {
      total_invocations: 18,
      observed_capabilities: 5,
      verified_capabilities: 5,
      reproducible_capabilities: 3,
    },
  };

  const projection = materializeProductVerificationProjection({
    productId: "lawyershub",
    appManifestRef: "workspace/apps/lawyershub/workspace.manifest.ts",
    testReport,
    runtimeInvocationReport,
    executionChainReport,
    executionTimelineReport,
    generatedAtUtc: "2026-08-03T12:00:00.000Z",
  });
  const artifact = persistProductRuntimeVerificationArtifacts({
    productId: "lawyershub",
    appManifestRef: "workspace/apps/lawyershub/workspace.manifest.ts",
    projectionPath: "/tmp/eos-product-verification-projection.json",
    evidencePath: "/tmp/eos-product-verification-evidence.json",
    testReport,
    runtimeInvocationReport,
    executionChainReport,
    executionTimelineReport,
    generatedAtUtc: "2026-08-03T12:00:00.000Z",
  });

  assert.equal(projection.projection_type, "ProductVerificationProjection");
  assert.equal(artifact.artifact_type, "product-runtime-verification-evidence");
  assert.equal(artifact.subject.subject_type, "product");
  assert.equal(artifact.summary.product_id, "lawyershub");
  assert.equal(artifact.summary.verified_capabilities, 5);
  assert.equal(artifact.summary.reproducible_chains, 2);
  assert.equal(
    artifact.projection.projection_type,
    "ProductVerificationProjection",
  );
});
