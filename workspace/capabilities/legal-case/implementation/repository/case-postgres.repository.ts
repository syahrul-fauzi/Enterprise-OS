import { PostgresRepository, getWORK_REPO, safeRecordEvidence } from "../../../work-core/implementation/index.js";
import { createDeviceId, newDeviceId } from "../../../../packages/contracts-core/src/index.js";
import { DatabaseMigrationManager } from "../../../shared/implementation/database/migrations/migration.manager.js";
import { isBuildPhase } from "../../../shared/implementation/database/health.check.js";
import {
  CaseId,
  type CaseAggregate,
  type CaseRepository,
  CaseStatus,
  CasePriority,
} from "../../contracts/index.js";

// Reuse base class pool from PostgresRepository - no need to create separate write/read pools
// All database connections are managed by the base class getPool() implementation


import { recordRuntimeInvocation } from "../../../../packages/core/runtime/src/index.js";

// PostgreSQL-backed case repository implementation
class CaseRepositoryPostgresImpl extends PostgresRepository<any> implements CaseRepository {
  readonly entityName = "Case" as const;
  readonly kind = "repository" as const;

  constructor() {
    super("cases");
  }

  /**
   * Expose base pool for health checking (reuse base class pool property)
   * Backward compatible with existing health check system
   */
  getPool(): any {
    return (this as any).pool;
  }

  // Implement required save method from CaseRepository interface
  // Reuse base PostgresRepository.save() yang sudah mengimplementasikan upsert logic dengan optimistic concurrency
  async save(caseAggregate: CaseAggregate): Promise<CaseAggregate> {
    return super.save(caseAggregate);
  }

  // Convert database record to domain aggregate - implements base.repository.ts abstract protected method
  // PROD-002-10: Full CMBCD fields deserialization from database
  protected toAggregate(record: any): CaseAggregate {
    return {
      id: CaseId(record.id),
      title: record.title,
      description: record.description,
      status: record.status as CaseStatus,
      priority: record.priority as CasePriority,
      lawyerId: record.lawyer_id,
      workId: record.work_id, // CORE-001: workId adalah satu-satunya sumber truth untuk boundary metadata
      sourceDiscussionId: record.source_discussion_id,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      ...(record.closed_at && { closedAt: new Date(record.closed_at) }),
      // PROD-002-10: CMBCD fields deserialized from JSONB columns
      actorMetadata: record.actor_metadata ? JSON.parse(record.actor_metadata) : undefined,
      allowedCapabilities: record.allowed_capabilities ? JSON.parse(record.allowed_capabilities) : [],
      authorization: record.authorization ? JSON.parse(record.authorization) : undefined,
      context: record.case_context ? JSON.parse(record.case_context) : undefined,
      risk: record.risk_assessment ? JSON.parse(record.risk_assessment) : undefined,
      executionFrame: record.execution_frame,
      executionContext: record.execution_context ? JSON.parse(record.execution_context) : undefined,
      evidence: record.evidence ? JSON.parse(record.evidence) : [],
      // Load intent dari database jika ada (Intent primitive integration)
      ...(record.intent && { intent: record.intent }),
    } as CaseAggregate;
  }

