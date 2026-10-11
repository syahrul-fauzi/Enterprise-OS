import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import {
  getWorkspaceRepositoryPostgres,
  getMembershipRepositoryPostgres,
  getTenantRepositoryPostgres,
  getSessionRepositoryPostgres,
} from "../repositories/index.js";
import { WorkspaceId, UserId, TenantId, ActorId, SessionId } from "@repo/contracts-core";

// Instantiate repositories
const sessionRepository = getSessionRepositoryPostgres();
const workspaceRepository = getWorkspaceRepositoryPostgres();
const membershipRepository = getMembershipRepositoryPostgres();
const tenantRepository = getTenantRepositoryPostgres();

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
  version: "2.0.0", // Postgres-backed persistence
  async execute(input: unknown) {
    const parsed = GetWorkspaceByIdInputSchema.parse(input);
    const { workspaceId, actorId, sessionId } = parsed;

    // 1. Validate session exists and is valid (tenant isolation check)
    const session = await sessionRepository.byId(sessionId);
    const sessionExpiresAt = session?.expiresAt ?? new Date(0);
    if (!session || session.revokedAt !== null || sessionExpiresAt < new Date()) {
      return undefined;
    }

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