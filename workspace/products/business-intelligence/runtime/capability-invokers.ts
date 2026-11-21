import { capabilityRegistry } from "../../../packages/core/kernel/src/registry/capability-command-registry.js";

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

export const invokeBusinessIntelligenceCapability = invokeCapability;