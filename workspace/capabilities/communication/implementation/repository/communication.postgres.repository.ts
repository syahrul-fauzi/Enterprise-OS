import { Pool } from "pg";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import { CommunicationEvent, CommunicationEventId, CommunicationEventStatus } from "../contracts/communication.contracts.js";
import type { TenantId } from "@capabilities/work-core";
import { DatabaseMigrationManager } from "../../../shared/implementation/database/migrations/migration.manager.js";
import { isBuildPhase, updateConnectionPoolMetrics } from "../../../shared/implementation/database/health.check.js";

// Validate required environment variables in production
// EXCEPTION: Skip during Next.js build phase (phase-production-build) because build-time static analysis runs in "production" NODE_ENV but has no DB connection
if (process.env.NODE_ENV === "production" && !isBuildPhase && !(process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL)) {
  throw new Error("[CommunicationRepositoryPostgres] FATAL: DATABASE_URL or POSTGRES_CONNECTION_STRING environment variable is required in production");
}

// Shared module-level state for both build and non-build phases
let migrationsInitialized = false;
// Create shared mock pool implementation for build phase
const mockPool = { query: async () => ({ rows: [] }) } as any;
async function mockInitializeDatabase() { return; }

// Initialize real pools only in non-build phase
let writePool: Pool = isBuildPhase ? mockPool as unknown as Pool : null as unknown as Pool;
let readPool: Pool = isBuildPhase ? mockPool as unknown as Pool : null as unknown as Pool;
let initializeDatabase: () => Promise<void> = isBuildPhase ? mockInitializeDatabase : async () => {};

