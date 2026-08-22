import { Pool } from "pg";
import { PostgresRepository } from "../../../identity/implementation/repositories/base.repository.js";
import {
  DocumentId,
  type DocumentAggregate,
  type DocumentRepository,
  DocumentStatus,
} from "../contracts/index.js";

// PostgreSQL-backed document repository implementation
class DocumentRepositoryPostgresImpl extends PostgresRepository<any> implements DocumentRepository {
  readonly entityName = "Document" as const;
  readonly kind = "repository" as const;

  constructor() {
    super("documents");
  }

  // Convert database record to domain aggregate
  protected toAggregate(record: any): DocumentAggregate {
    return {
      id: DocumentId(record.id),
      workId: record.work_id,
      title: record.title,
      description: record.description,
      status: record.status as DocumentStatus,
      matterId: record.matter_id,
      author: record.author,
      tenantId: record.tenant_id,
      workspaceId: record.workspace_id,
      actorId: record.actor_id,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      ...(record.signed_at && { signedAt: new Date(record.signed_at) }),
      ...(record.archived_at && { archivedAt: new Date(record.archived_at) }),
    } as DocumentAggregate;
  }

  // Convert domain aggregate to database record
  protected toRecord(entity: DocumentAggregate & { tenantId?: string; workspaceId?: string; actorId?: string }): any {
    return {
      id: entity.id,
      work_id: entity.workId,
      title: entity.title,
      description: entity.description,
      status: entity.status,
      matter_id: entity.matterId,
      author: entity.author,
      tenant_id: entity.tenantId,
      workspace_id: entity.workspaceId,
      actor_id: entity.actorId,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      ...(entity.signedAt && { signed_at: entity.signedAt.getTime() }),
      ...(entity.archivedAt && { archived_at: entity.archivedAt.getTime() }),
    };
  }

  async byId(id: DocumentId): Promise<DocumentAggregate | undefined> {
    const result = await this.pool.query(
      "SELECT * FROM documents WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  async list(): Promise<readonly DocumentAggregate[]> {
    const result = await this.pool.query("SELECT * FROM documents");
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async listByTenant(tenantId: string): Promise<readonly DocumentAggregate[]> {
    const result = await this.pool.query(
      "SELECT * FROM documents WHERE tenant_id = $1",
      [tenantId]
    );
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async listByWorkspace(workspaceId: string): Promise<readonly DocumentAggregate[]> {
    const result = await this.pool.query(
      "SELECT * FROM documents WHERE workspace_id = $1",
      [workspaceId]
    );
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async listByMatter(matterId: string): Promise<readonly DocumentAggregate[]> {
    const result = await this.pool.query(
      "SELECT * FROM documents WHERE matter_id = $1",
      [matterId]
    );
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async save(entity: DocumentAggregate & { tenantId?: string; workspaceId?: string; actorId?: string }): Promise<DocumentAggregate> {
    const exists = await this.byId(entity.id);
    const record = this.toRecord(entity);
    const columns = Object.keys(record);
    const values = Object.values(record);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

    if (exists) {
      // Update existing
      const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(", ");
      await this.pool.query(
        `UPDATE documents SET ${setClause} WHERE id = $${values.length + 1}`,
        [...values, entity.id]
      );
    } else {
      // Insert new
      await this.pool.query(
        `INSERT INTO documents (${columns.join(", ")}) VALUES (${placeholders})`,
        values
      );
    }

    const updated = { ...entity, updatedAt: new Date() } as DocumentAggregate;
    return this.toAggregate(this.toRecord(updated));
  }

  async remove(id: DocumentId): Promise<boolean> {
    const result = await this.pool.query(
      "DELETE FROM documents WHERE id = $1 RETURNING id",
      [id]
    );
    return result.rows.length > 0;
  }
}

// Lazy initialization function to avoid eager Postgres pool creation
let documentRepositoryPostgresInstance: DocumentRepositoryPostgresImpl | null = null;

export function getDocumentRepositoryPostgres(): DocumentRepository {
  if (!documentRepositoryPostgresInstance) {
    documentRepositoryPostgresInstance = new DocumentRepositoryPostgresImpl();
  }
  return documentRepositoryPostgresInstance;
}

// Lazy proxy for consistent API with in-memory repository
const _lazyPgDocRepo: DocumentRepository = new Proxy({} as DocumentRepository, {
  get(_target: any, prop: string | symbol) {
    const real = getDocumentRepositoryPostgres();
    const method = (real as any)[prop];
    if (typeof method === "function") {
      return method.bind(real);
    }
    return method;
  },
});

export const DocumentRepositoryPostgres = _lazyPgDocRepo;