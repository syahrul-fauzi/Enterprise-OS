import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import { 
  WorkspaceRepositoryPostgres, 
  MembershipRepositoryPostgres, 
  TenantRepositoryPostgres,
  SessionRepositoryPostgres
} from "../repositories/index.js";
import { WorkspaceId, UserId, TenantId, MembershipId, SessionId } from "../contracts/identity.contracts.js";
import { initIdentitySchema } from "../repositories/base.repository.js";

export const GetWorkspaceByIdInputSchema = z.object({
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
  sessionId: z.string().min(1),
});

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
  version: "2.0.0", // Postgres-backed persistence
  async execute(input: unknown) {
    // Initialize database schema
    await initIdentitySchema();
    
    const parsed = GetWorkspaceByIdInputSchema.parse(input);
    const { workspaceId, actorId, sessionId } = parsed;

    // 1. Validate session exists and is valid (tenant isolation check)
    const session = await SessionRepositoryPostgres.byId(SessionId(sessionId));
    const sessionExpiresAt = session?.expiresAt ?? new Date(0);
    if (!session || session.revokedAt !== null || sessionExpiresAt < new Date()) {
      return undefined;
    }

    // 2. Verify session belongs to the actor
    if (session.userId !== actorId) {
      return undefined;
    }

    // 3. Get workspace from PostgreSQL
    const workspace = await WorkspaceRepositoryPostgres.byId(WorkspaceId(workspaceId));
    if (!workspace) {
      return undefined;
    }

    // 4. Enforce tenant isolation: workspace tenantId must match session tenantId
    if (workspace.tenantId !== session.tenantId) {
      return undefined;
    }

    // 5. Get membership and tenant
    const userId = UserId(actorId);
    const membership = await MembershipRepositoryPostgres.find(userId, workspace.tenantId, workspace.id);
    const tenant = await TenantRepositoryPostgres.byId(TenantId(workspace.tenantId));

    const workspaceCreatedAt = workspace.createdAt ?? new Date();
    const workspaceUpdatedAt = workspace.updatedAt ?? new Date();
    const tenantResult = tenant ? {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
    } : null;
    const membershipResult = membership ? {
      id: membership.id,
      role: membership.role,
      joinedAt: (membership.joinedAt ?? new Date()).toISOString(),
    } : null;
    
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