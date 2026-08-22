import type { CapabilityCommand } from "@repo/core-kernel";
import { z } from "zod";
import { TenantId, UserId, SessionId, type MembershipAggregate, type WorkspaceAggregate } from "../contracts/identity.contracts.js";
import { 
  getTenantRepositoryPostgres, 
  getWorkspaceRepositoryPostgres, 
  getMembershipRepositoryPostgres,
  getSessionRepositoryPostgres,
  TenantRepositoryInMemory,
  WorkspaceRepositoryInMemory,
  MembershipRepositoryInMemory,
  SessionRepositoryInMemory,
} from "../repositories/index.js";

const tenantRepository = process.env.DATABASE_URL
  ? getTenantRepositoryPostgres()
  : TenantRepositoryInMemory;
const workspaceRepository = process.env.DATABASE_URL
  ? getWorkspaceRepositoryPostgres()
  : WorkspaceRepositoryInMemory;
const membershipRepository = process.env.DATABASE_URL
  ? getMembershipRepositoryPostgres()
  : MembershipRepositoryInMemory;
const sessionRepository = process.env.DATABASE_URL
  ? getSessionRepositoryPostgres()
  : SessionRepositoryInMemory;

export const GetWorkspacesByTenantInputSchema = z.object({
  tenantId: z.string().min(1),
  actorId: z.string().min(1),
  sessionId: z.string().min(1),
});

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
} | undefined;

type GetWorkspacesByTenantCommand = CapabilityCommand<
  GetWorkspacesByTenantInput,
  GetWorkspacesByTenantOutput
>;

export const getWorkspacesByTenantCommand: GetWorkspacesByTenantCommand = {
  kind: "command",
  name: "identity.getWorkspacesByTenant",
  version: "1.0.0",
  async execute(input) {
    const parsed = GetWorkspacesByTenantInputSchema.parse(input);
    
    // 1. Validate session exists and is active (enforce authentication)
    const session = await sessionRepository.byId(SessionId(parsed.sessionId));
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
    const tenant = await tenantRepository.byId(TenantId(parsed.tenantId));
    if (!tenant) {
      return undefined;
    }

    // 5. Get all workspaces for this tenant only
    const workspaces = await workspaceRepository.listByTenant(TenantId(parsed.tenantId));
    
    // 6. Get all memberships for this user in this tenant only
    const memberships = await membershipRepository.listByTenant(TenantId(parsed.tenantId));
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
    }).filter((ws) => ws.membershipId !== null); // Remove any workspaces user doesn't have membership for

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
    };
  },
};