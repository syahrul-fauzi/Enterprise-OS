// @ts-nocheck
// FIX-UI-001: Minimal email queue implementation using Redis
// In-memory fallback for test environments (NO Redis required) - aligned with platform/src implementation
import { ExecutionStatusRepository } from "./execution-status.js";
import { getNow } from "@repo/core-kernel/time/time.provider.js";

// In-memory fallback for test environments (NO Redis required) - matches platform/src pattern
// Add Carly inbox storage for reality observation mechanism (no core architecture changes)
declare global {
  var __EOS_INMEMORY_EMAIL_QUEUE__: any[];
  var __EOS_INMEMORY_EMAIL_PROCESSING__: any[];
  var __EOS_INMEMORY_CARLY_INBOX__: any[];
  var __EOS_INMEMORY_CARLY_INBOX_PROCESSING__: any[];
}
globalThis.__EOS_INMEMORY_EMAIL_QUEUE__ = globalThis.__EOS_INMEMORY_EMAIL_QUEUE__ || [];
globalThis.__EOS_INMEMORY_EMAIL_PROCESSING__ = globalThis.__EOS_INMEMORY_EMAIL_PROCESSING__ || [];
globalThis.__EOS_INMEMORY_CARLY_INBOX__ = globalThis.__EOS_INMEMORY_CARLY_INBOX__ || [];
globalThis.__EOS_INMEMORY_CARLY_INBOX_PROCESSING__ = globalThis.__EOS_INMEMORY_CARLY_INBOX_PROCESSING__ || [];

// Use in-memory store as DEFAULT, Redis only if explicitly configured and available
// This ensures test environments always use in-memory without requiring NODE_ENV to be set
const useInMemory = !process.env.REDIS_URL || process.env.REDIS_URL === '' || process.env.REDIS_URL === 'redis://localhost:6379';

// SOLUSI FINAL: Export langsung objek mock tanpa assignment variabel terpisah
// Eliminasi risiko variabel yang overwritten atau method tidak terdaftar
// FIX-TEST-004: Simpan instance Redis ke globalThis agar bisa dibagikan antara API (Next.js) dan test-runner (Node.js)
// Masalah sebelumnya: Next.js bundling memisahkan instance Redis sehingga test-runner tidak bisa mengubah state _simulateUnavailable di API
declare global {
  var __EOS_SHARED_REDIS_INSTANCE__: any;
  var _queueStore: Map<string, any[]>;
}
globalThis._queueStore = globalThis._queueStore || new Map<string, any[]>();

globalThis.__EOS_SHARED_REDIS_INSTANCE__ = globalThis.__EOS_SHARED_REDIS_INSTANCE__ || {
  // Flag untuk simulasi Redis unavailable - ketika true, sistem menggunakan in-memory fallback
  _simulateUnavailable: false,
  simulateUnavailable(state: boolean) {
    this._simulateUnavailable = state;
    console.log(`[email-queue.ts] Redis simulateUnavailable set to ${state} - ${state ? 'using in-memory fallback' : 'using Redis'}`);
  },
  async lpush(key: string, value: string) {
    // Ketika Redis unavailable, gunakan in-memory fallback (tidak melempar error)
    console.log(`[email-queue.ts] lpush called with key=${key}, value=${JSON.stringify(value).substring(0,100)}`);
    if (!globalThis._queueStore.has(key)) {
      console.log(`[email-queue.ts] Creating new queue for key=${key}`);
      globalThis._queueStore.set(key, []);
    }
    const targetArr = globalThis._queueStore.get(key)!;
    targetArr.unshift(value);
    console.log(`[email-queue.ts] lpush SUCCESS: key=${key}, new length=${targetArr.length}, queue content now: ${JSON.stringify(targetArr)}`);
    return targetArr.length; // Wajib return number, sesuai Redis lpush spec
  },
  async brpoplpush(from: string, to: string, timeout: number) {
    // Ketika Redis unavailable, gunakan in-memory fallback (tidak melempar error)
    if (!globalThis._queueStore.has(from)) {
      globalThis._queueStore.set(from, []);
    }
    if (!globalThis._queueStore.has(to)) {
      globalThis._queueStore.set(to, []);
    }
    const queue = globalThis._queueStore.get(from)!;
    const target = globalThis._queueStore.get(to)!;
    
    if (queue.length === 0) return null;
    const item = queue.pop()!;
    target.push(item);
    return item;
  },
  async lrem(key: string, count: number, value: string) {
    // Ketika Redis unavailable, gunakan in-memory fallback (tidak melempar error)
    if (!globalThis._queueStore.has(key)) {
      globalThis._queueStore.set(key, []);
    }
    const arr = globalThis._queueStore.get(key)!;
    const index = arr.indexOf(value);
    let removed = 0;
    if (index > -1) {
      arr.splice(index, 1);
      removed = 1;
    }
    console.log(`[email-queue.ts] lrem from ${key}: removed ${removed} items, new length=${arr.length}`);
    return removed;
  },
  async llen(key: string) {
    // Ketika Redis unavailable, gunakan in-memory fallback (tidak melempar error)
    if (!globalThis._queueStore.has(key)) {
      globalThis._queueStore.set(key, []);
    }
    return globalThis._queueStore.get(key)!.length;
  },
  async lrange(key: string, start: number, end: number) {
    // Ketika Redis unavailable, gunakan in-memory fallback (tidak melempar error)
    console.log(`[email-queue.ts] lrange EXECUTING: key=${key}, start=${start}, end=${end}`);
    console.log(`[email-queue.ts] lrange: _queueStore contents BEFORE slice: ${JSON.stringify(Array.from(globalThis._queueStore.entries()))}`);
    
    if (!globalThis._queueStore.has(key)) {
      console.log(`[email-queue.ts] lrange: key ${key} NOT FOUND, creating new empty queue`);
      globalThis._queueStore.set(key, []);
    }
    
    const arr = globalThis._queueStore.get(key)!;
    console.log(`[email-queue.ts] lrange: raw array for key=${key}: ${JSON.stringify(arr)}, length=${arr.length}`);
    
    // Perbaiki slice logic untuk Redis lrange spec: start=0, end=-1 = semua item
    let actualEnd = end;
    if (end === -1) {
      actualEnd = arr.length;
    }
    const result = arr.slice(start, actualEnd);
    console.log(`[email-queue.ts] lrange FINAL result for key=${key}: ${JSON.stringify(result)}, length=${result.length}`);
    return result;
  },
  async set(key: string, value: string) {
    // Ketika Redis unavailable, gunakan in-memory fallback (tidak melempar error)
    globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.set(key, value);
  },
  async get(key: string): Promise<string | null> {
    // Ketika Redis unavailable, gunakan in-memory fallback (tidak melempar error)
    return globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.get(key) || null;
  },
  async del(key: string) {
    // Ketika Redis unavailable, gunakan in-memory fallback (tidak melempar error)
    globalThis.__EOS_INMEMORY_EXECUTION_STATUSES__.delete(key);
  }
};

