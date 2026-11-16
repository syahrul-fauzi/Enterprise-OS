// Reuse investment-compliance capability (ACaaS) - EOS-360-003 Capability Reusability
import { 
  complianceCaseCommands,
  mapMcpPayloadToExecutionEnvelope as mapMcpPayloadToExecutionEnvelopeStandar
} from "../../../capabilities/investment-compliance/implementation/commands/compliance-case.commands.js";
import { capabilityRegistry } from "../../../packages/core/kernel/src/registry/capability-command-registry.js";

// Daftarkan investment-compliance capability ke Agentic Work product context
Object.values(complianceCaseCommands).forEach(command => {
  capabilityRegistry.register(command);
});

// Ekspor ulang fungsi standar Genesis agar tetap kompatibel
export const mapMcpPayloadToExecutionEnvelope = mapMcpPayloadToExecutionEnvelopeStandar;

// Generic capability invoker - lazy import untuk menghindari module cycles
async function invokeCapability<Output = unknown>(
  capability: string,
  commandName: string,
  input: unknown,
): Promise<Output> {
  const loaded = await import("../../../packages/core/kernel/src/registry/capability-command-registry.js");
  const command = loaded.capabilityRegistry.getCommand(capability, commandName);
  if (!command) {
    throw new Error(`Command ${capability}.${commandName} not found in registry`);
  }
  return command.execute(input) as Promise<Output>;
}

export const capabilityInvoker = {
  invokeCapability,
};