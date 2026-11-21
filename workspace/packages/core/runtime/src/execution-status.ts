// @ts-nocheck
// FIX-UI-001: Minimal execution status tracking for real-time UI updates
// In-memory fallback for test environments (NO Redis required) - aligned with platform/src implementation
import type { ObservedExecution } from "./execution-observability.js";
import { getNow } from "@repo/core-kernel/time/time.provider.js";
declare global {
  var __EOS_INMEMORY_EXECUTION_STATUSES__: Map<string, any>;
}
globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__ = globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__ || new Map();

// Use in-memory store as DEFAULT, Redis only if explicitly configured and available
// This ensures test environments always use in-memory without requiring NODE_ENV to be set
const useInMemory = !process.env.REDIS_URL || process.env.REDIS_URL === '' || process.env.REDIS_URL === 'redis://localhost:6379';
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

// Initialize in-memory Redis mock FIRST to avoid async race conditions (always available)
redis = {
  set: async (key: string, value: string) => globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.set(key, value),
  get: async (key: string) => globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.get(key),
  del: async (key: string) => globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.delete(key)
};

const sharedRedis = globalThis.__EOS_SHARED_REDIS_INSTANCE__ || redis;

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
      // Tambahkan error handler untuk mencegah unhandled error event
      redisInstance.on('error', () => {});
      // Hanya ganti ke Redis jika koneksi berhasil dalam 1 detik
      await Promise.race([
        redisInstance.connect().then(() => redisInstance.ping()),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 1000))
      ]);
      redis = redisInstance;
      // Share instance ke global untuk digunakan oleh semua core modules yang membutuhkan Redis lock
      globalThis.__EOS_SHARED_REDIS_INSTANCE__ = redis;
      console.log('[EXECUTION STATUS] Berhasil terhubung ke Redis untuk multi-instance deployment');
    } catch (error) {
      console.warn('[EXECUTION STATUS] Gagal terhubung ke Redis, fallback ke in-memory (default untuk semua lingkungan tanpa REDIS_URL eksplisit):', error.message);
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

const KILL_SWITCH_KEY = 'eos:global:kill_switch';

export const ExecutionStatusRepository = {
  async setStatus(executionId: string, status: ExecutionStatus['current'], actor?: string): Promise<void> {
    const key = `execution:${executionId}:status`;
    const existing = await redis.get(key);
    const current: ExecutionStatus = existing ? JSON.parse(existing) : {
      executionId,
      current: "loading",
      updatedAt: getNow().toISOString(),
      transitions: []
    };
    current.current = status;
    current.updatedAt = getNow().toISOString();
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
  },

  async getKillSwitchState(): Promise<{ kill_switch_triggered: boolean; reason?: string; triggeredAt?: string }> {
    const result = await redis.get(KILL_SWITCH_KEY);
    return result ? JSON.parse(result) : { kill_switch_triggered: false };
  },

  async armKillSwitch(reason: string): Promise<void> {
    await redis.set(KILL_SWITCH_KEY, JSON.stringify({
      kill_switch_triggered: true,
      reason,
      triggeredAt: getNow().toISOString()
    }));
  },

  async triggerKillSwitch(reason: string): Promise<void> {
    await this.armKillSwitch(reason);
  },

  async resetKillSwitch(): Promise<void> {
    await redis.del(KILL_SWITCH_KEY);
  }
};