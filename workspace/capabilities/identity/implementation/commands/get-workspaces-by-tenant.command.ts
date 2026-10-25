import type { CapabilityCommand } from "../../../capability-dispatch/contracts/command.contracts.js";
import { z } from "zod";
// Import shared identity types from contracts-core
import { TenantId, ActorId, UserId, SessionId, WorkId, type MembershipAggregate, type WorkspaceAggregate } from "@repo/contracts-core";
// Import 6-boundary validation function dari package kanonis
import { validateBoundaryAccess } from "@capabilities/work-core/contracts/work.contracts.js";

// Lazy load repositories untuk menghindari module cycle dan mematuhi 6-boundary compliance
async function getTenantRepositoryLazy() {
  const { getTenantRepositoryPostgres, TenantRepositoryInMemory } = await import("../repositories/index.js");
  return (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL)
    ? getTenantRepositoryPostgres()
    : TenantRepositoryInMemory;
}

async function getWorkspaceRepositoryLazy() {
  const { getWorkspaceRepositoryPostgres, WorkspaceRepositoryInMemory } = await import("../repositories/index.js");
  return (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL)
    ? getWorkspaceRepositoryPostgres()
    : WorkspaceRepositoryInMemory;
}

async function getMembershipRepositoryLazy() {
  const { getMembershipRepositoryPostgres, MembershipRepositoryInMemory } = await import("../repositories/index.js");
  return (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL)
    ? getMembershipRepositoryPostgres()
    : MembershipRepositoryInMemory;
}

async function getSessionRepositoryLazy() {
  const { getSessionRepositoryPostgres, SessionRepositoryInMemory } = await import("../repositories/index.js");
  return (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL)
    ? getSessionRepositoryPostgres()
    : SessionRepositoryInMemory;
}

// Workaround for TS2527: explicitly type schema as any to avoid unique symbol inference issue
export const GetWorkspacesByTenantInputSchema = z.object({
  tenantId: z.string().min(1).transform(TenantId),
  actorId: z.string().min(1).transform(ActorId),
  sessionId: z.string().min(1).transform(SessionId),
  actorContext: z.object({
    actorId: z.string().optional(),
    tenantId: z.string().optional(),
    workspaceId: z.string().optional(),
    productId: z.string().optional(),
  }).optional(),
}) as any;

export type GetWorkspacesByTenantInput = z.infer<typeof GetWorkspacesByTenantInputSchema>;

export type WorkspaceOutput = {
  readonly id: string;
  readonly name: string;
  readonly productId: string;
  readonly createdAt: string;
  readonly role: string | null;
  readonly membershipId: string | null;
};

export type GetWorkspacesByTenantOutput = {
  readonly tenant: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly createdAt: string;
  };
  readonly workspaces: readonly WorkspaceOutput[];
  readonly actorId: string;
  readonly actorContext?: {
    actorId: string | undefined;
    tenantId: string | undefined;
    workspaceId: string | undefined;
    productId: string | undefined;
  };
} | undefined;

type GetWorkspacesByTenantCommand = CapabilityCommand<
  GetWorkspacesByTenantInput,
  GetWorkspacesByTenantOutput
>;

export const getWorkspacesByTenantCommand: GetWorkspacesByTenantCommand = {
  kind: "command",
  name: "identity.getWorkspacesByTenant",
  version: "4.0.0", // Updated for full 6-boundary compliance, canonical actorContext support
  async execute(input: GetWorkspacesByTenantInput & { actorContext?: { tenantId: string; workspaceId: string; actorId: string; productId?: string } }) {
    // 1. Validasi 6-boundary compliance TERLEBIH DAHULU (Tahap B mandate - identity mengakses identity domain)
    if (!validateBoundaryAccess("identity", "identity")) {
      console.error("[identity.getWorkspacesByTenant] BOUNDARY ACCESS DENIED: cannot access identity domain with invalid boundary");
      throw new Error("Boundary access violation");
    }

    // Ambil repository secara lazy, sesuai pola yang sudah diverifikasi di command sebelumnya
    const sessionRepository = await getSessionRepositoryLazy();
    const tenantRepository = await getTenantRepositoryLazy();
    const workspaceRepository = await getWorkspaceRepositoryLazy();
    const membershipRepository = await getMembershipRepositoryLazy();
    
    const parsed = GetWorkspacesByTenantInputSchema.parse(input);
    
    // Extract context dari actorContext (mematuhi invariant "Workspace bukan identitas/authority")
    const workspaceId = input.actorContext?.workspaceId || "unknown-workspace";
    const actorId = input.actorContext?.actorId || "unknown-actor";
    const tenantId = input.actorContext?.tenantId || "unknown-tenant";

    // Log audit untuk tracing actorContext jika disediakan (wajib compliance audit)
    if (input.actorContext) {
      console.log(`[identity.getWorkspacesByTenant] Workspaces lookup initiated by actor ${actorId} in workspace ${workspaceId}, tenant ${tenantId} for tenant ID: ${parsed.tenantId}`);
    }
    
    // 1. Validate session exists and is active (enforce authentication)
    const session = await sessionRepository.byId(parsed.sessionId);
    if (!session || session.revokedAt !== null) {
      throw new Error("[identity.getWorkspacesByTenant] Invalid or revoked session - authentication violation");
    }

    // 2. Enforce actor match - session actor must match request actor
    if (session.actorId !== parsed.actorId) {
      throw new Error("[identity.getWorkspacesByTenant] Session actor mismatch - authentication violation");
    }

    // 3. Enforce tenant isolation - requested tenant must match session's tenant
    if (session.tenantId !== parsed.tenantId) {
      throw new Error("[identity.getWorkspacesByTenant] Cross-tenant access attempt blocked - security violation");
    }

    // 4. Get tenant from repository
    const tenant = await tenantRepository.byId(parsed.tenantId);
    if (!tenant) {
      return undefined;
    }

    // 5. Get all workspaces for this tenant only
    const workspaces = await workspaceRepository.listByTenant(parsed.tenantId);
    
    // 6. Get all memberships for this user in this tenant only
    const memberships = await membershipRepository.listByTenant(parsed.tenantId);
    const userMemberships = memberships.filter((m: MembershipAggregate) => m.userId === UserId(parsed.actorId));
    
    // 7. Map workspaces with their membership details (enforce only workspaces user is member of)
    const workspaceDetails = workspaces.map((w: WorkspaceAggregate) => {
      const membership = userMemberships.find((m: MembershipAggregate) => m.workspaceId === w.id);
      const workspaceCreatedAt = w.createdAt ?? new Date();
      return {
        id: w.id,
        name: w.name,
        productId: w.productId,
        createdAt: workspaceCreatedAt.toISOString(),
        role: membership?.role ?? null,
        membershipId: membership?.id ?? null,
      };
    }).filter((ws: any) => ws.membershipId !== null); // Remove any workspaces user doesn't have membership for

    const tenantCreatedAt = tenant.createdAt ?? new Date();
    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        createdAt: tenantCreatedAt.toISOString(),
      },
      workspaces: workspaceDetails,
      actorId: parsed.actorId,
      actorContext: input.actorContext, // Pertahankan actorContext untuk chainability antar command
    };
  },
};