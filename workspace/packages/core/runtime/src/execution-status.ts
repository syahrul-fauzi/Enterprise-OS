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

// Selalu coba load Redis asli, tapi tetap pakai in-memory sebagai fallback
// Status tracking SELALU AKTIF, tidak peduli environment
import('ioredis').then(({ default: Redis }) => {
  // @ts-ignore - Redis initialization dengan connection check
  const realRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true
  });
  
  // Coba koneksi dan hanya gunakan Redis jika berhasil (REALITY CHECK: bukan cuma load module)
  realRedis.connect().then(() => {
    console.log('[EXECUTION STATUS] Redis connected successfully, using real Redis for execution tracking');
    redis = realRedis;
  }).catch((connErr: Error) => {
    console.warn('[EXECUTION STATUS] Redis connection failed, keeping in-memory fallback:', connErr.message);
    // Tidak ganti redis = tetap pakai in-memory yang sudah diinisialisasi
  });
}).catch(err => {
  console.warn('[EXECUTION STATUS] Redis import failed, keeping in-memory fallback:', err.message);
  // Keep using the in-memory redis we already initialized - never undefined!
});

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

export const ExecutionStatusRepository = {
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
      statusUpdateLock.delete(executionId);
    }
  }
};

// Export types for external usage via index.ts only