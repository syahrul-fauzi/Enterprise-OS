import { 
  consultationCommands
} from "../../../capabilities/consultation/implementation/commands/consultation.commands.js";
import { capabilityRegistry } from "../../../packages/core/kernel/src/registry/capability-command-registry.js";

Object.values(consultationCommands).forEach(command => {
  capabilityRegistry.register(command);
});

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

export const invokeIssuesIdsCapability = invokeCapability;