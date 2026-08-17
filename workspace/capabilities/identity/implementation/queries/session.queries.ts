import {
  SessionId,
  UserId,
  type SessionAggregate,
} from "../contracts/identity.contracts.js";
import { SessionRepositoryPostgres } from "../repositories/index.js";

export const sessionQueries = Object.freeze({
  async byId(id: string): Promise<SessionAggregate | undefined> {
    return SessionRepositoryPostgres.byId(SessionId(id));
  },

  async listByUser(userId: string): Promise<readonly SessionAggregate[]> {
    return SessionRepositoryPostgres.listByUser(UserId(userId));
  },

  async listActiveByUser(userId: string): Promise<readonly SessionAggregate[]> {
    return SessionRepositoryPostgres.listActiveByUser(UserId(userId));
  },

  async isRevoked(id: string): Promise<boolean> {
    return SessionRepositoryPostgres.isRevoked(SessionId(id));
  },

  async isValid(id: string): Promise<boolean> {
    return !(await SessionRepositoryPostgres.isRevoked(SessionId(id)));
  },

  async list(): Promise<readonly SessionAggregate[]> {
    return SessionRepositoryPostgres.list();
  },

  async count(): Promise<number> {
    const list = await SessionRepositoryPostgres.list();
    return list.length;
  },
});

export type SessionQueries = typeof sessionQueries;