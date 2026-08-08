import { traceExecutionByDecision, RuntimeInvocationEvent } from "../packages/core/runtime/src/invocation-evidence";
// Deklarasi global Node.js process untuk TypeScript
declare const process: {
  exit: (code: number) => never;
  env: Record<string, string | undefined>;
};

// Type untuk menyesuaikan dengan return traceExecutionByDecision
type TraceResult = {
  readonly totalMatches: number;
  readonly matchingExecutions: ReadonlyArray<{
    readonly runId: string | null;
    readonly timestamp_utc: string;
    readonly capability_id: string;
    readonly operation_id: string;
    readonly success: boolean;
    readonly product_id?: string;
  }>;
};

/**
 * Script untuk memulai cross-system proof B7.10 - LawyersHub sebagai consumer #2
 * Menjalankan traceExecutionByDecision dengan decision_id req-003 LawyersHub
 * dan memverifikasi bahwa seam yang sama bekerja untuk product context berbeda
 */
async function main() {
  // Gunakan decision_id yang sudah diverifikasi di recon untuk LawyersHub req-003
  const LAWYERSHUB_REQ003_DECISION_ID = "dec-f18f99cd-0dff-4f11-8632-76e01b9d0864";
  
  console.log(`[B7.10 LAWYERSHUB PROOF] Memulai verifikasi seam untuk LawyersHub requirement req-003`);
  console.log(`[B7.10 LAWYERSHUB PROOF] Decision ID: ${LAWYERSHUB_REQ003_DECISION_ID}\n`);

  const result = traceExecutionByDecision(LAWYERSHUB_REQ003_DECISION_ID) as TraceResult;
  
  console.log(`[B7.10 LAWYERSHUB PROOF] Hasil trace:`);
  console.log(`  Total matches: ${result.totalMatches}`);
  console.log(`  Matching executions: ${result.matchingExecutions.length}\n`);

  if (result.totalMatches > 0) {
    console.log(`[B7.10 LAWYERSHUB PROOF] ✅ SUKSES! Semua event runtime terikat dengan decision_id:`);
    result.matchingExecutions.forEach((exec, idx: number) => {
      console.log(`  [${idx + 1}] ${exec.capability_id}.${exec.operation_id} | ${exec.timestamp_utc} | success=${exec.success} | product_id=${exec.product_id || "unknown"}`);
    });
    
    // Verifikasi bahwa kedua capability yang diharapkan muncul (workflow-engine dan api-platform) - SEAM YANG SAMA
    const hasWorkflowEngine = result.matchingExecutions.some(e => e.capability_id === "workflow-engine");
    const hasApiPlatform = result.matchingExecutions.some(e => e.capability_id === "api-platform");
    
    if (hasWorkflowEngine && hasApiPlatform) {
      console.log(`\n[B7.10 LAWYERSHUB PROOF] ✅ SEAM INVARIANT TERBUKTI!`);
      console.log(`[B7.10 LAWYERSHUB PROOF] Sama seperti services-id, D → workflow-engine dan D → api-platform tercatat untuk LawyersHub`);
      console.log(`[B7.10 LAWYERSHUB PROOF] Cross-capability traceability bekerja untuk product context yang berbeda`);
      process.exit(0);
    } else {
      console.warn(`\n[B7.10 LAWYERSHUB PROOF] ⚠️ Trace tidak lengkap. Periksa apakah LawyersHub runtime sudah memanggil recordRuntimeInvocation dengan decision_id.`);
      process.exit(1);
    }
  } else {
    console.error(`[B7.10 LAWYERSHUB PROOF] ❌ GAGAL! Tidak ada event yang ditemukan untuk decision_id ${LAWYERSHUB_REQ003_DECISION_ID}`);
    console.error(`[B7.10 LAWYERSHUB PROOF] Persiapkan runtime LawyersHub untuk menangkap invokasi dengan decision_id yang valid.`);
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(`[B7.10 LAWYERSHUB PROOF] FATAL ERROR:`, err);
  process.exit(1);
});