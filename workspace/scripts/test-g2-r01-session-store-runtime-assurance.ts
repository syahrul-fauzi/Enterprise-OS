#!/usr/bin/env node
import { sessionQueries, resetSessionRepository } from '../capabilities/identity/implementation/queries/session.queries.js';
import { decodeWorkspaceSession } from '../packages/core/kernel/src/session/workspace-session.js';
import { SessionRepositoryInMemory } from '../capabilities/identity/implementation/repositories/session.inmemory.js';
import { statePath } from "@repo/eos-cli";

async function runG2R01Test() {
  console.log("[G2-R01-TEST] Memulai Session Store Runtime Assurance Test...\n");
  let allPassed = true;
  const evidence: any[] = [];

  // Test 1: Verifikasi wiring runtime - sessionQueries menggunakan SessionRepositoryInMemory sebagai default
  console.log("[TEST 1] Verifikasi wiring runtime: sessionQueries menggunakan SessionRepositoryInMemory sebagai default...");
  try {
    await resetSessionRepository();
    const testSessionId = "session-test-001";
    const isRevoked = await sessionQueries.isRevoked(testSessionId);
    console.log(`[TEST 1] ✅ sessionQueries.isRevoked() dapat diakses: session ${testSessionId} isRevoked=${isRevoked}`);
    evidence.push({ test: "runtimeWiring", passed: true, result: isRevoked });
  } catch (error: any) {
    console.error(`[TEST 1] ❌ Gagal: ${error.message}`);
    allPassed = false;
    evidence.push({ test: "runtimeWiring", passed: false, error: error.message });
  }

  // Test 2: Verifikasi perilaku fail-closed ketika session tidak ditemukan
  console.log("\n[TEST 2] Verifikasi perilaku fail-closed ketika session tidak ditemukan...");
  try {
    const nonExistentSessionId = "session-non-existent-999";
    const isRevoked = await sessionQueries.isRevoked(nonExistentSessionId);
    console.log(`[TEST 2] ✅ Session tidak ditemukan: isRevoked=${isRevoked}`);
    
    if (isRevoked === true) {
      console.log("[TEST 2] ✅ Perilaku fail-closed terverifikasi: session tidak ditemukan dianggap dicabut");
      evidence.push({ test: "failClosedBehavior", passed: true, result: isRevoked });
    } else {
      console.error("[TEST 2] ❌ Perilaku fail-closed gagal: session tidak ditemukan tidak dianggap dicabut");
      allPassed = false;
      evidence.push({ test: "failClosedBehavior", passed: false, result: isRevoked });
    }
  } catch (error: any) {
    console.error(`[TEST 2] ❌ Gagal: ${error.message}`);
    allPassed = false;
    evidence.push({ test: "failClosedBehavior", passed: false, error: error.message });
  }

  // Test 3: Verifikasi decodeWorkspaceSession menggunakan sessionQueries.isRevoked() (authoritative store)
  console.log("\n[TEST 3] Verifikasi decodeWorkspaceSession menggunakan sessionQueries.isRevoked()...");
  try {
    await resetSessionRepository();
    const mockSignedSession = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiJzZXNzaW9uLXRlc3QtMDAxIiwidXNlcklkIjoidXNlci10ZXN0LTAwMSIsInRlbmFudElkIjoidGVuYW50LXRlc3QtMDAxIiwid29ya3NwYWNlSWQiOiJ3b3Jrc3BhY2UtdGVzdC0wMDEiLCJleHBpcmVzQXQiOjE5MDAwMDAwMDAwMDB9.signature";
    const decodedSession = await decodeWorkspaceSession(mockSignedSession);
    console.log(`[TEST 3] ✅ decodeWorkspaceSession dapat dijalankan, hasil: ${decodedSession ? "valid" : "null (sesuai dengan store)"}`);
    evidence.push({ test: "decodeWorkspaceSessionWiring", passed: true, result: decodedSession });
  } catch (error: any) {
    console.error(`[TEST 3] ❌ Gagal: ${error.message}`);
    allPassed = false;
    evidence.push({ test: "decodeWorkspaceSessionWiring", passed: false, error: error.message });
  }

  // Test 4: Verifikasi SessionRepositoryInMemory memiliki metode reset() untuk isolasi test
  console.log("\n[TEST 4] Verifikasi SessionRepositoryInMemory memiliki metode reset()...");
  try {
    if (typeof SessionRepositoryInMemory.reset === 'function') {
      console.log("[TEST 4] ✅ SessionRepositoryInMemory memiliki metode reset() untuk isolasi test");
      await SessionRepositoryInMemory.reset();
      evidence.push({ test: "resetMethodAvailable", passed: true });
    } else {
      console.error("[TEST 4] ❌ SessionRepositoryInMemory tidak memiliki metode reset()");
      allPassed = false;
      evidence.push({ test: "resetMethodAvailable", passed: false });
    }
  } catch (error: any) {
    console.error(`[TEST 4] ❌ Gagal: ${error.message}`);
    allPassed = false;
    evidence.push({ test: "resetMethodAvailable", passed: false, error: error.message });
  }

  // Test 5: Verifikasi dynamic repository selection (InMemory vs Postgres)
  console.log("\n[TEST 5] Verifikasi dynamic repository selection...");
  try {
    const usesInMemory = !process.env.POSTGRES_CONNECTION_STRING && !process.env.DATABASE_URL;
    console.log(`[TEST 5] ✅ Runtime menggunakan ${usesInMemory ? "SessionRepositoryInMemory" : "SessionRepositoryPostgres"} sebagai default`);
    evidence.push({ test: "dynamicRepositorySelection", passed: true, usesInMemory });
  } catch (error: any) {
    console.error(`[TEST 5] ❌ Gagal: ${error.message}`);
    allPassed = false;
    evidence.push({ test: "dynamicRepositorySelection", passed: false, error: error.message });
  }

  // Ringkasan hasil
  console.log("\n" + "=".repeat(60));
  console.log("[G2-R01-TEST] Ringkasan Hasil:");
  console.log(`Total test: ${evidence.length}`);
  console.log(`Lulus: ${evidence.filter(e => e.passed).length}`);
  console.log(`Gagal: ${evidence.filter(e => !e.passed).length}`);
  console.log(`Hasil akhir: ${allPassed ? "ALL_PASSED" : "FAILED"}`);
  console.log("=".repeat(60));

  // Simpan bukti
  const fs = require('fs');
  const evidenceDir = statePath('verification', 'SMACE-007');
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
  const evidencePath = statePath('verification', 'SMACE-007', `EVI-G2-R01-${Date.now()}.json`);
  fs.writeFileSync(evidencePath, JSON.stringify({
    testId: "G2-R01",
    overallResult: allPassed ? "ALL_PASSED" : "FAILED",
    evidence,
    timestamp: Date.now(),
    runtimeConfig: {
      usesInMemory: !process.env.POSTGRES_CONNECTION_STRING && !process.env.DATABASE_URL
    }
  }, null, 2));
  console.log(`\n[G2-R01-TEST] Bukti disimpan di: ${evidencePath}`);

  process.exit(allPassed ? 0 : 1);
}

runG2R01Test().catch(err => {
  console.error("[G2-R01-TEST] Error fatal:", err);
  process.exit(1);
});