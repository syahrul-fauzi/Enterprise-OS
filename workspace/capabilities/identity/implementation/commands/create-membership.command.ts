import type { CapabilityCommand } from "@repo/core-kernel";
import { randomUUID } from "node:crypto";
import {
  MembershipId,
  type CreateMembershipInput,
  type MembershipAggregate,
  type Role,
} from "../contracts/identity.contracts";
import { MembershipRepositoryPostgres } from "../repositories";

function newMembershipId(): MembershipId {
  return MembershipId(`membership-${randomUUID()}`);
}

type CreateMembershipCommand = CapabilityCommand<
  CreateMembershipInput,
  {
    readonly membershipId: string;
    readonly userId: string;
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly role: Role;
  }
>;

export const createMembershipCommand: CreateMembershipCommand = {
  kind: "command",
  name: "identity.createMembership",
  version: "2.0.0", // Postgres-backed persistence

  async execute(input: CreateMembershipInput) {
    const existing = await MembershipRepositoryPostgres.find(
      input.userId,
      input.tenantId,
      input.workspaceId,
    );
    if (existing !== undefined) {
      return {
        membershipId: existing.id,
        userId: existing.userId,
        tenantId: existing.tenantId,
        workspaceId: existing.workspaceId,
        role: existing.role,
      };
    }
    const entity: MembershipAggregate = {
      id: newMembershipId(),
      userId: input.userId,
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      role: input.role,
      joinedAt: new Date(),
      updatedAt: new Date(),
    };
    await MembershipRepositoryPostgres.save(entity);
    return {
      membershipId: entity.id,
      userId: entity.userId,
      tenantId: entity.tenantId,
      workspaceId: entity.workspaceId,
      role: entity.role,
    };
  },
};