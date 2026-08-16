import { PostgresRepository } from "./base.repository";
import {
  TenantId,
  UserId,
  type TenantAggregate,
  type TenantRepository,
} from "../contracts/identity.contracts";

// PostgreSQL-backed tenant repository implementation
class TenantRepositoryPostgresImpl extends PostgresRepository<any> implements TenantRepository {
  readonly entityName = "Tenant" as const;
  readonly kind = "repository" as const;

  constructor() {
    super("tenants");
  }

  // Convert database record to domain aggregate
  private toAggregate(record: any): TenantAggregate {
    return {
      id: TenantId(record.id),
      name: record.name,
      slug: record.slug,
      ownerId: UserId(record.owner_id),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    } as TenantAggregate;
  }

  // Convert domain aggregate to database record
  private toRecord(entity: TenantAggregate): any {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      owner_id: entity.ownerId,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    };
  }

  async byId(id: TenantId): Promise<TenantAggregate | undefined> {
    const result = await this.pool.query("SELECT * FROM tenants WHERE id = $1", [id]);
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  async bySlug(slug: string): Promise<TenantAggregate | undefined> {
    const needle = slug.trim().toLowerCase();
    const result = await this.pool.query("SELECT * FROM tenants WHERE LOWER(slug) = $1", [needle]);
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  async list(): Promise<readonly TenantAggregate[]> {
    const result = await this.pool.query("SELECT * FROM tenants ORDER BY created_at DESC", []);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async save(entity: TenantAggregate): Promise<TenantAggregate> {
    const updated = { ...entity, updatedAt: new Date() };
    const record = this.toRecord(updated);
    
    const exists = await this.byId(entity.id);
    if (exists) {
      await this.pool.query(
        `UPDATE tenants SET 
          name = $1, slug = $2, owner_id = $3, created_at = $4, updated_at = $5
          WHERE id = $6`,
        [
          record.name, record.slug, record.owner_id, record.created_at, record.updated_at,
          record.id
        ]
      );
    } else {
      await this.pool.query(
        `INSERT INTO tenants (
          id, name, slug, owner_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          record.id, record.name, record.slug, record.owner_id, record.created_at, record.updated_at
        ]
      );
    }

    return this.byId(entity.id) as Promise<TenantAggregate>;
  }

  async remove(id: TenantId): Promise<boolean> {
    const result = await this.pool.query("DELETE FROM tenants WHERE id = $1", [id]);
    return (result as any).rowCount > 0;
  }
}

let _instance: TenantRepository | null = null;
export function getTenantRepositoryPostgres(): TenantRepository {
  if (!_instance) {
    _instance = new TenantRepositoryPostgresImpl();
  }
  return _instance;
}

const _lazyPgTenantRepo: TenantRepository = new Proxy({} as TenantRepository, {
  get(_target: any, prop: string | symbol) {
    const real = getTenantRepositoryPostgres();
    const method = (real as any)[prop];
    if (typeof method === "function") {
      return method.bind(real);
    }
    return method;
  },
});

export const TenantRepositoryPostgres = _lazyPgTenantRepo;