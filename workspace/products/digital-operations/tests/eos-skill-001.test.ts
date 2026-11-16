import { describe, it } from "vitest";
// @ts-nocheck
import assert from "node:assert/strict";
import { 
  workflowRegistry, 
  executeWorkflowTransition, 
  EOS_SKILL_001_RepositoryAuditWorkflow,
  isValidWorkflowDefinition
} from "../../../packages/core/kernel/src/registry/capability-command-registry.js";

// Test context yang sesuai dengan boundary workflow
const TEST_CONTEXT = {
  workId: "EOS-SKILL-COMPOSITION-001",
  sessionId: "test-session-001",
  tenantId: "tenant-eos-system-001",
  workspaceId: "eos-system-workspace.anonymous",
  executionState: "PREPARED" as const
};

// Test actor dengan role yang diizinkan
const TEST_ACTOR = "system-automated-001";
const TEST_ACTOR_ROLES = ["system", "automated", "audit-actor"];

it("EOS-SKILL-001: Workflow definition valid sesuai 5-boundary model", () => {
  // Verifikasi workflow terdaftar di registry
  const registeredWorkflow = workflowRegistry.get("eos-skill-001-repository-audit");
  assert.ok(registeredWorkflow, "Workflow harus terdaftar di workflowRegistry");
  assert.strictEqual(registeredWorkflow.id, "eos-skill-001-repository-audit");
  
  // Verifikasi isValidWorkflowDefinition lulus semua validasi boundary
  const isWorkflowValid = isValidWorkflowDefinition(EOS_SKILL_001_RepositoryAuditWorkflow);
  assert.ok(isWorkflowValid, "Workflow harus melewati semua validasi 5-boundary");
});

it("EOS-SKILL-001: Langkah awal workflow dapat dieksekusi (G3 gate partial)", async () => {
  // Set NODE_ENV=test untuk mengaktifkan test mode di executeWorkflowTransition
  process.env.NODE_ENV = "test";
  
  // Eksekusi langkah pertama: audit-initiated
  const result = await executeWorkflowTransition(
    EOS_SKILL_001_RepositoryAuditWorkflow,
    "audit-initiated",
    TEST_ACTOR,
    TEST_CONTEXT
  );
  
  // Verifikasi hasil eksekusi
  assert.ok(result.success, "Eksekusi langkah awal harus berhasil");
  assert.strictEqual(result.nextStep?.id, "recon-completed", "Langkah berikutnya harus recon-completed");
  assert.ok(result.evidenceAdded, "Evidence harus tercatat");
  assert.strictEqual(result.newExecutionState, "DISPATCHED", "State execution harus berubah menjadi DISPATCHED");
  
  // Verifikasi assigned actors sesuai dengan required roles di langkah berikutnya
  assert.deepStrictEqual(result.assignedActors, ["system-001", "automated-001"], "Assigned actors harus sesuai role yang diperlukan");
});

it("EOS-SKILL-001: Full workflow transition chain (semua langkah dapat dieksekusi)", async () => {
  process.env.NODE_ENV = "test";
  let currentStepId = EOS_SKILL_001_RepositoryAuditWorkflow.initialStep;
  let currentExecutionState = TEST_CONTEXT.executionState;
  const executedSteps: string[] = [];

  // Iterasi seluruh workflow dari initial hingga terminal step
  while (currentStepId !== EOS_SKILL_001_RepositoryAuditWorkflow.terminalStep) {
    executedSteps.push(currentStepId);
    
    const result = await executeWorkflowTransition(
      EOS_SKILL_001_RepositoryAuditWorkflow,
      currentStepId,
      TEST_ACTOR,
      {
        ...TEST_CONTEXT,
        executionState: currentExecutionState
      }
    );

    assert.ok(result.success, `Langkah ${currentStepId} harus berhasil dieksekusi`);
    currentExecutionState = result.newExecutionState;
    currentStepId = result.nextStep?.id || EOS_SKILL_001_RepositoryAuditWorkflow.terminalStep;
  }
  
  // Tambahkan terminal step ke daftar
  executedSteps.push(currentStepId);
  
  // Verifikasi semua langkah tereksekusi
  assert.strictEqual(executedSteps.length, 6, "Semua 6 langkah workflow harus tereksekusi");
  assert.strictEqual(executedSteps[0], "audit-initiated", "Langkah pertama harus audit-initiated");
  assert.strictEqual(executedSteps[5], "audit-completed", "Langkah terakhir harus audit-completed (terminal step)");
  
  console.log("[TEST] Seluruh langkah workflow berhasil dieksekusi:", executedSteps.join(" → "));
});

it("EOS-SKILL-001: Unauthorized transition ditolak (role validation berfungsi)", async () => {
  process.env.NODE_ENV = "test";
  // Actor tanpa role yang diperlukan untuk langkah pertama
  const unauthorizedActor = "unauthorized-user-001";
  
  const result = await executeWorkflowTransition(
    EOS_SKILL_001_RepositoryAuditWorkflow,
    "audit-initiated",
    unauthorizedActor,
    TEST_CONTEXT
  );
  
  assert.ok(!result.success, "Eksekusi oleh actor tidak berwenang harus gagal");
  assert.ok(result.error?.includes("lacks required roles"), "Error message harus menjelaskan kekurangan role");
});

// === TEST UNTUK GATE G4: CONDITIONAL BRANCHING ===
it("EOS-SKILL-001: Workflow definition mencatat failure branch dari recon-completed ke audit-failed", async () => {
  process.env.NODE_ENV = "test";

  const transition = EOS_SKILL_001_RepositoryAuditWorkflow.transitions["recon-to-failed"];
  assert.ok(transition, "Transition recon-to-failed harus ada di workflow definition");
  assert.strictEqual(transition.from, "recon-completed", "Transition failure harus berasal dari recon-completed");
  assert.strictEqual(transition.to, "audit-failed", "Transition failure harus menuju audit-failed");
  assert.ok(EOS_SKILL_001_RepositoryAuditWorkflow.steps.some(step => step.id === "audit-failed"), "Langkah audit-failed harus didefinisikan");
  console.log("[TEST] Failure branch recon→audit-failed terdefinisi sesuai workflow registry");
});

it("EOS-SKILL-001: Recovery branch dari audit-failed kembali ke audit-initiated sesuai workflow definition", async () => {
  process.env.NODE_ENV = "test";

  const recovery = EOS_SKILL_001_RepositoryAuditWorkflow.transitions["recover-to-recon"];
  assert.ok(recovery, "Transition recover-to-recon harus ada di workflow definition");
  assert.strictEqual(recovery.from, "audit-failed", "Recovery harus berasal dari audit-failed");
  assert.strictEqual(recovery.to, "audit-initiated", "Recovery harus kembali ke audit-initiated");
  console.log("[TEST] Recovery branch failed→initiate terdefinisi sesuai workflow registry");
});

it("EOS-SKILL-001: Semua failure branch valid terdaftar di workflow definition", async () => {
  process.env.NODE_ENV = "test";
  const failureTransitions = [
    "recon-to-failed",
    "dependency-to-failed",
    "verification-to-failed",
    "evidence-to-failed"
  ];

  for (const key of failureTransitions) {
    const transition = EOS_SKILL_001_RepositoryAuditWorkflow.transitions[key];
    assert.ok(transition, `Transition ${key} harus ada di workflow definition`);
    assert.strictEqual(transition.to, "audit-failed", `Transition ${key} harus menuju audit-failed`);
  }

  console.log("[TEST] Semua failure transitions valid terdaftar di workflow definition");
});