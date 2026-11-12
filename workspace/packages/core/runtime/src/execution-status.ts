// FIX-UI-001: Minimal execution status tracking for real-time UI updates
// In-memory fallback for test environments (NO Redis required) - aligned with platform/src implementation
import type { ObservedExecution } from "./execution-observability.js";
declare global {
  var __EOS_INMEMORY_EXECUTION_STATUSES__: Map<string, any>;
}
globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__ = globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__ || new Map();

// Use in-memory store in test environment, Redis otherwise - matches platform/src pattern
const useInMemory = process.env.NODE_ENV === 'test';
let redis: any; // Inisialisasi awal = in-memory, hanya diganti jika Redis terkonfirmasi berjalan

// Lock untuk mencegah race condition pada update status - bisa menyimpan lockValue untuk Redis mode (sama dengan execution-observability)
const statusUpdateLock = new Map<string, string | boolean>();

// Konstanta lock untuk distributed lock (multi-instance mode) - reuse existing EOS Redis lock primitive
const EXECUTION_LOCK_PREFIX = 'eos:lock:execution:';
const LOCK_LEASE_TTL = 5000; // 5 detik lease TTL sesuai dengan max wait (sama dengan waitForLock maxWaitMs)

// Reuse shared Redis instance dari execution-observability (tidak membuat primitive baru - WORK-ACLPILOT-026)
declare global {
  var __EOS_SHARED_REDIS_INSTANCE__: any;
}
const sharedRedis = globalThis.__EOS_SHARED_REDIS_INSTANCE__ || redis;

// Initialize in-memory Redis mock FIRST to avoid async race conditions (always available)
redis = {
  set: async (key: string, value: string) => globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.set(key, value),
  get: async (key: string) => globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.get(key),
  del: async (key: string) => globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.delete(key)
};

// Kembalikan dukungan Redis nyata untuk multi-instance deployment (WORK-ACLPILOT-026-03)
// Hanya gunakan in-memory di test environment, aktifkan Redis untuk production/staging
if (!useInMemory) {
  // Inisialisasi Redis nyata hanya jika bukan lingkungan test
  try {
    const Redis = require('ioredis');
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    // Share instance ke global untuk digunakan oleh semua core modules yang membutuhkan Redis lock
    globalThis.__EOS_SHARED_REDIS_INSTANCE__ = redis;
    console.log('[EXECUTION STATUS] Berhasil terhubung ke Redis untuk multi-instance deployment');
  } catch (e) {
    console.warn('[EXECUTION STATUS] Gagal terhubung ke Redis, fallback ke in-memory (hanya untuk development)');
  }
}

// AC-PILOT-001: kill_switch_armed semantics sesuai permintaan War Room
// kill_switch_armed: true = mekanisme penghentian siap dipicu, BUKAN berarti pemrosesan sedang dihentikan
// Saat kill_switch_triggered di-set ke true, semua pemrosesan berhenti sesuai desain
interface GlobalKillSwitchState {
  kill_switch_armed: boolean;
  kill_switch_triggered: boolean;
  armed_at_utc: string | null;
  triggered_at_utc: string | null;
  triggered_by_actor_id: string | null;
  reason: string | null;
}

export interface ExecutionStatus {
  executionId: string;
  workId?: string; // FIX-PILOT-001: Tag Work ID untuk tracking status pilot (misal: g1-market-pricing-01)
  current: "loading" | "running" | "completed" | "failed" | "received" | "processing" | "prospect_unverified" | "prospect_contacted" | "interview_scheduled" | "paid_pilot"; // 4-tier evidence statuses
  updatedAt: string;
  transitions: Array<{
    status: string;
    timestamp: string;
    actor?: string;
    notes?: string; // FIX-PILOT-002: Catatan alasan perubahan status untuk audit trail pilot
  }>;
  lastObserved?: ObservedExecution;
}

// Redis key untuk global kill switch state (selalu gunakan storage yang sama, tidak peduli lingkungan)
const KILL_SWITCH_KEY = 'eos:global:kill-switch-state';

