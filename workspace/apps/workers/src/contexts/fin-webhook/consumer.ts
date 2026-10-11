// FIN-001 Webhook Consumer - Worker yang mengkonsumsi queue dan menjalankan handler
// Sesuai boundary worker: HANYA mengelola lifecycle eksekusi, tidak punya business logic
// REUSE email-queue.ts dari core runtime - tidak buat queue baru (100% primitive reuse)

import { handleMidtransWebhookWorker } from "./handler.js";
// Gunakan path alias monorepo yang sudah terkonfigurasi di tsconfig.json, sesuai konvensi workspace
// Pakai export subpath yang sudah didefinisikan di package.json @repo/core-runtime
import { redis } from "../../../../../packages/core/runtime/src/email-queue.js";
import type { RealitySignal } from "../../../../../packages/core/runtime/src/email-queue.js";

// Consumer untuk fin-webhook - bounded context terisolasi
// Hanya bertanggung jawab untuk: consume queue dan panggil handler yang sesuai
// Menggunakan infrastructure queue yang sudah ada dari core, tidak perlu BaseWorkerQueue baru

export class FinWebhookConsumer {
  private isRunning: boolean = false;
  private pollIntervalMs: number = 1000; // 1 detik poll interval
  public static readonly WEBHOOK_QUEUE_KEY = 'eos:webhook-queue:fin';
  public static readonly WEBHOOK_PROCESSING_KEY = 'eos:webhook-queue:fin:processing';
  public static readonly PROCESSED_TRANSACTIONS_KEY = 'eos:webhook-queue:fin:processed'; // Set untuk deduplikasi
  public static readonly WEBHOOK_PROCESSING_TRANSACTIONS_KEY = 'eos:webhook-queue:fin:processing-transactions'; // Set untuk mencegah paralel
  public redis: any = redis; // Gunakan instance Redis yang sama dari core, diimport di level atas

  constructor() {
    // Inisialisasi consumer dengan key queue spesifik untuk fin-webhook
    console.log('[FinWebhookConsumer] Initialized - using core runtime queue infrastructure');
    console.log('[FinWebhookConsumer] Core Redis instance loaded successfully');
  }

  // Add crash recovery: scan processing list for stale items (>5 minutes old)
  // Fixes BRPOPLPUSH idempotency gap: worker crash leaves items stuck in processing
  // Method dibuat public agar dapat diuji di test runner - tidak digunakan di production selain oleh interval internal
  public async recoverStaleProcessingItems(): Promise<void> {
    if (!this.redis) return;
    const processingItems = await this.redis.lrange(FinWebhookConsumer.WEBHOOK_PROCESSING_KEY, 0, -1);
    console.log(`[FinWebhookConsumer] recoverStaleProcessingItems: found ${processingItems.length} items in processing queue`);
    const staleThresholdMs = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();

    for (const item of processingItems) {
      try {
        const envelope = JSON.parse(item);
        const ageMs = now - new Date(envelope.enqueuedAt).getTime();
        console.log(`[FinWebhookConsumer] Checking item ${envelope.id}: age=${Math.round(ageMs/1000/60)}m, staleThreshold=5m`);
        // Jika envelope tidak punya timestamp atau sudah超过5 menit, kirim kembali ke queue utama
        if (!envelope.enqueuedAt || ageMs > staleThresholdMs) {
          console.log(`[FinWebhookConsumer] Recovering stale processing item ${envelope.id} (last seen: ${envelope.enqueuedAt || 'never'})`);
          // Update timestamp sebelum requeue untuk menghindari loop
          envelope.enqueuedAt = new Date().toISOString();
          envelope.attempts = (envelope.attempts || 0) + 1;
          
          if (envelope.attempts >= 3) {
            console.error(`[FinWebhookConsumer] Stale item ${envelope.id} exceeded max attempts, discarding`);
            await this.redis.lrem(FinWebhookConsumer.WEBHOOK_PROCESSING_KEY, 1, item);
          } else {
            await this.redis.lpush(FinWebhookConsumer.WEBHOOK_QUEUE_KEY, JSON.stringify(envelope));
            await this.redis.lrem(FinWebhookConsumer.WEBHOOK_PROCESSING_KEY, 1, item);
          }
        }
      } catch (e) {
        // If we can't parse the item, remove it from processing to avoid infinite loop
        console.error('[FinWebhookConsumer] Failed to parse stale processing item, removing from queue');
        await this.redis.lrem(FinWebhookConsumer.WEBHOOK_PROCESSING_KEY, 1, item);
      }
    }
  }

