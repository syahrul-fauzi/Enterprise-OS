// Contract Adversarial Verification - IoT Mock Substrate
// Menguji apakah hostile substrate dapat dipaksa tunduk pada Work Contract
// Sesuai invariant: Semantic Non-Reinterpretation Invariant

// Menggunakan Node.js built-in test runner (bukan vitest) sesuai pola project
import { describe, it, beforeEach } from "node:test";
import { strict as assert } from "node:assert";
import { observeWork, claimWork, executeWork, settleWork, localObservedWorks } from "../iot-consumer.ts";
import type { WorkAggregate } from "../../../capabilities/work-core/contracts/work.contracts.ts";
import { CompositionId } from "../../../capabilities/work-core/index.ts";

// Membuat mock Work valid dari EOS untuk semua test
function createValidMockWork(): WorkAggregate {
  return {
    // SEMANTIC CONTRACT - SEMUA FIELD INI TIDAK BOLEH DIUBAH
    id: "work-001-iot-sensor" as any,
    compositionId: CompositionId("composition-001"),
    tenantId: "tenant-enterprise" as any,
    workspaceId: "workspace-factory" as any,
    actorId: "actor-iot-device-001" as any,
    title: "Collect factory floor temperature sensor data",
    description: "Read temperature sensor every 5 minutes and transmit to cloud",
    
    // CONTROL CONTRACT
    status: "active" as any,
    mode: "core" as any,
    sessionId: "session-eos-001" as any,
    claimStatus: "UNCLAIMED" as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    
    // EVIDENCE CONTRACT
    evidence: [],
    stateHistory: []
  };
}

