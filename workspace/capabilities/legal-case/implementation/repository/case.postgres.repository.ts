import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import type { CaseAggregate, CaseId, CaseStatus, CasePriority } from "../contracts/index";
import { DatabaseMigrationManager } from "@capabilities/shared/implementation/database/migrations/migration.manager";

// Validate required environment variables in production
if (process.env.NODE_ENV === "production" && !process.env.POSTGRES_CONNECTION_STRING) {
  throw new Error("[CaseRepositoryPostgres] FATAL: POSTGRES_CONNECTION_STRING environment variable is required in production");
}

// Read replica configuration for horizontal scaling (consistent with communication repository)
const writePool = new Pool({
  connectionString: process.env.POSTGRES_WRITE_CONNECTION_STRING || process.env.POSTGRES_CONNECTION_STRING || "postgresql://localhost:5432/eos_legal",
  max: 10, // Smaller pool for writes
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const readPool = new Pool({
  connectionString: process.env.POSTGRES_READ_CONNECTION_STRING || process.env.POSTGRES_CONNECTION_STRING || "postgresql://localhost:5432/eos_legal",
  max: 20, // Larger pool for read-heavy case queries
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

// Initialize on module load
initializeDatabase().catch(err => console.error("[CaseRepositoryPostgres] Failed to initialize database:", err));

// Initialize database schema if not exists
async function initializeSchema(): Promise<void> {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS legal_cases (
      id VARCHAR(255) PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status VARCHAR(50) NOT NULL,
      priority VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
      deadline_at TIMESTAMP WITH TIME ZONE,
      closed_at TIMESTAMP WITH TIME ZONE,
      actor_id VARCHAR(255),
      lawyer_id VARCHAR(255),
      tenant_id VARCHAR(255),
      workspace_id VARCHAR(255),
      participants TEXT[],
      metadata JSONB
    );
    
    CREATE INDEX IF NOT EXISTS idx_cases_tenant_id ON legal_cases(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_cases_status ON legal_cases(status);
  `;
  
  await writePool.query(createTableQuery);
  console.log("[CaseRepositoryPostgres] Database schema initialized");
}

// Initialize schema on module load
initializeSchema().catch(err => {
  console.error("[CaseRepositoryPostgres] Failed to initialize schema:", err);
});

export const CaseRepositoryPostgres = {
  kind: "repository",
  entityName: "Case",
  /**
   * Expose both pools for health checking and monitoring
   * Used by Kubernetes liveness/readiness probes
   */
  getPools(): {write: Pool; read: Pool} {
    return { write: writePool, read: readPool };
  },
  
  /**
   * Backward compatibility for health check system
   * @deprecated Use getPools() instead
   */
  getPool(): Pool {
    return writePool;
  },
  async byId(id: string, context?: { tenantId: string; workspaceId: string }): Promise<CaseAggregate | undefined> {
    let query = "SELECT * FROM legal_cases WHERE id = $1";
    const params: any[] = [id];
    
    // WORK-015: Enforce tenant isolation at query level
    if (context?.tenantId && context?.workspaceId) {
      query += " AND tenant_id = $2 AND workspace_id = $3";
      params.push(context.tenantId, context.workspaceId);
    }
    
    const result = await readPool.query(query, params);
    
    if (result.rows.length === 0) return undefined;
    return mapRowToCaseAggregate(result.rows[0]);
  },

  async list(context?: { tenantId: string; workspaceId: string }): Promise<readonly CaseAggregate[]> {
    let query = "SELECT * FROM legal_cases";
    const params: any[] = [];
    
    if (context?.tenantId && context?.workspaceId) {
      query += " WHERE tenant_id = $1 AND workspace_id = $2";
      params.push(context.tenantId, context.workspaceId);
    }
    query += " ORDER BY created_at DESC";
    
    const result = await readPool.query(query, params);
    return result.rows.map(mapRowToCaseAggregate);
  },

  async listByTenant(tenantId: string): Promise<readonly CaseAggregate[]> {
    const result = await readPool.query(
      "SELECT * FROM legal_cases WHERE tenant_id = $1 ORDER BY created_at DESC",
      [tenantId]
    );
    
    return result.rows.map(mapRowToCaseAggregate);
  },

  async listByWorkspace(workspaceId: string): Promise<readonly CaseAggregate[]> {
    const result = await readPool.query(
      "SELECT * FROM legal_cases WHERE workspace_id = $1 ORDER BY created_at DESC",
      [workspaceId]
    );
    
    return result.rows.map(mapRowToCaseAggregate);
  },

  async byActorId(actorId: string): Promise<readonly CaseAggregate[]> {
    const result = await readPool.query(
      "SELECT * FROM legal_cases WHERE actor_id = $1 OR $1 = ANY(participants) ORDER BY created_at DESC",
      [actorId]
    );
    
    return result.rows.map(mapRowToCaseAggregate);
  },

  async listAll(): Promise<readonly CaseAggregate[]> {
    const result = await readPool.query("SELECT * FROM legal_cases ORDER BY created_at DESC");
    return result.rows.map(mapRowToCaseAggregate);
  },

  async save(entity: CaseAggregate, context?: { tenantId: string; workspaceId: string; actorId: string }): Promise<CaseAggregate> {
    // WORK-015: Enforce tenant isolation at save - ensure entity always has tenant/workspace context
    const tenantId = context?.tenantId || (entity as any).tenantId || "tenant-001";
    const workspaceId = context?.workspaceId || (entity as any).workspaceId || "workspace-001";
    const actorId = context?.actorId || (entity as any).actorId;
    
    const upsertQuery = `
      INSERT INTO legal_cases (
        id, title, description, status, priority, created_at, updated_at, 
        deadline_at, closed_at, actor_id, lawyer_id, tenant_id, workspace_id, 
        participants, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        updated_at = NOW(),
        deadline_at = EXCLUDED.deadline_at,
        closed_at = EXCLUDED.closed_at,
        actor_id = EXCLUDED.actor_id,
        lawyer_id = EXCLUDED.lawyer_id,
        tenant_id = EXCLUDED.tenant_id,
        workspace_id = EXCLUDED.workspace_id,
        participants = EXCLUDED.participants,
        metadata = EXCLUDED.metadata
    `;
    
    await writePool.query(upsertQuery, [
      entity.id,
      entity.title,
      entity.description || null,
      entity.status,
      entity.priority,
      entity.createdAt,
      new Date(),
      entity.deadline || null,
      (entity as any).closedAt || null,
      (entity as any).actorId || null,
      (entity as any).lawyerId || null,
      (entity as any).tenantId || "tenant-001",
      (entity as any).workspaceId || "workspace-001",
      (entity as any).participants || [],
      entity.executionContext ? JSON.stringify(entity.executionContext) : null,
    ]);
    
    // WORK-015: Append-only audit logging - log all mutations
    if (actorId) {
      recordRuntimeInvocation({
        capabilityId: "legal-case",
        operationId: "repository.save",
        sourceRef: "CaseRepositoryPostgres.save",
        success: true,
        input: { caseId: entity.id, actorId, tenantId, workspaceId, timestamp: new Date().toISOString() },
        result: { persisted: true },
        tenant_id: tenantId,
        inputRefs: [entity.id],
        outputRefs: [entity.id]
      });
    }
    
    return { ...entity, updatedAt: new Date() };
  },

  async updateStatus(id: string, status: CaseStatus): Promise<boolean> {
    const result = await writePool.query(
      "UPDATE legal_cases SET status = $1, updated_at = NOW() WHERE id = $2",
      [status, id]
    );
    
    return (result.rowCount ?? 0) > 0;
  },

  async remove(id: string, context?: { tenantId: string; workspaceId: string }): Promise<boolean> {
    let query = "DELETE FROM legal_cases WHERE id = $1";
    const params: any[] = [id];
    
    // WORK-015: Enforce tenant isolation before deletion
    if (context?.tenantId && context?.workspaceId) {
      query += " AND tenant_id = $2 AND workspace_id = $3";
      params.push(context.tenantId, context.workspaceId);
    }
    
    const result = await writePool.query(query, params);
    
    if (result.rowCount && result.rowCount > 0) {
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
        tenant_id: context?.tenantId || null,
        inputRefs: [id]
      });
    }
    
    return (result.rowCount ?? 0) > 0;
  },

  async clear(): Promise<void> {
    await writePool.query("TRUNCATE TABLE legal_cases");
  },

  /**
   * List all active (non-completed/non-archived) legal cases
   * Used by WorkInspectionAgent to scan active works
   */
  async listActive(): Promise<readonly CaseAggregate[]> {
    const result = await readPool.query(
      "SELECT * FROM legal_cases WHERE status NOT IN ('completed', 'archived', 'cancelled') ORDER BY updated_at DESC"
    );
    return result.rows.map(mapRowToCaseAggregate);
  }
};

// Helper to map Postgres row to CaseAggregate interface
function mapRowToCaseAggregate(row: any): CaseAggregate {
  const caseAggregate: any = {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deadline: row.deadline_at ? new Date(row.deadline_at) : undefined,
    closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
    lawyerId: row.lawyer_id,
    actorId: row.actor_id,
    tenantId: row.tenant_id || "tenant-001",
    workspaceId: row.workspace_id || "workspace-001",
    participants: row.participants || [],
    metadata: row.metadata || undefined,
  };
  
  if (row.closed_at) {
    caseAggregate.closedAt = new Date(row.closed_at);
  }
  
  return caseAggregate as CaseAggregate;
}

// Seed initial test data if table is empty
async function seedInitialData(): Promise<void> {
  const countResult = await readPool.query("SELECT COUNT(*) FROM legal_cases");
  if (parseInt(countResult.rows[0].count) === 0) {
    console.log("[CaseRepositoryPostgres] Seeding initial case data");
    // Reuse same seed data from in-memory repository
    const seedCases = [
      {
        id: "case-001",
        title: "Vendor Agreement Review",
        description: "Review and finalize vendor contract for Q3 procurement.",
        status: "open",
        priority: "high",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 48),
        actorId: "user-001",
        lawyerId: "lawyer-001",
      },
      {
        id: "case-002",
        title: "IP Filing — Trade Secret Protection",
        description: "Prepare and file intellectual property trade secret documentation package.",
        status: "in_progress",
        priority: "critical",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 36),
        actorId: "+628123456789",
        lawyerId: "+628987654321",
        participants: [
          "+628123456789", "+628987654321", "+6285678912345",
          "+6287890123456", "+6283456789012", "dian.permatasari@example.com"
        ]
      },
      {
        id: "case-003",
        title: "Employment Handbook Update",
        status: "draft",
        priority: "medium",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 168),
      }
    ];
    
    for (const c of seedCases) {
      await CaseRepositoryPostgres.save(c as unknown as CaseAggregate);
    }
    console.log("[CaseRepositoryPostgres] Initial data seeding complete");
  }
}

seedInitialData().catch(err => {
  console.error("[CaseRepositoryPostgres] Failed to seed initial data:", err);
});