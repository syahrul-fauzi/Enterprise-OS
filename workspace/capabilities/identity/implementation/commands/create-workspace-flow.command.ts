import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import { getWorkspaceRepositoryPostgres, getMembershipRepositoryPostgres, getTenantRepositoryPostgres } from "../repositories/index.js";
import { WorkspaceId, UserId, TenantId, MembershipId } from "@repo/contracts-core";

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
    const tenant = await getTenantRepositoryPostgres().byId(resolvedTenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${resolvedTenantId}`);
    }

    // TODO: Re-implement this flow in an architecturally compliant way.
    // The previous implementation violated architectural boundaries by dynamically
    // importing the capabilityRegistry from the core-kernel, creating a
    // transitive dependency on workflow-engine and breaking the build.
    // A command should not be orchestrating other commands via the registry.
    throw new Error("createWorkspaceFlowCommand is temporarily disabled pending architectural review.");
  },
};