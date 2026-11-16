import { 
  complianceCaseCommands,
  mapMcpPayloadToExecutionEnvelope as mapMcpPayloadToExecutionEnvelopeStandar
} from "../../../capabilities/investment-compliance/implementation/commands/compliance-case.commands.js";
import { capabilityRegistry } from "../../../packages/core/kernel/src/registry/capability-command-registry.js";

Object.values(complianceCaseCommands).forEach(command => {
  capabilityRegistry.register(command);
});

export const mapMcpPayloadToExecutionEnvelope = mapMcpPayloadToExecutionEnvelopeStandar;

async function invokeCapability<Output = unknown>(
  capability: string,
  commandName: string,
  input: unknown,
): Promise<Output> {
  const loaded = await import("../../../packages/core/kernel/src/registry/capability-command-registry.js");
  const command = loaded.capabilityRegistry.get(capability, commandName);
  if (!command) {
    throw new Error(`Capability ${capability}.${commandName} not found`);
  }
  return command.handler(input) as Promise<Output>;
}

export const invokeEcommerceOpsCapability = invokeCapability;