// WORK-ACLPILOT-026-03: Test fail-closed semantics untuk Redis unavailable
// Berdasarkan implementasi dari email-queue.ts dan test-runner.ts
import "../packages/core/runtime/src/email-queue.ts"; // Inisialisasi shared Redis instance
import { executeBudgetOperation } from "../packages/core/runtime/src/execution-observability.ts";

async function runRedisFailureTest() {
  console.log("[026-03-TEST] Memulai pengujian fail-closed Redis...");
  
  // Dapatkan instance Redis global yang sudah diinisialisasi
  const redis = globalThis.__EOS_SHARED_REDIS_INSTANCE__;
  
  // Set mode multi-instance untuk memicu fail-closed semantics
  process.env.EOS_DEPLOYMENT_MODE = 'multi-instance';
  console.log("[026-03-TEST] Mode deployment diatur ke: multi-instance");

  try {
    // 1. Test 1: Redis tersedia, operasi harus berhasil
    console.log("\n[026-03-TEST] Test 1: Redis tersedia, coba eksekusi reservasi...");
    const test1Result = await executeBudgetOperation(
      "PILOT-TENANT-003",    // tenantId (parameter pertama)
      "reserve",            // operation
      9900,                 // amount
      "test-reservation-001", // reservationId
      5000000               // maxMonthlyBudget (sesuai PILOT-TENANT-003)
    );
    console.log("[026-03-TEST] Test 1 BERHASIL: Operasi reservasi dieksekusi", test1Result);

    // 2. Test 2: Simulasikan Redis unavailable, operasi harus gagal
    console.log("\n[026-03-TEST] Test 2: Aktifkan simulasi Redis unavailable...");
    redis.simulateUnavailable(true);
    
    try {
      await executeBudgetOperation(
        "PILOT-TENANT-003",
        "reserve",
        9900,
        "test-reservation-002",
        5000000
      );
      // Jika tidak throw error, test gagal
      console.error("[026-03-TEST] Test 2 GAGAL: Operasi berhasil dieksekusi padahal Redis unavailable");
      process.exit(1);
    } catch (error: any) {
      console.log("[026-03-TEST] Test 2 BERHASIL: Operasi ditolak dengan error:", error.message);
      if (error.message.includes("[MULTI-INSTANCE-FAIL-CLOSED]")) {
        console.log("[026-03-TEST] Test 2: Error sesuai semantik fail-closed yang diharapkan");
      }
    }

    // 3. Test 3: Pulihkan Redis, operasi harus bisa dieksekusi kembali
    console.log("\n[026-03-TEST] Test 3: Matikan simulasi Redis unavailable, pulihkan koneksi...");
    redis.simulateUnavailable(false);
    
    const test3Result = await executeBudgetOperation(
      "PILOT-TENANT-003",
      "reserve",
      9900,
      "test-reservation-003",
      5000000
    );
    console.log("[026-03-TEST] Test 3 BERHASIL: Operasi dapat dieksekusi kembali setelah pemulihan", test3Result);

    // 4. Test 4: Verifikasi tidak ada fallback in-memory yang berjalan (tidak ada operasi yang lolos saat Redis unavailable)
    console.log("\n[026-03-TEST] Test 4: Verifikasi tidak ada fallback in-memory diam-diam...");
    redis.simulateUnavailable(true);
    let fallbackDetected = false;
    try {
      await executeBudgetOperation(
        "PILOT-TENANT-003",
        "reserve",
        100000,
        "test-reservation-004",
        5000000
      );
      fallbackDetected = true;
    } catch {
      fallbackDetected = false;
    }
    
    if (fallbackDetected) {
      console.error("[026-03-TEST] Test 4 GAGAL: Fallback in-memory terdeteksi berjalan");
      process.exit(1);
    } else {
      console.log("[026-03-TEST] Test 4 BERHASIL: Tidak ada fallback in-memory yang berjalan");
    }

    // Semua test lulus
    console.log("\n=== 026-03-TEST: SEMUA TEST LULUS ===");
    console.log("Fail-closed semantics terverifikasi: semua operasi berbayar ditolak saat Redis unavailable");
    console.log("Tidak ada fallback in-memory yang berjalan pada mode multi-instance");
    
    // Simpan hasil test ke folder evidence untuk 026-04
    const fs = await import('fs');
    const logPath = '/root/Enterprise-OS/workspace/.eos-state/evidence/WORK-ACLPILOT-026-03_failclosed_test.log';
    const logContent = `[${new Date().toISOString()}] WORK-ACLPILOT-026-03: Semua test fail-closed Redis lulus\n`;
    fs.appendFileSync(logPath, logContent);
    console.log(`[026-03-TEST] Hasil test disimpan ke: ${logPath}`);
    
    process.exit(0);

  } catch (error: any) {
    console.error("[026-03-TEST] Test gagal dengan error tidak terduga:", error);
    // Simpan error ke log juga
    const fs = await import('fs');
    const logPath = '/root/Enterprise-OS/workspace/.eos-state/evidence/WORK-ACLPILOT-026-03_failclosed_test.log';
    const logContent = `[${new Date().toISOString()}] WORK-ACLPILOT-026-03: Test gagal - ${error.message}\n`;
    fs.appendFileSync(logPath, logContent);
    process.exit(1);
  }
}

runRedisFailureTest();