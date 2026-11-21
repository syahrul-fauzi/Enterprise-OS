// @ts-nocheck
import type { CapabilityCommand } from "@repo/core-kernel";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  TenantId,
  ActorId,
  WorkspaceId,
  type TenantAggregate,
  createTenantId,
  createActorId,
  createWorkspaceId
} from "@repo/contracts-core";
import { getNow } from "../../../../packages/core/kernel/src/utils/time-provider.js";
// Import 6-boundary contracts + WorkStatus untuk compliance (canonical path untuk work-core)
import { 
  validateBoundaryAccess,
  validateAllBoundaries, 
  type IdentityBoundary, 
  type SemanticBoundary, 
  type AuthorityBoundary, 
  type ExecutionBoundary, 
  type EvidenceBoundary, 
  type PresentationBoundary,
  WorkStatus
} from "@repo/contracts-core";
import { slugifyForTenant } from "../../../identity/implementation/services/password.service.js";

// Lazy initialization untuk menghindari module cycle (Edge Runtime compatible) - reuse identity's tenant repository
async function getTenantRepositoryLazy() {
  const { TenantRepositoryPostgres } = await import("../../../identity/implementation/repositories/index.js");
  return TenantRepositoryPostgres;
}

function newTenantId(): TenantId {
  return TenantId(`tenant-${randomUUID()}`);
}

export const ProvisionEnterpriseTenantInputSchema = z.object({
  companyName: z.string().min(1),
  companyRegistrationNumber: z.string().min(1), // NIB Indonesia (required untuk compliance)
  suggestedSlug: z.string().optional(),
  planTier: z.enum(["basic", "professional", "enterprise"]).default("enterprise"),
  ownerId: z.string().optional(),
  billingEmail: z.string().email(),
  onboardingManagerId: z.string().optional(), // dedicated account manager ID (DIGIOP-104 requirement)
});

export type ProvisionEnterpriseTenantInput = z.infer<typeof ProvisionEnterpriseTenantInputSchema>;

export type ProvisionEnterpriseTenantOutput = {
  readonly success: boolean;
  readonly tenant: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
  };
};

type ProvisionEnterpriseTenantCommand = CapabilityCommand<
  ProvisionEnterpriseTenantInput,
  ProvisionEnterpriseTenantOutput
>;

