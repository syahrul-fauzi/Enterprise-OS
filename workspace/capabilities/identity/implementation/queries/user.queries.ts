import {
  UserId,
  type UserAggregate,
} from "../contracts/identity.contracts";
import { UserRepositoryInMemory } from "../repositories";

export const userQueries = Object.freeze({
  byId(id: string): UserAggregate | undefined {
    return UserRepositoryInMemory.byId(UserId(id));
  },

  byEmail(email: string): UserAggregate | undefined {
    return UserRepositoryInMemory.byEmail(email);
  },

  list(): readonly UserAggregate[] {
    return UserRepositoryInMemory.list();
  },

  count(): number {
    return UserRepositoryInMemory.list().length;
  },
});

export type UserQueries = typeof userQueries;
