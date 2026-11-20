// In-memory fallback for test environments (NO Redis required)
type EmailQueue = Array<{
  to: string;
  subject: string;
  body: string;
  createdAt: string;
  attempts: number;
}>;
declare global {
  var __EOS_INMEMORY_EMAIL_QUEUE__: EmailQueue;
}
globalThis.__EOS_INMEMORY_EMAIL_QUEUE__ = globalThis.__EOS_INMEMORY_EMAIL_QUEUE__ || [];

// Use in-memory store as DEFAULT, Redis only if explicitly configured and available
const useInMemory = !process.env.REDIS_URL || process.env.REDIS_URL === '' || process.env.REDIS_URL === 'redis://localhost:6379';
let redis: any;

// Initialize in-memory Redis mock FIRST to avoid async race conditions (always available)
redis = {
  lpush: async (queue: string, email: string) => globalThis.__EOS_INMEMORY_EMAIL_QUEUE__.unshift(JSON.parse(email)),
  rpop: async (queue: string) => globalThis.__EOS_INMEMORY_EMAIL_QUEUE__.pop() ? JSON.stringify(globalThis.__EOS_INMEMORY_EMAIL_QUEUE__.pop()) : null,
  llen: async (queue: string) => globalThis.__EOS_INMEMORY_EMAIL_QUEUE__.length
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
      console.log("[EMAIL QUEUE] Berhasil terhubung ke Redis untuk multi-instance deployment");
    } catch (error) {
      console.warn('[EMAIL QUEUE] Redis connection failed, falling back to in-memory:', error.message);
    }
  })();
}

export interface EmailJob {
  to: string;
  subject: string;
  body: string;
}

export const EmailQueue = {
  async enqueue(email: EmailJob): Promise<void> {
    const job = {
      ...email,
      createdAt: new Date().toISOString(),
      attempts: 0
    };
    await redis.lpush('email:queue', JSON.stringify(job));
  },

  async dequeue(): Promise<EmailJob | null> {
    const job = await redis.rpop('email:queue');
    return job ? JSON.parse(job) : null;
  },

  async length(): Promise<number> {
    return redis.llen('email:queue');
  }
};