export const provisionEnterpriseTenantCommand: ProvisionEnterpriseTenantCommand = {
  kind: "command",
  name: "full-platform-integration.provisionEnterpriseTenant",
  version: "0.1.0", // Added enterprise-specific fields, Postgres-backed (reuse identity repository)

  async execute(input: ProvisionEnterpriseTenantInput & { actorContext?: { tenantId: string; workspaceId: string; actorId: string } }) {
    const TenantRepositoryPostgres = await getTenantRepositoryLazy();
    const tenantRepository = new TenantRepositoryPostgres();
    
    // Validasi akses lintas domain terlebih dahulu (6-boundary compliance - full-platform-integration -> work-core, identity, connector-ecosystem)
    if (!validateBoundaryAccess("full-platform-integration", "work-core")) {
      console.error("[full-platform-integration.provisionEnterpriseTenant] BOUNDARY ACCESS DENIED: cannot access work-core directly");
      throw new Error("Boundary access violation: domain full-platform-integration tidak diizinkan mengakses domain work-core");
    }
    
    if (!validateBoundaryAccess("full-platform-integration", "identity")) {
      console.error("[full-platform-integration.provisionEnterpriseTenant] BOUNDARY ACCESS DENIED: cannot access identity capability");
      throw new Error("Boundary access violation: domain full-platform-integration tidak diizinkan mengakses domain identity");
    }

    const parsed = ProvisionEnterpriseTenantInputSchema.parse(input);
    const { companyName, companyRegistrationNumber, suggestedSlug, planTier, ownerId, billingEmail, onboardingManagerId } = parsed;
    const actorContext = input.actorContext;
    
    // Ekstrak context dari actorContext (pattern kanonis yang sudah kita gunakan)
    const requestTenantId = actorContext?.tenantId ? createTenantId(actorContext.tenantId) : createTenantId("unknown-tenant");
    const workspaceId = actorContext?.workspaceId ? createWorkspaceId(actorContext.workspaceId) : createWorkspaceId("unknown-workspace");
    const actorId = actorContext?.actorId ? createActorId(actorContext.actorId) : createActorId("unknown-actor");
    const resourceOwnerId = ownerId ? createActorId(ownerId) : actorId;

    // Bangun 6-boundary object untuk validasi sesuai CANONICAL contract dari work-core
    // Semua field readonly dan sesuai interface canonical - tidak ada modifikasi yang melanggar boundary ownership
    const identityBoundary: IdentityBoundary = {
      tenantId: requestTenantId,
      organizationId: "full-platform-integration.enterprise-os",
      principalId: actorId,
      ownerIds: [actorId]
    };

    const semanticBoundary: SemanticBoundary = {
      domain: "full-platform-integration",
      intent: "Provisioning enterprise tenant untuk DIGIOP-104",
      currentState: "executing" as WorkStatus,
      requirements: ["terpenuhi-6boundary", "tenant-creation-success", "slug-uniqueness"],
      constraints: ["hanya-akun-enterprise-bisa-create", "permissions-terbatas"],
      decisions: [],
    };

    const authorityBoundary: AuthorityBoundary = {
      actorCapabilities: new Map([[actorId, ["full-platform-integration.provision"]]]),
      policyEnforcements: ["restrict-sensitive-fields", "tenant-isolation"],
      authorizations: new Map([[actorId, ["create-tenant"]]]),
      delegations: []
    };

    const executionBoundary: ExecutionBoundary = {
      workspaceId: workspaceId,
      runtimeEnvironment: (process.env.NODE_ENV || "development") as "web" | "agent" | "edge" | "external-system",
      executorIds: [actorId],
      executionFrame: "api"
    };

    const evidenceBoundary: EvidenceBoundary = {
      evidenceIds: [],
      evidenceChain: [{
        actorId: actorId,
        action: "initiate-tenant-provisioning",
        timestamp: getNow(),
        workspaceId: workspaceId
      }],
      outcomeVerified: false
    };

    const presentationBoundary: PresentationBoundary = {
      supportedFaces: ["api", "web", "agent"],
      defaultLayout: "enterprise-onboarding",
      mobileEnabled: true,
      apiEnabled: true,
      projectionConfig: {
        displayName: "Enterprise Tenant Provisioning",
        summary: "Pembuatan tenant enterprise untuk pelanggan Managed Digital Business Operations",
        priority: "high",
        uiFilters: ["id", "name", "slug", "planTier"],
        hideFromSurfaces: []
      }
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
      console.error("[full-platform-integration.provisionEnterpriseTenant] BOUNDARY VALIDATION FAILED:", boundaryValidation.allErrors);
      throw new Error(`Boundary validation failed: ${boundaryValidation.allErrors.join(", ")}`);
    }

    const slugBase = suggestedSlug 
      ? slugifyForTenant(suggestedSlug) 
      : slugifyForTenant(companyName);
    
    let slug = slugBase;
    
    // Check for existing slugs to ensure uniqueness (reuse logic dari identity's create-tenant-with-slug-resolution)
    let counter = 1;
    while (await tenantRepository.existsBySlug(slug)) {
      slug = `${slugBase}-${counter}`;
      counter++;
    }
    
    // Create tenant record dengan extension metadata enterprise-specific
    const tenant = await tenantRepository.create({
      name: companyName,
      slug,
      metadata: {
        companyRegistrationNumber,
        planTier,
        billingEmail,
        onboardingManagerId, // dedicated account manager dari DIGIOP-104 requirement
        provisionedAt: getNow().toISOString(),
        provisionedBy: actorId
      },
      createdAt: getNow(),
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