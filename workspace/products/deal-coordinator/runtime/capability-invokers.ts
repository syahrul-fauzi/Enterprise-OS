// Reuse investment-compliance capability (ACaaS) - EOS-360-003 Capability Reusability
import { 
  complianceCaseCommands,
  mapMcpPayloadToExecutionEnvelope as mapMcpPayloadToExecutionEnvelopeStandar
} from "../../../capabilities/investment-compliance/implementation/commands/compliance-case.commands.js";
import { capabilityRegistry } from "../../../packages/core/kernel/src/registry/capability-command-registry.js";

// Register investment-compliance capability into Deal Coordinator product context
Object.values(complianceCaseCommands).forEach(command => {
  capabilityRegistry.register(command);
});

// Re-export standard Genesis function for backward compatibility
export const mapMcpPayloadToExecutionEnvelope = mapMcpPayloadToExecutionEnvelopeStandar;

// Generic capability invoker - lazy import to avoid module cycles
async function invokeCapability<Output = unknown>(
  capability: string,
  commandName: string,
  input: unknown,
): Promise<Output> {
  const loaded = await import("../../../packages/core/kernel/src/registry/capability-command-registry.js");
  const command = loaded.capabilityRegistry.get(capability, commandName);
  if (!command) {
    throw new Error(`Capability ${capability} command ${commandName} not found`);
  }
  return command.execute(input) as Promise<Output>;
}

export default invokeCapability;