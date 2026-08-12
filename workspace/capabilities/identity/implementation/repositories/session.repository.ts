import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Pool } from "pg";
import { PostgresRepository } from "./base.repository";
import {
  SessionId,
  UserId,
  TenantId,
  WorkspaceId,
  type SessionAggregate,
  type SessionRepository,
} from "../contracts/identity.contracts";

type SessionStore = Map<string, SessionAggregate>;

interface SessionRecord {
  readonly id: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly productId: string;
  readonly actorLabel: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function hydrate(): SessionStore {
  return new Map<string, SessionAggregate>();
}

const STORE: SessionStore = hydrate();

function isExpired(entity: SessionAggregate, now: Date): boolean {
  return entity.expiresAt.getTime() < now.getTime();
}

function resolveSessionStoragePath(): string | undefined {
  const raw = process.env.EOS_SESSION_STORAGE_PATH?.trim();
  return raw && raw.length > 0 ? raw : undefined;
}

function readFileStore(path: string): SessionStore {
  if (!existsSync(path)) {
    return hydrate();
  }

  const raw = readFileSync(path, "utf8").trim();
  if (raw.length === 0) {
    return hydrate();
  }

  const parsed = JSON.parse(raw) as SessionRecord[];
  const store = new Map<string, SessionAggregate>();
  for (const item of parsed) {
    const entity = fromRecord(item);
    store.set(entity.id, entity);
  }
  return store;
}

function writeFileStore(path: string, store: SessionStore): void {
  mkdirSync(dirname(path), { recursive: true });
  const payload = Array.from(store.values()).map(toRecord);
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function clone(entity: SessionAggregate): SessionAggregate {
  return {
    ...entity,
    issuedAt: new Date(entity.issuedAt),
    expiresAt: new Date(entity.expiresAt),
    revokedAt: entity.revokedAt ? new Date(entity.revokedAt) : null,
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
  };
}

function toRecord(entity: SessionAggregate): SessionRecord {
  return {
    id: entity.id,
    userId: entity.userId,
    tenantId: entity.tenantId,
    workspaceId: entity.workspaceId,
    productId: entity.productId,
    actorLabel: entity.actorLabel,
    issuedAt: entity.issuedAt.toISOString(),
    expiresAt: entity.expiresAt.toISOString(),
    revokedAt: entity.revokedAt?.toISOString() ?? null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

function fromRecord(record: SessionRecord): SessionAggregate {
  return {
    id: SessionId(record.id),
    userId: UserId(record.userId),
    tenantId: TenantId(record.tenantId),
    workspaceId: WorkspaceId(record.workspaceId),
    productId: record.productId,
    actorLabel: record.actorLabel,
    issuedAt: new Date(record.issuedAt),
    expiresAt: new Date(record.expiresAt),
    revokedAt: record.revokedAt ? new Date(record.revokedAt) : null,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  } as SessionAggregate;
}

export const SessionRepositoryInMemory: SessionRepository = Object.freeze({
  entityName: "Session",
  kind: "repository",

  async byId(id: SessionId): Promise<SessionAggregate | undefined> {
    const raw = STORE.get(id);
    return raw !== undefined ? clone(raw) : undefined;
  },

  async listByUser(userId: UserId): Promise<SessionAggregate[]> {
    return [...STORE.values()].filter((s) => s.userId === userId).map(clone);
  },

  async listActiveByUser(userId: UserId): Promise<SessionAggregate[]> {
    const now = new Date();
    return [...STORE.values()]
      .filter((s) => s.userId === userId && s.revokedAt === null && !isExpired(s, now))
      .map(clone);
  },

  async isRevoked(id: SessionId): Promise<boolean> {
    const s = STORE.get(id);
    if (s === undefined) return true;
    if (s.revokedAt !== null) return true;
    return isExpired(s, new Date());
  },

  async revoke(id: SessionId, revokedAt?: Date): Promise<SessionAggregate> {
    const existing = STORE.get(id);
    if (existing === undefined) {
      throw new Error(`[SessionRepository] Cannot revoke unknown session: ${id}`);
    }
    const revoked = revokedAt ?? new Date();
    const updated: SessionAggregate = {
      ...clone(existing),
      revokedAt: revoked,
      updatedAt: revoked,
    };
    STORE.set(updated.id, updated);
    return clone(updated);
  },

  async list(): Promise<SessionAggregate[]> {
    return Array.from(STORE.values()).map(clone);
  },

  async save(entity: SessionAggregate): Promise<SessionAggregate> {
    const updated: SessionAggregate = {
      ...clone(entity),
      updatedAt: new Date(),
    };
    STORE.set(updated.id, updated);
    return clone(updated);
  },

  async remove(id: SessionId): Promise<boolean> {
    return STORE.delete(id);
  },
});

export const SessionRepositoryFileBacked: SessionRepository = {
  entityName: "Session",
  kind: "repository",

  async byId(id: SessionId): Promise<SessionAggregate | undefined> {
    const path = resolveSessionStoragePath();
    if (!path) {
      return SessionRepositoryInMemory.byId(id);
    }
    const raw = readFileStore(path).get(id);
    return raw !== undefined ? clone(raw) : undefined;
  },

  async listByUser(userId: UserId): Promise<readonly SessionAggregate[]> {
    const path = resolveSessionStoragePath();
    if (!path) {
      return SessionRepositoryInMemory.listByUser(userId) as unknown as readonly SessionAggregate[];
    }
    return [...readFileStore(path).values()].filter((s) => s.userId === userId).map(clone);
  },

  async listActiveByUser(userId: UserId): Promise<readonly SessionAggregate[]> {
    const path = resolveSessionStoragePath();
    if (!path) {
      return SessionRepositoryInMemory.listActiveByUser(userId) as unknown as readonly SessionAggregate[];
    }
    const now = new Date();
    return [...readFileStore(path).values()]
      .filter((s) => s.userId === userId && s.revokedAt === null && !isExpired(s, now))
      .map(clone);
  },

  async isRevoked(id: SessionId): Promise<boolean> {
    const path = resolveSessionStoragePath();
    if (!path) {
      return SessionRepositoryInMemory.isRevoked(id);
    }
    const session = await this.byId(id);
    if (session === undefined) return true;
    if (session.revokedAt !== null) return true;
    return isExpired(session, new Date());
  },

  async revoke(id: SessionId, revokedAt?: Date): Promise<SessionAggregate> {
    const path = resolveSessionStoragePath();
    if (!path) {
      return SessionRepositoryInMemory.revoke(id, revokedAt);
    }
    const revoked = revokedAt ?? new Date();
    const fileStore = readFileStore(path);
    const existing = fileStore.get(id);
    if (existing === undefined) {
      throw new Error(`[SessionRepository] Cannot revoke unknown session: ${id}`);
    }
    const updated: SessionAggregate = {
      ...clone(existing),
      revokedAt: revoked,
      updatedAt: revoked,
    };
    fileStore.set(updated.id, updated);
    writeFileStore(path, fileStore);
    return clone(updated);
  },

  async save(entity: SessionAggregate): Promise<SessionAggregate> {
    const path = resolveSessionStoragePath();
    if (!path) {
      return SessionRepositoryInMemory.save(entity);
    }
    const store = readFileStore(path);
    const updated: SessionAggregate = {
      ...clone(entity),
      updatedAt: new Date(),
    };
    store.set(updated.id, updated);
    writeFileStore(path, store);
    return clone(updated);
  },

  async remove(id: SessionId): Promise<boolean> {
    return SessionRepositoryPostgres.remove(id);
  },

  async list(): Promise<readonly SessionAggregate[]> {
    return SessionRepositoryPostgres.list();
  }
} as const;

// PostgreSQL-backed session repository implementation
class SessionRepositoryPostgresImpl extends PostgresRepository<any> implements SessionRepository {
  readonly entityName = "Session" as const;
  readonly kind = "repository" as const;
  declare pool: Pool;

  constructor() {
    super("sessions");
    this.pool = (this as any).pool;
  }

  // Convert database record to domain aggregate
  private toAggregate(record: any): SessionAggregate {
    return {
      id: SessionId(record.id),
      userId: UserId(record.user_id),
      actorId: UserId(record.actor_id),
      tenantId: TenantId(record.tenant_id),
      workspaceId: WorkspaceId(record.workspace_id),
      productId: record.product_id,
      actorLabel: record.actor_label,
      issuedAt: new Date(record.issued_at),
      expiresAt: new Date(record.expires_at),
      revokedAt: record.revoked_at ? new Date(record.revoked_at) : null,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    } as SessionAggregate;
  }

  // Convert domain aggregate to database record
  private toRecord(entity: SessionAggregate): any {
    return {
      id: entity.id,
      user_id: entity.userId,
      actor_id: entity.actorId,
      tenant_id: entity.tenantId,
      workspace_id: entity.workspaceId,
      product_id: entity.productId,
      actor_label: entity.actorLabel,
      issued_at: entity.issuedAt,
      expires_at: entity.expiresAt,
      revoked_at: entity.revokedAt,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }

  private isExpired(entity: SessionAggregate, now: Date): boolean {
    return entity.expiresAt.getTime() < now.getTime();
  }

  async byId(id: SessionId): Promise<SessionAggregate | undefined> {
    const result = await this.pool.query("SELECT * FROM sessions WHERE id = $1", [id]);
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  async listByUser(userId: UserId): Promise<readonly SessionAggregate[]> {
    const result = await this.pool.query("SELECT * FROM sessions WHERE user_id = $1", [userId]);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async listActiveByUser(userId: UserId): Promise<readonly SessionAggregate[]> {
    const now = new Date();
    const result = await this.pool.query(
      "SELECT * FROM sessions WHERE user_id = $1 AND revoked_at IS NULL",
      [userId]
    );
    const aggregates = result.rows.map((row: any) => this.toAggregate(row));
    return aggregates.filter(s => !this.isExpired(s, now));
  }

  async isRevoked(id: SessionId): Promise<boolean> {
    const session = await this.byId(id);
    if (session === undefined) return true;
    if (session.revokedAt !== null) return true;
    return this.isExpired(session, new Date());
  }

  async revoke(id: SessionId, revokedAt?: Date): Promise<SessionAggregate> {
    const revoked = revokedAt ?? new Date();
    const result = await this.pool.query(
      "UPDATE sessions SET revoked_at = $1, updated_at = $2 WHERE id = $3 RETURNING *",
      [revoked, revoked, id]
    );
    if (result.rows.length === 0) {
      throw new Error(`[SessionRepository] Cannot revoke unknown session: ${id}`);
    }
    return this.toAggregate(result.rows[0]);
  }

  async list(): Promise<readonly SessionAggregate[]> {
    const result = await this.pool.query("SELECT * FROM sessions");
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async save(entity: SessionAggregate): Promise<SessionAggregate> {
    const record = this.toRecord({
      ...entity,
      updatedAt: new Date(),
    });
    
    const exists = await this.byId(entity.id);
    if (exists) {
      await this.pool.query(
        `UPDATE sessions SET 
          user_id = $1, actor_id = $2, tenant_id = $3, workspace_id = $4, product_id = $5, actor_label = $6,
          issued_at = $7, expires_at = $8, revoked_at = $9, created_at = $10, updated_at = $11
          WHERE id = $12`,
        [
          record.user_id, record.actor_id, record.tenant_id, record.workspace_id, record.product_id, record.actor_label,
          record.issued_at, record.expires_at, record.revoked_at, record.created_at, record.updated_at,
          record.id
        ]
      );
    } else {
      await this.pool.query(
        `INSERT INTO sessions (
          id, user_id, actor_id, tenant_id, workspace_id, product_id, actor_label,
          issued_at, expires_at, revoked_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          record.id, record.user_id, record.actor_id, record.tenant_id, record.workspace_id, record.product_id, record.actor_label,
          record.issued_at, record.expires_at, record.revoked_at, record.created_at, record.updated_at
        ]
      );
    }
    return this.toAggregate(record);
  }

  async remove(id: SessionId): Promise<boolean> {
    const result = await this.pool.query("DELETE FROM sessions WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
  }
}

export const SessionRepositoryPostgres: SessionRepository = new SessionRepositoryPostgresImpl();