if (!isBuildPhase) {
  // Read replica configuration for horizontal scaling of read-heavy queries
  // Separate write primary from read replicas to distribute load
  // Align with base.repository.ts pattern: support both DATABASE_URL (modern) and POSTGRES_CONNECTION_STRING (legacy)
  const writeConnectionString = process.env.POSTGRES_WRITE_CONNECTION_STRING || process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL || "postgresql://localhost:5432/eos_communication";
  const readConnectionString = process.env.POSTGRES_READ_CONNECTION_STRING || process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL || "postgresql://localhost:5432/eos_communication";

  writePool = new Pool({
  connectionString: writeConnectionString,
  max: 50, // DEL-001: Increased pool size from 10 to 50 to address database bottleneck
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

readPool = new Pool({
  connectionString: readConnectionString,
  max: 30, // Larger pool for read-heavy communication queries
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

  // Run migrations on initialization - ensures schema is always up-to-date
  initializeDatabase = async () => {
    if (migrationsInitialized) return;
    const result = await (DatabaseMigrationManager.runMigrations as (pool: Pool) => Promise<{
    executed: string[];
    already_applied: string[];
    errors: string[];
  }>)(writePool);
    if (result.errors.length > 0) {
      console.error("[CommunicationRepositoryPostgres] Database initialization failed:", result.errors);
      throw new Error(`Database migration failed: ${result.errors.join(", ")}`);
    }
    console.log(`[CommunicationRepositoryPostgres] Database initialized: ${result.executed.length} migrations executed, ${result.already_applied.length} already applied`);
    migrationsInitialized = true;
  }

  // Initialize on module load only in non-build phase
  initializeDatabase().catch(err => console.error("[CommunicationRepositoryPostgres] Failed to initialize database:", err));

  // Start pool metrics collection - DEL-001 telemetry requirement
  setInterval(() => {
    updateConnectionPoolMetrics("communication-write", writePool);
    updateConnectionPoolMetrics("communication-read", readPool);
  }, 5000); // Collect metrics every 5 seconds
}

// Export once at module level (consistent API regardless of build phase)
export { writePool, readPool, initializeDatabase };

// Initialize database schema if not exists - only used by legacy code (migrations handle schema now)
async function initializeSchema(): Promise<void> {
  if (migrationsInitialized) return;
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS communication_events (
      event_id VARCHAR(255) PRIMARY KEY,
      work_id VARCHAR(255) NOT NULL,
      tenant_id VARCHAR(255) NOT NULL,
      workspace_id VARCHAR(255) NOT NULL,
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
    CREATE INDEX IF NOT EXISTS idx_communication_workspace_id ON communication_events(workspace_id);
  `;
  
  await writePool.query(createTableQuery);
  console.log("[CommunicationRepositoryPostgres] Database schema initialized");
}

import type { CommunicationRepository } from "../contracts/communication.contracts.js";

class CommunicationRepositoryPostgresImpl implements CommunicationRepository {
  readonly entityName = "CommunicationEvent" as const;
  readonly kind = "repository" as const;

  /**
   * Set current tenant and context for RLS (Row Level Security) enforcement
   * CORE-001: Work-centric model - prioritize workId over workspaceId, workspace is optional execution boundary
   * Reused from base.repository.ts pattern (TENANT-ISOLATION-001, CORE-001)
   */
  protected async setSessionContext(tenantId: string, options?: { workspaceId?: string; workId?: string }): Promise<void> {
    let query = `SELECT set_config('app.current_tenant', $1, false)`;
    const params: any[] = [tenantId];
    let paramIndex = 2;
    if (options?.workId) {
        // Work as primary execution boundary (per mandate: Work is continuity object, workspace is just context)
        query += `, set_config('app.current_work', $${paramIndex}, false)`;
        params.push(options.workId);
        paramIndex++;
        // Clear workspace when work is set to enforce precedence
        query += `, set_config('app.current_workspace', '', false)`;
    }
    else if (options?.workspaceId) {
        // Fallback to workspace only when work is not specified
        query += `, set_config('app.current_workspace', $${paramIndex}, false)`;
        params.push(options.workspaceId);
        paramIndex++;
        // Clear work when workspace is set
        query += `, set_config('app.current_work', '', false)`;
    }
    else {
        // Clear both if no context provided
        query += `, set_config('app.current_workspace', '', false), set_config('app.current_work', '', false)`;
    }
    await writePool.query(query, params);
  }

  /**
   * Clear session context after operation completes
   * Reused from base.repository.ts pattern (TENANT-ISOLATION-001)
   */
  protected async clearSessionContext(): Promise<void> {
    await writePool.query(`SELECT set_config('app.current_tenant', '', false), set_config('app.current_workspace', '', false)`);
  }

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

  async byId(id: CommunicationEventId, context?: { tenantId: TenantId; workspaceId?: string; workId?: string }): Promise<CommunicationEvent | undefined> {
    let query = "SELECT * FROM communication_events WHERE event_id = $1";
    const params: any[] = [id];
    let paramIndex = 2;
    
    // CORE-001: Enforce tenant and work isolation in query
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
      // Enforce RLS by setting session context if context is provided (TENANT-ISOLATION-001, CORE-001)
      if (context) {
        await this.setSessionContext(context.tenantId, { workspaceId: context.workspaceId, workId: context.workId });
      }
      
      const result = await readPool.query(query, params);
      if (result.rows.length === 0) return undefined;
      return mapRowToCommunicationEvent(result.rows[0]);
    } catch (error) {
      console.error("[CommunicationRepositoryPostgres] byId error:", error);
      throw error;
    } finally {
      if (context) {
        await this.clearSessionContext();
      }
    }
  }

  async byMessageId(messageId: string, context?: { tenantId: TenantId; workspaceId?: string; workId?: string }): Promise<CommunicationEvent | undefined> {
    const query = "SELECT * FROM communication_events WHERE message_id = $1";
    const params: any[] = [messageId];
    
    try {
      // Enforce RLS by setting session context if context is provided (TENANT-ISOLATION-001, CORE-001)
      if (context) {
        await this.setSessionContext(context.tenantId, { workspaceId: context.workspaceId, workId: context.workId });
      }
      
      const result = await readPool.query(query, params);
      if (result.rows.length === 0) return undefined;
      return mapRowToCommunicationEvent(result.rows[0]);
    } catch (error) {
      console.error("[CommunicationRepositoryPostgres] byMessageId error:", error);
      throw error;
    } finally {
      if (context) {
        await this.clearSessionContext();
      }
    }
  }

  async byWorkId(workId: string, context?: { tenantId: TenantId; workspaceId?: string; workId?: string }): Promise<readonly CommunicationEvent[]> {
    const query = "SELECT * FROM communication_events WHERE work_id = $1 ORDER BY timestamp ASC";
    const params: any[] = [workId];
    
    try {
      // Enforce RLS by setting session context if context is provided (TENANT-ISOLATION-001)
      // Work-centric model: use workId as primary context, workspaceId as fallback context
      if (context) {
        await this.setSessionContext(context.tenantId, { workspaceId: context.workspaceId, workId: context.workId });
      }
      
      const result = await readPool.query(query, params);
      return result.rows.map(mapRowToCommunicationEvent);
    } catch (error) {
      console.error("[CommunicationRepositoryPostgres] byWorkId error:", error);
      throw error;
    } finally {
      if (context) {
        await this.clearSessionContext();
      }
    }
  }

  async byTenantId(tenantId: TenantId): Promise<readonly CommunicationEvent[]> {
    const result = await readPool.query(
      "SELECT * FROM communication_events WHERE tenant_id = $1 ORDER BY timestamp ASC",
      [tenantId]
    );
    
    return result.rows.map(mapRowToCommunicationEvent);
  }

  async list(context?: { tenantId: TenantId; workspaceId?: string; workId?: string }): Promise<readonly CommunicationEvent[]> {
    let query = "SELECT * FROM communication_events ORDER BY timestamp ASC";
    const params: any[] = [];
    let paramIndex = 1;
    
    try {
      // Enforce RLS by setting session context if context is provided (TENANT-ISOLATION-001, CORE-001)
      if (context) {
        // Add tenant isolation to query
        query += ` WHERE tenant_id = $${paramIndex}`;
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
        
        await this.setSessionContext(context.tenantId, { workspaceId: context.workspaceId, workId: context.workId });
      }
      
      const result = await readPool.query(query, params);
      return result.rows.map(mapRowToCommunicationEvent);
    } catch (error) {
      console.error("[CommunicationRepositoryPostgres] list error:", error);
      throw error;
    } finally {
      if (context) {
        await this.clearSessionContext();
      }
    }
  }

  async save(entity: CommunicationEvent, context?: { tenantId: TenantId; workspaceId?: string; workId?: string; actorId: string }): Promise<void> {
    const client = await writePool.connect();
    try {
      // Enforce RLS by setting session context if context is provided (TENANT-ISOLATION-001, CORE-001)
      if (context) {
        await this.setSessionContext(context.tenantId, { workspaceId: context.workspaceId, workId: context.workId });
        (entity as any).tenant_id = context.tenantId;
        (entity as any).workspace_id = context.workspaceId; // Optional, only set if provided
        (entity as any).actor_id = context.actorId;
        // Enforce workId as primary key (CORE-001)
        if (context?.workId) {
          (entity as any).work_id = context.workId;
        }
      }
      
      await client.query("BEGIN");
      
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
      
      await client.query(upsertQuery, [
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
        (entity as any).message_id || null, // message_id from inbound webhook events
        (entity as any).metadata || null, // metadata from inbound webhook events
      ]);
      
      await client.query("COMMIT");
      
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
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("[CommunicationRepositoryPostgres] save error:", error);
      throw error;
    } finally {
      if (context) {
        await this.clearSessionContext();
      }
      client.release();
    }
  }

  async updateStatus(id: CommunicationEventId, status: CommunicationEventStatus, context?: { tenantId: TenantId; workspaceId?: string; workId?: string }): Promise<boolean> {
    let query = "UPDATE communication_events SET status = $1, updated_at = NOW() WHERE event_id = $2";
    const params: any[] = [status, id];
    let paramIndex = 3;
    
    const client = await writePool.connect();
    try {
      // Enforce RLS by setting session context if context is provided (TENANT-ISOLATION-001, CORE-001)
      if (context) {
        await this.setSessionContext(context.tenantId, { workspaceId: context.workspaceId, workId: context.workId });
        // CORE-001: Enforce tenant and work isolation in query
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
      
      await client.query("BEGIN");
      const result = await client.query(query, params);
      await client.query("COMMIT");
      
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("[CommunicationRepositoryPostgres] updateStatus error:", error);
      throw error;
    } finally {
      if (context) {
        await this.clearSessionContext();
      }
      client.release();
    }
  }

  async remove(id: CommunicationEventId, context?: { tenantId: TenantId; workspaceId?: string; workId?: string }): Promise<boolean> {
    let query = "DELETE FROM communication_events WHERE event_id = $1 RETURNING event_id";
    const params: any[] = [id];
    let paramIndex = 2;
    
    const client = await writePool.connect();
    try {
      // Enforce RLS by setting session context if context is provided (TENANT-ISOLATION-001, CORE-001)
      if (context) {
        await this.setSessionContext(context.tenantId, { workspaceId: context.workspaceId, workId: context.workId });
        // CORE-001: Enforce tenant and work isolation in query
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
      
      await client.query("BEGIN");
      const result = await client.query(query, params);
      await client.query("COMMIT");
      
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
    } finally {
      client.release();
    }
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