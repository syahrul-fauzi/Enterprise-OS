import { PostgresRepository } from "./base.repository.js";
import {
  WorkspaceId,
  TenantId,
  type WorkId,
  createWorkId,
  type WorkspaceAggregate,
  type WorkspaceRepository,
} from "@repo/contracts-core";

// PostgreSQL-backed workspace repository implementation
class WorkspaceRepositoryPostgresImpl extends PostgresRepository<any> implements WorkspaceRepository {
  readonly entityName = "Workspace" as const;
  readonly kind = "repository" as const;

  constructor() {
    super("workspaces");
  }

  // Convert database record to domain aggregate - implements base.repository.ts abstract protected method
  protected toAggregate(record: any): WorkspaceAggregate {
    return {
      id: WorkspaceId(record.id),
      tenantId: TenantId(record.tenant_id),
      workId: record.work_id ? createWorkId(record.work_id) : undefined,
      name: record.name,
      slug: record.slug,
      productId: record.product_id,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    } as WorkspaceAggregate;
  }

  // Convert domain aggregate to database record - implements base.repository.ts abstract protected method
  protected toRecord(entity: WorkspaceAggregate): any {
    return {
      id: entity.id,
      tenant_id: entity.tenantId,
      work_id: entity.workId,
      name: entity.name,
      slug: entity.slug,
      product_id: entity.productId,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    };
  }

  async byId(id: WorkspaceId, context?: { tenantId: TenantId; workId?: WorkId }): Promise<WorkspaceAggregate | undefined> {
    let query = "SELECT * FROM workspaces WHERE id = $1";
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
      }
    }

    const result = await this.pool.query<Record<string, any>>(query, params);
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  async listByTenant(tenantId: TenantId, context?: { workId?: WorkId }): Promise<readonly WorkspaceAggregate[]> {
    let query = "SELECT * FROM workspaces WHERE tenant_id = $1";
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (context?.workId) {
      query += ` AND work_id = $${paramIndex}`;
      params.push(context.workId);
      paramIndex++;
    }
    query += " ORDER BY created_at DESC";

    const result = await this.pool.query<Record<string, any>>(query, params);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async list(context?: { tenantId: TenantId; workId?: WorkId }): Promise<readonly WorkspaceAggregate[]> {
    let query = "SELECT * FROM workspaces";
    const params: any[] = [];
    let paramIndex = 1;
    const conditions: string[] = [];

    if (context?.tenantId) {
      conditions.push(`tenant_id = $${paramIndex}`);
      params.push(context.tenantId);
      paramIndex++;
      
      if (context?.workId) {
        conditions.push(`work_id = $${paramIndex}`);
        params.push(context.workId);
        paramIndex++;
      }
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }
    query += " ORDER BY created_at DESC";

    const result = await this.pool.query<Record<string, any>>(query, params);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async save(entity: WorkspaceAggregate): Promise<WorkspaceAggregate> {
    const updated = { ...entity, updatedAt: new Date() };
    const record = this.toRecord(updated);
    
    const exists = await this.byId(entity.id);
    if (exists) {
      await this.pool.query<Record<string, any>>(
        `UPDATE workspaces SET 
          tenant_id = $1, work_id = $2, name = $3, slug = $4, product_id = $5, created_at = $6, updated_at = $7
          WHERE id = $8`,
        [
          record.tenant_id, record.work_id, record.name, record.slug, record.product_id,
          record.created_at, record.updated_at, record.id
        ]
      );
    } else {
      await this.pool.query<Record<string, any>>(
        `INSERT INTO workspaces (
          id, tenant_id, work_id, name, slug, product_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          record.id, record.tenant_id, record.work_id, record.name, record.slug, record.product_id,
          record.created_at, record.updated_at
        ]
      );
    }

    return this.byId(entity.id) as Promise<WorkspaceAggregate>;
  }

  async remove(id: WorkspaceId, context?: { tenantId: TenantId; workId?: WorkId }): Promise<boolean> {
    let query = "DELETE FROM workspaces WHERE id = $1";
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
      }
    }

    const result = await this.pool.query<Record<string, any>>(query, params);
    return result.rowCount > 0;
  }
}

let _instance: WorkspaceRepository | null = null;
export function getWorkspaceRepositoryPostgres(): WorkspaceRepository {
  if (!_instance) {
    _instance = new WorkspaceRepositoryPostgresImpl();
  }
  return _instance;
}

const _lazyPgWorkspaceRepo: WorkspaceRepository = new Proxy({} as WorkspaceRepository, {
  get(_target: any, prop: string | symbol) {
    const real = getWorkspaceRepositoryPostgres();
    const method = (real as any)[prop];
    if (typeof method === "function") {
      return method.bind(real);
    }
    return method;
  },
});

export const WorkspaceRepositoryPostgres = _lazyPgWorkspaceRepo;