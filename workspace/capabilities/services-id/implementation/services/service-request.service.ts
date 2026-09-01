import { capabilityRegistry } from "@repo/core-kernel";
import { serviceRequestCommands } from "../commands/service-request.commands";
import { serviceRequestQueries } from "../queries/service-request.queries";

export function registerServiceRequestCapability() {
  // Register all commands
  Object.entries(serviceRequestCommands).forEach(([name, command]) => {
    capabilityRegistry.registerCommand("services-id", name, command);
  });
  
  // Register all queries
  Object.entries(serviceRequestQueries).forEach(([name, query]) => {
    capabilityRegistry.registerQuery("services-id", name, query);
  });
  
  console.log("[Services-ID] Capability registered successfully");
}