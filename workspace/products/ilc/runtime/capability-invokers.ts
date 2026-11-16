// @ts-nocheck
/**
 * ILC Capability Invokers - EOS-360-003 Capability Reusability
 * Mengikuti pola yang sama dengan Digital Operations untuk konsistensi EOS 360
 * Menyediakan:
 * 1. Reuse existing EOS capabilities (100% reuse, tidak ada implementasi custom)
 * 2. MCP payload ke ExecutionEnvelope mapping menggunakan capability standar Genesis
 * 3. Lazy capability invocation untuk menghindari module cycles
 * 4. Semua governance rules tetap berlaku untuk MCP access
 */

// Reuse investment-compliance capability (ACaaS) - EOS-360-003 Capability Reusability
// Termasuk import mapMcpPayloadToExecutionEnvelope sebagai capability standar Genesis
import { 
  complianceCaseCommands,
  mapMcpPayloadToExecutionEnvelope as mapMcpPayloadToExecutionEnvelopeStandar
} from "../../../capabilities/investment-compliance/implementation/commands/compliance-case.commands.js";
// Import capability registry untuk registrasi capability yang direuse
import { capabilityRegistry } from "../../../packages/core/kernel/src/registry/capability-command-registry.js";

// Daftarkan investment-compliance capability ke ILC product context
// Tanpa duplikasi kode, 100% reuse dari capability yang sudah ada
Object.values(complianceCaseCommands).forEach(command => {
  capabilityRegistry.register(command);
});

// Ekspor ulang fungsi standar Genesis agar tetap kompatibel dengan kode yang mengimpornya
export const mapMcpPayloadToExecutionEnvelope = mapMcpPayloadToExecutionEnvelopeStandar;

/**
 * Generic capability invoker untuk ILC - lazy import untuk menghindari module cycles
 * Mengikuti pattern yang sama dengan Digital Operations untuk konsistensi
 */
async function invokeCapability<Output = unknown>(
  capability: string,
  commandName: string,
  input: unknown,
): Promise<Output> {
  const loaded = await import("../../../packages/core/kernel/src/registry/capability-command-registry.js");
  const reg = (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<Output> } }).capabilityRegistry;
  
  if (typeof reg?.invoke !== "function") {
    throw new Error(`[ILC-001] capabilityRegistry.invoke unavailable for ${capability}.${commandName}`);
  }
  
  const result = await reg.invoke(capability, commandName, input as never);
  return result;
}

/**
 * Helper untuk invoke work-core commands (create, updateWork, dll.)
 */
async function invokeWorkCoreCommand<Output = unknown>(
  commandName: string,
  input: unknown,
): Promise<Output> {
  return invokeCapability<Output>("work-core", commandName, input);
}

// Export public functions untuk digunakan oleh adapter dan experience layers
export {
  invokeCapability,
  invokeWorkCoreCommand
};