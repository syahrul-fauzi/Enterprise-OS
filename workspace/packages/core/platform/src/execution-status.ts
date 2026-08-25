// FIX-UI-001: Minimal execution status tracking for real-time UI updates
import type { ObservedExecution } from "./execution-observability.js";

// In-memory fallback for test environments (NO Redis required)
type InMemoryStatusMap = Map<string, any>;
declare global {
  var __EOS_INMEMORY_EXECUTION_STATUSES__: InMemoryStatusMap;
}
globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__ = globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__ || new Map();

// Use in-memory store in test environment, Redis otherwise - aligned with runtime/src ESM pattern
const useInMemory = process.env.NODE_ENV === 'test';
let redis: any;

// Initialize synchronously to avoid async race conditions
if (useInMemory) {
  // In-memory mock Redis client for tests
  redis = {
    set: async (key: string, value: string) => globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.set(key, value),
    get: async (key: string) => globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.get(key),
    del: async (key: string) => globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.delete(key)
  };
  console.log("[EXECUTION STATUS] Test environment detected: using in-memory status store");
} else {
  // Production: Redis client initialization - single instance per application - dynamic import for ESM
  import('ioredis').then(({ default: Redis }) => {
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

// Get Redis key for specific execution
const getRedisKey = (executionId: string) => `${REDIS_KEY_PREFIX}${executionId}`;

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
    
    await redis.set(getRedisKey(executionId), JSON.stringify(initialStatus));
    return initialStatus;
  },

  async getStatus(executionId: string): Promise<ExecutionStatus | undefined> {
    const data = await redis.get(getRedisKey(executionId));
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

    await redis.set(getRedisKey(executionId), JSON.stringify(updated));
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

    await redis.set(getRedisKey(executionId), JSON.stringify(updated));
    return updated;
  }
};

// Export types for external usage via index.ts only