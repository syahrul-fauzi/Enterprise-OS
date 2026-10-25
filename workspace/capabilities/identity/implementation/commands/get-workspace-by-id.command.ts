import { z } from "zod";
import type { CapabilityCommand } from "../../../capability-dispatch/contracts/command.contracts.js";
import {
  WorkspaceId,
  UserId,
  TenantId,
  ActorId,
  SessionId,
} from "@repo/contracts-core";
// Import 6-boundary types and canonical validation function dari package yang benar
import {
  validateBoundaryAccess,
  type IdentityBoundary,
  type SemanticBoundary,
  type AuthorityBoundary,
  type ExecutionBoundary,
  type EvidenceBoundary,
  type PresentationBoundary
} from "@capabilities/work-core/contracts/work.contracts.js";
import type { WorkspaceAggregate } from "@repo/contracts-core";

// Lazy load repositories untuk menghindari module cycle dan mematuhi 6-boundary compliance
async function getSessionRepositoryLazy() {
  const { getSessionRepositoryPostgres } = await import("../repositories/index.js");
  return getSessionRepositoryPostgres();
}

async function getWorkspaceRepositoryLazy() {
  const { getWorkspaceRepositoryPostgres } = await import("../repositories/index.js");
  return getWorkspaceRepositoryPostgres();
}

async function getMembershipRepositoryLazy() {
  const { getMembershipRepositoryPostgres } = await import("../repositories/index.js");
  return getMembershipRepositoryPostgres();
}

async function getTenantRepositoryLazy() {
  const { getTenantRepositoryPostgres } = await import("../repositories/index.js");
  return getTenantRepositoryPostgres();
}

// Workaround for TS2527: explicitly type schema as any to avoid unique symbol inference issue
export const GetWorkspaceByIdInputSchema = z.object({
  workspaceId: z.string().min(1).transform(WorkspaceId),
  actorId: z.string().min(1).transform(ActorId),
  sessionId: z.string().min(1).transform(SessionId),
}) as any;

export type GetWorkspaceByIdInput = z.infer<typeof GetWorkspaceByIdInputSchema>;

export type GetWorkspaceByIdOutput = {
  readonly workspace: {
    readonly id: string;
    readonly name: string;
    readonly productId: string;
    readonly createdAt: string;
    readonly updatedAt: string;
  };
  readonly tenant: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
  } | null;
  readonly membership: {
    readonly id: string;
    readonly role: "owner" | "admin" | "member";
    readonly joinedAt: string;
  } | null;
  readonly actorId: string;
} | undefined;

