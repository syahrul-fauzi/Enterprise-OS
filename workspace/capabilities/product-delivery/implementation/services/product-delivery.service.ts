import { capabilityRegistry } from "../../../../packages/core/kernel/src/registry/capability-command-registry.js";
import { deliveryCommands } from "../commands/index";
import { deliveryQueries } from "../queries/index";

export function registerProductDeliveryCapability() {
  // Register all commands for product-delivery capability
  Object.entries(deliveryCommands).forEach(([name, command]) => {
    capabilityRegistry.register({
      capability: "product-delivery",
      name: name,
      execute: command.execute
    });
  });
  
  // Register all queries for product-delivery capability
  Object.entries(deliveryQueries).forEach(([name, query]) => {
    capabilityRegistry.register({
      capability: "product-delivery",
      name: name,
      execute: query.execute
    });
  });
  
  console.log("[Product-Delivery] PROD-001 Capability registered successfully with EOS Work Continuity Substrate");
}