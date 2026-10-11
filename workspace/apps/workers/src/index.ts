// apps/workers/src/index.ts - Worker Runtime Composition Root
// WORKER-001: FIN-001-W2 Midtrans Webhook Processing
// Sesuai semua boundary yang ditetapkan: worker hanya execution surface, tidak punya authority domain
// Semua logic bisnis tetap di capabilities yang sudah ada, worker hanya mengeksekusinya di background

import { finWebhookConsumer } from "./contexts/fin-webhook/consumer.js";
import { fileURLToPath } from 'url';

// Log initialization
console.log('='.repeat(60));
console.log('[EOS WORKER] Initializing worker runtime for WORKER-001');
console.log('[EOS WORKER] Bounded Context: fin-webhook (FIN-001 Midtrans webhook processing)');
console.log('='.repeat(60));

// Start all consumers
async function startWorkers() {
  try {
    // Start fin-webhook consumer - hanya satu consumer untuk WORKER-001
    await finWebhookConsumer.start();
    
    console.log('\n[EOS WORKER] All consumers started successfully');
    console.log('[EOS WORKER] Worker is running in background, ready to process events');
    
    // Handle graceful shutdown
    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);
    
  } catch (error) {
    console.error('[EOS WORKER] Failed to start workers:', error);
    process.exit(1);
  }
}

// Graceful shutdown - handle SIGINT/SIGTERM
function handleShutdown() {
  console.log('\n[EOS WORKER] Received shutdown signal, stopping workers...');
  
  // Stop fin-webhook consumer
  finWebhookConsumer.stop();
  
  console.log('[EOS WORKER] All workers stopped, exiting');
  process.exit(0);
}

// Export consumer untuk dipanggil oleh API jika perlu (enqueue dari API)
// Hanya export yang dibutuhkan, tidak ada export lain
export { finWebhookConsumer };

// Start jika file ini dijalankan langsung (node dist/index.js atau tsx src/index.ts)
// ES module equivalent of require.main === module
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  startWorkers();
}