// Lazy initialization dengan promise lock untuk mencegah race condition BUD-007
let killSwitchInitialized = false;
let killSwitchInitializationPromise: Promise<void> | null = null;

async function initKillSwitchStateIfMissing(): Promise<void> {
  if (killSwitchInitialized) return;
  if (killSwitchInitializationPromise) return killSwitchInitializationPromise;
  
  killSwitchInitializationPromise = (async () => {
    const existing = await redis.get(KILL_SWITCH_KEY);
    if (!existing) {
      const defaultState: GlobalKillSwitchState = {
        kill_switch_armed: false,
        kill_switch_triggered: false,
        armed_at_utc: null,
        triggered_at_utc: null,
        triggered_by_actor_id: null,
        reason: null
      };
      await redis.set(KILL_SWITCH_KEY, JSON.stringify(defaultState));
      console.log('[KILL-SWITCH-AUDIT] Default state berhasil diinisialisasi');
    }
    killSwitchInitialized = true;
  })();
  
  return killSwitchInitializationPromise;
}
// Inisialisasi hanya dipanggil sebelum operasi kill switch pertama, bukan di load
// initKillSwitchStateIfMissing();

// Redis key prefix for execution statuses
const REDIS_KEY_PREFIX = 'eos:execution:';

// Get storage key for specific execution
const getStorageKey = (executionId: string) => `${REDIS_KEY_PREFIX}${executionId}`;

// Generic storage accessor that works with both Redis and in-memory
async function setStorage(key: string, value: string): Promise<void> {
  await redis.set(key, value);
}

async function getStorage(key: string): Promise<string | undefined> {
  return await redis.get(key);
}

