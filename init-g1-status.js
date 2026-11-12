// Script sederhana untuk inisialisasi status g1-market-pricing-01
// Gunakan ES modules import untuk kompatibilitas dengan TypeScript export
import { ExecutionStatusRepository } from './workspace/packages/core/runtime/src/execution-status.js';

async function main() {
  console.log('[INIT] Memulai inisialisasi status exec-g1-market-001...');
  try {
    const status = await ExecutionStatusRepository.initG1MarketStatus();
    console.log('[INIT] Status berhasil dibuat:');
    console.log(JSON.stringify(status, null, 2));
    
    // Verifikasi audit trail
    const currentStatus = await ExecutionStatusRepository.getStatus("exec-g1-market-001");
    console.log('\n[VERIFIKASI] Audit trail yang tersimpan:');
    console.log(JSON.stringify(currentStatus?.transitions, null, 2));
  } catch (error) {
    console.error('[INIT-ERROR] Gagal menginisialisasi status:', error);
  }
}

main().catch(console.error);