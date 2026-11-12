// Script validasi W06-A Gate A1: Product Binding → Capability Registry → Command Handler
// Import capabilityRegistry TERLEBIH DAHULU untuk memastikan instance yang sama digunakan untuk semua operasi
import { capabilityRegistry } from './workspace/packages/core/kernel/src/registry/capability-command-registry.ts';
import { registerValueMeteringCapability } from './workspace/products/value-metering/implementation/commands/value-metering.commands.ts';
import { registerDealCoordinatorCapability } from './workspace/products/deal-coordinator/implementation/commands/deal-coordinator.commands.ts';

async function main() {
  console.log("=== W06-A GATE A1 VALIDATION START ===");
  console.log("1. Menggunakan global capabilityRegistry instance (singleton)...");
  const globalRegistry = capabilityRegistry; // Gunakan instance yang diimport di awal
  
  // Override console.log untuk menangkap registrasi
  const originalLog = console.log;
  const registrationLogs: string[] = [];
  console.log = (...args) => {
    registrationLogs.push(args.join(' '));
    originalLog(...args);
  };

  console.log("2. Mendaftarkan value-metering capability...");
  registerValueMeteringCapability();
  
  console.log("3. Mendaftarkan deal-coordinator capability...");
  registerDealCoordinatorCapability();

  // Kembalikan console.log asli
  console.log = originalLog;

  // Log langsung isi capabilityCommands SEBELUM menunggu
  console.log("\n[DEBUG] Isi capabilityRegistry SEBELUM waitForCapability:");
  console.log(`[DEBUG] Total keys: ${Object.keys(globalRegistry.capabilityCommands).length}`);
  console.log(`[DEBUG] Semua keys:`, Object.keys(globalRegistry.capabilityCommands));

  console.log("\n4. Menunggu semua command terdaftar di registry (waitForCapability)...");
          // Gunakan waitForCapability utility untuk menangani race condition registrasi async
          const requiredCapabilities = ["value-metering", "deal-coordinator"];
          const allCapabilitiesReady = await Promise.all(
            requiredCapabilities.map(capId => globalRegistry.waitForCapability(capId, 15, 100))
          );
          console.log(`Semua kapabilitas siap: ${allCapabilitiesReady.every(r => r)}`);

          console.log("\n5. Memeriksa semua command yang terdaftar di GLOBAL registry:");
          const registeredCommands = Object.keys(globalRegistry.capabilityCommands || {});
          console.log(`Total commands registered: ${registeredCommands.length}`);
          console.log("Commands:");
          registeredCommands.forEach(cmd => console.log(`  - ${cmd}`));

          // Periksa command yang dibutuhkan
          const requiredCommands = [
            "value-metering.cost-attribution.execute",
            "value-metering.usage-metering.execute", 
            "value-metering.legal-service-metering.execute",
            "deal-coordinator.cross-org-agreement.execute",
            "deal-coordinator.payment-reconciliation.execute",
            "deal-coordinator.reconciliation.execute"
          ];

          console.log("\n6. Validasi command yang dibutuhkan:");
          const missingCommands: string[] = [];
          requiredCommands.forEach(reqCmd => {
            if (registeredCommands.includes(reqCmd)) {
              console.log(`✅ ${reqCmd} - TERDAFTAR`);
            } else {
              console.log(`❌ ${reqCmd} - TIDAK TERDAFTAR`);
              missingCommands.push(reqCmd);
            }
          });

  if (missingCommands.length === 0) {
    console.log("\n=== W06-A GATE A1 VALIDATION PASSED ===");
    console.log("Semua command value-metering dan deal-coordinator berhasil terdaftar di capability registry!");
  } else {
    console.log("\n=== W06-A GATE A1 VALIDATION FAILED ===");
    console.log(`Missing commands: ${missingCommands.join(', ')}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Error during validation:", err);
  process.exit(1);
});