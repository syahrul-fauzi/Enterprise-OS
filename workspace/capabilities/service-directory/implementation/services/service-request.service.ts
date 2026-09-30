import { capabilityRegistry } from "../../../../packages/core/kernel/src/registry/capability-command-registry.js";
import { serviceDirectoryCommands } from "../commands/service.commands.js";

export function registerServiceDirectoryCapability() {
  // Register all service-directory commands with capabilityRegistry (matches existing services-id pattern)
  Object.entries(serviceDirectoryCommands).forEach(([name, command]) => {
    capabilityRegistry.register(command);
  });
  
  console.log("[Service-Directory] All capabilities registered successfully with capabilityRegistry");
}