  // Convert domain aggregate to database record - implements base.repository.ts abstract protected method
  // PROD-002-10: Full CMBCD fields serialization to database
  protected toRecord(entity: CaseAggregate): any {
    // CORE-001: workId WAJIB diisi - tidak boleh fallback ke entity.id
    if (!entity.workId) {
      throw new Error("[CaseRepositoryPostgres] CaseAggregate must have workId set (CORE-001 mandate)");
    }
    // PROD-002-10: CMBCD fields wajib diisi pada save (enforce non-entity-centric initialization)
    if (!entity.actorMetadata || !entity.authorization || !entity.context || !entity.risk) {
      throw new Error("[CaseRepositoryPostgres] CaseAggregate must have all CMBCD fields set (PROD-002-10 mandate)");
    }
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      status: entity.status,
      priority: entity.priority,
      lawyer_id: entity.lawyerId,
      work_id: entity.workId,
      source_discussion_id: entity.sourceDiscussionId,
      // Extract tenantId/workspaceId dari CMBCD context (sumber truth terpusat)
      tenant_id: entity.context.tenantId,
      workspace_id: entity.context.workspaceId,
      actor_id: entity.actorMetadata.actorId,
      // PROD-002-10: Serialize CMBCD fields ke JSONB columns untuk queryability
      actor_metadata: JSON.stringify(entity.actorMetadata),
      allowed_capabilities: JSON.stringify(entity.allowedCapabilities),
      authorization: JSON.stringify(entity.authorization),
      case_context: JSON.stringify(entity.context),
      risk_assessment: JSON.stringify(entity.risk),
      execution_frame: entity.executionFrame,
      execution_context: entity.executionContext ? JSON.stringify(entity.executionContext) : null,
      evidence: entity.evidence ? JSON.stringify(entity.evidence) : JSON.stringify([]),
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      // Simpan intent JSON jika ada (Intent primitive integration)
      ...((entity as any).intent && { intent: (entity as any).intent }),
      ...(entity.closedAt && { closed_at: entity.closedAt }),
    };
  }

  async byId(id: CaseId, context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<CaseAggregate | undefined> {
    let query = "SELECT * FROM cases WHERE id = $1";
    const params: any[] = [id];
    let paramIndex = 2;
    
    // CORE-001: Enforce tenant isolation - prioritize workId over workspaceId, workspace is optional execution boundary
    if (context) {
      query += " AND tenant_id = $2";
      params.push(context.tenantId);
      paramIndex++;
      if (context?.workId) {
        query += " AND work_id = $3";
        params.push(context.workId);
      } else if (context?.workspaceId) {
        // Fallback to workspace only when workId is not provided (maintain backward compatibility)
        query += " AND workspace_id = $3";
        params.push(context.workspaceId);
      }
    }
    
    const result = await this.pool.query(query, params);
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  async list(context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<readonly CaseAggregate[]> {
    let query = "SELECT * FROM cases";
    const params: any[] = [];
    let paramIndex = 1;
    
    if (context) {
      query += " WHERE tenant_id = $1";
      params.push(context.tenantId);
      paramIndex++;
      if (context?.workId) {
        query += " AND work_id = $2";
        params.push(context.workId);
      } else if (context?.workspaceId) {
        // Fallback to workspace only when workId is not provided
        query += " AND workspace_id = $2";
        params.push(context.workspaceId);
      }
    }
    
    const result = await this.pool.query(query, params);
    return result.rows.map((row: any) => this.toAggregate(row));
  }

  // CORE-001: listByWorkIds menggantikan listByTenant/listByWorkspace - hanya fetch cases yang terikat ke Work yang diizinkan
  // Enforces Work-centric model precedence: workId > workspaceId per EOS architectural mandate
  // SLIC-003: Menambahkan context untuk workspace/tenant boundary enforcement (defense-in-depth)
  async listByWorkIds(workIds: readonly string[], context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<readonly CaseAggregate[]> {
    if (workIds.length === 0) return [];
    
    // PostgreSQL IN clause dengan parameterized queries untuk mencegah SQL injection
    const placeholders = workIds.map((_, i) => `$${i + 1}`).join(", ");
    let query = `SELECT * FROM cases WHERE work_id IN (${placeholders})`;
    const params: any[] = [...workIds];
    let paramIndex = workIds.length + 1;
    
    // SLIC-003: Enforce tenant isolation - prioritize workId over workspaceId, same pattern as byId/list
    if (context) {
      query += ` AND tenant_id = $${paramIndex}`;
      params.push(context.tenantId);
      paramIndex++;
      
      if (context?.workId) {
        query += ` AND work_id = $${paramIndex}`;
        params.push(context.workId);
      } else if (context?.workspaceId) {
        // Fallback to workspace only when workId is not provided (maintain backward compatibility)
        query += ` AND workspace_id = $${paramIndex}`;
        params.push(context.workspaceId);
      }
    }
    
    try {
      const result = await this.pool.query(query, params);
      return result.rows.map((row: any) => this.toAggregate(row));
    } catch (error) {
      console.error("[CaseRepositoryPostgres] listByWorkIds failed:", error);
      throw error;
    }
  }

  // Use base.repository.ts's save() method which implements the abstract protected toRecord()/toAggregate() pattern
  // This ensures consistent camelCase→snake_case mapping across all repositories

  async remove(id: CaseId, context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<boolean> {
    let query = "DELETE FROM cases WHERE id = $1 RETURNING id";
    const params: any[] = [id];
    let paramIndex = 2;
    
    if (context) {
      query += " AND tenant_id = $2";
      params.push(context.tenantId);
      paramIndex++;
      if (context?.workId) {
        query += " AND work_id = $3";
        params.push(context.workId);
      } else if (context?.workspaceId) {
        // Fallback to workspace only when workId is not provided
        query += " AND workspace_id = $3";
        params.push(context.workspaceId);
      }
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
        tenant_id: context?.tenantId || undefined,
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
        tenant_id: context?.tenantId || undefined
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