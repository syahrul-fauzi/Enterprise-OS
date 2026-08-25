import { Pool } from "pg";
import type { CapabilityCommand } from "@repo/core-kernel";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import { PostgresRepository } from "@capabilities/identity/implementation/repositories/base.repository.js";
import {
  DocumentId,
  type DocumentAggregate,
  type DocumentRepository,
  DocumentStatus,
} from "../contracts/document.contracts.js";

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

  async byId(id: DocumentId, context?: { tenantId: string; workspaceId: string }): Promise<DocumentAggregate | undefined> {
    let query = "SELECT * FROM documents WHERE id = $1";
    const params: any[] = [id];
    
    // WORK-015: Enforce tenant isolation - always filter by tenant/workspace if context is provided
    if (context) {
      query += " AND tenant_id = $2 AND workspace_id = $3";
      params.push(context.tenantId, context.workspaceId);
    }
    
    const result = await this.pool.query(query, params);
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  async list(context?: { tenantId: string; workspaceId: string }): Promise<readonly DocumentAggregate[]> {
    let query = "SELECT * FROM documents";
    const params: any[] = [];
    
    // WORK-015: Filter by tenant/workspace if context is provided
    if (context) {
      query += " WHERE tenant_id = $1 AND workspace_id = $2";
      params.push(context.tenantId, context.workspaceId);
    }
    
    const result = await this.pool.query(query, params);
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

  async listByMatter(matterId: string, context?: { tenantId: string; workspaceId: string }): Promise<readonly DocumentAggregate[]> {
    let query = "SELECT * FROM documents WHERE matter_id = $1";
    const params: any[] = [matterId];
    
    // WORK-015: Enforce tenant isolation - always filter by tenant/workspace if context is provided
    if (context) {
      query += " AND tenant_id = $2 AND workspace_id = $3";
      params.push(context.tenantId, context.workspaceId);
    }
    
    const result = await this.pool.query(query, params);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  async save(entity: DocumentAggregate & { tenantId?: string; workspaceId?: string; actorId?: string; version?: number }, context?: { tenantId: string; workspaceId: string; actorId: string }): Promise<DocumentAggregate> {
    try {
      // WORK-015: Enforce tenant isolation - ensure entity always has tenant/workspace context
      if (context) {
        entity.tenantId = context.tenantId;
        entity.workspaceId = context.workspaceId;
        entity.actorId = context.actorId;
      }
      
      const exists = await this.byId(entity.id, context);
      const record = this.toRecord(entity);
      const columns = Object.keys(record);
      const values = Object.values(record);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

      if (exists) {
        // Optimistic concurrency control - verify versions match
        if ((entity as any).version !== (exists as any).version) {
          // WORK-015: Log version conflict
          recordRuntimeInvocation({
            capabilityId: "legal-document",
            operationId: "repository.save",
            sourceRef: "DocumentRepositoryPostgres.save",
            success: false,
            input: { entityId: entity.id, previousVersion: (entity as any).version || 0 },
            result: { reason: "version_conflict", expectedVersion: (exists as any).version },
            tenant_id: context?.tenantId || null,
            decision_id: null
          });
          throw new Error(`Document version conflict: expected ${(exists as any).version}, got ${(entity as any).version}`);
        }
        // Increment version
        (entity as any).version = (exists as any).version + 1;
        
        // Update existing
        const updatedEntity = { ...entity, updatedAt: new Date() };
        const updatedRecord = this.toRecord(updatedEntity);
        const updateColumns = Object.keys(updatedRecord);
        const updateValues = Object.values(updatedRecord);
        const setClause = updateColumns.map((col, i) => `${col} = $${i + 1}`).join(", ");
        await this.pool.query(
          `UPDATE documents SET ${setClause} WHERE id = $${updateValues.length + 1}`,
          [...updateValues, entity.id]
        );
        
        // WORK-015: Append successful update to audit ledger
        recordRuntimeInvocation({
          capabilityId: "legal-document",
          operationId: "repository.save",
          sourceRef: "DocumentRepositoryPostgres.save",
          success: true,
          input: { entityId: entity.id, previousVersion: (entity as any).version || 0 },
          result: { newVersion: (entity as any).version, operation: "update" },
          tenant_id: context?.tenantId || null,
          decision_id: null,
          inputRefs: [entity.id],
          outputRefs: [entity.id]
        });
        
        return this.toAggregate(this.toRecord(updatedEntity));
      } else {
        // New entity - initialize version
        (entity as any).version = 1;
        // Insert new
        const newEntity = { ...entity, createdAt: new Date(), updatedAt: new Date() };
        const newRecord = this.toRecord(newEntity);
        const newColumns = Object.keys(newRecord);
        const newValues = Object.values(newRecord);
        const newPlaceholders = newValues.map((_, i) => `$${i + 1}`).join(", ");
        await this.pool.query(
          `INSERT INTO documents (${newColumns.join(", ")}) VALUES (${newPlaceholders})`,
          newValues
        );
        
        // WORK-015: Append successful creation to audit ledger
        recordRuntimeInvocation({
          capabilityId: "legal-document",
          operationId: "repository.save",
          sourceRef: "DocumentRepositoryPostgres.save",
          success: true,
          input: { entityId: entity.id, isNew: true },
          result: { newVersion: (entity as any).version, operation: "create" },
          tenant_id: context?.tenantId || null,
          decision_id: null,
          inputRefs: [entity.id],
          outputRefs: [entity.id]
        });
        
        return this.toAggregate(this.toRecord(newEntity));
      }
    } catch (error) {
      // Re-throw the error after logging it if not already logged
      if (!((error as Error).message.includes("version conflict"))) {
        recordRuntimeInvocation({
          capabilityId: "legal-document",
          operationId: "repository.save",
          sourceRef: "DocumentRepositoryPostgres.save",
          success: false,
          input: { entityId: entity.id },
          result: { reason: "database_error", error: (error as Error).message },
          tenant_id: context?.tenantId || null,
          decision_id: null
        });
      }
      throw error;
    }
  }

  async remove(id: DocumentId, context?: { tenantId: string; workspaceId: string }): Promise<boolean> {
    const entity = await this.byId(id, context);
    if (!entity) {
      // WORK-015: Log failed deletion attempt
      recordRuntimeInvocation({
        capabilityId: "legal-document",
        operationId: "repository.remove",
        sourceRef: "DocumentRepositoryPostgres.remove",
        success: false,
        input: { entityId: id },
        result: { reason: "entity_not_found" },
        tenant_id: context?.tenantId || null,
        decision_id: null
      });
      return false;
    }
    
    let query = "DELETE FROM documents WHERE id = $1";
    const params: any[] = [id];
    
    // WORK-015: Enforce tenant isolation - only allow deletion within tenant/workspace context
    if (context) {
      query += " AND tenant_id = $2 AND workspace_id = $3";
      params.push(context.tenantId, context.workspaceId);
    }
    
    const result = await this.pool.query(`${query} RETURNING id`, params);
    const deleted = result.rows.length > 0;
    
    if (deleted) {
      // WORK-015: Append successful deletion to audit ledger
      recordRuntimeInvocation({
        capabilityId: "legal-document",
        operationId: "repository.remove",
        sourceRef: "DocumentRepositoryPostgres.remove",
        success: true,
        input: { entityId: id },
        result: { deleted: true },
        tenant_id: context?.tenantId || null,
        decision_id: null,
        inputRefs: [id]
      });
    }
    
    return deleted;
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