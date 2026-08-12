import {
  UserId,
  type UserAggregate,
} from "../contracts/identity.contracts";
import { UserRepositoryPostgres } from "../repositories";

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