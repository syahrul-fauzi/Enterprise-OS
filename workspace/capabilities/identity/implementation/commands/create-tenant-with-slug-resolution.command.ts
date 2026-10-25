import type { CapabilityCommand } from "@repo/core-kernel";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  TenantId,
  UserId,
  type TenantAggregate,
} from "@repo/contracts-core";
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
import { initIdentitySchema } from "../repositories/base.repository.js";
import { slugifyForTenant } from "../services/password.service.js";

// Lazy initialization untuk menghindari module cycle (Edge Runtime compatible)
async function getTenantRepositoryLazy() {
  const { TenantRepositoryPostgres } = await import("../repositories/index.js");
  return TenantRepositoryPostgres;
}

function newTenantId(): TenantId {
  return TenantId(`tenant-${randomUUID()}`);
}

export const CreateTenantWithSlugResolutionInputSchema = z.object({
  name: z.string().min(1),
  suggestedSlug: z.string().optional(),
  ownerId: z.string().optional(),
});

export type CreateTenantWithSlugResolutionInput = z.infer<typeof CreateTenantWithSlugResolutionInputSchema>;

export type CreateTenantWithSlugResolutionOutput = {
  readonly tenantId: string;
  readonly name: string;
  readonly slug: string;
  readonly createdAt: string;
};

type CreateTenantWithSlugResolutionCommand = CapabilityCommand<
  CreateTenantWithSlugResolutionInput,
  CreateTenantWithSlugResolutionOutput
>;

export const createTenantWithSlugResolutionCommand: CreateTenantWithSlugResolutionCommand = {
  kind: "command",
  name: "identity.createTenantWithSlugResolution",
  version: "2.1.0", // Added ownerId support, Postgres-backed

  async execute(input: CreateTenantWithSlugResolutionInput & { actorContext?: { tenantId: string; workspaceId: string; actorId: string } }) {
    const tenantRepository = await getTenantRepositoryLazy();
    await initIdentitySchema();
    
    // Validasi akses lintas domain terlebih dahulu (6-boundary compliance - identity -> work-core)
    if (!validateBoundaryAccess("identity", "work-core")) {
      console.error("[identity.createTenantWithSlugResolution] BOUNDARY ACCESS DENIED: identity domain cannot access work-core directly");
      throw new Error("Boundary access violation: domain identity tidak diizinkan mengakses domain work-core");
    }
    
    const parsed = CreateTenantWithSlugResolutionInputSchema.parse(input);
    const { name, suggestedSlug, ownerId } = parsed;
    const actorContext = input.actorContext;
    
    // Ekstrak context dari actorContext (pattern kanonis yang sudah kita gunakan)
    const requestTenantId = actorContext?.tenantId || "unknown-tenant";
    const workspaceId = actorContext?.workspaceId || "unknown-workspace";
    const actorId = actorContext?.actorId || "unknown-actor";
    const resourceOwnerId = ownerId || actorId;

    // Bangun 6-boundary object untuk validasi sesuai requirement EOS
    const identityBoundary: IdentityBoundary = {
      tenantId: requestTenantId,
      organizationId: "identity.enterprise-os",
      principalId: actorId,
      ownerIds: [actorId]
    };

    const semanticBoundary: SemanticBoundary = {
      domain: "identity",
      intent: "create-tenant-with-slug-resolution",
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
      executionId: `tenant-${Date.now()}`,
      propagatedFrom: "api-route"
    };

    const evidenceBoundary: EvidenceBoundary = {
      evidenceRequired: true,
      evidenceRetentionPeriod: "90d",
      auditLogEnabled: true
    };

    const presentationBoundary: PresentationBoundary = {
      uiFilters: ["id", "name", "slug", "createdAt"],
      hideFromSurfaces: [],
      priority: "high"
    };

    // Validasi semua boundary sebelum eksekusi logic utama
    const boundaryValidation = validateAllBoundaries({
      identity: identityBoundary,
      semantic: semanticBoundary,
      authority: authorityBoundary,
      execution: executionBoundary,
      evidence: evidenceBoundary,
      presentation: presentationBoundary
    });

    if (!boundaryValidation.valid) {
      console.error("[identity.createTenantWithSlugResolution] BOUNDARY VALIDATION FAILED:", boundaryValidation.allErrors);
      throw new Error(`Boundary validation failed: ${boundaryValidation.allErrors.join(", ")}`);
    }

    const slugBase = suggestedSlug 
      ? slugifyForTenant(suggestedSlug) 
      : slugifyForTenant(name);
    
    let slug = slugBase;
    
    // Lazy initialize repository to avoid circular imports
    const { TenantRepositoryPostgres } = await import("../repositories/index.js");
    const tenantRepository = new TenantRepositoryPostgres();
    
    // Check for existing slugs to ensure uniqueness
    let counter = 1;
    while (await tenantRepository.existsBySlug(slug)) {
      slug = `${slugBase}-${counter}`;
      counter++;
    }
    
    // Create tenant record
    const tenant = await tenantRepository.create({
      name,
      slug,
      metadata: input.metadata || {},
      createdAt: new Date(),
      createdBy: actorId
    });
    
    return {
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug
      }
    };
  }
};