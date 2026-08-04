import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";

import {
  buildCapabilityDependencyConstitutionReport,
  buildCapabilityRegistryModel,
  buildContractVersionRegistryReport,
} from "@repo/core-capability-registry";

import { CAPABILITY_FOUNDATION_PRODUCER } from "../src/capability-foundation-producer.js";
import { executeEvidenceProducer } from "../src/evidence-producer-spi.js";
import { EOS_ROOT } from "../src/state.js";

test("capability foundation producer encapsulates operational metrics and certification", async () => {
  const workspaceRoot = resolve(EOS_ROOT, "workspace");
  const enterpriseRoot = resolve(EOS_ROOT, "enterprise");
  const capabilitiesRoot = resolve(workspaceRoot, "capabilities");
  const registry = buildCapabilityRegistryModel({
    eosRoot: EOS_ROOT,
    workspaceRoot,
    enterpriseRoot,
    capabilitiesRoot,
  });
  const dependencyConstitution = buildCapabilityDependencyConstitutionReport(
    {
      eosRoot: EOS_ROOT,
      workspaceRoot,
      enterpriseRoot,
      capabilitiesRoot,
    },
    registry,
  );
  const contractVersionRegistry = buildContractVersionRegistryReport(registry);

  const execution = await executeEvidenceProducer(
    CAPABILITY_FOUNDATION_PRODUCER,
    {
      registry,
      dependencyConstitution,
      contractVersionRegistry,
      executionEvidence: {
        capabilities: [],
      },
      governanceReadModelMetrics: {
        metrics_digest: "metrics-digest:001",
        freshness_ms: 10,
        generation_duration_ms: 5,
        consumer_count: 1,
      },
      metricsRef:
        "workspace/foundation/evidence/verification/capability-operational-metrics.json",
      certificationRef:
        "workspace/foundation/evidence/verification/capability-certification.json",
    },
  );

  assert.equal(execution.producer_id, "capability-producer");
  assert.equal(
    execution.projection.metrics_ref,
    "workspace/foundation/evidence/verification/capability-operational-metrics.json",
  );
  assert.equal(
    execution.projection.certification_ref,
    "workspace/foundation/evidence/verification/capability-certification.json",
  );
  assert.equal(
    typeof execution.projection.capability_operational_metrics.observed_capabilities,
    "number",
  );
  assert.equal(
    typeof execution.projection.capability_certification.overall_status,
    "string",
  );
  assert.equal(
    execution.materialized.operationalMetrics.metrics_version,
    "1.0.0",
  );
  assert.equal(
    execution.materialized.certification.certification_version,
    "1.0.0",
  );
});
