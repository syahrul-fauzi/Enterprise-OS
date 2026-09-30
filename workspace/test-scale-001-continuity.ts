/**
 * Work Continuity Trace Test for SCALE-001 (Completed Production Work)
 * End-to-end validation of handoff → receive → continue pipeline
 * Sesuai instruksi user: Ambil satu Work nyata → lakukan Work Continuity Trace
 */

import { handoff_work, receive_work, continue_work, WorkHandoffEnvelope } from './capabilities/core-runtime/work-continuity';
import { TenantId, WorkspaceId } from './capabilities/identity/implementation/contracts/identity.contracts';

// SCALE-001 metadata dari .eos-state/current-journey.yaml
const SCALE_001_EVIDENCE_CHAIN = [
  "/.eos-state/proofs/EOS-JOURNEY-007-W02-verification-complete.json",
  "/.eos-state/proofs/EOS-COMM-002-2026-09-24.json",
  "/.eos-state/proofs/EOS-JOURNEY-007-state-mutation-1790256374946.json"
];

// Canonical authority dari AUTHORITY-SCOPE-001 - tetap sama sepanjang pergerakan Work
const SCALE_001_TENANT_ID = TenantId("tenant-scale-001") as string;
const SCALE_001_WORKSPACE_ID = WorkspaceId("ws-scale-001-infra") as string;

// Buat envelope untuk handoff SCALE-001 dari AI Agent (eos-core-agent) ke Human Runtime (human-payment-operator)
const scale001HandoffEnvelope: WorkHandoffEnvelope = {
  work_id: "SCALE-001",
  timestamp: new Date().toISOString(),
  source_actor_id: "eos-core-agent",
  target_actor_id: "human-payment-operator",
  tenant_id: SCALE_001_TENANT_ID,
  workspace_id: SCALE_001_WORKSPACE_ID,
  state_path: "/.eos-state/current-journey.yaml",
  evidence_chain: SCALE_001_EVIDENCE_CHAIN,
  metadata: {
    work_title: "Migrate in-memory production stores to persistent PostgreSQL",
    next_work_id: "PAY-001",
    verification_summary: "SCALE-001 full end-to-end validation PASSED"
  }
};

console.log("\n=== STARTING WORK CONTINUITY TRACE: SCALE-001 ===");

try {
  // 1. HANDOFF: Pindahkan Work dari AI Agent ke Human Runtime
  console.log("\n[STEP 1/3] Handoff Work...");
  const handoffSuccess = handoff_work(scale001HandoffEnvelope);
  if (!handoffSuccess) throw new Error("Handoff failed");

  // 2. RECEIVE: Human Runtime menerima Work dari AI Agent
  console.log("\n[STEP 2/3] Receive Work...");
  const receivedEnvelope = receive_work("SCALE-001", "eos-core-agent");
  if (!receivedEnvelope) throw new Error("Receive failed");

  // 3. CONTINUE: Human Runtime melanjutkan Work untuk PAY-001
  console.log("\n[STEP 3/3] Continue Work...");
  const continueSuccess = continue_work("SCALE-001");
  if (!continueSuccess) throw new Error("Continue failed");

  console.log("\n=== 🎉 WORK CONTINUITY TRACE: PASS SEMUA! ===");
  console.log("SCALE-001 berhasil di-handoff, diterima, dan dilanjutkan lintas actor/runtime");
  console.log("EOS thesis terpenuhi: Work dapat dipahami, dijalankan, dibuktikan, dan dilanjutkan");
  process.exit(0);
} catch (err) {
  console.error("\n=== ❌ WORK CONTINUITY TRACE: FAIL ===");
  console.error("Error:", err);
  process.exit(1);
}