// FIX-UI-001: Minimal execution status tracking for real-time UI updates
// In-memory fallback for test environments (NO Redis required) - aligned with platform/src implementation
import type { ObservedExecution } from "./execution-observability.js";
declare global {
  var __EOS_INMEMORY_EXECUTION_STATUSES__: Map<string, any>;
}
globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__ = globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__ || new Map();

// Use in-memory store in test environment, Redis otherwise - matches platform/src pattern
const useInMemory = process.env.NODE_ENV === 'test';
let redis: any;

// Initialize synchronously to avoid async race conditions
if (useInMemory) {
  // In-memory mock Redis client for tests - identical interface to real ioredis
  redis = {
    set: async (key: string, value: string) => globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.set(key, value),
    get: async (key: string) => globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.get(key),
    del: async (key: string) => globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.delete(key)
  };
  console.log("[EXECUTION STATUS] Test environment detected: using in-memory status store");
} else {
  // Production: Redis client initialization - single instance per application
  // @ts-ignore - ioredis is an optional production dependency, falls back to in-memory if not available
  import('ioredis').then(({ default: Redis }) => {
    // @ts-ignore - TypeScript incorrectly flags dynamically imported Redis class as non-constructable
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
  }).catch(err => {
    console.warn('[EXECUTION STATUS] Redis import failed, falling back to in-memory:', err.message);
    redis = {
      set: async (key: string, value: string) => globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.set(key, value),
      get: async (key: string) => globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.get(key),
      del: async (key: string) => globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.delete(key)
    };
  });
}

export interface ExecutionStatus {
  executionId: string;
  current: "loading" | "running" | "completed" | "failed";
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

  async updateStatus(
    executionId: string, 
    newStatus: ExecutionStatus["current"], 
    actor?: string
  ): Promise<ExecutionStatus | undefined> {
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
  },

  async linkObservedExecution(
    executionId: string,
    observed: ObservedExecution
  ): Promise<ExecutionStatus | undefined> {
    const existing = await this.getStatus(executionId);
    if (!existing) return undefined;

    // Auto-derive status from observed execution
    let derivedStatus: ExecutionStatus["current"] = observed.success ? "completed" : "failed";
    
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
  }
};

// Export types for external usage via index.ts only