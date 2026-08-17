import {
  UserId,
  type UserAggregate,
} from "../contracts/identity.contracts.js";
import { getUserRepositoryPostgres } from "../repositories/index.js";

export const userQueries = Object.freeze({
  async byId(id: string): Promise<UserAggregate | undefined> {
    return getUserRepositoryPostgres().byId(UserId(id));
  },

  async byEmail(email: string): Promise<UserAggregate | undefined> {
    return getUserRepositoryPostgres().byEmail(email);
  },

  async list(): Promise<readonly UserAggregate[]> {
    return getUserRepositoryPostgres().list();
  },

  async count(): Promise<number> {
    const list = await getUserRepositoryPostgres().list();
    return list.length;
  },
});

export type UserQueries = typeof userQueries;