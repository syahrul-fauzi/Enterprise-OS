import type { CapabilityCommand } from "../../../../packages/core/kernel/src/types.js";

// Define trust-framework commands (reuse existing service contracts)
const trustFrameworkCommands: Readonly<Record<string, CapabilityCommand>> = {
  // Core trust framework commands aligned with service capabilities
  "trust-framework.getCatalog": {
    kind: "command",
    name: "Get Trust Framework Catalog",
    capability: "trust-framework",
    execute: async () => {
      const { trustFrameworkService } = await import("../services/trust-framework.service.js");
      return trustFrameworkService.getFrameworkCatalog();
    }
  },
  "trust-framework.getFramework": {
    kind: "command",
    name: "Get Trust Framework by ID",
    capability: "trust-framework",
    execute: async (frameworkId: string) => {
      const { trustFrameworkService } = await import("../services/trust-framework.service.js");
      return trustFrameworkService.getFramework(frameworkId);
    }
  }
} as const;

// Register trust-framework capability with capability registry (follows identity-core/work-core pattern)
export function registerTrustFrameworkCapability() {
  // Skip registration in test/standalone environments to avoid capabilityRegistry method errors
  if (typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.STANDALONE === 'true')) {
    console.log("[Trust-Framework] Test/standalone environment detected - skipping auto-registration");
    return;
  }
  // Register all commands in trustFrameworkCommands - import directly from registry file per kernel's server-only boundary
  import("../../../../packages/core/kernel/src/registry/capability-command-registry.js").then(({ capabilityRegistry }) => {
    if (capabilityRegistry) {
      Object.values(trustFrameworkCommands).forEach((command) => {
        capabilityRegistry.register(command);
      });
      console.log("[Trust-Framework] Capability registered successfully - all commands added to capability registry");
    }
  }).catch(err => {
    console.error("[Trust-Framework] Failed to register trust framework capability:", err);
  });
}

export { trustFrameworkCommands };