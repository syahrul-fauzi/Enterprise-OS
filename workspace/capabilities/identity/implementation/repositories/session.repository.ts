import {
  SessionId,
  UserId,
  type SessionAggregate,
  type SessionRepository,
} from "../contracts/identity.contracts";

type SessionStore = Map<string, SessionAggregate>;

const SESSION_STORE: SessionStore = new Map();

function isExpired(entity: SessionAggregate, now: Date): boolean {
  return entity.expiresAt.getTime() < now.getTime();
}

export const SessionRepositoryInMemory: SessionRepository = Object.freeze({
  entityName: "Session",
  kind: "repository",

  byId(id: SessionId): SessionAggregate | undefined {
    return SESSION_STORE.get(id);
  },

  listByUser(userId: UserId): readonly SessionAggregate[] {
    return [...SESSION_STORE.values()].filter((s) => s.userId === userId);
  },

  listActiveByUser(userId: UserId): readonly SessionAggregate[] {
    const now = new Date();
    return [...SESSION_STORE.values()].filter(
      (s) => s.userId === userId && s.revokedAt === null && !isExpired(s, now),
    );
  },

  isRevoked(id: SessionId): boolean {
    const s = SESSION_STORE.get(id);
    if (s === undefined) return true;
    if (s.revokedAt !== null) return true;
    return isExpired(s, new Date());
  },

  revoke(id: SessionId, revokedAt?: Date): SessionAggregate {
    const existing = SESSION_STORE.get(id);
    if (existing === undefined) {
      throw new Error(`[SessionRepository] Cannot revoke unknown session: ${id}`);
    }
    const revoked = revokedAt ?? new Date();
    const updated: SessionAggregate = {
      ...existing,
      revokedAt: revoked,
      updatedAt: revoked,
    };
    SESSION_STORE.set(id, updated);
    return updated;
  },

  list(): readonly SessionAggregate[] {
    return [...SESSION_STORE.values()];
  },

  save(entity: SessionAggregate): SessionAggregate {
    SESSION_STORE.set(entity.id, entity);
    return entity;
  },

  remove(id: SessionId): boolean {
    return SESSION_STORE.delete(id);
  },
});