const ExecutionStatusRepository = {
  async create(executionId: string, actor?: string, workId?: string): Promise<ExecutionStatus> {
    // Gunakan timestamp yang sama untuk inisialisasi (konsistensi audit trail sesuai FIX-PILOT-003)
    const timestamp = new Date().toISOString();
    const initialStatus: ExecutionStatus = {
      executionId,
      workId,
      current: "loading",
      updatedAt: timestamp,
      transitions: [{
        status: "loading",
        timestamp,
        actor
      }]
    };
    
    await setStorage(getStorageKey(executionId), JSON.stringify(initialStatus));
    return initialStatus;
  },

  // Inisialisasi status untuk g1-market-pricing-01 sesuai War Room review 2 November 2026
  async initG1MarketStatus(): Promise<ExecutionStatus | undefined> {
    const executionId = "exec-g1-market-001";
    const workId = "g1-market-pricing-01";
    
    // Cek apakah sudah ada, jika belum buat baru
    let existing = await this.getStatus(executionId);
    if (!existing) {
      await this.create(executionId, "war-room-commander", workId);
      existing = await this.getStatus(executionId);
    }
    
    if (!existing) return undefined;

    // Update status menjadi prospect_unverified dengan catatan audit lengkap sesuai hasil pemeriksaan
    return this.updateStatus(
      executionId,
      "prospect_unverified",
      "war-room-commander",
      "3 calon pelanggan (tokobajuangah.com, homelivingjkt.com, kerajinankulitjakarta.com) belum terverifikasi identitas dan kontak. Perlu konfirmasi langsung dari pemilik sebelum lanjut ke interview. Hasil pencarian publik belum mengonfirmasi keberadaan ketiga toko."
    );
  },

  async getStatus(executionId: string): Promise<ExecutionStatus | undefined> {
    const data = await getStorage(getStorageKey(executionId));
    if (!data) return undefined;
    return JSON.parse(data) as ExecutionStatus;
  },

  // Helper function untuk acquire lock - DUAL MODE: single-instance (in-memory) / multi-instance (Redis)
  // Reuse existing EOS Redis lock primitive (tidak membuat primitive baru - WORK-ACLPILOT-026 compliance)
  async waitForLock(executionId: string, maxWaitMs = 5000): Promise<boolean> {
    const IS_MULTI_INSTANCE = !useInMemory && globalThis.__EOS_SHARED_REDIS_INSTANCE__;
    const startTime = Date.now();
    let lockValue: string | false = false;
    
    // Multi-instance mode: gunakan Redis lock dengan lease TTL (sama dengan implementation di execution-observability)
    if (IS_MULTI_INSTANCE) {
      const lockKey = `${EXECUTION_LOCK_PREFIX}${executionId}`;
      const retryInterval = 100;
      const maxRetries = maxWaitMs / retryInterval;
      let retryCount = 0;
      
      // Spin lock untuk mendapatkan Redis lock dengan retry
      while (!lockValue && retryCount < maxRetries) {
        const now = Date.now();
        lockValue = now.toString();
        // Coba set lock dengan NX (hanya jika belum ada) dan PX (lease TTL) - atomic Redis operation
        const lockAcquired = await sharedRedis.set(lockKey, lockValue, 'NX', 'PX', LOCK_LEASE_TTL);
        
        if (lockAcquired) {
          console.log(`[REDIS-LOCK-SUCCESS] Berhasil memperoleh lock untuk execution ${executionId} (lease ${LOCK_LEASE_TTL}ms)`);
          // Simpan lockValue ke in-memory untuk release nanti
          statusUpdateLock.set(executionId, lockValue);
          return true;
        }
        
        // Cek apakah lock sudah expired (stale lock recovery)
        const existingLock = await sharedRedis.get(lockKey);
        if (existingLock) {
          const lockTime = parseInt(existingLock, 10);
          if (now - lockTime > LOCK_LEASE_TTL) {
            console.log(`[REDIS-LOCK-STALE-RECOVERY] Lock untuk execution ${executionId} sudah expired, ambil alih`);
            const newLock = await sharedRedis.set(lockKey, lockValue, 'XX', 'PX', LOCK_LEASE_TTL);
            if (newLock) {
              statusUpdateLock.set(executionId, lockValue);
              return true;
            }
          }
        }
        
        // Tunggu sebelum retry
        await new Promise(resolve => setTimeout(resolve, retryInterval));
        retryCount++;
      }
      
      if (!lockValue) {
        console.error(`[REDIS-LOCK-TIMEOUT] Gagal mendapatkan lock untuk execution ${executionId} setelah ${maxWaitMs}ms`);
        return false;
      }
    } 
    // Single-instance mode: gunakan in-memory lock (sama seperti sebelumnya, tetap kompatibel)
    else {
      while (statusUpdateLock.has(executionId)) {
        if (Date.now() - startTime > maxWaitMs) {
          console.error(`[EXECUTION STATUS] Lock wait timeout for ${executionId}, cannot proceed with update`);
          return false;
        }
        // Wait 100ms before checking again
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      // Acquire lock after waiting - simpan boolean true untuk in-memory mode
      statusUpdateLock.set(executionId, true);
      return true;
    }
    // Fallback return untuk semua path yang tidak tercover (menghindari TS2366 error)
    return false;
  },

  async updateStatus(
    executionId: string, 
    newStatus: ExecutionStatus["current"], 
    actor?: string,
    notes?: string
  ): Promise<ExecutionStatus | undefined> {
    // Wait for lock instead of skipping - serializes all updates to prevent lost transitions
    const lockAcquired = await this.waitForLock(executionId);
    if (!lockAcquired) return undefined;
    // Dapatkan lockValue yang disimpan saat acquire untuk release yang aman (hanya pemilik yang bisa hapus)
    const lockValue = statusUpdateLock.get(executionId);
    
    try {
      const existing = await this.getStatus(executionId);
      if (!existing) return undefined;

      // Gunakan timestamp yang sama untuk updatedAt dan transition (FIX-PILOT-003: konsistensi timestamp audit trail)
      const timestamp = new Date().toISOString();
      const updated: ExecutionStatus = {
        ...existing,
        current: newStatus,
        updatedAt: timestamp,
        transitions: [
          ...existing.transitions,
          {
            status: newStatus,
            timestamp,
            actor,
            notes
          }
        ]
      };

      await setStorage(getStorageKey(executionId), JSON.stringify(updated));
      return updated;
    } finally {
      // Lepas lock dengan verifikasi pemilik (sama dengan implementation di execution-observability.ts)
      const IS_MULTI_INSTANCE = !useInMemory && globalThis.__EOS_SHARED_REDIS_INSTANCE__;
      if (IS_MULTI_INSTANCE && lockValue) {
        // Multi-instance: release Redis lock hanya jika kita adalah pemilik sah
        const lockKey = `${EXECUTION_LOCK_PREFIX}${executionId}`;
        const currentLockValue = await sharedRedis.get(lockKey);
        if (currentLockValue === lockValue) {
          await sharedRedis.del(lockKey);
          console.log(`[REDIS-LOCK-RELEASED] Lock untuk execution ${executionId} telah dilepaskan oleh pemilik yang sah`);
        } else {
          console.warn(`[REDIS-LOCK-RELEASE-FAIL] Tidak dapat melepaskan lock untuk execution ${executionId} - bukan pemilik yang sah`);
        }
      } else {
        // Single-instance: release in-memory lock (sama seperti sebelumnya)
        statusUpdateLock.delete(executionId);
      }
      // Hapus lockValue dari in-memory map setelah release
      statusUpdateLock.delete(executionId);
    }
  },

  async linkObservedExecution(
    executionId: string,
    observed: ObservedExecution
  ): Promise<ExecutionStatus | undefined> {
    // Wait for lock instead of skipping - serializes all updates to prevent lost transitions
    const lockAcquired = await this.waitForLock(executionId);
    if (!lockAcquired) return undefined;
    // Dapatkan lockValue yang disimpan saat acquire untuk release yang aman (hanya pemilik yang bisa hapus)
    const lockValue = statusUpdateLock.get(executionId);
    
    try {
      const existing = await this.getStatus(executionId);
      if (!existing) return undefined;

      // PERBAIKAN EVIDENCE BOUNDARY: JANGAN otomatis set "completed" hanya dari observed.success
      // Status "completed" membutuhkan VERIFIKASI, bukan cuma internal observation
      // Hanya set status jika observed.success mengandung bukti eksternal (tidak pernah trust internal saja)
      let derivedStatus: ExecutionStatus["current"] = "processing"; // Tetap di processing sampai ada bukti nyata
      if (observed.success && observed.error === undefined) {
        // Hanya upgrade ke "completed" jika observed.success berasal dari sumber EKSTERNAL (webhook payment/calendar)
        // Observed dari internal system tetap "processing" untuk menjaga integritas epistemic
        const isExternalObservation = observed.executionId.includes("webhook") || observed.executionId.includes("external");
        if (isExternalObservation) {
          derivedStatus = observed.success ? "completed" : "failed";
        } else {
          console.log(`[EXECUTION STATUS] Internal observation for ${executionId} recorded, status remains processing (needs external verification)`);
        }
      } else {
        derivedStatus = "failed";
      }
      
      const updated: ExecutionStatus = {
        ...existing,
        current: derivedStatus,
        updatedAt: observed.timestamp_utc,
        lastObserved: observed,
        transitions: [
          ...existing.transitions,
          {
            status: derivedStatus,
            timestamp: observed.timestamp_utc,
            actor: observed.logicalWorkId
          }
        ]
      };

      await setStorage(getStorageKey(executionId), JSON.stringify(updated));
      return updated;
    } finally {
      // Lepas lock dengan verifikasi pemilik (sama dengan implementation di execution-observability.ts dan updateStatus)
      const IS_MULTI_INSTANCE = !useInMemory && globalThis.__EOS_SHARED_REDIS_INSTANCE__;
      if (IS_MULTI_INSTANCE && lockValue) {
        // Multi-instance: release Redis lock hanya jika kita adalah pemilik sah
        const lockKey = `${EXECUTION_LOCK_PREFIX}${executionId}`;
        const currentLockValue = await sharedRedis.get(lockKey);
        if (currentLockValue === lockValue) {
          await sharedRedis.del(lockKey);
          console.log(`[REDIS-LOCK-RELEASED] Lock untuk execution ${executionId} telah dilepaskan oleh pemilik yang sah`);
        } else {
          console.warn(`[REDIS-LOCK-RELEASE-FAIL] Tidak dapat melepaskan lock untuk execution ${executionId} - bukan pemilik yang sah`);
        }
      } else {
        // Single-instance: release in-memory lock (sama seperti sebelumnya)
        statusUpdateLock.delete(executionId);
      }
      // Hapus lockValue dari in-memory map setelah release
      statusUpdateLock.delete(executionId);
    }
  },

  async delete(executionId: string): Promise<void> {
    // Wait for lock before deleting too
    const lockAcquired = await this.waitForLock(executionId, 3000);
    if (!lockAcquired) {
      console.error(`[EXECUTION STATUS] Cannot delete ${executionId}, lock wait timeout`);
      return;
    }
    try {
      await redis.del(getStorageKey(executionId));
    } finally {
      // Lepas lock setelah selesai
      statusUpdateLock.delete(executionId);
    }
  },

  // AC-PILOT-001: Kill switch methods (semantics sesuai permintaan War Room)
  // Arm the kill switch: menandakan mekanisme siap dipicu (bukan menghentikan pemrosesan)
  async armKillSwitch(actorId: string): Promise<GlobalKillSwitchState> {
    // Inisialisasi state kill switch terlebih dahulu (lazy init untuk hindari race condition BUD-007)
    await initKillSwitchStateIfMissing();
    
    // Baca state saat ini dari storage
    const currentStateStr = await redis.get(KILL_SWITCH_KEY);
    const currentState: GlobalKillSwitchState = currentStateStr ? JSON.parse(currentStateStr) : {
      kill_switch_armed: false,
      kill_switch_triggered: false,
      armed_at_utc: null,
      triggered_at_utc: null,
      triggered_by_actor_id: null,
      reason: null
    };
    
    if (currentState.kill_switch_armed) {
      console.log(`[KILL-SWITCH] Kill switch already armed by ${currentState.triggered_by_actor_id || "unknown"}`);
      return { ...currentState };
    }
    
    // Update state
    currentState.kill_switch_armed = true;
    currentState.armed_at_utc = new Date().toISOString();
    
    // Simpan kembali ke storage
    await redis.set(KILL_SWITCH_KEY, JSON.stringify(currentState));
    
    console.log(`[KILL-SWITCH] Armed successfully by actor ${actorId} | kill_switch_armed = true (siap dipicu, pemrosesan masih berjalan)`);
    return { ...currentState };
  },

  // Trigger the kill switch: menghentikan semua pemrosesan (hanya bisa jika kill_switch_armed = true)
  async triggerKillSwitch(actorId: string, reason: string): Promise<GlobalKillSwitchState | undefined> {
    // Inisialisasi state kill switch terlebih dahulu (lazy init untuk hindari race condition BUD-007)
    await initKillSwitchStateIfMissing();
    
    // Baca state saat ini dari storage
    const currentStateStr = await redis.get(KILL_SWITCH_KEY);
    const currentState: GlobalKillSwitchState = currentStateStr ? JSON.parse(currentStateStr) : {
      kill_switch_armed: false,
      kill_switch_triggered: false,
      armed_at_utc: null,
      triggered_at_utc: null,
      triggered_by_actor_id: null,
      reason: null
    };
    
    if (!currentState.kill_switch_armed) {
      const error = `[KILL-SWITCH-ERROR] Cannot trigger kill switch: not armed. Arm first before triggering.`;
      console.error(error);
      return undefined;
    }
    
    if (currentState.kill_switch_triggered) {
      console.log(`[KILL-SWITCH] Kill switch already triggered at ${currentState.triggered_at_utc}`);
      return { ...currentState };
    }

    // Update state
    currentState.kill_switch_triggered = true;
    currentState.triggered_at_utc = new Date().toISOString();
    currentState.triggered_by_actor_id = actorId;
    currentState.reason = reason;
    
    // Simpan kembali ke storage
    await redis.set(KILL_SWITCH_KEY, JSON.stringify(currentState));
    
    console.log(`[KILL-SWITCH] Triggered successfully by actor ${actorId} | reason: ${reason} | semua pemrosesan dihentikan`);
    
    // Log semua eksekusi yang aktif saat kill switch dipicu (untuk audit dan evidence)
    const activeExecutions = Array.from(globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.keys());
    console.log(`[KILL-SWITCH-AUDIT] Active executions at trigger time: ${activeExecutions.length} | ${activeExecutions.join(', ')}`);

    // MARK: PEMBATASAN EKSEKUSI - Set semua eksekusi yang aktif ke status BLOCKED
    // Pastikan semua processing yang berjalan dihentikan dengan mengubah statusnya
    activeExecutions.forEach(executionId => {
      const existing = globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.get(executionId);
      if (existing) {
        // Handle baik string yang di-JSON.stringify maupun objek langsung (kompatibel semua lingkungan)
        let parsed;
        if (typeof existing === 'string') {
          try {
            parsed = JSON.parse(existing);
          } catch (e) {
            console.warn(`[KILL-SWITCH-PARSE] Failed to parse status for execution ${executionId}, skipping`);
            return;
          }
        } else if (typeof existing === 'object' && existing !== null) {
          parsed = { ...existing };
        } else {
          console.warn(`[KILL-SWITCH-INVALID] Invalid status type for execution ${executionId}, skipping`);
          return;
        }

        if (parsed.current === "processing" || parsed.current === "running" || parsed.current === "loading") {
          parsed.current = "blocked";
          parsed.transitions = parsed.transitions || [];
          parsed.transitions.push({
            status: "blocked",
            timestamp: new Date().toISOString(),
            actor: actorId,
            reason: "Kill switch triggered - all executions halted"
          });
          
          // Simpan kembali dengan format yang konsisten (stringify untuk semua lingkungan)
          globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.set(executionId, JSON.stringify(parsed));
          console.log(`[KILL-SWITCH-EXECUTION] Execution ${executionId} blocked successfully`);
        }
      }
    });
    
    return { ...currentState };
  },

  // Get current kill switch state untuk pengecekan
  async getKillSwitchState(): Promise<GlobalKillSwitchState> {
    // Inisialisasi state kill switch terlebih dahulu (lazy init untuk hindari race condition BUD-007)
    await initKillSwitchStateIfMissing();
    
    // Selalu baca state terbaru dari storage (bukan variabel lokal)
    const stateStr = await redis.get(KILL_SWITCH_KEY);
    const state: GlobalKillSwitchState = stateStr ? JSON.parse(stateStr) : {
      kill_switch_armed: false,
      kill_switch_triggered: false,
      armed_at_utc: null,
      triggered_at_utc: null,
      triggered_by_actor_id: null,
      reason: null
    };
    return { ...state };
  },

  // Reset kill switch (hanya untuk testing/reset lingkungan)
  async resetKillSwitch(actorId: string): Promise<GlobalKillSwitchState> {
    // Inisialisasi state kill switch terlebih dahulu (lazy init untuk hindari race condition BUD-007)
    await initKillSwitchStateIfMissing();
    
    const newState: GlobalKillSwitchState = {
      kill_switch_armed: false,
      kill_switch_triggered: false,
      armed_at_utc: null,
      triggered_at_utc: null,
      triggered_by_actor_id: null,
      reason: null
    };
    
    // Simpan state baru ke storage
    await redis.set(KILL_SWITCH_KEY, JSON.stringify(newState));
    
    console.log(`[KILL-SWITCH-AUDIT] Kill switch reset by actor ${actorId}`);
    return { ...newState };
  },


};

// Export types and repository for external usage - Final fix: remove duplicate exports to resolve TS redeclaration errors
export type { GlobalKillSwitchState };
export { ExecutionStatusRepository };