"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRepositoryInMemory = void 0;
const SESSION_STORE = new Map();
function isExpired(entity, now) {
    return entity.expiresAt.getTime() < now.getTime();
}
exports.SessionRepositoryInMemory = Object.freeze({
    entityName: "Session",
    kind: "repository",
    byId(id) {
        return SESSION_STORE.get(id);
    },
    listByUser(userId) {
        return [...SESSION_STORE.values()].filter((s) => s.userId === userId);
    },
    listActiveByUser(userId) {
        const now = new Date();
        return [...SESSION_STORE.values()].filter((s) => s.userId === userId && s.revokedAt === null && !isExpired(s, now));
    },
    isRevoked(id) {
        const s = SESSION_STORE.get(id);
        if (s === undefined)
            return true;
        if (s.revokedAt !== null)
            return true;
        return isExpired(s, new Date());
    },
    revoke(id, revokedAt) {
        const existing = SESSION_STORE.get(id);
        if (existing === undefined) {
            throw new Error(`[SessionRepository] Cannot revoke unknown session: ${id}`);
        }
        const revoked = revokedAt ?? new Date();
        const updated = {
            ...existing,
            revokedAt: revoked,
            updatedAt: revoked,
        };
        SESSION_STORE.set(id, updated);
        return updated;
    },
    list() {
        return [...SESSION_STORE.values()];
    },
    save(entity) {
        SESSION_STORE.set(entity.id, entity);
        return entity;
    },
    remove(id) {
        return SESSION_STORE.delete(id);
    },
});
