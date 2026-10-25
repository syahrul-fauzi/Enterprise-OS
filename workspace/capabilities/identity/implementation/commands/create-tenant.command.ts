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
  TenantId,
  type CreateTenantInput,
  type TenantAggregate,
} from "@repo/contracts-core";
import { initIdentitySchema } from "../repositories/base.repository.js";

// Lazy initialization untuk menghindari module cycle (Edge Runtime compatible)
async function getTenantRepositoryLazy() {
  const { TenantRepositoryPostgres } = await import("../repositories/index.js");
  return TenantRepositoryPostgres;
}

function newTenantId(): TenantId {
  return TenantId(`tenant-${randomUUID()}`);
}

type CreateTenantCommand = CapabilityCommand<
  CreateTenantInput,
  { readonly tenantId: string; readonly name: string; readonly slug: string }
>;

export const createTenantCommand: CreateTenantCommand = {
  kind: "command",
  name: "identity.createTenant",
  version: "2.0.0", // Postgres-backed persistence

  async execute(input: CreateTenantInput & { actorContext?: { tenantId: string; workspaceId: string; actorId: string } }) {
    // 1. Validasi 6-boundary compliance TERLEBIH DAHULU (Tahap B mandate - identity mengakses identity domain)
    if (!validateBoundaryAccess("identity", "identity")) {
      console.error("[identity.createTenant] BOUNDARY ACCESS DENIED: cannot access identity domain with invalid boundary");
      throw new Error("Boundary access violation");
    }

    // 2. Inisialisasi repository dan schema setelah validasi boundary (lazy loading untuk kompatibilitas Edge Runtime)
    const tenantRepository = await getTenantRepositoryLazy();
    await initIdentitySchema();
    
    // Log audit untuk tracing actorContext jika disediakan (wajib compliance audit)
    if (input.actorContext) {
      const actorId = input.actorContext.actorId;
      const workspaceId = input.actorContext.workspaceId;
      const tenantId = input.actorContext.tenantId;
      console.log(`[identity.createTenant] Tenant creation initiated by actor ${actorId} in workspace ${workspaceId}, tenant ${tenantId} with name: ${input.name}`);
    }
    
    // Extract context from actorContext (canonical pattern yang sudah terbukti)
    const requestTenantId = input.actorContext?.tenantId || "unknown-tenant";
    const workspaceId = input.actorContext?.workspaceId || "unknown-workspace";
    const actorId = input.actorContext?.actorId || "unknown-actor";
    const resourceOwnerId = actorId; // Pemilik resource adalah actor yang membuat tenant

    // Bangun 6-boundary object untuk validasi sesuai EOS requirements
    const identityBoundary: IdentityBoundary = {
      tenantId: requestTenantId,
      organizationId: "identity.enterprise-os",
      principalId: actorId,
      ownerIds: [actorId]
    };

    const semanticBoundary: SemanticBoundary = {
      domain: "identity",
      intent: "create-tenant",
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
      console.error("[identity.createTenant] BOUNDARY VALIDATION FAILED:", boundaryValidation.allErrors);
      throw new Error(`Boundary validation failed: ${boundaryValidation.allErrors.join(", ")}`);
    }

    const slug = input.slug.trim().toLowerCase();
    const existing = await tenantRepository.bySlug(slug);
    if (existing !== undefined) {
      throw new Error(`[identity.createTenant] Slug already taken: ${slug}`);
    }
    // Jika input berisi metadata.compliancePolicies (khusus ACaaS PILOT), tetap pertahankan
    const entity: TenantAggregate = {
      id: newTenantId(),
      name: input.name.trim(),
      slug,
      metadata: input.metadata, // Pertahankan metadata jika disediakan (khusus konfigurasi policy ACaaS)
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await tenantRepository.save(entity);
    return {
      tenantId: entity.id,
      name: entity.name,
      slug: entity.slug,
    };
  },
};