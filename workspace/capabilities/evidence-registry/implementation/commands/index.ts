// @ts-nocheck
import type { CapabilityCommand } from "@repo/core-kernel";
import { recordEvidence, listEvidenceByWorkId } from "./evidence-registry.commands.js";

// SAMA DENGAN identity-core: definisikan evidenceCommands sebagai Readonly<Record<string, CapabilityCommand>>
// Hanya gunakan nama command sederhana, capabilityRegistry.register() akan membuat key dari command.capability + command.name
export const evidenceCommands: Readonly<Record<string, CapabilityCommand>> = {
  "record": recordEvidence, // command.name = "record", capability sudah ada di command object
  "evidence.listbyworkid": listEvidenceByWorkId, // command.name = "evidence.listbyworkid", capability sudah ada di command object
} as const;

export { recordEvidence, listEvidenceByWorkId } from "./evidence-registry.commands.js";

// Lazy import capability registry sesuai SERVER-ONLY BOUNDARY di core-kernel barrel (SAMA PERSIS dengan identity-core)
async function getCapabilityRegistry() {
  const { capabilityRegistry } = await import("@repo/core-kernel");
  return capabilityRegistry;
}

// Register evidence-registry core commands dengan capability registry (ASYNC untuk menghindari module cycle - SAMA PERSIS dengan identity-core)
export async function registerEvidenceCoreCapability() {
  console.log("[Evidence-Core] AUDIT-001-005: Evidence-Core capability registration dimulai");
  console.log("[Evidence-Core] evidenceCommands keys saat registrasi:", Object.keys(evidenceCommands));
  console.log("[Evidence-Core] recordEvidence command exists:", !!recordEvidence);
  
  const capabilityRegistry = await getCapabilityRegistry();
  const registeredCommands = await capabilityRegistry.listCommandKeys();
  console.log("[Evidence-Core] Sebelum registrasi, command yang sudah terdaftar:", registeredCommands);
  
  for (const [commandKey, command] of Object.entries(evidenceCommands)) {
            // Buat full command key sesuai logika capabilityRegistry.register(): capability.name
            const fullCommandKey = `${command.capability}.${command.name}`;
            if (registeredCommands.includes(fullCommandKey)) {
              console.log("[Evidence-Core] Command sudah terdaftar, lewati:", fullCommandKey);
              continue;
            }
            console.log("[Evidence-Core] Mendaftarkan command:", fullCommandKey);
            // Pakai logika bawaan capabilityRegistry.register yang otomatis membuat key dari command.capability + command.name
            capabilityRegistry.register(command);
          }
  
  // Cek ulang command yang terdaftar setelah registrasi
  const updatedRegisteredCommands = await capabilityRegistry.listCommandKeys();
  console.log("[Evidence-Core] Command yang terdaftar setelah registrasi:", updatedRegisteredCommands);
  console.log("[Evidence-Core] Type of registeredCommands:", typeof updatedRegisteredCommands, "Is array?", Array.isArray(updatedRegisteredCommands));
  console.log("[Evidence-Core] AUDIT-001-005: Evidence-Core capability registered successfully");
}

// Panggil registrasi segera setelah modul diimpor (sesuai pola semua capability lain - SAMA PERSIS dengan identity-core)
// Cegah registrasi ganda dengan pengecekan command yang sudah terdaftar
registerEvidenceCoreCapability();