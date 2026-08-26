import {
  SessionId,
  UserId,
  TenantId,
  WorkspaceId,
  type SessionAggregate,
  type SessionRepository,
} from "../contracts/index";

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

const hydrate = (): Map<string, SessionAggregate> => {
  const store = new Map<string, SessionAggregate>();
  
  // Seed test sessions untuk FIRST LIGHT demo (supports multiple actors)
  const testSession1: SessionAggregate = {
    id: SessionId("session-test-001"),
    userId: UserId("user-001"),
    actorId: UserId("user-001"),
    tenantId: TenantId("tenant-001"),
    workspaceId: WorkspaceId("workspace-001"),
    productId: "lawyershub",
    actorLabel: "Demo User",
    isAgent: false,
    issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days from now
    revokedAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  };
  
  const testSession2: SessionAggregate = {
    id: SessionId("session-test-002"),
    userId: UserId("user-002"),
    actorId: UserId("user-002"),
    tenantId: TenantId("tenant-001"),
    workspaceId: WorkspaceId("workspace-001"),
    productId: "services-id",
    actorLabel: "Service Provider",
    isAgent: false,
    issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days from now
    revokedAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  };

  const testSession3: SessionAggregate = {
    id: SessionId("session-test-003"),
    userId: UserId("user-003"),
    actorId: UserId("user-003"),
    tenantId: TenantId("tenant-001"),
    workspaceId: WorkspaceId("workspace-001"),
    productId: "lawyershub.default",
    actorLabel: "LawyersHub User",
    isAgent: false,
    issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    revokedAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  };

  // C15: Add test agent session (agent identity for human→agent→human handoff testing)
  const testAgentSession: SessionAggregate = {
    id: SessionId("session-agent-001"),
    userId: UserId("agent-001"),
    actorId: UserId("agent-001"),
    tenantId: TenantId("tenant-001"),
    workspaceId: WorkspaceId("workspace-001"),
    productId: "lawyershub.default",
    actorLabel: "EOS Validation Agent",
    isAgent: true,
    issuedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day from now
    revokedAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30),
  };
  
  store.set(testSession1.id, testSession1);
  store.set(testSession2.id, testSession2);
  store.set(testSession3.id, testSession3);
  store.set(testAgentSession.id, testAgentSession);
  return store;
};

type Store = Map<string, SessionAggregate>;
const STORE: Store = (globalThis as any).__EOS_IDENTITY_SESSION_STORE__ ??= hydrate();

export const SessionRepositoryInMemory: SessionRepository = {
  kind: "repository",
  entityName: "Session",
  async byId(id: SessionId) {
    const raw = STORE.get(id);
    return raw !== undefined ? clone(raw) : undefined;
  },
  async listByUser(userId: UserId) {
    return Array.from(STORE.values())
      .filter(s => s.userId === userId)
      .map(clone);
  },
  async listActiveByUser(userId: UserId) {
    return Array.from(STORE.values())
      .filter(s => s.userId === userId && !s.revokedAt)
      .map(clone);
  },
  async isRevoked(id: SessionId): Promise<boolean> {
    const session = await this.byId(id);
    return !session || !!session.revokedAt;
  },
  async revoke(id: SessionId, revokedAt?: Date): Promise<SessionAggregate> {
    const existing = await this.byId(id);
    if (!existing) throw new Error(`Cannot revoke unknown session: ${id}`);
    const revoked = revokedAt ?? new Date();
    const updated = { ...existing, revokedAt: revoked, updatedAt: new Date() };
    STORE.set(id, updated);
    return clone(updated);
  },
  async list(): Promise<readonly SessionAggregate[]> {
    return Array.from(STORE.values()).map(clone);
  },
  async create(entity: SessionAggregate): Promise<SessionAggregate> {
    const updated: SessionAggregate = { ...clone(entity), updatedAt: new Date() };
    STORE.set(updated.id, updated);
    return clone(updated);
  },
  async save(entity: SessionAggregate): Promise<SessionAggregate> {
    const updated: SessionAggregate = { ...clone(entity), updatedAt: new Date() };
    STORE.set(updated.id, updated);
    return clone(updated);
  },

  async remove(id: SessionId): Promise<boolean> {
    return STORE.delete(id);
  },
} as const;

export const newSessionId = (() => {
  let seq = 100;
  return (): SessionId => {
    seq += 1;
    return SessionId(`session-${String(seq).padStart(3, "0")}`);
  };
})();