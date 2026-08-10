import type { CapabilityCommand } from "@repo/core-kernel";
import {
  UserId,
  type RegisterUserInput,
  type UserAggregate,
} from "../contracts/identity.contracts";
import { UserRepositoryInMemory } from "../repositories";
import { passwordService } from "../services/password.service";

let userIdCounter = 100;

function newUserId(): UserId {
  userIdCounter += 1;
  return UserId(`user-${userIdCounter}`);
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

  execute(input) {
    const trimmedEmail = input.email.trim().toLowerCase();
    if (UserRepositoryInMemory.byEmail(trimmedEmail) !== undefined) {
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
    UserRepositoryInMemory.save(entity);
    return {
      userId: entity.id,
      actorId: entity.id,
      actorLabel: entity.displayName,
      email: entity.email,
    };
  },
};

export { createUserCommand as registerUserCommand };