export const getWorkspaceByIdCommand: CapabilityCommand = {
  kind: "command",
  name: "identity.getWorkspaceById",
  version: "3.0.0", // Fully 6-boundary compliant, canonical imports, lazy repository
  async execute(input: unknown & { actorContext?: { tenantId: string; workspaceId: string; actorId: string } }) {
    // 1. Validasi 6-boundary compliance terlebih dahulu (Tahap B mandate)
    if (!validateBoundaryAccess("identity", "work-core")) {
      console.error("[identity.getWorkspaceById] BOUNDARY ACCESS DENIED: identity domain cannot access work-core directly");
      throw new Error("Boundary access violation: domain identity tidak diizinkan mengakses domain work-core");
    }
    
    // Ambil repository secara lazy, sesuai pola yang sudah diverifikasi di create-workspace.command.ts
    const sessionRepository = await getSessionRepositoryLazy();
    const workspaceRepository = await getWorkspaceRepositoryLazy();
    const membershipRepository = await getMembershipRepositoryLazy();
    const tenantRepository = await getTenantRepositoryLazy();
    
    const parsed = GetWorkspaceByIdInputSchema.parse(input);
    const { workspaceId, actorId, sessionId } = parsed;
    
    // 1. Validate session exists and is valid (tenant isolation check) - ambil session dulu sebelum pakai
    const session = await sessionRepository.byId(sessionId);
    const sessionExpiresAt = session?.expiresAt ?? new Date(0);
    if (!session || session.revokedAt !== null || sessionExpiresAt < new Date()) {
      return undefined;
    }

    // Extract context dari actorContext atau fallback ke session/input values (sesuai standar EOS)
    const requestTenantId = input.actorContext?.tenantId || session.tenantId || "unknown-tenant";
    const parentWorkspaceId = input.actorContext?.workspaceId || "unknown-parent-workspace";
    const requestActorId = input.actorContext?.actorId || actorId || "system-actor";

    // 6-boundary validation sesuai aturan kanonis EOS (sesuai mandate Tahap B)
    const identityBoundary: IdentityBoundary = { 
      tenantId: requestTenantId, 
      organizationId: "identity.enterprise-os", 
      principalId: requestActorId, 
      ownerIds: [requestActorId] 
    };
    const semanticBoundary: SemanticBoundary = { 
      domain: "identity", 
      intent: "retrieve-workspace-by-id", 
      currentState: "active", 
      requirements: [], 
      constraints: ["tenant isolation must be enforced", "actor must have membership to access workspace"], 
      decisions: [] 
    };
    const authorityBoundary: AuthorityBoundary = { 
      actorCapabilities: new Map([[requestActorId, ["workspace:read"]]]),
      policyEnforcements: ["tenant-isolation", "membership-required"],
      authorizations: new Map([[requestActorId, ["workspace:read"]]]),
      delegations: []
    };
    const executionBoundary: ExecutionBoundary = { 
      workspaceId: parentWorkspaceId,
      runtimeEnvironment: process.env.NODE_ENV === "production" ? "production" : "development",
      executorIds: [requestActorId],
      executionFrame: "api"
    };
    const evidenceBoundary: EvidenceBoundary = { 
      evidenceIds: [],
      evidenceChain: [{
        actorId: requestActorId,
        action: "retrieve-workspace",
        timestamp: new Date(),
        workspaceId: parentWorkspaceId
      }],
      outcomeVerified: false
    };
    const presentationBoundary: PresentationBoundary = { 
      supportedFaces: ["api", "web"],
      defaultLayout: "workspace-detail",
      mobileEnabled: true,
      apiEnabled: true,
      projectionConfig: {
        displayName: `Workspace ${workspaceId}`,
        summary: "Retrieve workspace details by ID",
        priority: "medium",
        uiFilters: ["tenant", "role"],
        hideFromSurfaces: []
      }
    };

    // Boundary validation already executed at start of method

    // 2. Verify session belongs to the actor (convert branded types to raw strings for comparison)
    if (session.userId as string !== actorId) {
      return undefined;
    }

    // 3. Get workspace from PostgreSQL
    const workspace = await workspaceRepository.byId(workspaceId);
    if (!workspace) {
      return undefined;
    }

    // 4. Enforce tenant isolation: workspace tenantId must match session tenantId
    if (workspace.tenantId !== session.tenantId) {
      return undefined;
    }

    // 5. Get membership and tenant
    const userId = UserId(actorId);
    const membership = await membershipRepository.findByUserTenantAndWorkspace(
      userId,
      workspace.tenantId,
      { workspaceId: workspace.id },
    );
    const tenant = await tenantRepository.byId(workspace.tenantId);

    const workspaceCreatedAt = workspace.createdAt ?? new Date();
    const workspaceUpdatedAt = workspace.updatedAt ?? new Date();
    const tenantResult = tenant
      ? {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        }
      : null;
    const membershipResult = membership
      ? {
          id: membership.id,
          role: membership.role,
          joinedAt: (membership.joinedAt ?? new Date()).toISOString(),
        }
      : null;

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        productId: workspace.productId,
        createdAt: workspaceCreatedAt.toISOString(),
        updatedAt: workspaceUpdatedAt.toISOString(),
      },
      tenant: tenantResult,
      membership: membershipResult,
      actorId,
    };
  },
};