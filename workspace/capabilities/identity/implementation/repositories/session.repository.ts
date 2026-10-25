import { PostgresRepository } from "./base.repository.js";
import {
  SessionId,
  UserId,
  TenantId,
  WorkspaceId,
  createWorkId,
  ActorId,
  type WorkId,
  type SessionAggregate,
  type SessionRepository,
} from "@repo/contracts-core";

// Alias untuk kompatibilitas dengan kode yang menggunakan WorkId sebagai value constructor
const WorkId = createWorkId;

// PostgreSQL-backed session repository implementation
class SessionRepositoryPostgresImpl extends PostgresRepository<any> implements SessionRepository {
  readonly entityName = "Session" as const;
  readonly kind = "repository" as const;
  declare pool: any;

  constructor() {
    super("sessions");
  }

  // Convert database record to domain aggregate - implements base.repository.ts abstract protected method
  protected toAggregate(record: any): SessionAggregate {
    return {
      id: SessionId(record.id),
      userId: UserId(record.user_id),
      actorId: ActorId(record.actor_id),
      tenantId: TenantId(record.tenant_id),
      workspaceId: record.workspace_id ? WorkspaceId(record.workspace_id) : undefined,
      workId: record.work_id ? WorkId(record.work_id) : undefined,
      productId: record.product_id,
      actorLabel: record.actor_label,
      isAgent: record.is_agent ?? false,
      issuedAt: new Date(record.issued_at),
      expiresAt: new Date(record.expires_at),
      revokedAt: record.revoked_at ? new Date(record.revoked_at) : null,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    } as SessionAggregate;
  }

  // Convert domain aggregate to database record - implements base.repository.ts abstract protected method
  protected toRecord(entity: SessionAggregate): any {
    return {
      id: entity.id,
      user_id: entity.userId,
      actor_id: entity.actorId,
      tenant_id: entity.tenantId,
      workspace_id: entity.workspaceId,
      work_id: entity.workId,
      product_id: entity.productId,
      actor_label: entity.actorLabel,
      is_agent: entity.isAgent,
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

  async byId(id: SessionId, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<SessionAggregate | undefined> {
    let query = "SELECT * FROM sessions WHERE id = $1";
    const params: any[] = [id];
    let paramIndex = 2;

    if (context?.tenantId) {
      query += ` AND tenant_id = $${paramIndex}`;
      params.push(context.tenantId);
      paramIndex++;
      
      if (context?.workId) {
        query += ` AND work_id = $${paramIndex}`;
        params.push(context.workId);
        paramIndex++;
      } else if (context?.workspaceId) {
        query += ` AND workspace_id = $${paramIndex}`;
        params.push(context.workspaceId);
        paramIndex++;
      }
    }

    const result = await this.pool.query(query, params);
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  async listByUser(userId: UserId, context?: { workId?: WorkId }): Promise<readonly SessionAggregate[]> {
    let query = "SELECT * FROM sessions WHERE user_id = $1";
    const params: any[] = [userId];
    let paramIndex = 2;

    if (context?.workId) {
      query += ` AND work_id = $${paramIndex}`;
      params.push(context.workId);
      paramIndex++;
    }

    const result = await this.pool.query(query, params);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async listActiveByUser(userId: UserId, context?: { workId?: WorkId }): Promise<readonly SessionAggregate[]> {
    let query = "SELECT * FROM sessions WHERE user_id = $1 AND revoked_at IS NULL";
    const params: any[] = [userId];
    let paramIndex = 2;

    if (context?.workId) {
      query += ` AND work_id = $${paramIndex}`;
      params.push(context.workId);
      paramIndex++;
    }

    const now = new Date();
    const result = await this.pool.query(query, params);
    const aggregates = result.rows.map((row: any) => this.toAggregate(row));
    return aggregates.filter((s: SessionAggregate) => !this.isExpired(s, now));
  }

  async isRevoked(id: SessionId, context?: { workId?: WorkId }): Promise<boolean> {
    const session = await this.byId(id);
    if (session === undefined) return true;
    if (session.revokedAt !== null) return true;
    return this.isExpired(session, new Date());
  }

  async revoke(id: SessionId, revokedAt?: Date, context?: { workId?: WorkId }): Promise<SessionAggregate> {
    const revoked = revokedAt ?? new Date();
    let query = "UPDATE sessions SET revoked_at = $1, updated_at = $2 WHERE id = $3";
    const params: any[] = [revoked.toISOString(), revoked.toISOString(), id];
    let paramIndex = 4;

    if (context?.workId) {
      query += ` AND work_id = $${paramIndex}`;
      params.push(context.workId);
      paramIndex++;
    }
    query += " RETURNING *";

    const result = await this.pool.query(query, params);
    if (result.rows.length === 0) {
      throw new Error(`[SessionRepository] Cannot revoke unknown session: ${id}`);
    }
    return this.toAggregate(result.rows[0]);
  }

  async list(context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<readonly SessionAggregate[]> {
    let query = "SELECT * FROM sessions";
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (context?.tenantId) {
      conditions.push(`tenant_id = $${paramIndex}`);
      params.push(context.tenantId);
      paramIndex++;
      
      if (context?.workId) {
        conditions.push(`work_id = $${paramIndex}`);
        params.push(context.workId);
        paramIndex++;
      } else if (context?.workspaceId) {
        conditions.push(`workspace_id = $${paramIndex}`);
        params.push(context.workspaceId);
        paramIndex++;
      }
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    const result = await this.pool.query(query, params);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async create(entity: SessionAggregate): Promise<SessionAggregate> {
    return super.save(entity);
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
          user_id = $1, actor_id = $2, tenant_id = $3, workspace_id = $4, work_id = $5, product_id = $6, actor_label = $7,
          is_agent = $8, issued_at = $9, expires_at = $10, revoked_at = $11, created_at = $12, updated_at = $13
          WHERE id = $14`,
        [
          record.user_id, record.actor_id, record.tenant_id, record.workspace_id, record.work_id, record.product_id, record.actor_label,
          record.is_agent, record.issued_at, record.expires_at, record.revoked_at, record.created_at, record.updated_at,
          record.id
        ]
      );
    } else {
      await this.pool.query(
        `INSERT INTO sessions (
          id, user_id, actor_id, tenant_id, workspace_id, work_id, product_id, actor_label, is_agent,
          issued_at, expires_at, revoked_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14)`,
        [
          record.id, record.user_id, record.actor_id, record.tenant_id, record.workspace_id, record.work_id, record.product_id, record.actor_label, record.is_agent,
          record.issued_at, record.expires_at, record.revoked_at, record.created_at, record.updated_at
        ]
      );
    }
    return this.byId(entity.id) as Promise<SessionAggregate>;
  }

  async remove(id: SessionId, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<boolean> {
    let query = "DELETE FROM sessions WHERE id = $1";
    const params: any[] = [id];
    let paramIndex = 2;

    if (context?.tenantId) {
      query += ` AND tenant_id = $${paramIndex}`;
      params.push(context.tenantId);
      paramIndex++;
      
      if (context?.workId) {
        query += ` AND work_id = $${paramIndex}`;
        params.push(context.workId);
        paramIndex++;
      } else if (context?.workspaceId) {
        query += ` AND workspace_id = $${paramIndex}`;
        params.push(context.workspaceId);
        paramIndex++;
      }
    }
    query += " RETURNING id";

    const result = await this.pool.query(query, params);
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