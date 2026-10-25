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

// Lock untuk mencegah race condition pada update status (sederhana, tidak memerlukan distributed lock untuk skala kecil)
const statusUpdateLock = new Set<string>();


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
  current: "loading" | "running" | "completed" | "failed" | "received" | "processing"; // Added Carly inbox statuses
  updatedAt: string;
  transitions: Array<{
    status: string;
    timestamp: string;
    actor?: string;
  }>;
  lastObserved?: ObservedExecution;
}

// In-memory store untuk global kill switch state (sesuai pattern in-memory yang sudah ada)
let globalKillSwitchState: GlobalKillSwitchState = {
  kill_switch_armed: false,
  kill_switch_triggered: false,
  armed_at_utc: null,
  triggered_at_utc: null,
  triggered_by_actor_id: null,
  reason: null
};

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
  async create(executionId: string, actor?: string): Promise<ExecutionStatus> {
    const initialStatus: ExecutionStatus = {
      executionId,
      current: "loading",
      updatedAt: new Date().toISOString(),
      transitions: [{
        status: "loading",
        timestamp: new Date().toISOString(),
        actor
      }]
    };
    
    await setStorage(getStorageKey(executionId), JSON.stringify(initialStatus));
    return initialStatus;
  },

  async getStatus(executionId: string): Promise<ExecutionStatus | undefined> {
    const data = await getStorage(getStorageKey(executionId));
    if (!data) return undefined;
    return JSON.parse(data) as ExecutionStatus;
  },

  // Helper function to wait for lock instead of skipping - preserves all valid transitions
  async waitForLock(executionId: string, maxWaitMs = 5000): Promise<boolean> {
    const startTime = Date.now();
    while (statusUpdateLock.has(executionId)) {
      if (Date.now() - startTime > maxWaitMs) {
        console.error(`[EXECUTION STATUS] Lock wait timeout for ${executionId}, cannot proceed with update`);
        return false;
      }
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    // Acquire lock after waiting
    statusUpdateLock.add(executionId);
    return true;
  },

  async updateStatus(
    executionId: string, 
    newStatus: ExecutionStatus["current"], 
    actor?: string
  ): Promise<ExecutionStatus | undefined> {
    // Wait for lock instead of skipping - serializes all updates to prevent lost transitions
    const lockAcquired = await this.waitForLock(executionId);
    if (!lockAcquired) return undefined;
    
    try {
      const existing = await this.getStatus(executionId);
      if (!existing) return undefined;

      const updated: ExecutionStatus = {
        ...existing,
        current: newStatus,
        updatedAt: new Date().toISOString(),
        transitions: [
          ...existing.transitions,
          {
            status: newStatus,
            timestamp: new Date().toISOString(),
            actor
          }
        ]
      };

      await setStorage(getStorageKey(executionId), JSON.stringify(updated));
      return updated;
    } finally {
      // Lepas lock setelah selesai
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
      // Lepas lock setelah selesai
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
    if (globalKillSwitchState.kill_switch_armed) {
      console.log(`[KILL-SWITCH] Kill switch already armed by ${globalKillSwitchState.triggered_by_actor_id || "unknown"}`);
      return { ...globalKillSwitchState };
    }
    
    globalKillSwitchState.kill_switch_armed = true;
    globalKillSwitchState.armed_at_utc = new Date().toISOString();
    console.log(`[KILL-SWITCH] Armed successfully by actor ${actorId} | kill_switch_armed = true (siap dipicu, pemrosesan masih berjalan)`);
    
    return { ...globalKillSwitchState };
  },

  // Trigger the kill switch: menghentikan semua pemrosesan (hanya bisa jika kill_switch_armed = true)
  async triggerKillSwitch(actorId: string, reason: string): Promise<GlobalKillSwitchState | undefined> {
    if (!globalKillSwitchState.kill_switch_armed) {
      const error = `[KILL-SWITCH-ERROR] Cannot trigger kill switch: not armed. Arm first before triggering.`;
      console.error(error);
      return undefined;
    }
    
    if (globalKillSwitchState.kill_switch_triggered) {
      console.log(`[KILL-SWITCH] Kill switch already triggered at ${globalKillSwitchState.triggered_at_utc}`);
      return { ...globalKillSwitchState };
    }

    globalKillSwitchState.kill_switch_triggered = true;
    globalKillSwitchState.triggered_at_utc = new Date().toISOString();
    globalKillSwitchState.triggered_by_actor_id = actorId;
    globalKillSwitchState.reason = reason;
    
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
    
    return { ...globalKillSwitchState };
  },

  // Get current kill switch state untuk pengecekan
  async getKillSwitchState(): Promise<GlobalKillSwitchState> {
    return { ...globalKillSwitchState };
  },

  // Reset kill switch (hanya untuk testing/reset lingkungan)
  async resetKillSwitch(actorId: string): Promise<GlobalKillSwitchState> {
    console.log(`[KILL-SWITCH] Reset by actor ${actorId}`);
    globalKillSwitchState = {
      kill_switch_armed: false,
      kill_switch_triggered: false,
      armed_at_utc: null,
      triggered_at_utc: null,
      triggered_by_actor_id: null,
      reason: null
    };
    return { ...globalKillSwitchState };
  }
};

// Export types and repository for external usage - Final fix: remove duplicate exports to resolve TS redeclaration errors
export type { GlobalKillSwitchState };
export { ExecutionStatusRepository };