describe("Contract Adversarial Verification - IoT Substrate", () => {
  // Reset state sebelum setiap test
  beforeEach(() => {
    localObservedWorks.clear();
  });

  describe("SEMANTIC CONTRACT IMMUTABILITY TESTS", () => {
    it("hostile attempt to mutate WorkId → DENY (throws invariant error)", () => {
      // 1. Substrate observe Work yang valid
      const validWork = createValidMockWork();
      const observed = observeWork(JSON.stringify(validWork));
      
      // 2. Hostile mencoba memodifikasi WorkId (tetap simpan dengan ID asli untuk trigger pengecekan invariant)
      assert.throws(() => {
        // @ts-expect-error - Sengaja memodifikasi SEMANTIC field yang seharusnya immutable
        const badWork = { ...observed, id: "hacked-work-123" as any };
        // Simpan dengan ID ASLI (bukan yang dihack) agar claimWork menemukan Work dan trigger pengecekan
        localObservedWorks.set(observed.id, badWork);
        // Coba jalankan claimWork yang akan memicu pengecekan invariant
        claimWork(observed.id, "session-iot-hack-001" as any);
      }, { message: "[IoT-Substrate] Invariant violation: SEMANTIC CONTRACT fields modified" });
    });

    it("hostile attempt to mutate TenantId → DENY", () => {
      const validWork = createValidMockWork();
      const observed = observeWork(JSON.stringify(validWork));
      
      assert.throws(() => {
        // @ts-expect-error - Sengaja mengganti tenant ID yang seharusnya tidak boleh diganti
        const badWork = { ...observed, tenantId: "hacker-tenant-123" as any };
        // Simpan dengan ID ASLI agar claimWork menemukan Work dan trigger pengecekan invariant
        localObservedWorks.set(observed.id, badWork);
        claimWork(observed.id, "session-iot-hack-002" as any);
      }, { message: "[IoT-Substrate] Invariant violation: SEMANTIC CONTRACT fields modified" });
    });

    it("hostile attempt to mutate WorkspaceId → DENY", () => {
      const validWork = createValidMockWork();
      const observed = observeWork(JSON.stringify(validWork));
      
      assert.throws(() => {
        // @ts-expect-error - Sengaja mengganti workspace ID
        const badWork = { ...observed, workspaceId: "hacker-space-123" as any };
        // Simpan dengan ID ASLI agar claimWork menemukan Work dan trigger pengecekan invariant
        localObservedWorks.set(observed.id, badWork);
        claimWork(observed.id, "session-iot-hack-003" as any);
      }, { message: "[IoT-Substrate] Invariant violation: SEMANTIC CONTRACT fields modified" });
    });

    it("hostile attempt to mutate ActorId during execution → DENY", () => {
      const validWork = createValidMockWork();
      const observed = observeWork(JSON.stringify(validWork));
      const claimed = claimWork(observed.id, "session-iot-legit-001" as any);
      
      assert.throws(() => {
        // @ts-expect-error - Mencoba mengubah actor ID saat eksekusi
        const badWork = { ...claimed, actorId: "hacker-actor-123" as any };
        localObservedWorks.set(badWork.id, badWork);
        executeWork(badWork.id, { temperature: 999 });
      }, { message: "[IoT-Substrate] Invariant violation: SEMANTIC CONTRACT fields modified" });
    });
  });

  describe("CONTROL CONTRACT VIOLATION TESTS", () => {
    it("hostile attempt to claim already claimed Work → DENY", () => {
      const validWork = createValidMockWork();
      const observed = observeWork(JSON.stringify(validWork));
      // Pertama claim secara legit
      claimWork(observed.id, "session-legit-1" as any);
      
      // Coba claim lagi oleh substrate lain (hostile)
      assert.throws(() => {
        claimWork(observed.id, "session-hacker-1" as any);
      }, { message: `[IoT-Substrate] Work ${validWork.id} is already claimed` });
    });

    it("hostile attempt to execute unclaimed Work → DENY", () => {
      const validWork = createValidMockWork();
      observeWork(JSON.stringify(validWork));
      
      assert.throws(() => {
        executeWork(validWork.id, { hacked: true });
      }, { message: `[IoT-Substrate] Work ${validWork.id} not claimed` });
    });

    it("hostile attempt to settle non-existent Work → DENY", () => {
      assert.throws(() => {
        settleWork("non-existent-work-999" as any);
      }, { message: "[IoT-Substrate] Work non-existent-work-999 not found" });
    });
  });

  describe("EVIDENCE CONTRACT INTEGRITY TESTS", () => {
    it("legitimate execution APPENDS evidence (tidak overwrite) → ALLOWED", () => {
      const validWork = createValidMockWork();
      const observed = observeWork(JSON.stringify(validWork));
      const claimed = claimWork(observed.id, "session-legit-2" as any);
      const executed = executeWork(claimed.id, { temperature: 25.0 });
      
      // Evidence harus bertambah, bukan diganti
      assert.equal(executed.evidence?.length, 1);
      assert.equal(executed.evidence?.[0].action, "sensor_data_transmit");
      assert.equal(executed.evidence?.[0].substrate, "iot-mock-v0.1");
    });

    it("hostile attempt to fabricate fake evidence but can't modify semantics → SEMANTICS STILL PRESERVED", () => {
      const validWork = createValidMockWork();
      const observed = observeWork(JSON.stringify(validWork));
      const claimed = claimWork(observed.id, "session-hacker-3" as any);
      
      // Meskipun hacker bisa menambahkan evidence palsu, SEMANTIC field tetap tidak bisa diubah
      // karena semua operasi selalu memvalidasi invariant
      const executed = executeWork(claimed.id, { fake: "data" });
      
      // SEMANTIC fields masih terjaga meskipun evidence ada yang palsu
      assert.equal(executed.id, validWork.id);
      assert.equal(executed.tenantId, validWork.tenantId);
      assert.equal(executed.workspaceId, validWork.workspaceId);
      // Evidence yang palsu tetap tercatat (bisa dideteksi oleh EOS saat verifikasi)
      assert.equal(executed.evidence?.length, 1);
    });
  });

  describe("LEGAL SUBSTRATE OPERATIONS (SEMUA OPS YANG DIZINKAN BERJALAN)", () => {
    it("legitimate substrate lifecycle (observe→claim→execute→settle) → ALLOWED", () => {
      const validWork = createValidMockWork();
      
      // 1. Observe
      const observed = observeWork(JSON.stringify(validWork));
      assert.equal(observed.id, validWork.id);
      
      // 2. Claim
      const claimed = claimWork(observed.id, "session-iot-legit-002" as any);
      assert.equal(claimed.claimStatus, "CLAIMED");
      assert.equal(claimed.status, "executing");
      
      // 3. Execute
      const executed = executeWork(claimed.id, { temperature: 24.5, humidity: 62 });
      assert.equal(executed.evidence?.length, 1);
      
      // 4. Settle
      const settled = settleWork(executed.id);
      assert.equal(settled.claimStatus, "UNCLAIMED");
      assert.equal(settled.status, "completed");
      
      // SEMUA SEMANTIC FIELD TIDAK PERNAH BERUBAH
      assert.equal(settled.id, validWork.id);
      assert.equal(settled.tenantId, validWork.tenantId);
      assert.equal(settled.workspaceId, validWork.workspaceId);
      assert.equal(settled.actorId, validWork.actorId);
    });
  });
});