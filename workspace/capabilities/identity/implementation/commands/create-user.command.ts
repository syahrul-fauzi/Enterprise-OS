import type { CapabilityCommand } from "@repo/core-kernel";
import { randomUUID } from "node:crypto";
import {
  UserId,
  type RegisterUserInput,
  type UserAggregate,
} from "../contracts/identity.contracts";
import { passwordService } from "../services/password.service";
import { UserRepositoryPostgres } from "../repositories/index";

function newUserId(): UserId {
  return UserId(`user-${randomUUID()}`);
}

type RegisterUserCommand = CapabilityCommand<
  RegisterUserInput,
  {
    readonly userId: string;
    readonly actorId: string;
    readonly actorLabel: string;
    readonly email: string;
  }
>;

export const createUserCommand: RegisterUserCommand = {
  kind: "command",
  name: "identity.registerUser",
  version: "1.0.0",

  async execute(input) {
    const trimmedEmail = input.email.trim().toLowerCase();
    const existingUser = await UserRepositoryPostgres.byEmail(trimmedEmail);
    if (existingUser !== undefined) {
      throw new Error(`[identity.registerUser] Email already registered: ${trimmedEmail}`);
    }
    const entity: UserAggregate = {
      id: newUserId(),
      email: trimmedEmail,
      displayName: input.displayName.trim(),
      passwordHash: passwordService.hash(input.password),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await UserRepositoryPostgres.save(entity);
    return {
      userId: entity.id,
      actorId: entity.id,
      actorLabel: entity.displayName,
      email: entity.email,
    };
  },
};

export { createUserCommand as registerUserCommand };