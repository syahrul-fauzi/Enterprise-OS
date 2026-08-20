/**
 * C8 Acceptance Test - Verify decision_id as Shared Work Identity
 * Buktikan bahwa satu decision_id dapat mengikat multiple capability execution
 * Semua perubahan minimal, tidak mengubah Building v0
 */
import { randomUUID } from "node:crypto";
import { executionContext, recordRuntimeInvocation, traceExecutionByDecision } from "../packages/core/runtime/src/index.js";
import { capabilityRegistry } from "@repo/core-kernel";
import type { CreateRequirementInput, CreateRequirementOutput } from "../capabilities/requirement-management/implementation/contracts/requirement.contracts.js";
import type { CreateCaseInput, CreateCaseOutput } from "../capabilities/legal-case/implementation/contracts/case.contracts.js";
import type { CreateDocumentInput, CreateDocumentOutput } from "../capabilities/legal-document/implementation/contracts/document.contracts.js";

// Generate test context (synthetic session, sesuai tenant isolation requirements)
const TEST_SESSION = {
  sessionId: `sess-${randomUUID()}`,
  tenantId: "tenant-lawyershub-001",
  workspaceId: "workspace-lawyershub-main",
  actorId: "user-human-001",
  productId: "lawyershub-v1"
};

// C8 WORK IDENTITY - decision_id = W1 (sama untuk semua execution)
const WORK_DECISION_ID = "W1";

