import { PostgresRepository } from "./base.repository.ts";
import {
  MembershipId,
  TenantId,
  UserId,
  WorkspaceId,
  type WorkId,
  type MembershipAggregate,
  type MembershipRepository,
} from "@repo/contracts-core";

// PostgreSQL-backed membership repository implementation
export class MembershipRepositoryPostgresImpl extends PostgresRepository<any> implements MembershipRepository {
  readonly entityName = "Membership" as const;
  readonly kind = "repository" as const;
  declare pool: any;

  constructor() {
    super("memberships");
  }

  // Convert database record to domain aggregate - implements base.repository.ts abstract protected method
  protected toAggregate(record: any): MembershipAggregate {
    return {
      id: MembershipId(record.id),
      userId: UserId(record.user_id),
      tenantId: TenantId(record.tenant_id),
      workspaceId: record.workspace_id ? WorkspaceId(record.workspace_id) : undefined,
      workId: record.work_id,
      role: record.role,
      joinedAt: new Date(record.joined_at),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    } as MembershipAggregate;
  }

  // Convert domain aggregate to database record - implements base.repository.ts abstract protected method
  protected toRecord(entity: MembershipAggregate): any {
    return {
      id: entity.id,
      user_id: entity.userId,
      tenant_id: entity.tenantId,
      workspace_id: entity.workspaceId,
      work_id: entity.workId,
      role: entity.role,
      joined_at: entity.joinedAt.toISOString(),
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    };
  }

  async byId(id: MembershipId, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<MembershipAggregate | undefined> {
    let query = "SELECT * FROM memberships WHERE id = $1";
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

  async listByUser(userId: UserId, context?: { workId?: WorkId }): Promise<readonly MembershipAggregate[]> {
    let query = "SELECT * FROM memberships WHERE user_id = $1";
    const params: any[] = [userId];
    let paramIndex = 2;

    if (context?.workId) {
      query += ` AND work_id = $${paramIndex}`;
      params.push(context.workId);
      paramIndex++;
    }

    query += " ORDER BY joined_at DESC";
    const result = await this.pool.query(query, params);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async listByTenant(tenantId: TenantId, context?: { workId?: WorkId }): Promise<readonly MembershipAggregate[]> {
    let query = "SELECT * FROM memberships WHERE tenant_id = $1";
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (context?.workId) {
      query += ` AND work_id = $${paramIndex}`;
      params.push(context.workId);
      paramIndex++;
    }

    query += " ORDER BY joined_at DESC";
    const result = await this.pool.query(query, params);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async listByWorkspace(workspaceId: WorkspaceId, context?: { tenantId?: TenantId; workId?: WorkId }): Promise<readonly MembershipAggregate[]> {
    let query = "SELECT * FROM memberships WHERE workspace_id = $1";
    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (context?.tenantId) {
      query += ` AND tenant_id = $${paramIndex}`;
      params.push(context.tenantId);
      paramIndex++;
    }

    if (context?.workId) {
      query += ` AND work_id = $${paramIndex}`;
      params.push(context.workId);
      paramIndex++;
    }

    query += " ORDER BY joined_at DESC";
    const result = await this.pool.query(query, params);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async findByUserTenantAndWorkspace(userId: UserId, tenantId: TenantId, context?: { workspaceId?: WorkspaceId; workId?: WorkId }): Promise<MembershipAggregate | undefined> {
    let query = "SELECT * FROM memberships WHERE user_id = $1 AND tenant_id = $2";
    const params: any[] = [userId, tenantId];
    let paramIndex = 3;

    if (context?.workId) {
      query += ` AND work_id = $${paramIndex}`;
      params.push(context.workId);
      paramIndex++;
    } else if (context?.workspaceId) {
      query += ` AND workspace_id = $${paramIndex}`;
      params.push(context.workspaceId);
      paramIndex++;
    }

    const result = await this.pool.query(query, params);
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  async list(context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<readonly MembershipAggregate[]> {
    let query = "SELECT * FROM memberships WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (context?.tenantId) {
      query += ` AND tenant_id = $${paramIndex}`;
      params.push(context.tenantId);
      paramIndex++;
    }

    if (context?.workId) {
      query += ` AND work_id = $${paramIndex}`;
      params.push(context.workId);
      paramIndex++;
    } else if (context?.workspaceId) {
      query += ` AND workspace_id = $${paramIndex}`;
      params.push(context.workspaceId);
      paramIndex++;
    }

    query += " ORDER BY joined_at DESC";
    const result = await this.pool.query(query, params);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async save(entity: MembershipAggregate): Promise<MembershipAggregate> {
    const updated = { ...entity, updatedAt: new Date() };
    const record = this.toRecord(updated);
    
    const exists = await this.byId(entity.id);
    if (exists) {
      await this.pool.query(
        `UPDATE memberships SET 
          user_id = $1, tenant_id = $2, workspace_id = $3, work_id = $4, role = $5, joined_at = $6, created_at = $7, updated_at = $8
          WHERE id = $9`,
        [
          record.user_id, record.tenant_id, record.workspace_id, record.work_id, record.role,
          record.joined_at, record.created_at, record.updated_at, record.id
        ]
      );
    } else {
      await this.pool.query(
        `INSERT INTO memberships (
          id, user_id, tenant_id, workspace_id, work_id, role, joined_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          record.id, record.user_id, record.tenant_id, record.workspace_id, record.work_id, record.role,
          record.joined_at, record.created_at, record.updated_at
        ]
      );
    }

    return this.byId(entity.id) as Promise<MembershipAggregate>;
  }

  async remove(id: MembershipId, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<boolean> {
    let query = "DELETE FROM memberships WHERE id = $1";
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
    return (result as any).rowCount > 0;
  }
}

let _instance: MembershipRepository | null = null;
export function getMembershipRepositoryPostgres(): MembershipRepository {
  if (!_instance) {
    _instance = new MembershipRepositoryPostgresImpl();
  }
  return _instance;
}

const _lazyPgMembershipRepo: MembershipRepository = new Proxy({} as MembershipRepository, {
  get(_target: any, prop: string | symbol) {
    const real = getMembershipRepositoryPostgres();
    const method = (real as any)[prop];
    if (typeof method === "function") {
      return method.bind(real);
    }
    return method;
  },
});

export const MembershipRepositoryPostgres = _lazyPgMembershipRepo;