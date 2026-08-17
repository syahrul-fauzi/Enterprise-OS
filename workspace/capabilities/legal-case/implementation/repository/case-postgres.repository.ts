import { Pool } from "pg";
import { PostgresRepository } from "../../../identity/implementation/repositories/base.repository.js";
import {
  CaseId,
  type CaseAggregate,
  type CaseRepository,
  CaseStatus,
  CasePriority,
} from "../contracts/case.contracts.js";

// PostgreSQL-backed case repository implementation
class CaseRepositoryPostgresImpl extends PostgresRepository<any> implements CaseRepository {
  readonly entityName = "Case" as const;
  readonly kind = "repository" as const;

  constructor() {
    super("cases");
  }

  // Convert database record to domain aggregate
  private toAggregate(record: any): CaseAggregate {
    return {
      id: CaseId(record.id),
      title: record.title,
      description: record.description,
      status: record.status as CaseStatus,
      priority: record.priority as CasePriority,
      lawyerId: record.lawyer_id,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      ...(record.closed_at && { closedAt: new Date(record.closed_at) }),
    } as CaseAggregate;
  }

  // Convert domain aggregate to database record
  private toRecord(entity: CaseAggregate): any {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      status: entity.status,
      priority: entity.priority,
      lawyer_id: entity.lawyerId,
      tenant_id: (entity as any).tenantId,
      workspace_id: (entity as any).workspaceId,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      ...(entity.closedAt && { closed_at: entity.closedAt }),
    };
  }

  async byId(id: CaseId): Promise<CaseAggregate | undefined> {
    const result = await this.pool.query(
      "SELECT * FROM cases WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  async list(): Promise<readonly CaseAggregate[]> {
    const result = await this.pool.query("SELECT * FROM cases");
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async listByTenant(tenantId: string): Promise<readonly CaseAggregate[]> {
    const result = await this.pool.query(
      "SELECT * FROM cases WHERE tenant_id = $1",
      [tenantId]
    );
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async listByWorkspace(workspaceId: string): Promise<readonly CaseAggregate[]> {
    const result = await this.pool.query(
      "SELECT * FROM cases WHERE workspace_id = $1",
      [workspaceId]
    );
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async save(entity: CaseAggregate): Promise<CaseAggregate> {
    const exists = await this.byId(entity.id);
    const record = this.toRecord(entity);
    const columns = Object.keys(record);
    const values = Object.values(record);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

    if (exists) {
      // Update existing
      const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(", ");
      await this.pool.query(
        `UPDATE cases SET ${setClause} WHERE id = $${values.length + 1}`,
        [...values, entity.id]
      );
    } else {
      // Insert new
      await this.pool.query(
        `INSERT INTO cases (${columns.join(", ")}) VALUES (${placeholders})`,
        values
      );
    }

    const updated = { ...entity, updatedAt: new Date() } as CaseAggregate;
    return this.toAggregate(this.toRecord(updated));
  }

  async remove(id: CaseId): Promise<boolean> {
    const result = await this.pool.query(
      "DELETE FROM cases WHERE id = $1 RETURNING id",
      [id]
    );
    return result.rows.length > 0;
  }
}

// Lazy initialization function to avoid eager Postgres pool creation
let caseRepositoryPostgresInstance: CaseRepositoryPostgresImpl | null = null;

export function getCaseRepositoryPostgres(): CaseRepository {
  if (!caseRepositoryPostgresInstance) {
    caseRepositoryPostgresInstance = new CaseRepositoryPostgresImpl();
  }
  return caseRepositoryPostgresInstance;
}

const _lazyPgCaseRepo: CaseRepository = new Proxy({} as CaseRepository, {
  get(_target: any, prop: string | symbol) {
    const real = getCaseRepositoryPostgres();
    const method = (real as any)[prop];
    if (typeof method === "function") {
      return method.bind(real);
    }
    return method;
  },
});

export const CaseRepositoryPostgres = _lazyPgCaseRepo;