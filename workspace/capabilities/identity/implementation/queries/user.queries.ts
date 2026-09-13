import {
  UserId,
  type UserAggregate,
} from "../contracts/identity.contracts.js";
import { getUserRepositoryPostgres } from "../repositories/index.js";

const userRepository = getUserRepositoryPostgres();

export const userQueries = Object.freeze({
  async byId(id: string): Promise<UserAggregate | undefined> {
    return userRepository.byId(UserId(id));
  },

  async byEmail(email: string): Promise<UserAggregate | undefined> {
    return userRepository.byEmail(email);
  },

  async list(): Promise<readonly UserAggregate[]> {
    return userRepository.list();
  },

  async count(): Promise<number> {
    const list = await userRepository.list();
    return list.length;
  },
});

export type UserQueries = typeof userQueries;