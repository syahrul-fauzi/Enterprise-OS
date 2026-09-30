// IoT Mock Substrate - Verifikasi Substrate Independence
// Hanya mengimport WorkAggregate dan type primitive dari work-core
// TIDAK mengimport apapun dari implementasi internal EOS (tidak ada repository, tidak ada command, hanya type definitions)
import { CompositionId, newWorkId } from "../../capabilities/work-core/index.ts";
import type { WorkAggregate, WorkId, TenantId, WorkspaceId, ActorId, SessionId, WorkStatus, WorkMode, ClaimStatus } from "../../capabilities/work-core/contracts/work.contracts.ts";

/**
 * IoT Substrate hanya boleh melakukan operasi yang diizinkan:
 * observe → claim → execute → handoff/resume → report → settle
 * TIDAK BOLEH mendefinisikan ulang semantics Work atau memodifikasi field SEMANTIC CONTRACT
 */

// State lokal substrate (bukan state EOS Work) - simpan SEMANTIC CONTRACT asli dari EOS untuk verifikasi selamanya
const originalSemanticState: Map<string, Pick<WorkAggregate, "id" | "tenantId" | "workspaceId" | "actorId">> = new Map();
const localObservedWorks: Map<string, WorkAggregate> = new Map();

/**
 * 1. Observe Work dari EOS (hanya read-only untuk SEMANTIC CONTRACT)
 * Substrate hanya menerima serialisasi Work dari EOS, tidak membuatnya sendiri
 * Simpan SEMANTIC CONTRACT asli di Map terpisah untuk verifikasi selamanya (tidak pernah diubah)
 */
export function observeWork(serializedWork: string): WorkAggregate {
  const work: WorkAggregate = JSON.parse(serializedWork);
  
  // Validasi SEMANTIC CONTRACT field tidak boleh undefined (invariant: identity terjaga)
  if (!work.id || !work.tenantId || !work.workspaceId || !work.actorId) {
    throw new Error("[IoT-Substrate] Invalid Work: Missing required SEMANTIC CONTRACT fields");
  }
  
  // SIMPAN SEMANTIC ORIGINAL TIDAK AKAN PERNAH DIUBAH SELAMANYA
  originalSemanticState.set(work.id, {
    id: work.id,
    tenantId: work.tenantId,
    workspaceId: work.workspaceId,
    actorId: work.actorId
  });
  
  localObservedWorks.set(work.id, work);
  console.log(`[IoT-Substrate] Observed Work: ${work.id} (Tenant: ${work.tenantId})`);
  return work;
}

/**
 * 2. Claim Work untuk dieksekusi oleh substrate ini
 * Hanya boleh memodifikasi field CONTROL CONTRACT, TIDAK BOLEH mengubah SEMANTIC CONTRACT
 */
export function claimWork(workId: WorkId, executionSessionId: SessionId): WorkAggregate {
  const work = localObservedWorks.get(workId);
  if (!work) throw new Error(`[IoT-Substrate] Work ${workId} not found in observed works`);
  
  // Ambil SEMANTIC CONTRACT asli dari EOS yang disimpan saat observeWork (selalu immutable)
  const originalSemantics = originalSemanticState.get(workId);
  if (!originalSemantics) throw new Error(`[IoT-Substrate] No original semantic state found for Work ${workId}`);
  
  // Validasi SEMANTIC CONTRACT sekarang TIDAK BERBEDA DENGAN ASLI (invariant utama)
  // Ini akan selalu menangkap modifikasi apapun, kapanpun dilakukan
  if (work.id !== originalSemantics.id || 
      work.tenantId !== originalSemantics.tenantId || 
      work.workspaceId !== originalSemantics.workspaceId ||
      work.actorId !== originalSemantics.actorId) {
    throw new Error("[IoT-Substrate] Invariant violation: SEMANTIC CONTRACT fields modified");
  }
  
  // Validasi status sebelum claim (hanya boleh claim Work yang unclaimed)
  if (work.claimStatus === "CLAIMED") {
    throw new Error(`[IoT-Substrate] Work ${workId} is already claimed`);
  }

  // Update hanya field CONTROL CONTRACT - TIDAK ADA perubahan ke SEMANTIC CONTRACT
  const updatedWork: WorkAggregate = {
    ...work,
    claimStatus: "CLAIMED",
    activeExecutionId: executionSessionId,
    sessionId: executionSessionId,
    leaseUntil: new Date(Date.now() + 3600000), // 1 jam sesuai EOS policy
    status: "executing"
  };
  
  localObservedWorks.set(workId, updatedWork);
  console.log(`[IoT-Substrate] Claimed Work: ${workId} (Execution: ${executionSessionId})`);
  return updatedWork;
}

/**
 * 3. Execute Work (menjalankan aksi spesifik IoT device - contoh: mengirim data sensor)
 * Hanya memodifikasi field EVIDENCE CONTRACT untuk mencatat apa yang terjadi
 */
