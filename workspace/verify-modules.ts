// Script verifikasi modul untuk mencegah error "Module not found" pada tahap build
// Dijalankan otomatis sebelum build untuk memastikan semua dependensi internal dapat terdeteksi

async function verifyModule(modulePath: string, moduleName: string): Promise<boolean> {
  try {
    const module = await import(modulePath);
    console.log(`✅ ${moduleName}: BERHASIL diimpor`);
    return true;
  } catch (error) {
    console.error(`❌ ${moduleName}: GAGAL - ${error}`);
    return false;
  }
}

async function main() {
  console.log("\n🚀 Memulai verifikasi modul Enterprise-OS...\n");
  
  const results = await Promise.all([
    // Capability Identity
    verifyModule("./capabilities/identity/dist/repositories/index.js", "Identity Repository"),
    // Capability Communication
    verifyModule("./capabilities/communication/dist/repository/communication.repository.js", "Communication Repository"),
    // Core Kernel
    verifyModule("@repo/core-kernel", "Core Kernel"),
    // Core Runtime
    verifyModule("@repo/core-runtime", "Core Runtime")
  ]);

  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log(`\n📊 Hasil verifikasi: ${passed}/${total} modul berhasil`);
  
  if (passed === total) {
    console.log("\n🎉 SEMUA MODUL BERHASIL! Proyek siap untuk build/produksi.");
    process.exit(0);
  } else {
    console.error("\n⚠️ Beberapa modul gagal. Perbaiki sebelum build!");
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});