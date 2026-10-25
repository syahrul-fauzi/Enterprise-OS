import {
  SessionId,
  UserId,
  TenantId,
  WorkspaceId,
  ActorId,
  type SessionAggregate,
  type SessionRepository,
} from "@repo/contracts-core";

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

const hydrate = (): Map<string, SessionAggregate> => {
  const store = new Map<string, SessionAggregate>();
  
  // Seed test sessions untuk FIRST LIGHT demo (supports multiple actors)
  const testSession1: SessionAggregate = {
    id: SessionId("session-test-001"),
    userId: UserId("user-001"),
    actorId: ActorId("user-001"),
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
    actorId: ActorId("user-002"),
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
    actorId: ActorId("user-003"),
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
    actorId: ActorId("agent-001"),
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
  
  // Simpan SEMUA session dengan string key yang konsisten (fix key type mismatch)
  store.set(String(testSession1.id), testSession1);
  store.set(String(testSession2.id), testSession2);
  store.set(String(testSession3.id), testSession3);
  store.set(String(testAgentSession.id), testAgentSession);
  return store;
};

type Store = Map<string, SessionAggregate>;
const STORE: Store = (globalThis as any).__EOS_IDENTITY_SESSION_STORE__ ??= hydrate();

export const SessionRepositoryInMemory: SessionRepository & { reset: () => Promise<void> } = {
  kind: "repository",
  entityName: "Session",
  async byId(id: SessionId | string) {
    const sessionIdStr = typeof id === 'string' ? id : String(id);
    let session: SessionAggregate | undefined;
    for (const [key, value] of STORE.entries()) {
      const keyStr = String(key);
      if (keyStr === sessionIdStr) {
        session = value;
        break;
      }
    }
    return session !== undefined ? clone(session) : undefined;
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
  async isRevoked(id: SessionId | string): Promise<boolean> {
          // Handle baik SessionId object maupun string ID (fix untuk edge device test yang menggunakan string sessionId)
          const sessionIdStr = typeof id === 'string' ? id : String(id);
          console.log(`[SESSION] 🔍 DEBUG: isRevoked dipanggil dengan id=${id}, typeof id=${typeof id}, sessionIdStr=${sessionIdStr}`);
          
          // Cari di STORE dengan string ID yang konsisten
          let session: SessionAggregate | undefined;
          console.log(`[SESSION] 🔍 DEBUG: STORE size=${STORE.size}, iterasi semua entry di STORE:`);
          for (const [key, value] of STORE.entries()) {
            const keyStr = String(key);
            console.log(`[SESSION] 🔍 DEBUG: key=${key}, typeof key=${typeof key}, keyStr=${keyStr}, value.id=${value.id}, value.revokedAt=${value.revokedAt}`);
            if (keyStr === sessionIdStr) {
              session = value;
              console.log(`[SESSION] 🔍 DEBUG: MATCH! session ditemukan`);
              break;
            }
          }
          
          if (!session) {
            console.log(`[SESSION] ⚠️ Session tidak ditemukan: ${sessionIdStr} - list semua session yang tersedia:`);
            for (const [key, value] of STORE.entries()) {
              console.log(`[SESSION]   - ${String(key)} (actor: ${value.actorId}, revokedAt: ${value.revokedAt})`);
            }
            return true; // Anggap dicabut jika tidak ada
          }
          const revoked = !!session.revokedAt;
          console.log(`[SESSION] 🔍 Cek status session ${sessionIdStr}: isRevoked=${revoked}, revokedAt=${session.revokedAt}`);
          return revoked;
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
    // Simpan dengan string key yang konsisten (String(id)) untuk pencarian yang andal
    STORE.set(String(updated.id), updated);
    console.log(`[SESSION] ✅ Session dibuat: ${String(updated.id)} disimpan di STORE, STORE size sekarang=${STORE.size}`);
    return clone(updated);
  },
  async save(entity: SessionAggregate): Promise<SessionAggregate> {
    const updated: SessionAggregate = { ...clone(entity), updatedAt: new Date() };
    // Simpan dengan string key yang konsisten
    STORE.set(String(updated.id), updated);
    console.log(`[SESSION] ✅ Session disimpan: ${String(updated.id)} diperbarui di STORE`);
    return clone(updated);
  },

  async remove(id: SessionId | string): Promise<boolean> {
    const sessionIdStr = typeof id === 'string' ? id : String(id);
    console.log(`[SESSION] 🗑️ Menghapus session: ${sessionIdStr}`);
    return STORE.delete(sessionIdStr);
  },
  
  // Method reset untuk test isolation (EDGE-DEVICE-001: align dengan work-core repository pattern)
  async reset(): Promise<void> {
    STORE.clear();
    // Re-seed default test sessions setelah reset dengan string key yang KONSISTEN (String(session.id))
    const hydrated = hydrate();
    hydrated.forEach((session) => STORE.set(String(session.id), session));
    console.log(`[SessionRepositoryInMemory] ✅ Store telah di-reset ke kondisi awal: ${STORE.size} session default tersedia`);
    // Debug: list semua session setelah reset untuk verifikasi key
    for (const [key, value] of STORE.entries()) {
      console.log(`[SessionRepositoryInMemory] 🔍 Post-reset session key=${key}, value.id=${value.id}`);
    }
  },
} as const;

export const newSessionId = (() => {
  let seq = 100;
  return (): SessionId => {
    seq += 1;
    return SessionId(`session-${String(seq).padStart(3, "0")}`);
  };
})();

// Export standalone reset function untuk import mudah di test files
export const resetSessionRepository = async (): Promise<void> => {
  await SessionRepositoryInMemory.reset();
};