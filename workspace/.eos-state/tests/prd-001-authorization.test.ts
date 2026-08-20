import { test } from "node:test";
import assert from "node:assert";
import { executionContext } from "../../packages/core/runtime/src/execution-context.js";
import { recordRuntimeInvocation, traceExecutionByDecision } from "../../packages/core/runtime/src/invocation-evidence.js";
import { unlinkSync, existsSync } from "node:fs";

const EVIDENCE_PATH = "/tmp/prd001-test.log";
if (existsSync(EVIDENCE_PATH)) unlinkSync(EVIDENCE_PATH);
process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH = EVIDENCE_PATH;

test("PRD-001 TEST-1: Selesai implementasi cross-capability authorization", async () => {
  const W1 = "prd001-w1-001";
  const W2 = "prd001-w2-001";
  const tenant = "tenant-prd001-001";

  // 1. Buat artifact di W1
  await executionContext.run({ decision_id: W1, tenant_id: tenant }, async () => {
    recordRuntimeInvocation({
      capabilityId: "legal-document",
      operationId: "document.create",
      sourceRef: "test://prd001/w1-doc",
      success: true,
      input: { title: "W1 Document" },
      result: { id: "doc-w1-001" },
      outputRefs: ["artifact://doc-w1-001"]
    });
  });

  // 2. Coba akses artifact W1 dari W2 (HARUS GAGAL)
  let caughtError: any = null;
  console.log("\n--- Memulai akses tidak sah dari W2 ---");
  try {
    await executionContext.run({ decision_id: W2, tenant_id: tenant }, async () => {
      recordRuntimeInvocation({
        capabilityId: "legal-review",
        operationId: "review.create",
        sourceRef: "test://prd001/w2-review-unauthorized",
        success: false,
        input: { comments: "Unauthorized review" },
        result: null,
        inputRefs: ["artifact://doc-w1-001"]
      });
      console.log("⚠️ recordRuntimeInvocation selesai tanpa throw error! Assert.fail akan dieksekusi");
      assert.fail("Seharusnya throw error untuk unauthorized access");
    });
  } catch (e: any) {
    caughtError = e;
    console.log("✅ Catch menangkap error:", e.message);
  }
  assert.ok(caughtError !== null, "Harus menangkap error akses tidak sah");
  console.log("Error message yang diterima:", caughtError.message);
  assert.ok(caughtError.message.includes("Unauthorized"), `Pesan error harus mengandung "Unauthorized", pesan diterima: ${caughtError.message}`);
  console.log("✅ PRD-001 TEST-1 PASS: Unauthorized cross-decision artifact access berhasil diblokir");

  // 3. Coba akses artifact W1 dari W1 sendiri (HARUS BERHASIL)
  await executionContext.run({ decision_id: W1, tenant_id: tenant }, async () => {
    recordRuntimeInvocation({
      capabilityId: "legal-review",
      operationId: "review.create",
      sourceRef: "test://prd001/w1-review-authorized",
      success: true,
      input: { comments: "Authorized review" },
      result: { id: "review-w1-001" },
      inputRefs: ["artifact://doc-w1-001"]
    });
    console.log("✅ PRD-001 TEST-1 PASS: Authorized same-decision artifact access berhasil diizinkan");
  });

  const trace = traceExecutionByDecision(W1, tenant);
  assert.equal(trace.matchingExecutions.length, 2);
  const unauthTrace = traceExecutionByDecision(W2, tenant);
  assert.equal(unauthTrace.matchingExecutions.length, 1); // Hanya event unauthorized yang tercatat
});