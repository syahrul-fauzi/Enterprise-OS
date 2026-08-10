import type { CapabilityCommand } from "@repo/core-kernel";
import {
  WorkspaceId,
  type CreateWorkspaceInput,
  type WorkspaceAggregate,
} from "../contracts/identity.contracts";
import { WorkspaceRepositoryInMemory } from "../repositories";

let workspaceIdCounter = 100;

function newWorkspaceId(): WorkspaceId {
  workspaceIdCounter += 1;
  return WorkspaceId(`workspace-${workspaceIdCounter}`);
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
  version: "1.0.0",

  execute(input) {
    const entity: WorkspaceAggregate = {
      id: newWorkspaceId(),
      tenantId: input.tenantId,
      name: input.name.trim(),
      productId: input.productId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    WorkspaceRepositoryInMemory.save(entity);
    return {
      workspaceId: entity.id,
      tenantId: entity.tenantId,
      name: entity.name,
      productId: entity.productId,
    };
  },
};
