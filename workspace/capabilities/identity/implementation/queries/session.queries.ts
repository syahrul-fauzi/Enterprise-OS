import {
  SessionId,
  UserId,
  type SessionAggregate,
} from "@repo/contracts-core/index.js";
import { SessionRepositoryInMemory, getSessionRepositoryPostgres, } from "../repositories/index.js";

const sessionRepository = (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL)
    ? getSessionRepositoryPostgres()
    : SessionRepositoryInMemory;

export const sessionQueries = Object.freeze({
  async byId(id: string): Promise<SessionAggregate | undefined> {
    return sessionRepository.byId(SessionId(id));
  },

  async listByUser(userId: string): Promise<readonly SessionAggregate[]> {
    return sessionRepository.listByUser(UserId(userId));
  },

  async listActiveByUser(userId: string): Promise<readonly SessionAggregate[]> {
    return sessionRepository.listActiveByUser(UserId(userId));
  },

  async isRevoked(id: string): Promise<boolean> {
    return sessionRepository.isRevoked(SessionId(id));
  },

  async isValid(id: string): Promise<boolean> {
    return !(await sessionRepository.isRevoked(SessionId(id)));
  },

  async list(): Promise<readonly SessionAggregate[]> {
    return sessionRepository.list();
  },

  async count(): Promise<number> {
    const list = await sessionRepository.list();
    return list.length;
  },
});

export type SessionQueries = typeof sessionQueries;