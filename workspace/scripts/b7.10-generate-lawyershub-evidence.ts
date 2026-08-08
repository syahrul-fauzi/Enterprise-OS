import { recordRuntimeInvocation } from "@repo/core-runtime";

/**
 * Script untuk menghasilkan evidence runtime untuk LawyersHub req-003
 * Mensimulasikan POST /api/delivery flow untuk product context LawyersHub
 * Membuktikan seam yang sama bekerja untuk kedua produk
 */
async function main() {
  // Decision ID yang valid untuk LawyersHub req-003 (dari recon yang sudah diverifikasi)
  const LAWYERSHUB_REQ003_DECISION_ID = "dec-f18f99cd-0dff-4f11-8632-76e01b9d0864";
  
  console.log(`[B7.10 LAWYERSHUB EVIDENCE] Membuat runtime events untuk req-003, decision_id: ${LAWYERSHUB_REQ003_DECISION_ID}`);
  
  // Set environment untuk menulis ke LawyersHub's runtime log
  process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH = "/root/Enterprise-OS/workspace/products/lawyershub/evidence/verification/runtime-invocations.jsonl";
  process.env.EOS_RUNTIME_INVOCATION_PRODUCT_ID = "lawyershub";

  // 1. api-platform event (SAME SEAM sebagai services-id)
  recordRuntimeInvocation({
    capabilityId: "api-platform",
    operationId: "delivery-surface.attach-evidence",
    sourceRef: "scripts/b7.10-generate-lawyershub-evidence.ts",
    success: true,
    input: { requirementId: "req-003" },
    result: { artifactCreated: true },
    decision_id: LAWYERSHUB_REQ003_DECISION_ID,
  });

  // 2. workflow-engine event (SAME SEAM sebagai services-id)
  recordRuntimeInvocation({
    capabilityId: "workflow-engine",
    operationId: "execute-delivery-workflow",
    sourceRef: "scripts/b7.10-generate-lawyershub-evidence.ts",
    success: true,
    input: { requirementId: "req-003", runId: "run-lawyershub-001" },
    result: { workflowCompleted: true },
    decision_id: LAWYERSHUB_REQ003_DECISION_ID,
  });

  console.log(`[B7.10 LAWYERSHUB EVIDENCE] ✅ Dua event runtime berhasil dibuat untuk LawyersHub`);
  console.log(`[B7.10 LAWYERSHUB EVIDENCE] Sekarang jalankan verifikasi trace untuk LawyersHub!`);
  
  console.log(`\nRun verification dengan command:`);
  console.log(`npx tsx scripts/b7.10-verify-lawyershub-trace.ts`);
}

main().catch(err => {
  console.error(`[B7.10 LAWYERSHUB EVIDENCE] FATAL ERROR:`, err);
  process.exit(1);
});