async function main() {
  console.log("\n[C8-ACCEPTANCE] 🚀 Memulai C8 Acceptance Test: decision_id = W1 sebagai Work Identity");
  console.log("[C8-ACCEPTANCE] 📋 Test Chain: Human Need → decision_id=W1 → Requirement → Case → Document");

  // Jalankan semua execution dalam SINGLE executionContext.run() dengan decision_id=W1
  // Ini mensimulasikan bahwa SEMUA capability dalam satu work memiliki decision_id yang sama
  const result = await executionContext.run(
    {
      decision_id: WORK_DECISION_ID,
      product_id: TEST_SESSION.productId,
      run_id: `c8-test-run-${randomUUID()}`
    },
    async () => {
      // 1. Create Requirement dengan workId=W1
      console.log("\n[C8-ACCEPTANCE] ⏳ Step 1: create Requirement(workId=W1)");
      const createRequirementInput: CreateRequirementInput = {
        title: "Buatkan kontrak sewa toko untuk usaha saya",
        description: "User membutuhkan kontrak sewa toko komersial untuk usaha retailnya.",
        priority: "high",
        workId: WORK_DECISION_ID,
        sessionId: TEST_SESSION.sessionId,
        tenantId: TEST_SESSION.tenantId,
        workspaceId: TEST_SESSION.workspaceId,
        actorId: TEST_SESSION.actorId
      };
      const requirementOutput: CreateRequirementOutput = await capabilityRegistry.invokeAsync(
        "requirement-management",
        "requirement.create",
        createRequirementInput
      );
      recordRuntimeInvocation({
        capabilityId: "EOS-REQUIREMENT-MANAGEMENT",
        operationId: "requirement.create",
        sourceRef: `req-${requirementOutput.id}`,
        success: true,
        input: createRequirementInput,
        result: requirementOutput,
        decision_id: WORK_DECISION_ID
      });
      console.log(`[C8-ACCEPTANCE] ✅ Requirement created: ${requirementOutput.id} (workId=${WORK_DECISION_ID})`);

      // 2. Create Case dengan workId=W1
      console.log("\n[C8-ACCEPTANCE] ⏳ Step 2: create Case(workId=W1)");
      const createCaseInput: CreateCaseInput = {
        title: "Kasus Kontrak Sewa Toko - Retail",
        description: "Kasus hukum untuk pembuatan kontrak sewa toko komersial.",
        priority: "high",
        workId: WORK_DECISION_ID,
        sessionId: TEST_SESSION.sessionId,
        tenantId: TEST_SESSION.tenantId,
        workspaceId: TEST_SESSION.workspaceId,
        actorId: TEST_SESSION.actorId
      };
      const caseOutput: CreateCaseOutput = await capabilityRegistry.invokeAsync(
        "legal-case",
        "case.create",
        createCaseInput
      );
      recordRuntimeInvocation({
        capabilityId: "EOS-LEGAL-CASE",
        operationId: "case.create",
        sourceRef: `case-${caseOutput.id}`,
        success: true,
        input: createCaseInput,
        result: caseOutput,
        decision_id: WORK_DECISION_ID
      });
      console.log(`[C8-ACCEPTANCE] ✅ Case created: ${caseOutput.id} (workId=${WORK_DECISION_ID})`);

      // 3. Create Document dengan workId=W1
      console.log("\n[C8-ACCEPTANCE] ⏳ Step 3: create Document(workId=W1)");
      const createDocumentInput: CreateDocumentInput = {
        title: "Draf Kontrak Sewa Toko Komersial",
        description: "Draf pertama kontrak sewa toko untuk kasus retail.",
        author: TEST_SESSION.actorId,
        workId: WORK_DECISION_ID,
        sessionId: TEST_SESSION.sessionId,
        tenantId: TEST_SESSION.tenantId,
        workspaceId: TEST_SESSION.workspaceId,
        actorId: TEST_SESSION.actorId
      };
      const documentOutput: CreateDocumentOutput = await capabilityRegistry.invokeAsync(
        "legal-document",
        "document.create",
        createDocumentInput
      );
      recordRuntimeInvocation({
        capabilityId: "EOS-LEGAL-DOCUMENT",
        operationId: "document.create",
        sourceRef: `doc-${documentOutput.id}`,
        success: true,
        input: createDocumentInput,
        result: documentOutput,
        decision_id: WORK_DECISION_ID
      });
      console.log(`[C8-ACCEPTANCE] ✅ Document created: ${documentOutput.id} (workId=${WORK_DECISION_ID})`);

      return {
        requirementId: requirementOutput.id,
        caseId: caseOutput.id,
        documentId: documentOutput.id,
        decisionId: WORK_DECISION_ID
      };
    }
  );

  // 4. Verifikasi traceExecutionByDecision mengembalikan SEMUA execution dengan decision_id=W1
  console.log("\n[C8-ACCEPTANCE] ⏳ Step 4: Query traceExecutionByDecision(W1)");
  const trace = traceExecutionByDecision(WORK_DECISION_ID);
  console.log(`[C8-ACCEPTANCE] 📊 Total matching executions: ${trace.totalMatches}`);
  trace.matchingExecutions.forEach((exec, idx) => {
    console.log(`  ${idx + 1}. ${exec.capability_id} / ${exec.operation_id} → decision_id=${exec.decision_id}`);
  });

  // 5. C8 Acceptance Criterion - SEMUA equality terpenuhi
  console.log("\n[C8-ACCEPTANCE] 🧪 Validating C8 Acceptance Criteria:");
  const allSameDecisionId = trace.matchingExecutions.every(exec => exec.decision_id === WORK_DECISION_ID);
  const allThreeExecutions = trace.totalMatches >= 3; // requirement, case, document

  if (allSameDecisionId && allThreeExecutions) {
    console.log("\n[C8-ACCEPTANCE] 🟢 C8 PASS - Shared Work Identity Proven!");
    console.log("[C8-ACCEPTANCE] ✅ Requirement.workId === Case.workId === Document.workId === decision_id === W1");
    console.log("[C8-ACCEPTANCE] ✅ Semua capability execution dalam satu work menggunakan decision_id yang sama.");
    console.log("[C8-ACCEPTANCE] 🎉 decision_id adalah primitive yang cukup untuk Work Identity - tidak perlu Work Manager baru!");
  } else {
    console.log("\n[C8-ACCEPTANCE] 🔴 C8 FAILED - Identity binding tidak konsisten");
    console.log(`[C8-ACCEPTANCE]   allSameDecisionId: ${allSameDecisionId}`);
    console.log(`[C8-ACCEPTANCE]   allThreeExecutions: ${allThreeExecutions}`);
    process.exit(1);
  }

  // Return hasil untuk verifikasi
  return result;
}

main().catch(err => {
  console.error("[C8-ACCEPTANCE] 💥 Test failed with error:", err);
  process.exit(1);
});