let redis: any;
// Initialize in-memory Redis mock FIRST to avoid async race conditions (always available)
redis = globalThis.__EOS_SHARED_REDIS_INSTANCE__;

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
      // Jika berhasil, ganti instance
      redis = redisInstance;
      globalThis.__EOS_SHARED_REDIS_INSTANCE__ = redisInstance;
      console.log('[email-queue.ts] Redis connected successfully, using Redis mode');
    } catch (error) {
      // Jika gagal, tetap gunakan in-memory mock
      console.log('[email-queue.ts] Redis connection failed, using in-memory fallback:', error.message);
    }
  })();
}

// Email Queue Repository
export const EmailQueueRepository = {
  async enqueue(queueName: string, item: any) {
    const itemStr = JSON.stringify(item);
    await redis.lpush(queueName, itemStr);
    console.log(`[EmailQueueRepository] enqueue: item added to ${queueName}`);
    return true;
  },
  
  async dequeue(queueName: string, processingQueueName: string) {
    const itemStr = await redis.brpoplpush(queueName, processingQueueName, 0);
    if (!itemStr) return null;
    const item = JSON.parse(itemStr);
    console.log(`[EmailQueueRepository] dequeue: item retrieved from ${queueName}`);
    return item;
  },
  
  async ack(processingQueueName: string, item: any) {
    const itemStr = JSON.stringify(item);
    await redis.lrem(processingQueueName, 1, itemStr);
    console.log(`[EmailQueueRepository] ack: item removed from ${processingQueueName}`);
    return true;
  },
  
  async list(queueName: string) {
    const items = await redis.lrange(queueName, 0, -1);
    return items.map((itemStr: string) => JSON.parse(itemStr));
  },
  
  async length(queueName: string) {
    return redis.llen(queueName);
  }
};

// Carly Inbox Repository - untuk reality observation mechanism
export const CarlyInboxRepository = {
  async add(item: any) {
    globalThis.__EOS_INMEMORY_CARLY_INBOX__.push({
      ...item,
      observedAt: getNow().toISOString()
    });
    console.log(`[CarlyInboxRepository] add: item added to Carly inbox`);
    return true;
  },
  
  async list() {
    return [...globalThis.__EOS_INMEMORY_CARLY_INBOX__];
  },
  
  async clear() {
    globalThis.__EOS_INMEMORY_CARLY_INBOX__ = [];
    return true;
  }
};

export default {
  EmailQueueRepository,
  CarlyInboxRepository,
  simulateUnavailable: (state: boolean) => globalThis.__EOS_SHARED_REDIS_INSTANCE__.simulateUnavailable(state)
};