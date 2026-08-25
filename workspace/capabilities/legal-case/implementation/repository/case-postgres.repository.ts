import { Pool } from "pg";
import { recordRuntimeInvocation } from "../../../../packages/core/runtime/src/index.js";
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

  // Convert database record to domain aggregate - implements base.repository.ts abstract protected method
  protected toAggregate(record: any): CaseAggregate {
    return {
      id: CaseId(record.id),
      title: record.title,
      description: record.description,
      status: record.status as CaseStatus,
      priority: record.priority as CasePriority,
      lawyerId: record.lawyer_id,
      workId: record.work_id,
      sourceDiscussionId: record.source_discussion_id,
      actorId: record.actor_id,
      tenantId: record.tenant_id,
      workspaceId: record.workspace_id,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      ...(record.closed_at && { closedAt: new Date(record.closed_at) }),
    } as CaseAggregate;
  }

  // Convert domain aggregate to database record - implements base.repository.ts abstract protected method
  protected toRecord(entity: CaseAggregate): any {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      status: entity.status,
      priority: entity.priority,
      lawyer_id: entity.lawyerId,
      work_id: (entity as any).workId || entity.id,
      source_discussion_id: entity.sourceDiscussionId,
      tenant_id: (entity as any).tenantId,
      workspace_id: (entity as any).workspaceId,
      actor_id: (entity as any).actorId,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      ...(entity.closedAt && { closed_at: entity.closedAt }),
    };
  }

  async byId(id: CaseId, context?: { tenantId: string; workspaceId: string }): Promise<CaseAggregate | undefined> {
    let query = "SELECT * FROM cases WHERE id = $1";
    const params: any[] = [id];
    
    if (context) {
      query += " AND tenant_id = $2 AND workspace_id = $3";
      params.push(context.tenantId, context.workspaceId);
    }
    
    const result = await this.pool.query(query, params);
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  async list(context?: { tenantId: string; workspaceId: string }): Promise<readonly CaseAggregate[]> {
    let query = "SELECT * FROM cases";
    const params: any[] = [];
    
    if (context) {
      query += " WHERE tenant_id = $1 AND workspace_id = $2";
      params.push(context.tenantId, context.workspaceId);
    }
    
    const result = await this.pool.query(query, params);
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

  // Use base.repository.ts's save() method which implements the abstract protected toRecord()/toAggregate() pattern
  // This ensures consistent camelCase→snake_case mapping across all repositories

  async remove(id: CaseId, context?: { tenantId: string; workspaceId: string }): Promise<boolean> {
    let query = "DELETE FROM cases WHERE id = $1 RETURNING id";
    const params: any[] = [id];
    
    if (context) {
      query += " AND tenant_id = $2 AND workspace_id = $3";
      params.push(context.tenantId, context.workspaceId);
    }
    
    const result = await this.pool.query(query, params);
    
    // WORK-015: Log deletion in audit ledger
    if (result.rows.length > 0) {
      recordRuntimeInvocation({
        capabilityId: "legal-case",
        operationId: "repository.remove",
        sourceRef: "CaseRepositoryPostgres.remove",
        success: true,
        input: { caseId: id },
        result: { deleted: true },
        tenant_id: context?.tenantId || null,
        inputRefs: [id]
      });
    } else {
      recordRuntimeInvocation({
        capabilityId: "legal-case",
        operationId: "repository.remove",
        sourceRef: "CaseRepositoryPostgres.remove",
        success: false,
        input: { caseId: id },
        result: { reason: "entity_not_found_or_isolation_violation" },
        tenant_id: context?.tenantId || null
      });
    }
    
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