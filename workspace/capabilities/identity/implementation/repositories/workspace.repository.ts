import { PostgresRepository } from "./base.repository";
import {
  WorkspaceId,
  TenantId,
  type WorkspaceAggregate,
  type WorkspaceRepository,
} from "../contracts/index";

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
      name: entity.name,
      slug: entity.slug,
      product_id: entity.productId,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    };
  }

  async byId(id: WorkspaceId): Promise<WorkspaceAggregate | undefined> {
    const result = await this.pool.query("SELECT * FROM workspaces WHERE id = $1", [id]);
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  async listByTenant(tenantId: TenantId): Promise<readonly WorkspaceAggregate[]> {
    const result = await this.pool.query("SELECT * FROM workspaces WHERE tenant_id = $1 ORDER BY created_at DESC", [tenantId]);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async list(): Promise<readonly WorkspaceAggregate[]> {
    const result = await this.pool.query("SELECT * FROM workspaces ORDER BY created_at DESC", []);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async save(entity: WorkspaceAggregate): Promise<WorkspaceAggregate> {
    const updated = { ...entity, updatedAt: new Date() };
    const record = this.toRecord(updated);
    
    const exists = await this.byId(entity.id);
    if (exists) {
      await this.pool.query(
        `UPDATE workspaces SET 
          tenant_id = $1, name = $2, slug = $3, product_id = $4, created_at = $5, updated_at = $6
          WHERE id = $7`,
        [
          record.tenant_id, record.name, record.slug, record.product_id,
          record.created_at, record.updated_at, record.id
        ]
      );
    } else {
      await this.pool.query(
        `INSERT INTO workspaces (
          id, tenant_id, name, slug, product_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          record.id, record.tenant_id, record.name, record.slug, record.product_id,
          record.created_at, record.updated_at
        ]
      );
    }

    return this.byId(entity.id) as Promise<WorkspaceAggregate>;
  }

  async remove(id: WorkspaceId): Promise<boolean> {
    const result = await this.pool.query("DELETE FROM workspaces WHERE id = $1", [id]);
    return (result as any).rowCount > 0;
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