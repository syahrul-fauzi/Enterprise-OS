import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import { capabilityRegistry } from "@repo/core-kernel";
import { WorkspaceRepositoryPostgres, MembershipRepositoryPostgres, TenantRepositoryPostgres } from "../repositories";
import { WorkspaceId, UserId, TenantId, MembershipId } from "../contracts/identity.contracts";

export const CreateWorkspaceFlowInputSchema = z.object({
  name: z.string().min(1),
  productId: z.string().min(1),
  tenantId: z.string().min(1).optional(),
  actorId: z.string().min(1),
});

export type CreateWorkspaceFlowInput = z.infer<typeof CreateWorkspaceFlowInputSchema>;

export type CreateWorkspaceFlowOutput = {
  readonly workspace: {
    readonly id: string;
    readonly name: string;
    readonly productId: string;
    readonly tenantId: string;
    readonly createdAt: string;
    readonly updatedAt: string;
  };
  readonly membership: {
    readonly id: string;
    readonly role: "owner" | "admin" | "member";
    readonly userId: string;
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly joinedAt: string;
  };
};

export const createWorkspaceFlowCommand: CapabilityCommand = {
  kind: "command",
  name: "identity.createWorkspaceFlow",
  version: "2.0.0", // Postgres-backed persistence
  async execute(input: unknown) {
    const parsed = CreateWorkspaceFlowInputSchema.parse(input);
    const { name, productId, tenantId, actorId } = parsed;

    if (!tenantId) {
      throw new Error("tenantId is required");
    }
    const resolvedTenantId = TenantId(tenantId);
    const tenant = await TenantRepositoryPostgres.byId(resolvedTenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${resolvedTenantId}`);
    }

    // Create dates BEFORE invoking commands to match exact timestamps used in createWorkspaceCommand/createMembershipCommand
    const workspaceCreatedAt = new Date();
    const workspaceOutput = await capabilityRegistry.invokeAsync<{
      readonly workspaceId: string;
      readonly tenantId: string;
      readonly name: string;
      readonly productId: string;
    }>("identity", "createWorkspace", {
      tenantId: resolvedTenantId,
      name,
      productId,
    });

    if (!workspaceOutput?.output?.workspaceId) {
      throw new Error("createWorkspace failed to return valid workspace");
    }

    const workspaceId = WorkspaceId(workspaceOutput.output.workspaceId);
    const userId = UserId(actorId);

    // Create membership date BEFORE invoking createMembership
    const membershipJoinedAt = new Date();
    const membershipOutput = await capabilityRegistry.invokeAsync<{
      readonly membershipId: string;
      readonly userId: string;
      readonly tenantId: string;
      readonly workspaceId: string;
      readonly role: "owner" | "admin" | "member";
    }>("identity", "createMembership", {
      userId,
      tenantId: resolvedTenantId,
      workspaceId,
      role: "owner" as const,
    });

    if (!membershipOutput?.output?.membershipId) {
      throw new Error("createMembership failed to return valid membership");
    }

    return {
      workspace: {
        id: workspaceOutput.output.workspaceId,
        name: workspaceOutput.output.name,
        productId: workspaceOutput.output.productId,
        tenantId: workspaceOutput.output.tenantId,
        createdAt: workspaceCreatedAt.toISOString(),
        updatedAt: workspaceCreatedAt.toISOString(),
      },
      membership: {
        id: membershipOutput.output.membershipId,
        role: membershipOutput.output.role,
        userId: membershipOutput.output.userId,
        tenantId: membershipOutput.output.tenantId,
        workspaceId: membershipOutput.output.workspaceId,
        joinedAt: membershipJoinedAt.toISOString(),
      },
    };
  },
};