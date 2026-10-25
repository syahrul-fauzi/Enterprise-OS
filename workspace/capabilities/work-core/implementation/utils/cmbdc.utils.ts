import type { ActorId, WorkspaceId, TenantId, ExecutionFrame } from "@capabilities/work-core/contracts/work.contracts";

// Canonical CMBCD (Actor+Capability+Authority+Context+Risk+Evidence) execution frame calculator
// Shared across all vertical slices to enforce consistent execution boundary logic
// Implements user mandate: Actor + Capability + Authority + Context + Risk + Evidence → Capability Boundary → Connection Medium → Execution
export function calculateExecutionFrame(
  actorMetadata: {
    actorId: ActorId;
    actorType: "human" | "ai-agent" | "external-service" | "organization" | "machine";
    role: string;
    displayName: string;
    trustLevel: "verified" | "certified" | "unverified";
  },
  authorization: {
    allowedActions: readonly string[];
    restrictedFields: readonly string[];
  },
  context: {
    tenantId: TenantId;
    workspaceId?: WorkspaceId | undefined;
    jurisdiction: string;
    requestCategory: string;
    sensitivityLevel: "public" | "internal" | "confidential" | "restricted";
    relatedWorkIds: readonly string[];
  },
  riskAssessment: {
    level: "low" | "medium" | "high" | "critical";
    rationale: string;
    assessedBy: ActorId;
    assessedAt: Date;
  }
): ExecutionFrame {
  // 1. First evaluate risk level (primary driver for execution constraints)
  if (riskAssessment.level === "critical" || context.sensitivityLevel === "restricted") {
    // High risk/restricted data requires human-only direct execution
    if (actorMetadata.actorType === "human" && actorMetadata.trustLevel === "verified") {
      return "direct";
    }
    // Non-verified humans or any AI/service on critical risk = constrained GUI only
    return "constrained-gui";
  }

  // 2. Evaluate actor type and trust level
  if (actorMetadata.actorType === "human") {
    if (actorMetadata.trustLevel === "verified" || actorMetadata.trustLevel === "certified") {
      // Verified humans get direct execution
      return "direct";
    }
    // Unverified humans get constrained GUI
    return "constrained-gui";
  }

  if (actorMetadata.actorType === "ai-agent") {
    if (actorMetadata.trustLevel === "certified" && riskAssessment.level === "low") {
      // Certified AI with low risk can use proxy execution
      return "proxy";
    }
    // All other AI agents get constrained GUI only
    return "constrained-gui";
  }

  if (actorMetadata.actorType === "external-service" || actorMetadata.actorType === "machine") {
    if (actorMetadata.trustLevel === "certified" && authorization.allowedActions.length <= 2) {
      // Certified external services/machines with limited permissions use MCP
      return "mcp";
    }
    // Uncertified or over-permissive external actors = blocked (constrained-gui as fallback)
    return "constrained-gui";
  }

  // Default fallback: constrained GUI for any unhandled case
  return "constrained-gui";
}