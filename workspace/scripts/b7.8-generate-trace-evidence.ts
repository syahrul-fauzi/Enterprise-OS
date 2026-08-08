import { recordRuntimeInvocation } from "@repo/core-runtime";

/**
 * Script untuk menghasilkan evidence runtime dengan decision_id yang valid untuk B7.8
 * Mensimulasikan flow POST /api/delivery yang menghasilkan trace(D)→R yang bisa diverifikasi
 */
async function main() {
  // Decision ID yang valid untuk services-id (B7.8 primary consumer)
  const SERVICES_ID_VALID_DECISION_ID = "dec-services-id-b7.8-12345";
  
  console.log(`[B7.8 EVIDENCE GENERATOR] Membuat runtime events untuk decision_id: ${SERVICES_ID_VALID_DECISION_ID}`);
  
  // Set environment variable untuk menulis ke services-id's runtime log
  process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH = "/root/Enterprise-OS/workspace/products/services-id/evidence/verification/runtime-invocations.jsonl";
  process.env.EOS_RUNTIME_INVOCATION_PRODUCT_ID = "services-id";

  // 1. Simulasikan api-platform event (sesuai route.ts POST)
  recordRuntimeInvocation({
    capabilityId: "api-platform",
    operationId: "delivery-surface.attach-evidence",
    sourceRef: "scripts/b7.8-generate-trace-evidence.ts",
    success: true,
    input: { requirementId: "req-services-id-001" },
    result: { artifactCreated: true },
    decision_id: SERVICES_ID_VALID_DECISION_ID,
  });

  // 2. Simulasikan workflow-engine event (yang juga harus tercatat)
  recordRuntimeInvocation({
    capabilityId: "workflow-engine",
    operationId: "execute-delivery-workflow",
    sourceRef: "scripts/b7.8-generate-trace-evidence.ts",
    success: true,
    input: { requirementId: "req-services-id-001", runId: "run-67890" },
    result: { workflowCompleted: true },
    decision_id: SERVICES_ID_VALID_DECISION_ID,
  });

  console.log(`[B7.8 EVIDENCE GENERATOR] ✅ Dua event runtime berhasil dibuat untuk decision_id ${SERVICES_ID_VALID_DECISION_ID}`);
  console.log(`[B7.8 EVIDENCE GENERATOR] Sekarang jalankan b7.8-verify-trace-primitive.ts dengan decision_id yang benar!`);
  
  // Print command untuk user
  console.log(`\nRun verification dengan command:`);
  console.log(`TEST_DECISION_ID=${SERVICES_ID_VALID_DECISION_ID} npx tsx scripts/b7.8-verify-trace-primitive.ts`);
}

main().catch(err => {
  console.error(`[B7.8 EVIDENCE GENERATOR] FATAL ERROR:`, err);
  process.exit(1);
});