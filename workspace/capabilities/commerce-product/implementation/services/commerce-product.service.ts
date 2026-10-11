import { capabilityRegistry } from "../../../../packages/core/kernel/src/registry/capability-command-registry.js";
import { productListingCommands } from "../commands/index";
// Future: add productListingQueries import jika ada queries di masa depan

export function registerCommerceProductCapability() {
  // Register all commands for commerce-product capability (COM-001) - ikuti canonical pattern dari capability-command-registry.ts
  Object.values(productListingCommands).forEach((command) => {
    capabilityRegistry.register(command); // Pass full command object (command has capability + name fields)
  });
  
  // Future: register queries jika ditambahkan
  // Object.entries(productListingQueries).forEach(([name, query]) => {
  //   capabilityRegistry.registerQuery("commerce-product", name, query);
  // });
  
  console.log("[Commerce-Product] COM-001 Capability registered successfully with EOS Work Continuity Substrate");
}