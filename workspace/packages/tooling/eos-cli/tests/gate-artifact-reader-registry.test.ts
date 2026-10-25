import assert from "node:assert/strict";
import test from "node:test";

import { materializeGateCGovernanceBundle } from "../src/gate/bundles/governance.js";
import { loadGateCProjectionBundle } from "../src/gate/repositories/projection-bundle-repository.js";
import { evaluateGateCAcceptanceGovernance } from "../src/gate/runtime/evaluators/acceptance-governance.js";
import { provideGateCReadModels } from "../src/gate/runtime/providers/read-model-provider.js";
import { executeGateCArtifactReaderRegistry } from "../src/gate/runtime/readers/reader-registry.js";
import { readGateCGovernancePlatformReadModel } from "../src/gate/runtime/readers/governance-platform-reader.js";
import { EOS_ROOT } from "../src/state.js";
import { buildGateFExecutionContext } from "../src/gate/commands/gate-f.js";

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
});

// WF-01: Boundary input wrapper diuji untuk input valid, invalid, dan batas tipe
test("Gate F boundary input wrapper: valid input menghasilkan context yang frozen (immutable)", () => {
  const validInputs = {
    criteria: { version: "1.0.0", gate_id: "gate-f", name: "Production Readiness" },
    eosRoot: "/test/eos",
    runId: "run-12345",
    processPid: 9999,
    processUser: "test-user",
    governanceSnapshot: { constitution_status: "valid" }
  };
  
  const context = buildGateFExecutionContext(validInputs);
  
  // Verifikasi nilai terisi dengan benar
  assert.equal(context.runId, "run-12345");
  assert.equal(context.executorIdentity, "gate-f:run=run-12345:pid=9999:user=test-user");
  assert.equal(context.governanceSnapshot.constitution_status, "valid");
  
  // Verifikasi immutability (Object.freeze bekerja)
  assert.throws(() => { context.runId = "hacked-run-id"; }, TypeError);
  assert.throws(() => { context.criteria.version = "2.0.0"; }, TypeError);
  assert.throws(() => { context.governanceSnapshot.constitution_status = "invalid"; }, TypeError);
});

test("Gate F boundary input wrapper: missing required input throws error (input invalid)", () => {
  // Missing required field "criteria"
  const invalidInputs = { 
    eosRoot: "/test/eos", 
    runId: "run-12345", 
    processPid: 9999, 
    processUser: "test-user", 
    governanceSnapshot: { constitution_status: "valid" } 
  };
  
  assert.throws(() => { buildGateFExecutionContext(invalidInputs); }, /Missing required input field/);
});

test("Gate F boundary input wrapper: null processUser menggunakan default value (batas tipe)", () => {
  const inputsWithNullUser = {
    criteria: { version: "1.0.0", gate_id: "gate-f", name: "Production Readiness" },
    eosRoot: "/test/eos",
    runId: "run-12345",
    processPid: 9999,
    processUser: null,
    governanceSnapshot: { constitution_status: "valid" }
  };
  
  const context = buildGateFExecutionContext(inputsWithNullUser);
  assert.equal(context.executorIdentity, "gate-f:run=run-12345:pid=9999:user=u");
});

test("Gate F boundary input wrapper: valid input menghasilkan context yang frozen", () => {
  // Input valid yang lengkap
  const validInputs = {
    criteria: { version: "1.0.0", gate_id: "gate-f", name: "Production Readiness" },
    eosRoot: "/test/eos",
    runId: "run-12345",
    processPid: 9999,
    processUser: "test-user",
    governanceSnapshot: { constitution_status: "valid" }
  };

  const context = buildGateFExecutionContext(validInputs);
  
  // Verifikasi semua field ada dan benar
  assert.equal(context.runId, "run-12345");
  assert.equal(context.eosRoot, "/test/eos");
  assert.equal(context.executorIdentity, "gate-f:run=run-12345:pid=9999:user=test-user");
  assert.equal(context.criteria.version, "1.0.0");
  assert.equal(context.governanceSnapshot.constitution_status, "valid");
  assert.equal(typeof context.generatedAt, "string");
  
  // Verifikasi Object.freeze bekerja (tidak bisa dimodifikasi)
  assert.throws(() => {
    // @ts-expect-error - mencoba modifikasi object frozen (seharusnya error di strict mode)
    context.runId = "hacked-run-id";
  }, TypeError);
});

test("Gate F boundary input wrapper: missing required input throws error", () => {
  // Input invalid (tanpa criteria yang mandatory)
  const invalidInputs = {
    eosRoot: "/test/eos",
    runId: "run-12345",
    processPid: 9999,
    processUser: "test-user",
    governanceSnapshot: { constitution_status: "valid" }
  };

  // Memastikan error muncul ketika mengakses field yang hilang (karena inputs tidak lengkap)
  assert.throws(() => {
    buildGateFExecutionContext(invalidInputs);
  });
});

test("Gate F boundary input wrapper: null processUser menggunakan default 'u'", () => {
  const inputsWithNullUser = {
    criteria: { version: "1.0.0", gate_id: "gate-f", name: "Production Readiness" },
    eosRoot: "/test/eos",
    runId: "run-12345",
    processPid: 9999,
    processUser: null,
    governanceSnapshot: { constitution_status: "valid" }
  };

  const context = buildGateFExecutionContext(inputsWithNullUser);
  assert.equal(context.executorIdentity, "gate-f:run=run-12345:pid=9999:user=u");
});