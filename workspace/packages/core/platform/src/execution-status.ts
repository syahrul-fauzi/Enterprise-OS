// FIX-UI-001: Minimal execution status tracking for real-time UI updates
import type { ObservedExecution } from "./execution-observability.js";

// In-memory fallback for test environments (NO Redis required)
type InMemoryStatusMap = Map<string, any>;
declare global {
  var __EOS_INMEMORY_EXECUTION_STATUSES__: InMemoryStatusMap;
}
globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__ = globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__ || new Map();

// Use in-memory store as DEFAULT, Redis only if explicitly configured and available
// This ensures test environments always use in-memory without requiring NODE_ENV to be set
const useInMemory = !process.env.REDIS_URL || process.env.REDIS_URL === '' || process.env.REDIS_URL === 'redis://localhost:6379';
let redis: any;

// Initialize in-memory Redis mock FIRST to avoid async race conditions (always available)
redis = {
  set: async (key: string, value: string) => globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.set(key, value),
  get: async (key: string) => globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.get(key),
  del: async (key: string) => globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.delete(key)
};

// HANYA coba inisialisasi Redis jika REDIS_URL secara eksplisit di-set ke nilai yang tidak default
if (!useInMemory) {
  (async () => {
    try {
      const { default: Redis } = await import('ioredis');
      const redisInstance = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 0,
        enableOfflineQueue: false
      });
      redisInstance.on('error', () => {});
      await Promise.race([
        redisInstance.connect().then(() => redisInstance.ping()),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 1000))
      ]);
      redis = redisInstance;
      console.log("[EXECUTION STATUS] Berhasil terhubung ke Redis untuk multi-instance deployment");
    } catch (error) {
      console.warn('[EXECUTION STATUS] Redis connection failed, falling back to in-memory:', error.message);
    }
  })();
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
}

export const ExecutionStatusRepository = {
  async setStatus(executionId: string, status: ExecutionStatus['current'], actor?: string): Promise<void> {
    const key = `execution:${executionId}:status`;
    const existing = await redis.get(key);
    const current: ExecutionStatus = existing ? JSON.parse(existing) : {
      executionId,
      current: "loading",
      updatedAt: new Date().toISOString(),
      transitions: []
    };
    current.current = status;
    current.updatedAt = new Date().toISOString();
    current.transitions.push({
      status,
      timestamp: current.updatedAt,
      actor
    });
    await redis.set(key, JSON.stringify(current));
  },

  async getStatus(executionId: string): Promise<ExecutionStatus | null> {
    const key = `execution:${executionId}:status`;
    const result = await redis.get(key);
    return result ? JSON.parse(result) : null;
  },

  async deleteStatus(executionId: string): Promise<void> {
    const key = `execution:${executionId}:status`;
    await redis.del(key);
  }
};