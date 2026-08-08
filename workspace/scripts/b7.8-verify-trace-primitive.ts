import { traceExecutionByDecision } from "@repo/core-runtime";

/**
 * Script untuk membuktikan B7.8 trace(D) → R primitive aktual
 * Menjalankan traceExecutionByDecision dengan decision_id yang valid
 * dan memverifikasi bahwa semua runtime events terkait dikembalikan
 */
async function main() {
  // Gunakan decision_id yang sudah diuji di staging
  const TEST_DECISION_ID = process.env.TEST_DECISION_ID || "test-decision-123-b7.8";
  
  console.log(`[B7.8 TRACE PROOF] Memulai verifikasi trace primitive untuk decision_id: ${TEST_DECISION_ID}`);
  console.log(`[B7.8 TRACE PROOF] Memanggil traceExecutionByDecision("${TEST_DECISION_ID}")...\n`);

  const result = traceExecutionByDecision(TEST_DECISION_ID);
  
  console.log(`[B7.8 TRACE PROOF] Hasil trace:`);
  console.log(`  Total matches: ${result.totalMatches}`);
  console.log(`  Matching executions: ${result.matchingExecutions.length}\n`);

  if (result.totalMatches > 0) {
    console.log(`[B7.8 TRACE PROOF] ✅ SUKSES! Semua event runtime terikat dengan decision_id:`);
    result.matchingExecutions.forEach((exec, idx) => {
      console.log(`  [${idx + 1}] ${exec.capability_id}.${exec.operation_id} | ${exec.timestamp_utc} | success=${exec.success}`);
    });
    
    // Verifikasi bahwa kedua capability yang diharapkan muncul (workflow-engine dan api-platform)
    const hasWorkflowEngine = result.matchingExecutions.some(e => e.capability_id === "workflow-engine");
    const hasApiPlatform = result.matchingExecutions.some(e => e.capability_id === "api-platform");
    
    if (hasWorkflowEngine && hasApiPlatform) {
      console.log(`\n[B7.8 TRACE PROOF] ✅ SEMUA CROSS-CAPABILITY TRACE TERBUKTI!`);
      console.log(`[B7.8 TRACE PROOF] D → workflow-engine dan D → api-platform keduanya tercatat di ledger`);
      process.exit(0);
    } else {
      console.warn(`\n[B7.8 TRACE PROOF] ⚠️ Trace tidak lengkap. Periksa apakah kedua capability sudah memanggil recordRuntimeInvocation.`);
      process.exit(1);
    }
  } else {
    console.error(`[B7.8 TRACE PROOF] ❌ GAGAL! Tidak ada event yang ditemukan untuk decision_id ${TEST_DECISION_ID}`);
    console.error(`[B7.8 TRACE PROOF] Pastikan EOS_RUNTIME_INVOCATION_EVIDENCE_PATH sudah dikonfigurasi dengan benar.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`[B7.8 TRACE PROOF] FATAL ERROR:`, err);
  process.exit(1);
});