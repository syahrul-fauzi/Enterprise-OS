// Test script untuk memanggil getMidtransPaymentStatus dan menyimpan evidence
import { getMidtransPaymentStatus } from './capabilities/connector-ecosystem/implementation/services/connector-ecosystem.service.js';

async function runMidtransTest() {
  console.log('[W05 Midtrans Verification] Memulai GET Status API untuk test transaction...');
  const testTransactionId = "midtrans-tx-8deeceee-69b5-4468-9ee2-49ea999b5a0f";
  
  try {
    const status = await getMidtransPaymentStatus(testTransactionId);
    console.log(`[W05 Midtrans Verification] Test selesai. Status transaksi: ${status}`);
    process.exit(0);
  } catch (error) {
    console.error('[W05 Midtrans Verification] Test gagal:', error);
    process.exit(1);
  }
}

runMidtransTest();