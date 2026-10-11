import { PostgresRepository } from "./base.repository.ts";
import {
  UserId,
  TenantId,
  WorkspaceId,
  type WorkId,
  createWorkId,
  type UserAggregate,
  type UserRepository,
} from "@repo/contracts-core";

// PostgreSQL-backed user repository implementation - 100% 5 boundary compliant
class UserRepositoryPostgresImpl extends PostgresRepository<any> implements UserRepository {
  readonly entityName = "User" as const;
  readonly kind = "repository" as const;

  constructor() {
    super("users");
  }

  // Convert database record to domain aggregate - implements base.repository.ts abstract protected method
  protected toAggregate(record: any): UserAggregate {
    return {
      id: UserId(record.id),
      tenantId: TenantId(record.tenant_id),
      workId: record.work_id ? createWorkId(record.work_id) : undefined,
      workspaceId: record.workspace_id ? WorkspaceId(record.workspace_id) : undefined,
      email: record.email,
      displayName: record.display_name,
      passwordHash: record.password_hash,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    } as UserAggregate;
  }

  // Convert domain aggregate to database record - implements base.repository.ts abstract protected method
  protected toRecord(entity: UserAggregate): any {
    return {
      id: entity.id,
      tenant_id: entity.tenantId,
      work_id: entity.workId,
      workspace_id: entity.workspaceId,
      email: entity.email,
      display_name: entity.displayName,
      password_hash: entity.passwordHash,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    };
  }

  // WorkId-first pattern implementation - sesuai model 5 boundary
  async byId(id: UserId, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<UserAggregate | undefined> {
    let query = "SELECT * FROM users WHERE id = $1";
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

    const result = await this.pool.query<Record<string, any>>(query, params);
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  async byEmail(email: string, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<UserAggregate | undefined> {
    const needle = email.trim().toLowerCase();
    let query = "SELECT * FROM users WHERE LOWER(email) = $1";
    const params: any[] = [needle];
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

    const result = await this.pool.query<Record<string, any>>(query, params);
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  async list(context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<readonly UserAggregate[]> {
    let query = "SELECT * FROM users";
    const params: any[] = [];
    let paramIndex = 1;

    if (context?.tenantId) {
      query += ` WHERE tenant_id = $${paramIndex}`;
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

    query += " ORDER BY created_at DESC";

    const result = await this.pool.query<Record<string, any>>(query, params);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async save(entity: UserAggregate): Promise<UserAggregate> {
    if (!entity.tenantId) {
      throw new Error("UserAggregate must have tenantId (identity boundary is mandatory)");
    }
    const updated = { ...entity, updatedAt: new Date() };
    const record = this.toRecord(updated);
    
    const exists = await this.byId(entity.id, { tenantId: entity.tenantId, workId: entity.workId, workspaceId: entity.workspaceId });
    if (exists) {
      await this.pool.query(
        `UPDATE users SET 
          tenant_id = $1, work_id = $2, workspace_id = $3,
          email = $4, display_name = $5, password_hash = $6, created_at = $7, updated_at = $8
          WHERE id = $9`,
        [
          record.tenant_id, record.work_id, record.workspace_id,
          record.email, record.display_name, record.password_hash,
          record.created_at, record.updated_at, record.id
        ]
      );
    } else {
      await this.pool.query(
        `INSERT INTO users (
          id, tenant_id, work_id, workspace_id,
          email, display_name, password_hash, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          record.id, record.tenant_id, record.work_id, record.workspace_id,
          record.email, record.display_name, record.password_hash,
          record.created_at, record.updated_at
        ]
      );
    }

    return this.byId(entity.id, { tenantId: entity.tenantId, workId: entity.workId, workspaceId: entity.workspaceId }) as Promise<UserAggregate>;
  }

  async remove(id: UserId, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<boolean> {
    if (!context?.tenantId) {
      throw new Error("remove() requires tenantId in context (identity boundary is mandatory)");
    }

    let query = "DELETE FROM users WHERE id = $1";
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

    const result = await this.pool.query<Record<string, any>>(query, params);
    return result.rows.length > 0;
  }
}

let _instance: UserRepository | null = null;
export function getUserRepositoryPostgres(): UserRepository {
  if (!_instance) {
    _instance = new UserRepositoryPostgresImpl();
  }
  return _instance;
}

const _lazyPgUserRepo: UserRepository = new Proxy({} as UserRepository, {
  get(_target: any, prop: string | symbol) {
    const real = getUserRepositoryPostgres();
    const method = (real as any)[prop];
    if (typeof method === "function") {
      return method.bind(real);
    }
    return method;
  },
});

export const UserRepositoryPostgres = _lazyPgUserRepo;