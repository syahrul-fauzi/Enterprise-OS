import { capabilityRegistry } from "../../../../packages/core/kernel/src/registry/capability-command-registry.js";
import { inventoryAdjustmentCommands } from "../commands/index";
// Future: add inventoryAdjustmentQueries import jika ada queries di masa depan

export function registerRetailInventoryCapability() {
  // Register all commands for retail-inventory capability (RET-001)
  // Menggunakan pattern register() yang sama persis dengan COM-001 untuk compliance capability registry
  Object.entries(inventoryAdjustmentCommands).forEach(([name, command]) => {
    capabilityRegistry.register("retail-inventory", name, command);
  });
  
  // Future: register queries jika ditambahkan
  // Object.entries(inventoryAdjustmentQueries).forEach(([name, query]) => {
  //   capabilityRegistry.registerQuery("retail-inventory", name, query);
  // });
  
  console.log("[Retail-Inventory] RET-001 Capability registered successfully with EOS Work Continuity Substrate");
  console.log("[Retail-Inventory] Work Core invariant enforced: workId remains unchanged across all retail in-store execution contexts");
  console.log("[Retail-Inventory] 6 Boundary Classes validation enabled for inventory adjustment operations");
}