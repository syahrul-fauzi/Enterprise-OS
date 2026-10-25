/**
 * FIN-001 Entry point: Register semua capability vertical slice ke capabilityRegistry
 * Sesuai pola standar yang digunakan work-core, product-delivery, dan capability lain
 * 100% primitive reuse, tidak ada primitive baru yang dibuat
 */
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import { executeCrossBorderSettlement } from "./adapters/FIN-001-cross-border-adapter.js";

// Register FIN-001 capability commands (sesuai canonical pattern, initialization-time registration)
export function registerFin001Capability() {
  const fin001Commands = [
    {
      name: "executeCrossBorderSettlement",
      capability: "fin-001",
      description: "Execute cross-border payment settlement dengan dynamic currency conversion untuk FIN-001",
      execute: executeCrossBorderSettlement,
      inputSchema: { 
        workId: "string", 
        amount: "number", 
        sourceCurrency: "string", 
        targetCurrency: "string", 
        customsId: "string", 
        recipient: "string", 
        payer: "string", 
        description: "string", 
        dueDate: "string",
        sessionId: "string",
        tenantId: "string",
        workspaceId: "string",
        actorId: "string"
      }
    }
  ];

  for (const command of fin001Commands) {
    const fullCommandName = `fin-001.${command.name}`;
    capabilityRegistry.register({
      ...command,
      name: fullCommandName,
      capability: "fin-001"
    });
    console.log(`[FIN-001] ✅ Registered command: ${fullCommandName}`);
  }
  console.log("[FIN-001] ✅ Semua capability vertical slice FIN-001 berhasil didaftarkan");
}

// Jalankan registrasi ketika module diimpor (initialization-time registration, bukan on-demand)
registerFin001Capability();