import { Pool } from "pg";
import { PostgresRepository } from "./base.repository.ts";
import {
  IntentId,
  type IntentAggregate,
  type IntentRepository,
  type IntentStatus,
  type IntentCategory,
} from "@repo/contracts-core";

// Validate required environment variables in production - matches other repository patterns
// Allow sandbox mode for isolated testing in production
if (process.env.NODE_ENV === "production" && !(process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL) && process.env.EOS_SANDBOX_MODE !== "true") {
  throw new Error("[IntentRepositoryPostgres] FATAL: POSTGRES_CONNECTION_STRING or DATABASE_URL environment variable is required in production unless EOS_SANDBOX_MODE is enabled");
}

// Read replica configuration - matches case.postgres.repository.ts pattern
const writePool = new Pool({
  connectionString: process.env.POSTGRES_WRITE_CONNECTION_STRING || process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL || "postgresql://localhost:5432/eos_identity",
  max: 150, // DEL-001: Increased pool size to 150 to match target TPS of 150
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const readPool = new Pool({
  connectionString: process.env.POSTGRES_READ_CONNECTION_STRING || process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL || "postgresql://localhost:5432/eos_identity",
  max: 100, // DEL-001: Increased read pool size to support higher throughput
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// PostgreSQL-backed intent repository implementation
class IntentRepositoryPostgresImpl extends PostgresRepository<any> implements IntentRepository {
  readonly entityName = "Intent" as const;
  readonly kind = "repository" as const;

  constructor() {
    super("intents");
  }

  /**
   * Expose both pools for health checking and monitoring
   * Matches interface of all other repositories
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

  // Convert domain aggregate to database record (camelCase → snake_case)
  protected toRecord(entity: IntentAggregate): Record<string, any> {
    return {
      id: entity.id,
      tenant_id: entity.tenantId,
      workspace_id: entity.workspaceId,
      work_id: entity.workId,
      actor_id: entity.actorId,
      origin: entity.origin,
      title: entity.title,
      description: entity.description,
      raw: entity.raw ? JSON.stringify(entity.raw) : null,
      understanding: entity.understanding ? JSON.stringify(entity.understanding) : null,
      resolution: entity.resolution ? JSON.stringify(entity.resolution) : null,
      category: entity.category,
      status: entity.status,
      metadata: entity.metadata ? JSON.stringify(entity.metadata) : null,
      converted_to_work_id: entity.convertedToWorkId,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
      version: entity.version ?? 1,
    };
  }

  // Convert database record to domain aggregate (snake_case → camelCase)
  protected toAggregate(record: any): IntentAggregate {
    return {
      id: IntentId(record.id),
      tenantId: record.tenant_id,
      workspaceId: record.workspace_id,
      workId: record.work_id,
      actorId: record.actor_id,
      origin: record.origin,
      title: record.title,
      description: record.description,
      raw: record.raw ? JSON.parse(record.raw) : undefined,
      understanding: record.understanding ? JSON.parse(record.understanding) : undefined,
      resolution: record.resolution ? JSON.parse(record.resolution) : undefined,
      category: record.category as IntentCategory,
      status: record.status as IntentStatus,
      metadata: record.metadata ? JSON.parse(record.metadata) : undefined,
      convertedToWorkId: record.converted_to_work_id,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      version: record.version,
    } as IntentAggregate;
  }

  /**
   * Find intent by ID with tenant/work/workspace context for isolation (CORE-001: workId priority)
   */
  async byId(id: string, context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<IntentAggregate | undefined> {
    let query = "SELECT * FROM intents WHERE id = $1";
    const params: any[] = [id];
    let paramIndex = 2;

    if (context?.tenantId) {
      query += ` AND tenant_id = $${paramIndex}`;
      params.push(context.tenantId);
      paramIndex++;
      
      if (context?.workId) {
        query += ` AND work_id = $${paramIndex}`;
        params.push(context.workId);
        paramIndex++;
      } else if (context?.workspaceId) {
        query += ` AND workspace_id = $${paramIndex}`;
        params.push(context.workspaceId);
        paramIndex++;
      }
    }

    const result = await readPool.query(query, params);
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]);
  }

  /**
   * List all intents with tenant/work/workspace context for isolation (CORE-001: workId priority)
   */
  async list(context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<readonly IntentAggregate[]> {
    let query = "SELECT * FROM intents";
    const params: any[] = [];
    let paramIndex = 1;
    let hasWhere = false;

    if (context?.tenantId) {
      query += ` WHERE tenant_id = $${paramIndex}`;
      params.push(context.tenantId);
      paramIndex++;
      hasWhere = true;
      
      if (context?.workId) {
        query += ` AND work_id = $${paramIndex}`;
        params.push(context.workId);
        paramIndex++;
      } else if (context?.workspaceId) {
        query += ` AND workspace_id = $${paramIndex}`;
        params.push(context.workspaceId);
        paramIndex++;
      }
    }

    const result = await readPool.query(query, params);
    return result.rows.map(row => this.toAggregate(row));
  }

  /**
   * Remove intent with tenant/work/workspace context for isolation (CORE-001: workId priority)
   */
  async remove(id: string, context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<boolean> {
    let query = "DELETE FROM intents WHERE id = $1";
    const params: any[] = [id];
    let paramIndex = 2;

    if (context?.tenantId) {
      query += ` AND tenant_id = $${paramIndex}`;
      params.push(context.tenantId);
      paramIndex++;
      
      if (context?.workId) {
        query += ` AND work_id = $${paramIndex}`;
        params.push(context.workId);
        paramIndex++;
      } else if (context?.workspaceId) {
        query += ` AND workspace_id = $${paramIndex}`;
        params.push(context.workspaceId);
        paramIndex++;
      }
    }

    const result = await writePool.query(query, params);
    return result.rowCount > 0;
  }

  /**
   * Mark intent as converted to a work (case)
   * Creates provenance link between Intent and Work
   */
  async markAsConverted(intentId: string, workId: string): Promise<boolean> {
    const result = await writePool.query(
      `UPDATE intents SET converted_to_work_id = $1, updated_at = NOW(), version = version + 1 WHERE id = $2 RETURNING id`,
      [workId, intentId]
    );
    return result.rows.length > 0;
  }
}

// Lazy initialization proxy - matches pattern in all other repositories (session.repository.ts)
let _instance: IntentRepository | null = null;
type IntentRepoMethods = keyof IntentRepository;

const _lazyPgRepo: IntentRepository = new Proxy({} as IntentRepository, {
  get(_target: any, prop: string | symbol) {
    const real = (() => {
      if (!_instance) {
        _instance = new IntentRepositoryPostgresImpl();
      }
      return _instance;
    })();
    const method = (real as any)[prop];
    if (typeof method === "function") {
      return method.bind(real);
    }
    return method;
  },
});

export function getIntentRepositoryPostgres(): IntentRepository {
  return _lazyPgRepo;
}

export const IntentRepositoryPostgres = _lazyPgRepo;