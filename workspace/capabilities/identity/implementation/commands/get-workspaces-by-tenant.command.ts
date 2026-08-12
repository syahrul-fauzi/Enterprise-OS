import type { CapabilityCommand } from "@repo/core-kernel";
import { z } from "zod";
import { TenantId, UserId } from "../contracts/identity.contracts";
import { 
  TenantRepositoryPostgres, 
  WorkspaceRepositoryPostgres, 
  MembershipRepositoryPostgres,
  SessionRepositoryPostgres 
} from "../repositories";

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
    const session = await SessionRepositoryPostgres.byId(parsed.sessionId);
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

    // 4. Get tenant from PostgreSQL repository
    const tenant = await TenantRepositoryPostgres.byId(TenantId(parsed.tenantId));
    if (!tenant) {
      return undefined;
    }

    // 5. Get all workspaces for this tenant only (PostgreSQL filtered query)
    const workspaces = await WorkspaceRepositoryPostgres.listByTenant(TenantId(parsed.tenantId));
    
    // 6. Get all memberships for this user in this tenant only
    const memberships = await MembershipRepositoryPostgres.listByTenant(TenantId(parsed.tenantId));
    const userMemberships = memberships.filter((m) => m.userId === UserId(parsed.actorId));
    
    // 7. Map workspaces with their membership details (enforce only workspaces user is member of)
    const workspaceDetails = workspaces.map((w) => {
      const membership = userMemberships.find((m) => m.workspaceId === w.id);
      return {
        id: w.id,
        name: w.name,
        productId: w.productId,
        createdAt: w.createdAt.toISOString(),
        role: membership?.role ?? null,
        membershipId: membership?.id ?? null,
      };
    }).filter(ws => ws.membershipId !== null); // Remove any workspaces user doesn't have membership for

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        createdAt: tenant.createdAt.toISOString(),
      },
      workspaces: workspaceDetails,
      actorId: parsed.actorId,
    };
  },
};