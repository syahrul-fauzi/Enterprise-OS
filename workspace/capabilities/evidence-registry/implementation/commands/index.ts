import type { CapabilityCommand } from "@repo/core-kernel";
import { recordEvidence } from "./evidence-registry.commands.js";

// SAMA DENGAN identity-core: definisikan evidenceCommands sebagai Readonly<Record<string, CapabilityCommand>>
// Semua command menggunakan format capability.name yang sudah lengkap agar terdaftar dengan benar
export const evidenceCommands: Readonly<Record<string, CapabilityCommand>> = {
  "evidence-registry.record": recordEvidence, // WAJIB didaftarkan agar masuk ke evidenceCommands dengan format yang benar!
} as const;

export { recordEvidence } from "./evidence-registry.commands.js";

// Lazy import capability registry sesuai SERVER-ONLY BOUNDARY di core-kernel barrel (SAMA PERSIS dengan identity-core)
async function getCapabilityRegistry() {
  const { capabilityRegistry } = await import("../../../../packages/core/kernel/src/registry/capability-command-registry.js");
  return capabilityRegistry;
}

// Register evidence-registry core commands dengan capability registry (ASYNC untuk menghindari module cycle - SAMA PERSIS dengan identity-core)
export async function registerEvidenceCoreCapability() {
  console.log("[Evidence-Core] AUDIT-001-005: Evidence-Core capability registration dimulai");
  console.log("[Evidence-Core] evidenceCommands keys saat registrasi:", Object.keys(evidenceCommands));
  console.log("[Evidence-Core] recordEvidence command exists:", !!recordEvidence);
  
  const capabilityRegistry = await getCapabilityRegistry();
  Object.values(evidenceCommands).forEach((command) => {
    console.log("[Evidence-Core] Mendaftarkan command:", command.name);
    capabilityRegistry.register(command);
  });
  
  // listCommandKeys() membutuhkan await karena memuat capability commands secara async
  const registeredCommands = await capabilityRegistry.listCommandKeys();
  console.log("[Evidence-Core] Command yang terdaftar setelah registrasi:", registeredCommands);
  console.log("[Evidence-Core] Type of registeredCommands:", typeof registeredCommands, "Is array?", Array.isArray(registeredCommands));
  console.log("[Evidence-Core] AUDIT-001-005: Evidence-Core capability registered successfully");
}

// Panggil registrasi segera setelah modul diimpor (sesuai pola semua capability lain - SAMA PERSIS dengan identity-core)
// Hanya panggil jika bukan di test environment (VITEST) untuk menghindari registrasi ganda
if (typeof process.env.VITEST === 'undefined') {
  registerEvidenceCoreCapability();
}