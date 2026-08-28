import { Pool } from "pg";
import { PostgresRepository } from "../../../identity/implementation/repositories/base.repository";
import { DatabaseMigrationManager } from "../../../shared/implementation/database/migrations/migration.manager";
import {
  CaseId,
  type CaseAggregate,
  type CaseRepository,
  CaseStatus,
  CasePriority,
} from "../../contracts/case.contracts";

// Validate required environment variables in production - matches communication.postgres.repository.ts pattern
// EXCEPTION: Skip during Next.js build phase (phase-production-build) because build-time static analysis runs in "production" NODE_ENV but has no DB connection
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
if (process.env.NODE_ENV === "production" && !isBuildPhase && !process.env.POSTGRES_CONNECTION_STRING) {
  throw new Error("[CaseRepositoryPostgres] FATAL: POSTGRES_CONNECTION_STRING environment variable is required in production");
}

// Read replica configuration for horizontal scaling of read-heavy legal case queries
// Separate write primary from read replicas to distribute load - matches communication.postgres.repository.ts pattern
const writePool = new Pool({
  connectionString: process.env.POSTGRES_WRITE_CONNECTION_STRING || process.env.POSTGRES_CONNECTION_STRING || "postgresql://localhost:5432/eos_identity",
  max: 10, // Smaller pool for writes (fewer write operations)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const readPool = new Pool({
  connectionString: process.env.POSTGRES_READ_CONNECTION_STRING || process.env.POSTGRES_CONNECTION_STRING || "postgresql://localhost:5432/eos_identity",
  max: 30, // Larger pool for read-heavy case queries
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Run migrations on initialization - ensures schema is always up-to-date
let migrationsInitialized = false;
async function initializeDatabase() {
  if (migrationsInitialized) return;
  const result = await DatabaseMigrationManager.runMigrations(writePool);
  if (result.errors.length > 0) {
    console.error("[CaseRepositoryPostgres] Database initialization failed:", result.errors);
    throw new Error(`Database migration failed: ${result.errors.join(", ")}`);
  }
  console.log(`[CaseRepositoryPostgres] Database initialized: ${result.executed.length} migrations executed, ${result.already_applied.length} already applied`);
  migrationsInitialized = true;
}

// Initialize on module load - only when not in build phase to prevent build failures
if (!isBuildPhase) {
  initializeDatabase().catch(err => console.error("[CaseRepositoryPostgres] Failed to initialize database:", err));
}

import { recordRuntimeInvocation } from "@repo/core-runtime";

// PostgreSQL-backed case repository implementation
class CaseRepositoryPostgresImpl extends PostgresRepository<any> implements CaseRepository {
  readonly entityName = "Case" as const;
  readonly kind = "repository" as const;

  constructor() {
    super("cases");
  }

  /**
   * Expose both pools for health checking and monitoring
   * Used by Kubernetes liveness/readiness probes - matches communication.postgres.repository.ts interface
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
      // Load intent dari database jika ada (Intent primitive integration)
      ...(record.intent && { intent: record.intent }),
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
      tenant_id: entity.tenantId,
      workspace_id: entity.workspaceId,
      actor_id: entity.actorId,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      // Simpan intent JSON jika ada (Intent primitive integration)
      ...((entity as any).intent && { intent: (entity as any).intent }),
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