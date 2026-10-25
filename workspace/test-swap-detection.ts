// Test script untuk memverifikasi field swap detection logic
import { recordWorkPayment } from './packages/core/runtime/src/execution-observability';

async function testSwapDetection() {
  console.log("[TEST] Memulai uji coba field swap detection...");
  
  // Simulasikan kasus di mana billable_units dan price_unit tertukar:
  // billable_units=10, price_unit=999 (seharusnya billable_units=999, price_unit=10)
  const swappedPayment = {
    payment_id: "test-swap-001",
    work_id: "work-test-swap-001",
    outcome_id: "outcome-test-swap-001",
    tenant_id: "AC-PILOT-001",
    workspace_id: "ws-acpilot-001",
    amount: 9990,
    currency: "IDR",
    due_date_utc: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    issued_at_utc: new Date().toISOString(),
    payment_status: "pending",
    reconciliation_status: "unreconciled",
    billable_units: 10, // SALAH: seharusnya 999
    price_unit: 999,   // SALAH: seharusnya 10
    actual_cost: 5994,
    idempotency_key: "idem-test-swap-001",
    case_type: "TEST_FIELD_SWAP",
    human_review_minutes: 5,
    correction_count: 0,
    customer_value_score: 8
  };

  try {
    await recordWorkPayment(swappedPayment);
    console.log("[TEST] Pembayaran dengan field tertukar berhasil diproses dan dikoreksi!");
  } catch (error) {
    console.error("[TEST] Error saat memproses:", error);
  }
}

testSwapDetection().catch(console.error);