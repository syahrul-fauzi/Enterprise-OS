import type { CapabilityCommand } from "@repo/core-kernel";
import { randomUUID } from "node:crypto";
import {
  WorkspaceId,
  type CreateWorkspaceInput,
  type WorkspaceAggregate,
} from "../contracts/identity.contracts.js";
import { WorkspaceRepositoryPostgres } from "../repositories/index.js";
import { slugifyForTenant } from "../services/password.service.js";

function newWorkspaceId(): WorkspaceId {
  return WorkspaceId(`workspace-${randomUUID()}`);
}

type CreateWorkspaceCommand = CapabilityCommand<
  CreateWorkspaceInput,
  {
    readonly workspaceId: string;
    readonly tenantId: string;
    readonly name: string;
    readonly productId: string;
  }
>;

export const createWorkspaceCommand: CreateWorkspaceCommand = {
  kind: "command",
  name: "identity.createWorkspace",
  version: "2.0.0", // Postgres-backed persistence

  async execute(input) {
    const entity: WorkspaceAggregate = {
      id: newWorkspaceId(),
      tenantId: input.tenantId,
      name: input.name.trim(),
      slug: slugifyForTenant(input.name.trim()),
      productId: input.productId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await WorkspaceRepositoryPostgres.save(entity);
    return {
      workspaceId: entity.id,
      tenantId: entity.tenantId,
      name: entity.name,
      productId: entity.productId,
    };
  },
};