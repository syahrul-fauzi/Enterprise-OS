import {
  UserId,
  type UserAggregate,
} from "../contracts/identity.contracts.js";
import { UserRepositoryPostgres } from "../repositories/index.js";

export const userQueries = Object.freeze({
  async byId(id: string): Promise<UserAggregate | undefined> {
    return UserRepositoryPostgres.byId(UserId(id));
  },

  async byEmail(email: string): Promise<UserAggregate | undefined> {
    return UserRepositoryPostgres.byEmail(email);
  },

  async list(): Promise<readonly UserAggregate[]> {
    return UserRepositoryPostgres.list();
  },

  async count(): Promise<number> {
    const list = await UserRepositoryPostgres.list();
    return list.length;
  },
});

export type UserQueries = typeof userQueries;