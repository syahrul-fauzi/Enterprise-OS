import { capabilityRegistry } from "./workspace/packages/core/kernel/src/registry/capability-command-registry.js";

async function runVerification() {
  console.log("=== VERIFIKASI INDEPENDEN OLEH EOS-VERIFICATION ===");
  
  // Dapatkan semua command yang terdaftar
  const registeredCommands = await capabilityRegistry.listCommandKeys();
  console.log("\n1. Semua command yang terdaftar di capabilityRegistry:");
  console.log(registeredCommands);
  
  // Cek apakah evidence-registry.record ada
  const hasEvidenceCommand = registeredCommands.includes("evidence-registry.record");
  console.log(`\n2. Apakah 'evidence-registry.record' terdaftar? ${hasEvidenceCommand ? "✅ YES" : "❌ NO"}`);
  
  // Coba resolve command menggunakan resolveByParts
  const resolution = await capabilityRegistry.resolveByParts("evidence-registry", "record");
  console.log("\n3. Hasil resolveByParts('evidence-registry', 'record'):");
  console.log("   - Attempted keys:", resolution.attemptedKeys);
  console.log("   - Command ditemukan?", !!resolution.command);
  console.log("   - Candidates:", resolution.candidates);
  
  // Cek in-memory logs konfigurasi
  console.log("\n4. Status in-memory evidence logs:");
  console.log("   - globalThis.__EOS_INMEMORY_EVIDENCE_LOGS__ terdefinisi?", !!(globalThis as any).__EOS_INMEMORY_EVIDENCE_LOGS__);
  if ((globalThis as any).__EOS_INMEMORY_EVIDENCE_LOGS__) {
    console.log("   - Jumlah entries:", (globalThis as any).__EOS_INMEMORY_EVIDENCE_LOGS__.length);
  }
  
  process.exit(hasEvidenceCommand && resolution.command ? 0 : 1);
}

// Jalankan verifikasi
runVerification().catch(err => {
  console.error("Verifikasi gagal dengan error:", err);
  process.exit(1);
});