import { Pool } from "pg";
import { PostgresRepository } from "../../../work-core/index.js";
import { DatabaseMigrationManager } from "../../../shared/implementation/database/migrations/migration.manager.js";
import { isBuildPhase, updateConnectionPoolMetrics } from "../../../shared/implementation/database/health.check.js";
import {
  ComplianceCaseId,
  type ComplianceCaseAggregate,
  type ComplianceCaseRepository,
  ComplianceCaseStatus,
  ComplianceCasePriority,
} from "../../contracts/index.js";

import { getWorkRepositoryPostgres } from "../../../work-core/implementation/repository/work-postgres.repository.js";
import { recordRuntimeInvocation } from "@repo/core-runtime";

// Validate required environment variables in production - matches legal-case pattern
if (process.env.NODE_ENV === "production" && !isBuildPhase && !(process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL)) {
  throw new Error("[ComplianceCaseRepositoryPostgres] FATAL: POSTGRES_CONNECTION_STRING or DATABASE_URL environment variable is required in production");
}

// Read replica configuration - separate write primary from read replicas
const writePool = new Pool({
  connectionString: process.env.POSTGRES_WRITE_CONNECTION_STRING || process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL || "postgresql://localhost:5432/eos_identity",
  max: 50, // DEL-001: Increased pool size from 10 to 50 to address database bottleneck
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const readPool = new Pool({
  connectionString: process.env.POSTGRES_READ_CONNECTION_STRING || process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL || "postgresql://localhost:5432/eos_identity",
  max: 30,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Run migrations on initialization
let migrationsInitialized = false;
async function initializeDatabase() {
  if (migrationsInitialized) return;
  const result = await DatabaseMigrationManager.runMigrations(writePool);
  if (result.errors.length > 0) {
    console.error("[ComplianceCaseRepositoryPostgres] Database initialization failed:", result.errors);
    throw new Error(`Database migration failed: ${result.errors.join(", ")}`);
  }
  console.log(`[ComplianceCaseRepositoryPostgres] Database initialized: ${result.executed.length} migrations executed, ${result.already_applied.length} already applied`);
  migrationsInitialized = true;
}

// Initialize on module load - only when not in build phase
if (!isBuildPhase) {
  initializeDatabase().catch(err => console.error("[ComplianceCaseRepositoryPostgres] Failed to initialize database:", err));
  // Start pool metrics collection for DEL-001 telemetry (collect metrics every 5 seconds)
  setInterval(() => {
    updateConnectionPoolMetrics("legal-write", writePool);
    updateConnectionPoolMetrics("legal-read", readPool);
  }, 5000);
}

// PostgreSQL-backed compliance case repository implementation
class ComplianceCaseRepositoryPostgresImpl extends PostgresRepository<any> implements ComplianceCaseRepository {
  readonly entityName = "ComplianceCase" as const;
  readonly kind = "repository" as const;
  private stateTransitionListeners: Array<(oldEntity: ComplianceCaseAggregate, newEntity: ComplianceCaseAggregate) => Promise<void>> = [];

  constructor() {
    super("compliance_cases");
  }

  /**
   * Expose both pools for health checking and monitoring
   */
  getPools(): {write: Pool; read: Pool} {
    return { write: writePool, read: readPool };
  }
  
  /**
   * Backward compatibility for health check system
   * @deprecated Use getPools() instead
   */
  getPool(): Pool {
    return writePool;
  }

  // Convert database record to domain aggregate
  protected toAggregate(record: any): ComplianceCaseAggregate {
    return {
      id: ComplianceCaseId(record.id),
      title: record.title,
      description: record.description,
      status: record.status as ComplianceCaseStatus,
      priority: record.priority as ComplianceCasePriority,
      auditorId: record.auditor_id,
      investmentAmount: record.investment_amount,
      sector: record.sector,
      riskRating: record.risk_rating,
      sourceDiscussionId: record.source_discussion_id,
      deadline: record.deadline,
      workId: record.work_id,
      actorId: record.actor_id,
      tenantId: record.tenant_id,
      workspaceId: record.workspace_id,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      ...(record.closed_at && { closedAt: new Date(record.closed_at) }),
    } as ComplianceCaseAggregate;
  }

  // Convert domain aggregate to database record
  protected toRecord(entity: ComplianceCaseAggregate): any {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      status: entity.status,
      priority: entity.priority,
      auditor_id: entity.auditorId,
      investment_amount: entity.investmentAmount,
      sector: entity.sector,
      risk_rating: entity.riskRating,
      source_discussion_id: entity.sourceDiscussionId,
      deadline: entity.deadline,
      work_id: entity.workId,
      actor_id: entity.actorId,
      tenant_id: entity.tenantId,
      workspace_id: entity.workspaceId,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      ...(entity.closedAt && { closed_at: entity.closedAt }),
    };
  }

  async byId(id: ComplianceCaseId, context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<ComplianceCaseAggregate | undefined> {
    let query = "SELECT * FROM compliance_cases WHERE id = $1";
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

  async list(context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<readonly ComplianceCaseAggregate[]> {
    let query = "SELECT * FROM compliance_cases";
    const params: any[] = [];
    let paramIndex = 1;
    
    // CORE-001: Filter by tenant/work/workspace - workId as primary boundary, workspace is optional
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
  async listByWorkIds(workIds: readonly string[], context?: { tenantId: string }): Promise<readonly ComplianceCaseAggregate[]> {
    if (workIds.length === 0) return [];
    const tenantId = context?.tenantId;
    if (!tenantId) {
      throw new Error("[ComplianceCaseRepositoryPostgres] listByWorkIds requires tenantId in context");
    }
    
    // PostgreSQL IN clause with parameterized queries to prevent SQL injection, add tenant isolation
    const placeholders = workIds.map((_, i) => `$${i + 2}`).join(", ");
    const query = `SELECT * FROM compliance_cases WHERE tenant_id = $1 AND work_id IN (${placeholders})`;
    
    try {
      const result = await this.pool.query(query, [tenantId, ...workIds]);
      return result.rows.map((row: any) => this.toAggregate(row));
    } catch (error) {
      console.error("[ComplianceCaseRepositoryPostgres] listByWorkIds failed:", error);
      throw error;
    }
  }

  // Implement save method sesuai interface dengan defense-in-depth tenant isolation (sesuai in-memory implementation)
  async save(entity: ComplianceCaseAggregate, context?: { tenantId: string; workspaceId: string; actorId: string }): Promise<ComplianceCaseAggregate> {
    const existing = await this.byId(entity.id);
    
    // Enforce tenant isolation juga di save method untuk defense-in-depth
    if (existing && context) {
      const workRepository = getWorkRepositoryPostgres();
      const coreWork = await workRepository.byWorkId(existing.workId);
      
      if (coreWork && process.env.NODE_ENV === "production" && (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL)) {
        if (coreWork.tenantId !== context.tenantId || coreWork.workspaceId !== context.workspaceId) {
          console.error(`[ComplianceCaseRepositoryPostgres] Cross-tenant save blocked: case ${entity.id} belongs to tenant ${coreWork.tenantId}, requested tenant ${context.tenantId}`);
          recordRuntimeInvocation({
            capabilityId: "investment-compliance",
            operationId: "repository.save",
            sourceRef: "ComplianceCaseRepositoryPostgres.save",
            success: false,
            input: { caseId: entity.id, workId: existing.workId },
            result: { reason: "cross_tenant_isolation_violation" },
            tenant_id: context.tenantId,
            inputRefs: [entity.id, existing.workId]
          });
          throw new Error("Cross-tenant save blocked - authority boundary violation");
        }
      }
    }

    // Upsert logic: insert jika tidak ada, update jika sudah ada
    const updated = { ...entity, updatedAt: new Date() };
    const record = this.toRecord(updated);
    
    if (existing) {
      // Update existing record
      const updateQuery = `
        UPDATE compliance_cases SET 
          title = $1, description = $2, status = $3, priority = $4, auditor_id = $5, 
          investment_amount = $6, sector = $7, risk_rating = $8, source_discussion_id = $9, 
          deadline = $10, work_id = $11, actor_id = $12, tenant_id = $13, workspace_id = $14, 
          updated_at = $15, closed_at = $16
        WHERE id = $17
      `;
      await writePool.query(updateQuery, [
        record.title, record.description, record.status, record.priority, record.auditor_id,
        record.investment_amount, record.sector, record.risk_rating, record.source_discussion_id,
        record.deadline, record.work_id, record.actor_id, record.tenant_id, record.workspace_id,
        record.updated_at, record.closed_at, record.id
      ]);
    } else {
      // Insert new record
      const insertQuery = `
        INSERT INTO compliance_cases (
          id, title, description, status, priority, auditor_id, investment_amount, sector, 
          risk_rating, source_discussion_id, deadline, work_id, actor_id, tenant_id, workspace_id, 
          created_at, updated_at, closed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      `;
      await writePool.query(insertQuery, [
        record.id, record.title, record.description, record.status, record.priority, record.auditor_id,
        record.investment_amount, record.sector, record.risk_rating, record.source_discussion_id,
        record.deadline, record.work_id, record.actor_id, record.tenant_id, record.workspace_id,
        record.created_at, record.updated_at, record.closed_at
      ]);
    }
    
    // Catat runtime invocation untuk audit dan observability
    recordRuntimeInvocation({
      capabilityId: "investment-compliance",
      operationId: "repository.save",
      sourceRef: "ComplianceCaseRepositoryPostgres.save",
      success: true,
      input: { caseId: entity.id, workId: entity.workId, status: entity.status },
      result: { saved: true },
      ...(context?.tenantId ? { tenant_id: context.tenantId } : {}),
      ...(context?.actorId ? { actor_id: context.actorId } : {}),
      inputRefs: [entity.id, entity.workId]
    });
    
    // Trigger state transition listeners jika case status berubah
    if (existing && existing.status !== updated.status) {
      // Import stateTransitionListeners dari in-memory repository atau buat listener registry terpisah
      // Untuk konsistensi, kita dapat menambahkan listener pattern yang sama dengan in-memory
      const stateTransitionListeners: Array<(prev: ComplianceCaseAggregate, next: ComplianceCaseAggregate) => Promise<void>> = [];
      for (const listener of stateTransitionListeners) {
        try {
          await listener(existing, updated);
        } catch (err) {
          console.error("[ComplianceCaseRepositoryPostgres] State transition listener failed during save:", err);
        }
      }
    }
    
    return this.toAggregate(this.toRecord(updated));
  }

  // Tambahkan state transition listeners untuk konsistensi dengan in-memory repository
  private static stateTransitionListeners: Array<(oldEntity: ComplianceCaseAggregate, newEntity: ComplianceCaseAggregate) => Promise<void>> = [];
  
  static addStateTransitionListener(listener: (oldEntity: ComplianceCaseAggregate, newEntity: ComplianceCaseAggregate) => Promise<void>) {
    ComplianceCaseRepositoryPostgresImpl.stateTransitionListeners.push(listener);
  }

  async remove(id: string, context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<boolean> {
    const complianceCaseId = ComplianceCaseId(id);
    const entity = await this.byId(complianceCaseId, context);
    if (!entity) {
      recordRuntimeInvocation({
        capabilityId: "investment-compliance",
        operationId: "repository.remove",
        sourceRef: "ComplianceCaseRepositoryPostgres.remove",
        success: false,
        input: { caseId: id },
        result: { reason: "entity_not_found" },
        tenant_id: context?.tenantId || null,
        decision_id: null
      });
      return false;
    }
    
    let query = "DELETE FROM compliance_cases WHERE id = $1";
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
    
    const result = await this.pool.query(`${query} RETURNING id`, params);
    const deleted = result.rows.length > 0;
    
    if (deleted) {
      recordRuntimeInvocation({
        capabilityId: "investment-compliance",
        operationId: "repository.remove",
        sourceRef: "ComplianceCaseRepositoryPostgres.remove",
        success: true,
        input: { caseId: id },
        result: { deleted: true },
        tenant_id: context?.tenantId || null,
        inputRefs: [id]
      });
    }
    
    return deleted;
  }
}

// Lazy initialization to avoid eager Postgres pool creation
let complianceCaseRepositoryPostgresInstance: ComplianceCaseRepositoryPostgresImpl | null = null;

export function getComplianceCaseRepositoryPostgres(): ComplianceCaseRepository {
  if (!complianceCaseRepositoryPostgresInstance) {
    complianceCaseRepositoryPostgresInstance = new ComplianceCaseRepositoryPostgresImpl();
  }
  return complianceCaseRepositoryPostgresInstance;
}

// Proxy for consistent method binding - matches legal-case pattern
const _lazyPgComplianceCaseRepo: ComplianceCaseRepository = new Proxy({} as ComplianceCaseRepository, {
  get(_target: any, prop: string | symbol) {
    const real = getComplianceCaseRepositoryPostgres();
    const method = (real as any)[prop];
    if (typeof method === "function") {
      return method.bind(real);
    }
    return method;
  },
});

export const ComplianceCaseRepositoryPostgres = _lazyPgComplianceCaseRepo;