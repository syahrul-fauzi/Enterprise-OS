import {
  SessionId,
  UserId,
  type SessionAggregate,
} from "../contracts/identity.contracts";
import { SessionRepositoryInMemory } from "../repositories";

export const sessionQueries = Object.freeze({
  byId(id: string): SessionAggregate | undefined {
    return SessionRepositoryInMemory.byId(SessionId(id));
  },

  listByUser(userId: string): readonly SessionAggregate[] {
    return SessionRepositoryInMemory.listByUser(UserId(userId));
  },

  listActiveByUser(userId: string): readonly SessionAggregate[] {
    return SessionRepositoryInMemory.listActiveByUser(UserId(userId));
  },

  isRevoked(id: string): boolean {
    return SessionRepositoryInMemory.isRevoked(SessionId(id));
  },

  isValid(id: string): boolean {
    return !SessionRepositoryInMemory.isRevoked(SessionId(id));
  },

  list(): readonly SessionAggregate[] {
    return SessionRepositoryInMemory.list();
  },

  count(): number {
    return SessionRepositoryInMemory.list().length;
  },
});

export type SessionQueries = typeof sessionQueries;
