// WORK-ACLPILOT-024: Kill Switch Trigger Test - Verifikasi efektivitas pemicuan kill switch
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import dari dist setelah build
const executionStatusPath = join(__dirname, '../packages/core/runtime/dist/execution-status.js');
const { ExecutionStatusRepository } = await import(executionStatusPath);

// Test acceptance criteria untuk WORK-ACLPILOT-024:
// 1. Tidak bisa trigger sebelum arm (harus error)
// 2. Setelah arm, state kill_switch_armed = true
// 3. Setelah trigger, state kill_switch_triggered = true
// 4. Semua eksekusi aktif menjadi status BLOCKED
// 5. Evidence (timestamp, actor, reason) tersimpan dengan benar
// 6. Tidak ada eksekusi baru yang bisa diproses setelah trigger

async function main() {
  console.log("=== MEMULAI TEST KILL SWITCH WORK-ACLPILOT-024 ===");
  
  // Reset state terlebih dahulu untuk test
  await ExecutionStatusRepository.resetKillSwitch("test-actor-001");
  let initialState = await ExecutionStatusRepository.getKillSwitchState();
  console.log("1. Initial state:", initialState);
  
  // Test 1: Coba trigger sebelum arm - harus gagal
  console.log("\n=== Test 1: Trigger sebelum arm ===");
  const failedTrigger = await ExecutionStatusRepository.triggerKillSwitch("test-actor-001", "Test premature trigger");
  if (failedTrigger === undefined) {
    console.log("✓ PASSED: Trigger gagal sebelum kill switch di-arm (sesuai ekspektasi)");
  } else {
    console.error("✗ FAILED: Trigger berhasil sebelum arm - ini merupakan bug!");
    process.exit(1);
  }
  
  // Test 2: Arm kill switch
  console.log("\n=== Test 2: Arm kill switch ===");
  const armedState = await ExecutionStatusRepository.armKillSwitch("test-auditor-007");
  console.log("State setelah arm:", armedState);
  if (armedState.kill_switch_armed === true && armedState.armed_at_utc !== null) {
    console.log("✓ PASSED: Kill switch berhasil di-arm, state benar");
  } else {
    console.error("✗ FAILED: Kill switch gagal di-arm");
    process.exit(1);
  }
  
  // Test 3: Buat beberapa eksekusi dummy yang aktif (running/processing)
  console.log("\n=== Test 3: Inisialisasi eksekusi dummy yang aktif ===");
  // Inisialisasi global store jika belum ada
  if (!globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__) {
    globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__ = new Map();
  }
  
  // Tambahkan 3 eksekusi aktif
  const testExecutions = [
    { executionId: "exec-test-001", current: "running" },
    { executionId: "exec-test-002", current: "processing" },
    { executionId: "exec-test-003", current: "loading" },
    { executionId: "exec-test-004", current: "completed" } // Sudah selesai, tidak boleh diubah
  ];
  
  testExecutions.forEach(exec => {
    globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.set(exec.executionId, JSON.stringify({
      executionId: exec.executionId,
      current: exec.current,
      updatedAt: new Date().toISOString(),
      transitions: [{ status: exec.current, timestamp: new Date().toISOString() }]
    }));
  });
  
  console.log(`✓ Berhasil menambahkan ${testExecutions.length} eksekusi dummy`);
  console.log("Active execution IDs:", Array.from(globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.keys()));
  
  // Test 4: Trigger kill switch
  console.log("\n=== Test 4: Trigger kill switch ===");
  const triggerReason = "Pilot security audit - test penghentian semua eksekusi";
  const triggeredState = await ExecutionStatusRepository.triggerKillSwitch("test-auditor-007", triggerReason);
  
  if (!triggeredState) {
    console.error("✗ FAILED: Trigger kill switch gagal");
    process.exit(1);
  }
  
  console.log("State setelah trigger:", triggeredState);
  if (triggeredState.kill_switch_triggered === true && 
      triggeredState.triggered_by_actor_id === "test-auditor-007" &&
      triggeredState.reason === triggerReason &&
      triggeredState.triggered_at_utc !== null) {
    console.log("✓ PASSED: Kill switch berhasil di-trigger, semua field evidence terisi dengan benar");
  } else {
    console.error("✗ FAILED: State setelah trigger tidak valid");
    process.exit(1);
  }
  
  // Test 5: Verifikasi semua eksekusi aktif menjadi BLOCKED
  console.log("\n=== Test 5: Verifikasi eksekusi aktif menjadi BLOCKED ===");
  let allActiveBlocked = true;
  const allExecutions = Array.from(globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.entries());
  
  for (const [execId, execData] of allExecutions) {
    let parsed;
    if (typeof execData === 'string') {
      parsed = JSON.parse(execData);
    } else {
      parsed = execData;
    }
    
    console.log(`Execution ${execId}: status sekarang = ${parsed.current}`);
    
    // Eksekusi yang sebelumnya running/processing/loading harus menjadi blocked
    if (["exec-test-001", "exec-test-002", "exec-test-003"].includes(execId)) {
      if (parsed.current !== "blocked") {
        console.error(`✗ FAILED: Eksekusi ${execId} tidak menjadi blocked`);
        allActiveBlocked = false;
      } else {
        // Cek apakah transition ditambahkan
        const blockTransition = parsed.transitions.find(t => t.status === "blocked");
        if (!blockTransition) {
          console.error(`✗ FAILED: Eksekusi ${execId} tidak memiliki transition block di history`);
          allActiveBlocked = false;
        } else {
          console.log(`✓ Eksekusi ${execId} berhasil di-block, transition tercatat`);
        }
      }
    }
    
    // Eksekusi yang sudah completed harus tetap completed
    if (execId === "exec-test-004" && parsed.current !== "completed") {
      console.error(`✗ FAILED: Eksekusi yang sudah completed berubah status menjadi ${parsed.current}`);
      allActiveBlocked = false;
    }
  }
  
  if (allActiveBlocked) {
    console.log("✓ PASSED: Semua eksekusi aktif berhasil di-block, eksekusi selesai tetap utuh");
  } else {
    process.exit(1);
  }
  
  // Test 6: Coba trigger lagi - harus idempoten (tidak error)
  console.log("\n=== Test 6: Idempotensi trigger (coba trigger lagi) ===");
  const secondTrigger = await ExecutionStatusRepository.triggerKillSwitch("test-auditor-007", "Duplicate trigger test");
  if (secondTrigger) {
    console.log("✓ PASSED: Trigger kedua idempoten, tidak menyebabkan error");
  } else {
    console.error("✗ FAILED: Trigger kedua gagal");
    process.exit(1);
  }
  
  // Test 7: Verifikasi semua evidence tersimpan (audit log)
  console.log("\n=== Test 7: Verifikasi evidence chain lengkap ===");
  const finalState = await ExecutionStatusRepository.getKillSwitchState();
  console.log("Final kill switch state:", finalState);
  
  const evidenceComplete = 
    finalState.kill_switch_armed === true &&
    finalState.kill_switch_triggered === true &&
    finalState.armed_at_utc !== null &&
    finalState.triggered_at_utc !== null &&
    finalState.triggered_by_actor_id === "test-auditor-007" &&
    finalState.reason === triggerReason;
  
  if (evidenceComplete) {
    console.log("✓ PASSED: Seluruh evidence kill switch lengkap dan terverifikasi");
  } else {
    console.error("✗ FAILED: Evidence chain tidak lengkap");
    process.exit(1);
  }
  
  // Reset state kembali
  await ExecutionStatusRepository.resetKillSwitch("test-actor-001");
  
  console.log("\n=== SEMUA TEST KILL SWITCH WORK-ACLPILOT-024 LULUS ===");
  console.log("VERIFICATION VERDICT: ALL_PASSED = true");
  process.exit(0);
}

main().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});