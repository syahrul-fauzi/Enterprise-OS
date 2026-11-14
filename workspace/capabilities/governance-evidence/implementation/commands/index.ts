// @ts-nocheck
import type { CapabilityCommand } from "@repo/core-kernel";
import { governanceEvidenceService } from "../services/governance-evidence.service.js";

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
      return governanceEvidenceService.getAuditReport();
    }
  },
  "governance-evidence.record": {
    kind: "command",
    name: "Record Governance Evidence Entry",
    capability: "governance-evidence",
    execute: async (input: {
      workId: string;
      entry: any;
      tenantId: string;
      workspaceId: string;
      actorId: string;
    }) => {
      await governanceEvidenceService.addEvidence(input.workId, {
        ...input.entry,
        recordedAt: new Date().toISOString(),
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        source: "governance-evidence.record"
      });
      return { success: true, workId: input.workId, recorded: true };
    }
  },
  "governance-evidence.archive": {
    kind: "command",
    name: "Archive Governance Evidence",
    capability: "governance-evidence",
    execute: async (input: {
      workId: string;
      actorId: string;
      tenantId: string;
      workspaceId: string;
      archiveReason?: string;
    }) => {
      await governanceEvidenceService.addEvidence(input.workId, {
        type: "evidence-archived",
        workId: input.workId,
        actorId: input.actorId,
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        archiveReason: input.archiveReason || "work-completed",
        archivedAt: new Date().toISOString(),
        source: "governance-evidence.archive"
      });
      return { success: true, workId: input.workId, archived: true };
    }
  },
  "governance-evidence.recordRevenue": {
    kind: "command",
    name: "Record Commercial Revenue Entry",
    capability: "governance-evidence",
    execute: async (input: Parameters<typeof governanceEvidenceService.addRevenueTrackingEntry>[1]) => {
      await governanceEvidenceService.addRevenueTrackingEntry(input.workId, input);
      return { success: true, workId: input.workId, revenueRecorded: true, amount: input.grossAmount };
    }
  },
  "governance-evidence.getRevenueSummary": {
    kind: "command",
    name: "Get Product Revenue Summary",
    capability: "governance-evidence",
    execute: async (input: { productId: string }) => {
      return governanceEvidenceService.getRevenueSummary(input.productId);
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