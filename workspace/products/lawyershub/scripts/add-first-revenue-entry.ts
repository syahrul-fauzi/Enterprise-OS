// Script untuk menambahkan entry revenue pertama LawyersHub ke governance-evidence
// Menjalankan ACT-LHUB-002 sesuai commercial-evidence-summary-20261101.yaml

import { governanceEvidenceService } from "../../../capabilities/governance-evidence/implementation/services/governance-evidence.service.js";
import { RevenueTrackingEntry } from "../../../capabilities/governance-evidence/implementation/contracts/governance-evidence.contracts.js";

async function addLawyersHubFirstRevenue() {
  console.log("[LHUB-001] Memulai penambahan entry revenue pertama untuk LawyersHub...");
  
  // Data transaksi dari runtime-invocations.jsonl yang sudah ditambahkan sebelumnya
  const firstRevenueEntry: RevenueTrackingEntry = {
    workId: "case-001", // Logical Work ID dari kasus hukum pertama
    clientId: "client-corp-001", // Klien yang melakukan pembayaran
    paymentTransactionId: "txn-midtrans-20261101-0001", // ID transaksi Midtrans
    grossAmount: 5000000, // Jumlah pembayaran 5 Juta IDR
    productId: "lawyershub", // Product ID
    actorId: "system:lawyershub-commercial-team", // Actor yang merekam entry
    tenantId: "tenant-eos-indonesia", // Tenant EOS Indonesia
    workspaceId: "workspace-legal-production" // Workspace produksi legal
  };

  try {
    // Panggil method addRevenueTrackingEntry dari governance-evidence service
    await governanceEvidenceService.addRevenueTrackingEntry(firstRevenueEntry);
    
    // Ambil summary untuk verifikasi
    const revenueSummary = await governanceEvidenceService.getRevenueSummary("lawyershub");
    console.log("[LHUB-001] ✅ Entry revenue berhasil ditambahkan!");
    console.log("[LHUB-001] Ringkasan revenue saat ini:", JSON.stringify(revenueSummary, null, 2));
    
    // Update doctor-metrics untuk menandakan ACT-LHUB-002 selesai
    console.log("[LHUB-001] Langkah selanjutnya: Perbarui commercial-evidence-summary-20261101.yaml untuk menandakan ACCEPT-LHUB-003 selesai");
    
  } catch (error) {
    console.error("[LHUB-001] ❌ Gagal menambahkan entry revenue:", error);
    process.exit(1);
  }
}

// Jalankan fungsi
addLawyersHubFirstRevenue();