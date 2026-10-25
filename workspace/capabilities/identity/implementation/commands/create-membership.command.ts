import type { CapabilityCommand } from "@repo/core-kernel";
import { randomUUID } from "node:crypto";
// Import 6-boundary contracts untuk compliance (canonical path untuk work-core)
import { 
  validateBoundaryAccess,
  validateAllBoundaries, 
  type IdentityBoundary, 
  type SemanticBoundary, 
  type AuthorityBoundary, 
  type ExecutionBoundary, 
  type EvidenceBoundary, 
  type PresentationBoundary 
} from "@capabilities/work-core/contracts/work.contracts.js";
import {
  MembershipId,
  type MembershipAggregate,
  type Role,
  type CreateMembershipInput,
} from "@repo/contracts-core";

// Lazy initialization untuk menghindari module cycle (Edge Runtime compatible)
async function getMembershipRepositoryLazy() {
  const { MembershipRepositoryPostgres } = await import("../repositories/index.js");
  return MembershipRepositoryPostgres;
}

function newMembershipId(): MembershipId {
  return MembershipId(`membership-${randomUUID()}`);
}

type CreateMembershipCommand = CapabilityCommand<
  CreateMembershipInput,
  {
    readonly membershipId: string;
    readonly userId: string;
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly role: Role;
  }
>;

export const createMembershipCommand: CreateMembershipCommand = {
  kind: "command",
  name: "identity.createMembership",
  version: "2.0.0", // Postgres-backed persistence

  async execute(input: CreateMembershipInput & { actorContext?: { tenantId: string; workspaceId: string; actorId: string } }) {
    // 1. Validasi 6-boundary compliance TERLEBIH DAHULU (Tahap B mandate - identity mengakses identity domain)
    if (!validateBoundaryAccess("identity", "identity")) {
      console.error("[identity.createMembership] BOUNDARY ACCESS DENIED: cannot access identity domain with invalid boundary");
      throw new Error("Boundary access violation");
    }

    // 2. Inisialisasi repository setelah validasi boundary (lazy loading untuk kompatibilitas Edge Runtime)
    const membershipRepository = await getMembershipRepositoryLazy();

    // Extract context from actorContext (canonical pattern)
    const tenantId = input.actorContext?.tenantId || input.tenantId;
    const workspaceId = input.actorContext?.workspaceId || input.workspaceId;
    const actorId = input.actorContext?.actorId || "unknown-actor";

    // Log audit untuk tracing actorContext jika disediakan
    if (input.actorContext) {
      console.log(`[identity.createMembership] Membership creation initiated by actor ${actorId} in workspace ${workspaceId}, tenant ${tenantId} for user ${input.userId}`);
    }

    // Build 6-boundary objects for validation
    const identityBoundary: IdentityBoundary = {
      tenantId,
      organizationId: "identity.enterprise-os",
      principalId: actorId,
      ownerIds: [actorId]
    };

    const semanticBoundary: SemanticBoundary = {
      domain: "identity",
      intent: "create-membership",
      currentState: "executing"
    };

    const authorityBoundary: AuthorityBoundary = {
      allowedActions: ["create"],
      restrictedFields: [],
      requesterId: actorId,
      resourceOwnerId: input.userId
    };

    const executionBoundary: ExecutionBoundary = {
      workspaceId,
      runtimeEnvironment: process.env.NODE_ENV || "development",
      executionId: `membership-${Date.now()}`,
      propagatedFrom: "api-route"
    };

    const evidenceBoundary: EvidenceBoundary = {
      evidenceRequired: true,
      evidenceRetentionPeriod: "90d",
      auditLogEnabled: true
    };

    const presentationBoundary: PresentationBoundary = {
      uiFilters: ["id", "userId", "role"],
      hideFromSurfaces: [],
      priority: "medium"
    };

    // Validate all boundaries before main logic execution
    const boundaryValidation = validateAllBoundaries({
      identity: identityBoundary,
      semantic: semanticBoundary,
      authority: authorityBoundary,
      execution: executionBoundary,
      evidence: evidenceBoundary,
      presentation: presentationBoundary
    });

    if (!boundaryValidation.valid) {
      console.error("[identity.createMembership] BOUNDARY VALIDATION FAILED:", boundaryValidation.allErrors);
      throw new Error(`Boundary validation failed: ${boundaryValidation.allErrors.join(", ")}`);
    }

    const existing = await membershipRepository.findByUserTenantAndWorkspace(
      input.userId,
      tenantId,
      { workspaceId },
    );
    if (existing !== undefined) {
      return {
        membershipId: existing.id,
        userId: existing.userId,
        tenantId: existing.tenantId,
        workspaceId: existing.workspaceId,
        role: existing.role,
      };
    }
    const entity: MembershipAggregate = {
      id: newMembershipId(),
      userId: input.userId,
      tenantId,
      workspaceId,
      role: input.role,
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await membershipRepository.save(entity);
    return {
      membershipId: entity.id,
      userId: entity.userId,
      tenantId,
      workspaceId,
      role: entity.role,
    };
  },
};