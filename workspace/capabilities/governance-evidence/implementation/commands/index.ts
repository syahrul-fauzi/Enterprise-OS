import type { CapabilityCommand } from "../../../../packages/core/kernel/src/types.js";

// Define governance-evidence commands aligned with existing service capabilities
const governanceEvidenceCommands: Readonly<Record<string, CapabilityCommand>> = {
  "governance-evidence.getArtifactCatalog": {
    kind: "command",
    name: "Get Governance Evidence Artifact Catalog",
    capability: "governance-evidence",
    execute: async () => {
      const { governanceEvidenceArtifactCatalog } = await import("../services/governance-evidence.service.js");
      return governanceEvidenceArtifactCatalog;
    }
  },
  "governance-evidence.getAuditReport": {
    kind: "command",
    name: "Get Governance Audit Report",
    capability: "governance-evidence",
    execute: async () => {
      const { governanceEvidenceService } = await import("../services/governance-evidence.service.js");
      return governanceEvidenceService.getAuditReport();
    }
  }
} as const;

// Register governance-evidence capability with capability registry (follows identity-core/work-core pattern)
export function registerGovernanceEvidenceCapability() {
  // Enable command registration even in test/standalone environments to support test execution
  if (typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.STANDALONE === 'true')) {
    console.log("[Governance-Evidence] Test/standalone environment detected - enabling safe auto-registration");
    // Register all commands in governanceEvidenceCommands for test environment
    import("@repo/core-kernel/registry/capability-command-registry").then(({ capabilityRegistry }) => {
      if (capabilityRegistry) {
        governanceEvidenceCommands.forEach((command) => {
          capabilityRegistry.register(command);
        });
        console.log("[Governance-Evidence] All test commands registered successfully");
      }
    });
    return;
  }
  // Register all commands in governanceEvidenceCommands
  import("@repo/core-kernel/registry/capability-command-registry").then(({ capabilityRegistry }) => {
    if (capabilityRegistry) {
      Object.values(governanceEvidenceCommands).forEach((command) => {
        capabilityRegistry.register(command);
      });
      console.log("[Governance-Evidence] AUDIT-001-005: Governance-Evidence capability registered successfully");
    }
  }).catch(err => {
    console.error("[Governance-Evidence] AUDIT-001-005: Failed to register governance-evidence capability:", err);
  });
}

export { governanceEvidenceCommands };