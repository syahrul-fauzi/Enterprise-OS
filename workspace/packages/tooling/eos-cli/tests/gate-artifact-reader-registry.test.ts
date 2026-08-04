import assert from "node:assert/strict";
import test from "node:test";

import { materializeGateCGovernanceBundle } from "../src/gate/bundles/governance.js";
import { loadGateCProjectionBundle } from "../src/gate/repositories/projection-bundle-repository.js";
import { evaluateGateCAcceptanceGovernance } from "../src/gate/runtime/evaluators/acceptance-governance.js";
import { provideGateCReadModels } from "../src/gate/runtime/providers/read-model-provider.js";
import { executeGateCArtifactReaderRegistry } from "../src/gate/runtime/readers/reader-registry.js";
import { readGateCGovernancePlatformReadModel } from "../src/gate/runtime/readers/governance-platform-reader.js";
import { EOS_ROOT } from "../src/state.js";

test("Gate C artifact reader registry materializes governance and projection snapshots", () => {
  const snapshots = executeGateCArtifactReaderRegistry({
    gateExecutionDir: `${EOS_ROOT}/enterprise/science/gate-c/execution`,
    foundationVerificationDir:
      `${EOS_ROOT}/workspace/foundation/evidence/verification`,
  });

  assert.equal(typeof snapshots.governancePlatform.constitution_status, "string");
  assert.equal(typeof snapshots.projectionSource.coverage_matrix_hash, "string");
  assert.equal(
    snapshots.projectionSource.learning_intelligence_hash,
    snapshots.governancePlatform.learning_intelligence_hash,
  );
  const governancePlatform = readGateCGovernancePlatformReadModel({
    gateExecutionDir: `${EOS_ROOT}/enterprise/science/gate-c/execution`,
    foundationVerificationDir:
      `${EOS_ROOT}/workspace/foundation/evidence/verification`,
  });
  assert.equal(
    governancePlatform.refs.incrementalMaterialization,
    "workspace/foundation/evidence/verification/governance-incremental-materialization.json",
  );
  assert.equal(
    governancePlatform.snapshot.learning_intelligence_hash,
    snapshots.governancePlatform.learning_intelligence_hash,
  );
});

test("Gate C read model provider bundles reader outputs for evaluator consumption", () => {
  const readModels = provideGateCReadModels({
    gateExecutionDir: `${EOS_ROOT}/enterprise/science/gate-c/execution`,
    foundationVerificationDir:
      `${EOS_ROOT}/workspace/foundation/evidence/verification`,
  });

  assert.equal(
    readModels.projectionSource.snapshot.learning_intelligence_hash,
    readModels.governancePlatform.snapshot.learning_intelligence_hash,
  );

  const governanceGate = evaluateGateCAcceptanceGovernance(
    materializeGateCGovernanceBundle({
      platform: readModels.governancePlatform.snapshot,
      evidenceRefs: readModels.governancePlatform.refs,
    }),
  );

  assert.equal(typeof governanceGate.overallStatus, "string");
  assert.equal(typeof governanceGate.snapshot, "object");
});

test("Gate C projection bundle repository loads reusable domain bundle and snapshot hash", () => {
  const projectionBundle = loadGateCProjectionBundle({
    gateExecutionDir: `${EOS_ROOT}/enterprise/science/gate-c/execution`,
    foundationVerificationDir:
      `${EOS_ROOT}/workspace/foundation/evidence/verification`,
  });

  assert.equal(
    projectionBundle.learning.intelligence.hash,
    projectionBundle.status.projection.sourceEvidence.learning_intelligence_hash,
  );
  assert.equal(
    projectionBundle.specification.conformance.hash,
    projectionBundle.status.projection.sourceEvidence.specification_conformance_hash,
  );
  assert.match(
    projectionBundle.status.projection.sourceEvidenceHash,
    /^sha256:[0-9a-f]{64}$/,
  );
  assert.equal(
    projectionBundle.status.projection.sourceEvidence.learning_intelligence_hash,
    projectionBundle.learning.intelligence.hash,
  );
  assert.equal(
    projectionBundle.status.projection.governance.acceptance.platform.learning_intelligence_hash,
    projectionBundle.governance.acceptance.platform.learning_intelligence_hash,
  );
  assert.equal(
    projectionBundle.governance.acceptance.platform.learning_intelligence_hash,
    projectionBundle.status.projection.governance.acceptance.platform.learning_intelligence_hash,
  );
  assert.equal(
    projectionBundle.governance.acceptance.evidenceRefs.constitution,
    "workspace/foundation/evidence/verification/constitution-summary.json",
  );
  assert.equal(
    projectionBundle.governance.constitution.summaryHash,
    projectionBundle.status.projection.sourceEvidence.constitution_summary_hash,
  );
  assert.equal(
    projectionBundle.capability.graph.status,
    projectionBundle.status.projection.governance.acceptance.platform.capability_graph_status,
  );
  assert.equal(
    projectionBundle.decision.quality.hash,
    projectionBundle.status.projection.governance.acceptance.platform.decision_quality_hash,
  );
  assert.equal(
    projectionBundle.foundation.evidenceProducers.convergenceHash,
    projectionBundle.status.projection.governance.acceptance.platform.evidence_producer_convergence_hash,
  );
});
