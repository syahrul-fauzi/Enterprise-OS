import { PostgresRepository } from "./base.repository.js";
import {
  SessionId,
  UserId,
  TenantId,
  WorkspaceId,
  type SessionAggregate,
  type SessionRepository,
} from "../contracts/identity.contracts.js";

// PostgreSQL-backed session repository implementation
class SessionRepositoryPostgresImpl extends PostgresRepository<any> implements SessionRepository {
  readonly entityName = "Session" as const;
  readonly kind = "repository" as const;

  constructor() {
    super("sessions");
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
      issued_at: entity.issuedAt.toISOString(),
      expires_at: entity.expiresAt.toISOString(),
      revoked_at: entity.revokedAt?.toISOString() ?? null,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
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
      [revoked.toISOString(), revoked.toISOString(), id]
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
    return this.byId(entity.id) as Promise<SessionAggregate>;
  }

  async remove(id: SessionId): Promise<boolean> {
    const result = await this.pool.query("DELETE FROM sessions WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
  }
}

type SessionRepoMethods = keyof SessionRepository;

const _lazyPgRepo: SessionRepository = new Proxy({} as SessionRepository, {
  get(_target: any, prop: string | symbol) {
    const real = (() => {
      if (!_instance) {
        _instance = new SessionRepositoryPostgresImpl();
      }
      return _instance;
    })();
    const method = (real as any)[prop];
    if (typeof method === "function") {
      return method.bind(real);
    }
    return method;
  },
});

let _instance: SessionRepository | null = null;
export function getSessionRepositoryPostgres(): SessionRepository {
  return _lazyPgRepo;
}

export const SessionRepositoryPostgres = _lazyPgRepo;