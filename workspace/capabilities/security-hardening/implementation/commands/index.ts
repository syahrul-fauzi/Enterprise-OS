import type { CapabilityCommand } from "../../../../packages/core/kernel/src/index.js";
import type { AuthorizationDecision, EosScope } from "../contracts/security-hardening.contracts.js";

// Define security-hardening commands aligned with existing service capabilities
const securityHardeningCommands: Readonly<Record<string, CapabilityCommand>> = {
  "security-hardening.getConfigSummary": {
    id: "security-hardening.getConfigSummary",
    name: "Get Security Configuration Summary",
    description: "Retrieve current security configuration including strict mode status",
    capabilityId: "security-hardening",
    requiredRoles: ["system", "admin"],
    execute: async () => {
      const { SecurityHardeningService } = await import("../services/security-hardening.service.js");
      const service = new SecurityHardeningService();
      return service.getConfigSummary();
    }
  },
  "security-hardening.authorize": {
    id: "security-hardening.authorize",
    name: "Authorize Request",
    description: "Validate request authorization against security policies",
    capabilityId: "security-hardening",
    requiredRoles: ["system"],
    execute: async (request: Request, scope: EosScope): Promise<AuthorizationDecision> => {
      const { SecurityHardeningService } = await import("../services/security-hardening.service.js");
      const service = new SecurityHardeningService();
      return service.authorize(request, scope);
    }
  }
} as const;

// Register security-hardening capability with capability registry (follows identity-core/work-core pattern)
export function registerSecurityHardeningCapability() {
  // Enable command registration even in test/standalone environments to support test execution
  if (typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.STANDALONE === 'true')) {
    console.log("[Security-Hardening] Test/standalone environment detected - enabling safe auto-registration");
    // Register all commands in securityHardeningCommands for test environment
    import("@repo/core-kernel/registry/capability-command-registry").then(({ capabilityRegistry }) => {
      if (capabilityRegistry) {
        securityHardeningCommands.forEach((command) => {
          capabilityRegistry.register(command);
        });
        console.log("[Security-Hardening] All test commands registered successfully");
      }
    });
    return;
  }
  // Register all commands in securityHardeningCommands
  import("@repo/core-kernel/registry/capability-command-registry").then(({ capabilityRegistry }) => {
    if (capabilityRegistry) {
      Object.values(securityHardeningCommands).forEach((command) => {
        capabilityRegistry.register(command);
      });
      console.log("[Security-Hardening] AUDIT-001-005: Security-Hardening capability registered successfully");
    }
  }).catch(err => {
    console.error("[Security-Hardening] AUDIT-001-005: Failed to register security-hardening capability:", err);
  });
}

export { securityHardeningCommands };