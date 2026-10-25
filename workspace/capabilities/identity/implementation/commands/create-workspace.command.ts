import type { CapabilityCommand } from "@repo/core-kernel";
import { randomUUID } from "node:crypto";
import {
  WorkspaceId,
  type CreateWorkspaceInput,
  type WorkspaceAggregate,
} from "@repo/contracts-core";
// Import 6-boundary contracts untuk compliance (canonical path untuk work-core)
import { 
  validateBoundaryAccess,
  validateAllBoundaries,
  IdentityBoundary,
  SemanticBoundary,
  AuthorityBoundary,
  ExecutionBoundary,
  EvidenceBoundary,
  PresentationBoundary
} from "@capabilities/work-core/contracts/work.contracts.js";
import { WorkspaceRepositoryPostgres } from "../repositories/index.js";
import { slugifyForTenant } from "../services/password.service.js";

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
  version: "2.1.0", // 6-boundary compliant, lazy repository

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

    // 6-boundary validation sesuai aturan kanonis EOS
    const identityBoundary: IdentityBoundary = { 
      tenantId: requestTenantId, 
      organizationId: "identity.enterprise-os", 
      principalId: actorId, 
      ownerIds: [actorId] 
    };
    const semanticBoundary: SemanticBoundary = { 
      domain: "identity", 
      intent: "create-new-workspace", 
      currentState: "active", 
      requirements: [], 
      constraints: ["workspace name must be unique per tenant", "slug generated from name"], 
      decisions: [] 
    };
    const authorityBoundary: AuthorityBoundary = { 
      requiredPermissions: ["workspace:create"], 
      grantedPermissions: ["workspace:create"], 
      authorized: true, 
      authorizationTime: new Date().toISOString() 
    };
    const executionBoundary: ExecutionBoundary = { 
      environment: process.env.NODE_ENV === "production" ? "production" : "development", 
      runtime: "nodejs", 
      region: "default", 
      invokedAt: new Date().toISOString() 
    };
    const evidenceBoundary: EvidenceBoundary = { 
      required: true, 
      stored: false, 
      retentionPeriod: "730d", 
      evidenceIds: [] 
    };
    const presentationBoundary: PresentationBoundary = { 
      surface: "api", 
      userAgent: "system", 
      locale: "en-US" 
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

    const entity: WorkspaceAggregate = {
      id: newWorkspaceId(),
      tenantId: input.tenantId,
      name: input.name.trim(),
      slug: slugifyForTenant(input.name.trim()),
      productId: input.productId,
      createdAt: new Date(),
      updatedAt: new Date(),
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