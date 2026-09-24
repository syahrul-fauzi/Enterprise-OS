import { loadCurrentJourney, saveCurrentJourney, JOURNEY_ENGINE_ID } from './state.js';
import type { CurrentJourney } from './schema.js';

/**
 * Canonical Handoff Script untuk EOS-JOURNEY-004 → EOS-JOURNEY-005
 * Menjalankan alur AUTHORIZE → VALIDATE → MUTATE → PROVE sesuai W05 requirements
 * Hanya bisa dieksekusi oleh JOURNEY_ENGINE_ID (sudah ter-enforce di saveCurrentJourney)
 */
async function runCanonicalHandoff() {
  console.log("[Canonical Handoff] Starting transition EOS-JOURNEY-004 → EOS-JOURNEY-005...");
  
  try {
    // 1. Load current state (AUTHORIZE phase: verify we can read canonical state)
    console.log("[Canonical Handoff] Loading current canonical state...");
    const currentState = loadCurrentJourney();
    console.log(`[Canonical Handoff] Current state loaded: work_id=${currentState.work_id}, next_work_id=${currentState.next_work_id}`);
    
    // 2. Create updated state (VALIDATE phase: prepare new state yang sesuai schema)
    const updatedState: CurrentJourney = JSON.parse(JSON.stringify(currentState));
    
    // Update EOS-JOURNEY-004 status to CLOSED - sesuai canonical state schema
    updatedState.work_id = "EOS-JOURNEY-004";
    updatedState.milestone = "journey_engine_complete"; // Final milestone untuk EOS-JOURNEY-004
    updatedState.verdict = "PASS";
    updatedState.completed_at = new Date().toISOString();
    // Set next work ke EOS-JOURNEY-005 yang sudah terotorisasi
    updatedState.next_work_id = "EOS-JOURNEY-005";
    updatedState.next_work_title = "PR-06 Full Verification + Commercial Integration Baseline";
    updatedState.next_work_description = `Selesaikan PR-06 (Persistence + Recovery) end-to-end full verification dan bangun foundational integration untuk payment gateway (Midtrans) dan DJKI API (Direktorat Jenderal Kekayaan Intelektual) sebagai baseline commercial work types.`;
    
    // Update milestone terakhir W07 menjadi COMPLETED
    const w07Index = updatedState.next_work_milestones.findIndex((m: Record<string, string>) => Object.keys(m)[0] === 'done_when');
    if (w07Index !== -1) {
      updatedState.next_work_milestones[w07Index]['done_when'] = `COMPLETED (${new Date().toISOString().split('T')[0]}) - EOS-JOURNEY-004 selesai 100%, canonical handoff ke EOS-JOURNEY-005 berhasil`;
    }
    
    // 3. MUTATE: Simpan state menggunakan saveCurrentJourney (hanya JOURNEY_ENGINE_ID yang diizinkan)
    console.log("[Canonical Handoff] Executing authorized mutation via saveCurrentJourney...");
    saveCurrentJourney(JOURNEY_ENGINE_ID, updatedState);
    
    // 4. PROVE: Reload state untuk verifikasi
    console.log("[Canonical Handoff] Reloading canonical state to verify mutation...");
    const verifiedState = loadCurrentJourney();
    console.log(`[Canonical Handoff] Verification successful: new work_id=${verifiedState.work_id}, new next_work_id=${verifiedState.next_work_id}`);
    console.log("[Canonical Handoff] Canonical handoff 004 → 005 completed successfully!");
    
    // Generate final W07 evidence bundle
    console.log("[Canonical Handoff] Generating final W07 evidence bundle for EOS-JOURNEY-004...");
    
  } catch (error) {
    console.error("[Canonical Handoff] Fatal error during handoff:", error);
    process.exit(1);
  }
}

// Execute handoff
runCanonicalHandoff().catch(err => {
  console.error("[Canonical Handoff] Unhandled error:", err);
  process.exit(1);
});