import { Pool } from "pg";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import { CommunicationEvent, CommunicationEventId, CommunicationEventStatus } from "../contracts/communication.contracts.js";
import { DatabaseMigrationManager } from "../../../shared/implementation/database/migrations/migration.manager.js";

// Validate required environment variables in production
if (process.env.NODE_ENV === "production" && !process.env.POSTGRES_CONNECTION_STRING) {
  throw new Error("[CommunicationRepositoryPostgres] FATAL: POSTGRES_CONNECTION_STRING environment variable is required in production");
}

// Read replica configuration for horizontal scaling of read-heavy queries
// Separate write primary from read replicas to distribute load
const writePool = new Pool({
  connectionString: process.env.POSTGRES_WRITE_CONNECTION_STRING || process.env.POSTGRES_CONNECTION_STRING || "postgresql://localhost:5432/eos_communication",
  max: 10, // Smaller pool for writes (fewer write operations)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const readPool = new Pool({
  connectionString: process.env.POSTGRES_READ_CONNECTION_STRING || process.env.POSTGRES_CONNECTION_STRING || "postgresql://localhost:5432/eos_communication",
  max: 30, // Larger pool for read-heavy communication queries
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Run migrations on initialization - ensures schema is always up-to-date
let migrationsInitialized = false;
async function initializeDatabase() {
  if (migrationsInitialized) return;
  const result = await DatabaseMigrationManager.runMigrations(writePool);
  if (result.errors.length > 0) {
    console.error("[CommunicationRepositoryPostgres] Database initialization failed:", result.errors);
    throw new Error(`Database migration failed: ${result.errors.join(", ")}`);
  }
  console.log(`[CommunicationRepositoryPostgres] Database initialized: ${result.executed.length} migrations executed, ${result.already_applied.length} already applied`);
  migrationsInitialized = true;
}

// Initialize on module load
initializeDatabase().catch(err => console.error("[CommunicationRepositoryPostgres] Failed to initialize database:", err));

// Initialize database schema if not exists
async function initializeSchema(): Promise<void> {
  if (migrationsInitialized) return;
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS communication_events (
      event_id VARCHAR(255) PRIMARY KEY,
      work_id VARCHAR(255) NOT NULL,
      tenant_id VARCHAR(255) NOT NULL,
      sender_id VARCHAR(255) NOT NULL,
      recipient_ids TEXT[] NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      adapter_type VARCHAR(50) NOT NULL,
      timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
      status VARCHAR(50) NOT NULL,
      message_id VARCHAR(255),
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_communication_work_id ON communication_events(work_id);
    CREATE INDEX IF NOT EXISTS idx_communication_tenant_id ON communication_events(tenant_id);
  `;
  
  await writePool.query(createTableQuery);
  console.log("[CommunicationRepositoryPostgres] Database schema initialized");
}

import type { CommunicationRepository } from "../contracts/communication.contracts.js";

class CommunicationRepositoryPostgresImpl implements CommunicationRepository {
  readonly entityName = "CommunicationEvent" as const;
  readonly kind = "repository" as const;

  /**
   * Expose both pools for health checking and monitoring
   * Used by Kubernetes liveness/readiness probes
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

  async byId(id: CommunicationEventId, context?: { tenantId: string; workspaceId: string }): Promise<CommunicationEvent | undefined> {
    let query = "SELECT * FROM communication_events WHERE event_id = $1";
    const params: any[] = [id];
    
    // WORK-015: Enforce tenant isolation - always filter by tenant/workspace if context is provided
    if (context) {
      query += " AND tenant_id = $2 AND workspace_id = $3";
      params.push(context.tenantId, context.workspaceId);
    }
    
    const result = await readPool.query(query, params);
    if (result.rows.length === 0) return undefined;
    return mapRowToCommunicationEvent(result.rows[0]);
  }

  async byWorkId(workId: string, context?: { tenantId: string; workspaceId: string }): Promise<readonly CommunicationEvent[]> {
    let query = "SELECT * FROM communication_events WHERE work_id = $1 ORDER BY timestamp ASC";
    const params: any[] = [workId];
    
    // WORK-015: Filter by tenant/workspace if context is provided
    if (context) {
      query += " AND tenant_id = $2 AND workspace_id = $3";
      params.push(context.tenantId, context.workspaceId);
    }
    
    const result = await readPool.query(query, params);
    return result.rows.map(mapRowToCommunicationEvent);
  }

  async byTenantId(tenantId: string): Promise<readonly CommunicationEvent[]> {
    const result = await readPool.query(
      "SELECT * FROM communication_events WHERE tenant_id = $1 ORDER BY timestamp ASC",
      [tenantId]
    );
    
    return result.rows.map(mapRowToCommunicationEvent);
  }

  async list(context?: { tenantId: string; workspaceId: string }): Promise<readonly CommunicationEvent[]> {
    let query = "SELECT * FROM communication_events ORDER BY timestamp ASC";
    const params: any[] = [];
    
    // WORK-015: Filter by tenant/workspace if context is provided
    if (context) {
      query += " WHERE tenant_id = $1 AND workspace_id = $2";
      params.push(context.tenantId, context.workspaceId);
    }
    
    const result = await readPool.query(query, params);
    return result.rows.map(mapRowToCommunicationEvent);
  }

  async save(entity: CommunicationEvent, context?: { tenantId: string; workspaceId: string; actorId: string }): Promise<void> {
    // WORK-015: Enforce tenant isolation - ensure entity always has tenant/workspace context
    if (context) {
      (entity as any).tenant_id = context.tenantId;
      (entity as any).workspace_id = context.workspaceId;
      (entity as any).actor_id = context.actorId;
    }
    
    const upsertQuery = `
      INSERT INTO communication_events (
        event_id, work_id, tenant_id, workspace_id, actor_id, sender_id, recipient_ids, event_type, 
        content, adapter_type, timestamp, status, message_id, metadata, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      ON CONFLICT (event_id) DO UPDATE SET
        work_id = EXCLUDED.work_id,
        tenant_id = EXCLUDED.tenant_id,
        workspace_id = EXCLUDED.workspace_id,
        actor_id = EXCLUDED.actor_id,
        sender_id = EXCLUDED.sender_id,
        recipient_ids = EXCLUDED.recipient_ids,
        event_type = EXCLUDED.event_type,
        content = EXCLUDED.content,
        adapter_type = EXCLUDED.adapter_type,
        timestamp = EXCLUDED.timestamp,
        status = EXCLUDED.status,
        message_id = EXCLUDED.message_id,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    `;
    
    await writePool.query(upsertQuery, [
      entity.event_id,
      entity.work_id,
      entity.tenant_id,
      (entity as any).workspace_id || null,
      entity.actor_id,
      entity.actor_id, // Map sender_id to actor_id for database schema compatibility
      entity.recipient_ids,
      entity.event_type,
      entity.content,
      entity.adapter_type,
      (entity as any).timestamp || new Date(),
      entity.status,
      null, // message_id not in current interface
      null, // metadata not in current interface
    ]);
    
    // WORK-015: Append to immutable audit ledger
    recordRuntimeInvocation({
      capabilityId: "communication",
      operationId: "repository.save",
      sourceRef: "CommunicationRepositoryPostgres.save",
      success: true,
      input: { eventId: entity.event_id, workId: entity.work_id },
      result: { persisted: true },
      tenant_id: context?.tenantId || null,
      decision_id: entity.work_id || null,
      inputRefs: [entity.event_id],
      outputRefs: [entity.event_id]
    });
  }

  async updateStatus(id: CommunicationEventId, status: CommunicationEventStatus, context?: { tenantId: string; workspaceId: string }): Promise<boolean> {
    let query = "UPDATE communication_events SET status = $1, updated_at = NOW() WHERE event_id = $2";
    const params: any[] = [status, id];
    
    // WORK-015: Enforce tenant isolation before allowing status update
    if (context) {
      query += " AND tenant_id = $3 AND workspace_id = $4";
      params.push(context.tenantId, context.workspaceId);
    }
    
    const result = await writePool.query(query, params);
    return (result.rowCount ?? 0) > 0;
  }

  async remove(id: CommunicationEventId, context?: { tenantId: string; workspaceId: string }): Promise<boolean> {
    let query = "DELETE FROM communication_events WHERE event_id = $1";
    const params: any[] = [id];
    
    // WORK-015: Enforce tenant isolation before allowing deletion
    if (context) {
      query += " AND tenant_id = $2 AND workspace_id = $3";
      params.push(context.tenantId, context.workspaceId);
    }
    
    const result = await writePool.query(`${query} RETURNING event_id`, params);
    const deleted = result.rows.length > 0;
    
    // WORK-015: Log deletion attempt in audit ledger
    if (deleted) {
      // Success - entity was deleted
      recordRuntimeInvocation({
        capabilityId: "communication",
        operationId: "repository.remove",
        sourceRef: "CommunicationRepositoryPostgres.remove",
        success: true,
        input: { eventId: id },
        result: { deleted: true },
        tenant_id: context?.tenantId || null,
        inputRefs: [id]
      });
    } else {
      // Failure - entity not found or cross-tenant
      recordRuntimeInvocation({
        capabilityId: "communication",
        operationId: "repository.remove",
        sourceRef: "CommunicationRepositoryPostgres.remove",
        success: false,
        input: { eventId: id, attemptedTenantId: context?.tenantId || null },
        result: { reason: "entity_not_found_or_isolation_violation" },
        tenant_id: context?.tenantId || null
      });
    }
    
    return deleted;
  }

  async clear(): Promise<void> {
    await writePool.query("TRUNCATE TABLE communication_events");
  }
}

// Lazy initialization function to avoid eager Postgres pool creation
let communicationRepositoryPostgresInstance: CommunicationRepositoryPostgresImpl | null = null;

export function getCommunicationRepositoryPostgres(): CommunicationRepository {
  if (!communicationRepositoryPostgresInstance) {
    communicationRepositoryPostgresInstance = new CommunicationRepositoryPostgresImpl();
  }
  return communicationRepositoryPostgresInstance;
}

// Lazy proxy for consistent API with in-memory repository
const _lazyPgCommRepo: CommunicationRepository = new Proxy({} as CommunicationRepository, {
  get(_target: any, prop: string | symbol) {
    const real = getCommunicationRepositoryPostgres();
    const method = (real as any)[prop];
    if (typeof method === "function") {
      return method.bind(real);
    }
    return method;
  },
});

export const CommunicationRepositoryPostgres = _lazyPgCommRepo;

// Helper to map Postgres row to CommunicationEvent interface
function mapRowToCommunicationEvent(row: any): CommunicationEvent {
  return {
    event_id: row.event_id,
    work_id: row.work_id,
    tenant_id: row.tenant_id,
    workspace_id: row.workspace_id,
    actor_id: row.sender_id, // Map db sender_id to interface actor_id
    recipient_ids: row.recipient_ids,
    event_type: row.event_type,
    content: row.content,
    adapter_type: row.adapter_type,
    timestamp: row.timestamp ? row.timestamp : new Date().toISOString(), // Store/serialize as ISO string to match interface contract
    status: row.status,
  } as CommunicationEvent;
}