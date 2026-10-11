import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import { complianceCaseCommands } from "../commands/index";
// Future: add complianceCaseQueries import jika ada queries di masa depan

export function registerInvestmentComplianceCapability() {
  // Register all commands for investment-compliance capability (ILC-004)
  Object.entries(complianceCaseCommands).forEach(([name, command]) => {
    capabilityRegistry.registerCommand("investment-compliance", name, command);
  });
  
  // Future: register queries jika ditambahkan
  // Object.entries(complianceCaseQueries).forEach(([name, query]) => {
  //   capabilityRegistry.registerQuery("investment-compliance", name, query);
  // });
  
  console.log("[Investment-Compliance] ILC-004 Capability registered successfully with EOS Work Continuity Substrate");
}