  // Start consumer - loop yang berjalan di background
  // Worker menjalankan consume loop yang TIDAK bergantung pada request lifecycle
  // REUSE pattern processQueue dari core email-queue, tidak buat loop baru
  // Stop consumer - hentikan loop pemrosesan (untuk test crash recovery)
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn('[FinWebhookConsumer] Already stopped');
      return;
    }
    this.isRunning = false;
    console.log('[FinWebhookConsumer] Stopped - no longer listening for fin-webhook events');
  }

  // Process single webhook item - exposed for testing to avoid infinite loop
  async processWebhookItem(webhookJson: string): Promise<void> {
    if (!this.redis) return;
    
    try {
      const envelope: RealitySignal = JSON.parse(webhookJson);
      // Increment attempts counter
      envelope.attempts = (envelope.attempts || 0) + 1;
      
      console.log(`[FinWebhookConsumer] Processing webhook ${envelope.id} (attempt ${envelope.attempts})`);
      
      // Cek apakah transaction_id sudah diproses ATAU SEDANG DIPROSES sebelumnya (idempotensi penuh)
      // Parse rawInput untuk mendapatkan payload Midtrans (sesuai RealitySignal kontrak)
      // Perbaiki null safety dan tambahkan validasi payload sebelum akses properti
      let rawPayload;
      let transactionId: string | undefined;
      try {
        rawPayload = JSON.parse(envelope.rawInput);
        transactionId = rawPayload?.transaction_id;
      } catch (e) {
        console.error(`[FinWebhookConsumer] Failed to parse rawInput for webhook ${envelope.id}, discarding malformed payload`);
        await this.redis.lrem(FinWebhookConsumer.WEBHOOK_PROCESSING_KEY, 1, webhookJson);
        return;
      }
      if (!transactionId) {
        console.error(`[FinWebhookConsumer] Webhook ${envelope.id} missing transaction_id, discarding invalid payload`);
        await this.redis.lrem(FinWebhookConsumer.WEBHOOK_PROCESSING_KEY, 1, webhookJson);
        return;
      }
      const alreadyProcessed = await this.redis.sismember(FinWebhookConsumer.PROCESSED_TRANSACTIONS_KEY, transactionId);
      const currentlyProcessing = await this.redis.sismember(FinWebhookConsumer.WEBHOOK_PROCESSING_TRANSACTIONS_KEY, transactionId);
      if (alreadyProcessed || currentlyProcessing) {
        console.log(`[FinWebhookConsumer] Transaction ${transactionId} already processed or being processed, skipping duplicate`);
        await this.redis.lrem(FinWebhookConsumer.WEBHOOK_PROCESSING_KEY, 1, webhookJson);
        return;
      }
      // Tandai sebagai SEDANG DIPROSES sebelum memulai, mencegah pemrosesan paralel
      await this.redis.sadd(FinWebhookConsumer.WEBHOOK_PROCESSING_TRANSACTIONS_KEY, transactionId);
      
      // Batasi maksimal 3 percobaan
      if (envelope.attempts >= 3) {
        console.error(`[FinWebhookConsumer] Webhook ${envelope.id} exceeded max 3 attempts, discarding`);
        await this.redis.lrem(FinWebhookConsumer.WEBHOOK_PROCESSING_KEY, 1, webhookJson);
        await this.redis.srem(FinWebhookConsumer.WEBHOOK_PROCESSING_TRANSACTIONS_KEY, transactionId);
        return;
      }
      
      // Panggil handler untuk memproses business logic
      const result = await handleMidtransWebhookWorker(envelope);
      
      if (result.success) {
        console.log(`[FinWebhookConsumer] Webhook ${envelope.id} processed successfully`);
        // Pindahkan dari processing set ke completed set jika berhasil
        await this.redis.sadd(FinWebhookConsumer.PROCESSED_TRANSACTIONS_KEY, transactionId);
        await this.redis.srem(FinWebhookConsumer.WEBHOOK_PROCESSING_TRANSACTIONS_KEY, transactionId);
        await this.redis.lrem(FinWebhookConsumer.WEBHOOK_PROCESSING_KEY, 1, webhookJson);
      } else {
        // Jika gagal, hapus dari processing transaksi agar bisa di retry nanti
        await this.redis.srem(FinWebhookConsumer.WEBHOOK_PROCESSING_TRANSACTIONS_KEY, transactionId);
        console.error(`[FinWebhookConsumer] Webhook ${envelope.id} failed (attempt ${envelope.attempts}/3): ${result.error}`);
        // Update envelope dengan attempts terbaru sebelum dikembalikan ke queue
        const updatedEnvelope = {...envelope, attempts: (envelope.attempts || 0) + 1};
        const updatedWebhookJson = JSON.stringify(updatedEnvelope);
        await this.redis.lpush(FinWebhookConsumer.WEBHOOK_QUEUE_KEY, updatedWebhookJson);
        await this.redis.lrem(FinWebhookConsumer.WEBHOOK_PROCESSING_KEY, 1, webhookJson);
      }
    } catch (e) {
      console.error('[FinWebhookConsumer] Failed to process webhook item', e);
      await this.redis.lrem(FinWebhookConsumer.WEBHOOK_PROCESSING_KEY, 1, webhookJson);
    }
  }

  // Reset consumer state - untuk test isolation
  async reset(): Promise<void> {
    if (this.isRunning) await this.stop();
    // Hapus semua item dari queue dan set
    await this.redis.del(FinWebhookConsumer.WEBHOOK_QUEUE_KEY);
    await this.redis.del(FinWebhookConsumer.WEBHOOK_PROCESSING_KEY);
    await this.redis.del(FinWebhookConsumer.PROCESSED_TRANSACTIONS_KEY);
    await this.redis.del(FinWebhookConsumer.WEBHOOK_PROCESSING_TRANSACTIONS_KEY);
    console.log('[FinWebhookConsumer] Reset - all queues and transaction sets cleared');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[FinWebhookConsumer] Already running');
      return;
    }

    // Tunggu sampai redis instance terinisialisasi sebelum memulai loop
    if (!this.redis) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.start(); // Retry setelah 100ms jika redis belum siap
    }

    this.isRunning = true;
    console.log('[FinWebhookConsumer] Started - listening for fin-webhook events using core queue infrastructure');
    
    // Jalankan crash recovery pertama kali saat startup
    await this.recoverStaleProcessingItems();
    // Jalankan recovery setiap 1 menit untuk menangkap item yang tertinggal dari crash sebelumnya
    setInterval(() => this.recoverStaleProcessingItems(), 60 * 1000);

    // Buat local functions yang extend core queue functions untuk webhook-specific keys
    // Semua menggunakan redis instance yang sudah terinisialisasi dari core, tidak import berulang
    const moveFromWebhookQueueToProcessing = async (): Promise<string | null> => {
      return await this.redis.brpoplpush(FinWebhookConsumer.WEBHOOK_QUEUE_KEY, FinWebhookConsumer.WEBHOOK_PROCESSING_KEY, 1);
    };

    const removeFromWebhookProcessing = async (value: string): Promise<void> => {
      await this.redis.lrem(FinWebhookConsumer.WEBHOOK_PROCESSING_KEY, 1, value);
    };

    const pushToWebhookQueue = async (value: string): Promise<void> => {
      await this.redis.lpush(FinWebhookConsumer.WEBHOOK_QUEUE_KEY, value);
    };

    while (this.isRunning) {
      try {
        // Ambil item dari queue menggunakan core infrastructure yang sudah ada
        const webhookJson = await moveFromWebhookQueueToProcessing();
        if (!webhookJson) {
          // Jika queue kosong, tunggu sebentar sebelum coba lagi
          await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
          continue;
        }

        let envelope: RealitySignal;
                try {
                  envelope = JSON.parse(webhookJson);
                  // Increment attempts counter setiap kali envelope diambil dari queue
                  envelope.attempts = (envelope.attempts || 0) + 1;
                } catch (e) {
                  console.error('[FinWebhookConsumer] Failed to parse webhook envelope, removing from queue');
                  await removeFromWebhookProcessing(webhookJson);
                  continue;
                }

                // Batasi maksimal 3 percobaan pemrosesan per webhook (idempotensi)
                if (envelope.attempts >= 3) {
                  console.error(`[FinWebhookConsumer] Webhook ${envelope.id} exceeded max 3 attempts, discarding`);
                  await removeFromWebhookProcessing(webhookJson);
                  continue;
                }

                // Cek apakah transaction_id sudah diproses ATAU SEDANG DIPROSES sebelumnya (idempotensi penuh)
                // Parse rawInput untuk mendapatkan payload Midtrans (sesuai RealitySignal kontrak)
                // Perbaiki null safety dan tambahkan validasi payload sebelum akses properti
                let rawPayload;
                let transactionId: string | undefined;
                try {
                  rawPayload = JSON.parse(envelope.rawInput);
                  transactionId = rawPayload?.transaction_id;
                } catch (e) {
                  console.error(`[FinWebhookConsumer] Failed to parse rawInput for webhook ${envelope.id}, discarding malformed payload`);
                  await removeFromWebhookProcessing(webhookJson);
                  continue;
                }
                if (!transactionId) {
                  console.error(`[FinWebhookConsumer] Webhook ${envelope.id} missing transaction_id, discarding invalid payload`);
                  await removeFromWebhookProcessing(webhookJson);
                  continue;
                }
                const alreadyProcessed = await this.redis.sismember(FinWebhookConsumer.PROCESSED_TRANSACTIONS_KEY, transactionId);
                const currentlyProcessing = await this.redis.sismember(FinWebhookConsumer.WEBHOOK_PROCESSING_TRANSACTIONS_KEY, transactionId);
                if (alreadyProcessed || currentlyProcessing) {
                  console.log(`[FinWebhookConsumer] Transaction ${transactionId} already processed or being processed, skipping duplicate`);
                  await removeFromWebhookProcessing(webhookJson);
                  continue;
                }
                // Tandai sebagai SEDANG DIPROSES sebelum memulai, mencegah pemrosesan paralel
                await this.redis.sadd(FinWebhookConsumer.WEBHOOK_PROCESSING_TRANSACTIONS_KEY, transactionId);

                // Proses envelope dengan handler yang sudah ada
                console.log(`[FinWebhookConsumer] Processing webhook ${envelope.id} (attempt ${envelope.attempts}/3)`);
                const result = await handleMidtransWebhookWorker(envelope);
                
                if (result.success) {
                  console.log(`[FinWebhookConsumer] Webhook ${envelope.id} processed successfully`);
                  // Pindahkan dari processing set ke completed set jika berhasil
                  if (transactionId) {
                    await redis.sadd(FinWebhookConsumer.PROCESSED_TRANSACTIONS_KEY, transactionId);
                    await redis.srem(FinWebhookConsumer.WEBHOOK_PROCESSING_TRANSACTIONS_KEY, transactionId);
                  }
                  await removeFromWebhookProcessing(webhookJson);
                } else {
                  // Jika gagal, hapus dari processing transaksi agar bisa di retry nanti
                  if (transactionId) {
                    await redis.srem(FinWebhookConsumer.WEBHOOK_PROCESSING_TRANSACTIONS_KEY, transactionId);
                  }
                  console.error(`[FinWebhookConsumer] Webhook ${envelope.id} failed (attempt ${envelope.attempts}/3): ${result.error}`);
                  // Update envelope dengan attempts terbaru sebelum dikembalikan ke queue
                  const updatedEnvelope = {...envelope, attempts: (envelope.attempts || 0) + 1};
                  const updatedWebhookJson = JSON.stringify(updatedEnvelope);
                  await pushToWebhookQueue(updatedWebhookJson);
                  await removeFromWebhookProcessing(webhookJson);
                }
      } catch (error) {
        console.error('[FinWebhookConsumer] Error in consumer loop:', error);
        await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
      }
    }
  }

  // Stop consumer
  stop(): void {
    this.isRunning = false;
    console.log('[FinWebhookConsumer] Stopped');
  }

  // Static method untuk enqueue webhook - dipanggil dari API ingress setelah validasi
  // Hanya worker yang boleh menambahkan ke queue, API hanya dispatch ke sini
  static async enqueueWebhook(signal: RealitySignal): Promise<void> {
    // Gunakan path alias monorepo yang sama untuk semua import, sesuai konvensi workspace
    const module = await import('@repo/core-runtime/email-queue.js');
    const redis = module.redis;
    await redis.lpush(FinWebhookConsumer.WEBHOOK_QUEUE_KEY, JSON.stringify(signal));
    console.log(`[FinWebhookConsumer] Webhook ${signal.id} enqueued successfully`);
  }
}

// Singleton instance - hanya satu consumer yang berjalan di worker process
// Worker process adalah single-purpose untuk fin-webhook
// Bisa di-scale horizontal jika perlu, tapi untuk WORKER-001 cukup satu instance
export const finWebhookConsumer = new FinWebhookConsumer();