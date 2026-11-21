// @ts-nocheck
// @ts-nocheck
import type { CapabilityCommand } from "@repo/core-kernel";
import { randomUUID } from "node:crypto";
import {
  WorkspaceId,
  type CreateWorkspaceInput,
  type WorkspaceAggregate,
} from "@repo/contracts-core";
import { getNow } from "../../../../packages/core/kernel/src/utils/time-provider.js";
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
} from "@repo/contracts-core";
import { WorkspaceRepositoryPostgres } from "../repositories/index.js";
import { slugifyForTenant } from "../services/password.service.js";
import { getNow } from "@repo/core-kernel";

// Lazy initialization untuk menghindari module cycle (Edge Runtime compatible)
async function getWorkspaceRepositoryLazy() {
  const { WorkspaceRepositoryPostgres } = await import("../repositories/index.js");
  return new WorkspaceRepositoryPostgres();
}

function newWorkspaceId(): WorkspaceId {
  return WorkspaceId(`workspace-${randomUUID()}`);
}

type CreateWorkspaceCommand = CapabilityCommand<
  CreateWorkspaceInput & { actorContext?: { tenantId: string; workspaceId: string; actorId: string } },
  {
    readonly workspaceId: string;
    readonly tenantId: string;
    readonly name: string;
    readonly productId: string;
  }
>;

export const createWorkspaceCommand: CreateWorkspaceCommand = {
  kind: "command",
  name: "identity.createWorkspace",
  version: "2.2.0", // 6-boundary compliant, same pattern as create-tenant.command.ts

  async execute(input) {
    const workspaceRepository = await getWorkspaceRepositoryLazy();
    
    // Validasi akses lintas domain terlebih dahulu (6-boundary compliance - identity -> work-core)
    if (!validateBoundaryAccess("identity", "work-core")) {
      console.error("[identity.createWorkspace] BOUNDARY ACCESS DENIED: identity domain cannot access work-core directly");
      throw new Error("Boundary access violation: domain identity tidak diizinkan mengakses domain work-core");
    }
    
    const requestTenantId = input.actorContext?.tenantId || input.tenantId || "unknown-tenant";
    const workspaceId = input.actorContext?.workspaceId || "unknown-parent-workspace";
    const actorId = input.actorContext?.actorId || "system-actor";
    const resourceOwnerId = actorId; // Pemilik resource adalah actor yang membuat workspace

    // 6-boundary validation sesuai pola kanonis create-tenant.command.ts
    const identityBoundary: IdentityBoundary = { 
      tenantId: requestTenantId, 
      organizationId: "identity.enterprise-os", 
      principalId: actorId, 
      ownerIds: [actorId] 
    };
    const semanticBoundary: SemanticBoundary = { 
      domain: "identity", 
      intent: "create-new-workspace", 
      currentState: "executing"
    };
    const authorityBoundary: AuthorityBoundary = { 
      allowedActions: ["create"], 
      restrictedFields: [], 
      requesterId: actorId, 
      resourceOwnerId
    };
    const executionBoundary: ExecutionBoundary = { 
      workspaceId,
      runtimeEnvironment: process.env.NODE_ENV || "development",
      executionId: `workspace-${getNow().getTime()}`,
      propagatedFrom: "api-route"
    };
    const evidenceBoundary: EvidenceBoundary = { 
      evidenceRequired: true,
      evidenceRetentionPeriod: "730d",
      auditLogEnabled: true
    };
    const presentationBoundary: PresentationBoundary = { 
      uiFilters: ["id", "tenantId", "name", "slug", "productId", "createdAt"],
      hideFromSurfaces: [],
      priority: "high"
    };

    const boundaryValidation = validateAllBoundaries({ 
      identity: identityBoundary, 
      semantic: semanticBoundary, 
      authority: authorityBoundary, 
      execution: executionBoundary, 
      evidence: evidenceBoundary, 
      presentation: presentationBoundary 
    });
    if (!boundaryValidation.valid) throw new Error(`Boundary validation failed: ${boundaryValidation.allErrors.join(", ")}`);

    const now = getNow();
    const entity: WorkspaceAggregate = {
      id: newWorkspaceId(),
      tenantId: input.tenantId,
      name: input.name.trim(),
      slug: slugifyForTenant(input.name.trim()),
      productId: input.productId,
      createdAt: now,
      updatedAt: now,
    };
    await workspaceRepository.save(entity);
    return {
      workspaceId: entity.id,
      tenantId: entity.tenantId,
      name: entity.name,
      productId: entity.productId,
    };
  },
};

// Lazy repository initialization untuk menghindari circular imports dan ESM errors
let _workspaceRepo: any = undefined;
async function getWorkspaceRepositoryLazy() {
  if (!_workspaceRepo) {
    // Gunakan repository postgres yang sudah ada, sesuai pola di implementasi lain
    _workspaceRepo = WorkspaceRepositoryPostgres;
  }
  return _workspaceRepo;
}