export function executeWork(workId: WorkId, sensorData: Record<string, any>): WorkAggregate {
  const work = localObservedWorks.get(workId);
  if (!work) throw new Error(`[IoT-Substrate] Work ${workId} not found`);
  if (work.claimStatus !== "CLAIMED") throw new Error(`[IoT-Substrate] Work ${workId} not claimed`);
  
  // Ambil SEMANTIC CONTRACT asli dari EOS yang disimpan saat observeWork (selalu immutable)
  const originalSemantics = originalSemanticState.get(workId);
  if (!originalSemantics) throw new Error(`[IoT-Substrate] No original semantic state found for Work ${workId}`);
  
  // Validasi SEMANTIC CONTRACT sekarang TIDAK BERBEDA DENGAN ASLI (invariant utama)
  // Ini akan selalu menangkap modifikasi apapun, kapanpun dilakukan
  if (work.id !== originalSemantics.id || 
      work.tenantId !== originalSemantics.tenantId || 
      work.workspaceId !== originalSemantics.workspaceId ||
      work.actorId !== originalSemantics.actorId) {
    throw new Error("[IoT-Substrate] Invariant violation: SEMANTIC CONTRACT fields modified");
  }
  
  // Tambahkan evidence eksekusi ke EVIDENCE CONTRACT - TIDAK merubah SEMANTIC/CONTROL
  const executionEvidence = {
    timestamp: new Date().toISOString(),
    substrate: "iot-mock-v0.1",
    action: "sensor_data_transmit",
    data: sensorData
  };
  
  const updatedWork: WorkAggregate = {
    ...work,
    evidence: [...(work.evidence || []), executionEvidence],
    platformSource: "iot-mock",
    updatedAt: new Date()
  };
  
  localObservedWorks.set(workId, updatedWork);
  console.log(`[IoT-Substrate] Executed Work: ${workId} - Sensor data transmitted`);
  return updatedWork;
}

/**
 * 4. Settle Work (menyelesaikan eksekusi, melepaskan claim)
 * Update CONTROL dan EVIDENCE contract untuk menandakan selesai
 */
export function settleWork(workId: WorkId): WorkAggregate {
  const work = localObservedWorks.get(workId);
  if (!work) throw new Error(`[IoT-Substrate] Work ${workId} not found`);
  
  // Ambil SEMANTIC CONTRACT asli dari EOS yang disimpan saat observeWork (selalu immutable)
  const originalSemantics = originalSemanticState.get(workId);
  if (!originalSemantics) throw new Error(`[IoT-Substrate] No original semantic state found for Work ${workId}`);
  
  // Validasi SEMANTIC CONTRACT sekarang TIDAK BERBEDA DENGAN ASLI (invariant utama)
  if (work.id !== originalSemantics.id || 
      work.tenantId !== originalSemantics.tenantId || 
      work.workspaceId !== originalSemantics.workspaceId ||
      work.actorId !== originalSemantics.actorId) {
    throw new Error("[IoT-Substrate] Invariant violation: SEMANTIC CONTRACT fields modified");
  }
  
  // Update CONTROL CONTRACT untuk melepaskan claim
  const settlementEvidence = {
    timestamp: new Date().toISOString(),
    action: "settle",
    outcome: "success"
  };
  
  const updatedWork: WorkAggregate = {
    ...work,
    claimStatus: "UNCLAIMED",
    activeExecutionId: undefined,
    status: "completed",
    evidence: [...(work.evidence || []), settlementEvidence],
    updatedAt: new Date()
  };
  
  localObservedWorks.set(workId, updatedWork);
  console.log(`[IoT-Substrate] Settled Work: ${workId} - Execution complete`);
  return updatedWork;
}

// Test harness untuk verifikasi substrate berjalan tanpa pengetahuan internal EOS
async function runSubstrateTest() {
  console.log("\n=== IoT Mock Substrate Test Starting ===");
  
  // Simulasi serialisasi Work dari EOS (seolah-olah dikirim via API/Message broker)
  const mockWorkFromEOS: WorkAggregate = {
    // SEMANTIC CONTRACT - TIDAK BOLEH diubah oleh substrate
    id: "work-001-iot-sensor" as WorkId,
    compositionId: CompositionId("composition-001"),
    tenantId: "tenant-enterprise" as TenantId,
    workspaceId: "workspace-factory" as WorkspaceId,
    actorId: "actor-iot-device-001" as ActorId,
    title: "Collect factory floor temperature sensor data",
    description: "Read temperature sensor every 5 minutes and transmit to cloud",
    
    // CONTROL CONTRACT - hanya boleh diubah oleh operasi claim/execute/settle
    status: "active" as WorkStatus,
    mode: "core" as WorkMode,
    sessionId: "session-eos-001" as SessionId,
    claimStatus: "UNCLAIMED" as ClaimStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
    
    // EVIDENCE CONTRACT - hanya boleh ditambah, tidak dihapus
    evidence: [],
    stateHistory: []
  };
  
  try {
    // 1. Observe
    const observed = observeWork(JSON.stringify(mockWorkFromEOS));
    // 2. Claim
    const claimed = claimWork(observed.id, "session-iot-001" as SessionId);
    // 3. Execute
    const executed = executeWork(claimed.id, { temperature: 24.5, humidity: 62 });
    // 4. Settle
    const settled = settleWork(executed.id);
    
    console.log("\n=== ALL SUBSTRATE OPERATIONS PASSED ===");
    console.log("Substrate successfully consumed Work Continuity Contract WITHOUT internal EOS knowledge");
    console.log("SEMANTIC CONTRACT fields preserved throughout execution");
  } catch (error) {
    console.error("\n=== SUBSTRATE TEST FAILED ===");
    console.error(error);
    process.exit(1);
  }
}

// Jalankan test jika file dieksekusi langsung
if (import.meta.url === `file://${process.argv[1]}`) {
  runSubstrateTest();
}

export { localObservedWorks, runSubstrateTest };