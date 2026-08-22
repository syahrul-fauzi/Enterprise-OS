// FIX-UI-001: Minimal email queue implementation using Redis
import Redis from 'ioredis';
import { ExecutionStatusRepository } from "./execution-status.js";

// Shared Redis client instance - reuse from execution-status
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

export interface QueuedEmail {
  id: string;
  to: string;
  subject: string;
  html: string;
  executionId: string;
  createdAt: string;
  processedAt?: string;
  status: "queued" | "processing" | "sent" | "failed";
  error?: string;
}

// Redis queue configuration
const REDIS_QUEUE_KEY = 'eos:email-queue';
const REDIS_PROCESSING_KEY = 'eos:email-queue:processing';
let isProcessing = false;

// Email sender mock - will implement real SMTP/nodemailer in next iteration
async function sendEmail(email: QueuedEmail): Promise<boolean> {
  // Simulate email send latency - real implementation would use actual email service
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log(`[EMAIL QUEUE] Sent to ${email.to} | Subject: ${email.subject} | Execution: ${email.executionId}`);
  return true;
}

async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (true) {
      // BRPOPLPUSH to atomically move item from queue to processing list
      const emailJson = await redis.brpoplpush(REDIS_QUEUE_KEY, REDIS_PROCESSING_KEY, 1);
      if (!emailJson) break; // No items in queue

      let email: QueuedEmail;
      try {
        email = JSON.parse(emailJson);
      } catch (e) {
        console.error('[EMAIL QUEUE] Failed to parse email JSON, removing from queue');
        await redis.lrem(REDIS_PROCESSING_KEY, 1, emailJson);
        continue;
      }

      // Mark as processing
      email.status = "processing";
      
      try {
        const success = await sendEmail(email);
        if (success) {
          email.status = "sent";
          email.processedAt = new Date().toISOString();
          
          // Update execution status to reflect email sent
          await ExecutionStatusRepository.updateStatus(
            email.executionId,
            "completed",
            "email-queue-service"
          );
        } else {
          throw new Error("Email send failed");
        }
        // Remove from processing list after success
        await redis.lrem(REDIS_PROCESSING_KEY, 1, emailJson);
      } catch (error) {
        email.status = "failed";
        email.error = error instanceof Error ? error.message : "Unknown error";
        email.processedAt = new Date().toISOString();
        
        // Update execution status to failed
        await ExecutionStatusRepository.updateStatus(
          email.executionId,
          "failed",
          "email-queue-service"
        );
        // Remove from processing list after failure
        await redis.lrem(REDIS_PROCESSING_KEY, 1, emailJson);
      }
    }
  } finally {
    isProcessing = false;
  }
}

// Periodic queue processor - ensure we keep processing even if processQueue exits
setInterval(() => {
  if (!isProcessing) processQueue().catch(console.error);
}, 5000);

export const EmailQueueRepository = {
  async enqueue(emailData: Omit<QueuedEmail, "id" | "status">): Promise<QueuedEmail> {
    const queuedEmail: QueuedEmail = {
      ...emailData,
      id: crypto.randomUUID(),
      status: "queued"
    };

    // Add to Redis queue - LPUSH to add to the end
    await redis.lpush(REDIS_QUEUE_KEY, JSON.stringify(queuedEmail));
    
    // Initialize status tracking for this execution
    await ExecutionStatusRepository.create(
      emailData.executionId,
      "email-queue-service"
    );
    await ExecutionStatusRepository.updateStatus(
      emailData.executionId,
      "running",
      "email-queue-service"
    );

    // Trigger queue processing immediately if not already processing
    if (!isProcessing) processQueue().catch(console.error);

    return queuedEmail;
  },

  async getQueueStatus(): Promise<{
    queued: number;
    processing: number;
    sent: number;
    failed: number;
  }> {
    const queueLength = await redis.llen(REDIS_QUEUE_KEY);
    const processingLength = await redis.llen(REDIS_PROCESSING_KEY);
    
    // For simplicity, we'll calculate basic stats - in production we'd track completed/failed in Redis
    return {
      queued: queueLength,
      processing: processingLength,
      sent: 0, // TODO: Track sent in a Redis sorted set for production scaling
      failed: 0
    };
  },

  async getEmailStatus(executionId: string): Promise<QueuedEmail | undefined> {
    // Scan queue for email with matching executionId - acceptable for minimal implementation
    const queueItems = await redis.lrange(REDIS_QUEUE_KEY, 0, -1);
    const processingItems = await redis.lrange(REDIS_PROCESSING_KEY, 0, -1);
    const allItems = [...queueItems, ...processingItems];
    
    for (const item of allItems) {
      try {
        const email = JSON.parse(item) as QueuedEmail;
        if (email.executionId === executionId) return email;
      } catch (e) {
        continue;
      }
    }
    return undefined;
  }
};

// Export types only via index.ts to avoid duplicate export declarations