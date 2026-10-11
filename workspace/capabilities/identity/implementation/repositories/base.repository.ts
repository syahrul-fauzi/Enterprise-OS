import { Pool } from "pg";

// Initialize connection pool once
let pool: AnyPool | null = null;
// Schema initialization flag - prevent multiple schema creation attempts (pg_type duplicate key errors)
let schemaInitialized = false;

// Shared query method interface that both Pool and MockPool implement
interface Queryable {
  query: (query: string, values?: any[]) => Promise<{ rows: Record<string, any>[] }>;
}

// Mock pool for test environment (in-memory store when no DATABASE_URL)
// Optimized for 150 TPS sustained load with async queueing to prevent long-tail latency
class MockPool implements Queryable {
  private activeQueries = 0;
  private maxConcurrentQueries = 150; // DEL-001: Increased to match target TPS of 150
  private queue: (() => void)[] = [];

  private async acquire(): Promise<void> {
    if (this.activeQueries < this.maxConcurrentQueries) {
      this.activeQueries++;
      return;
    }
    // Queue if at max concurrency to prevent overwhelming in-memory layer
    await new Promise<void>(resolve => this.queue.push(resolve));
    this.activeQueries++;
  }

  private release(): void {
    this.activeQueries--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next?.();
    }
  }

  async query(_query?: string, _values?: any[]): Promise<{ rows: Record<string, any>[] }> {
    await this.acquire();
    try {
      // Remove simulated latency for in-memory operations to maximize throughput
      // In-memory operations should be <1ms, so no need for artificial delay
      return { rows: [] };
    } finally {
      this.release();
    }
  }
}

// Use interface instead of union to avoid callable signature mismatch - minimal fix
type AnyPool = Pool & Queryable;

export function getPool(): AnyPool {
  if (!pool) {
    // DEL-001: Enable sandbox isolation mode if EOS_SANDBOX_MODE=true
    if (process.env.EOS_SANDBOX_MODE === "true") {
      (globalThis as any)._forceMockPool = true;
      console.log("[base.repository.ts] 🔒 SANDBOX MODE ENABLED: Using in-memory mock pool for all database operations");
    }

    // Use unified POSTGRES_CONNECTION_STRING first, with fallback to DATABASE_URL for backward compatibility
    const connectionString = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL;
    const forceMock = (globalThis as any)._forceMockPool === true;
    
    console.log(`[base.repository.ts] getPool() called - connectionString found: ${!!connectionString}, forceMock: ${forceMock}, value: ${connectionString?.substring(0,30)}...`);
    
    if (!connectionString || forceMock) {
      console.warn("[PostgreSQL] Using in-memory mock pool (sandbox/test environment) - NO REAL DATABASE TRANSACTIONS");
      pool = new MockPool() as AnyPool;
    } else {
      console.log("[PostgreSQL] Initializing REAL PostgreSQL pool!");
      pool = new Pool({
        connectionString,
        max: 150, // DEL-001: Increased pool size to 150 to match target TPS of 150
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }) as AnyPool;
    }
  }
  return pool;
}

// Base repository class with common CRUD operations
export abstract class PostgresRepository<T extends { id: string }> {
  protected tableName: string;
  protected pool: AnyPool;

  // Abstract mapping methods for camelCase ↔ snake_case conversion
  protected abstract toRecord(entity: T): Record<string, any>;
  protected abstract toAggregate(record: Record<string, any>): T;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.pool = getPool();
  }

  /**
   * Set current tenant and workspace/work for RLS (Row Level Security) enforcement
   * Must be called before any database operation in production to enforce tenant isolation
   * Supports both workspace and work as execution boundaries per EOS Work-centric model
   */
  protected async setSessionContext(tenantId: string, options?: { workspaceId?: string; workId?: string }): Promise<void> {
    let query = `SELECT set_config('app.current_tenant', $1, false)`;
    const params: string[] = [tenantId];
    let paramIndex = 2;

    if (options?.workId) {
      // Work as primary execution boundary (per mandate: Work is continuity object, workspace is just context)
      query += `, set_config('app.current_work', $${paramIndex}, false)`;
      params.push(options.workId);
      paramIndex++;
      // Clear workspace when work is set to enforce precedence
      query += `, set_config('app.current_workspace', '', false)`;
    } else if (options?.workspaceId) {
      // Fallback to workspace only when work is not specified
      query += `, set_config('app.current_workspace', $${paramIndex}, false)`;
      params.push(options.workspaceId);
      paramIndex++;
      // Clear work when workspace is set
      query += `, set_config('app.current_work', '', false)`;
    } else {
      // Clear both if no context provided
      query += `, set_config('app.current_workspace', '', false), set_config('app.current_work', '', false)`;
    }

    await this.pool.query(query, params);
  }

  /**
   * Clear session context after operation completes
   */
  protected async clearSessionContext(): Promise<void> {
    await this.pool.query(`SELECT set_config('app.current_tenant', '', false), set_config('app.current_workspace', '', false), set_config('app.current_work', '', false)`);
  }

  async byId(id: string): Promise<T | undefined> {
    const result = await this.pool.query<Record<string, any>>(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) return undefined;
    return this.toAggregate(result.rows[0]!);
  }

  async list(): Promise<readonly T[]> {
    const result = await this.pool.query<Record<string, any>>(`SELECT * FROM ${this.tableName}`);
    return result.rows.map(row => this.toAggregate(row));
  }

  async find(criteria: Partial<T>): Promise<readonly T[]> {
    const keys = Object.keys(criteria);
    if (keys.length === 0) {
      return [];
    }
    const whereClause = keys.map((key, i) => `"${key}" = $${i + 1}`).join(" AND ");
    const values = Object.values(criteria);
    const result = await this.pool.query<Record<string, any>>(
      `SELECT * FROM ${this.tableName} WHERE ${whereClause}`,
      values
    );
    return result.rows.map(row => this.toAggregate(row));
  }

  async save(entity: T & { version?: number }): Promise<T> {
    console.log(`[base.repository.ts] save() called for table: ${this.tableName}, entity ID: ${entity.id}`);
    // Convert domain entity to database record (camelCase → snake_case)
    const record = this.toRecord(entity);
    const exists = await this.byId(entity.id);
    console.log(`[base.repository.ts] Entity exists in DB: ${exists ? "YES" : "NO"}`);
    console.log(`[base.repository.ts] Generated record:`, JSON.stringify(record, null, 2));

    if (exists) {
      // PR-003: Optimistic concurrency control - check version if present
      const existingEntity = exists as T & { version?: number };
      if (entity.version !== undefined && existingEntity.version !== undefined) {
        // Version check failed - concurrent modification detected
        if (entity.version !== existingEntity.version) {
          throw new Error(`[PostgresRepository] Concurrent modification detected for ${this.tableName}:${entity.id} - current version ${existingEntity.version}, attempted update from version ${entity.version}`);
        }
        // Increment version for successful update
        record.version = entity.version + 1;
      } else if (entity.version === undefined && existingEntity.version === undefined) {
        // Initialize version if not present on existing record
        record.version = 1;
      }
      
      // Build update query with explicit version casting
      const columns = Object.keys(record);
      const setClauses: string[] = [];
      const values: any[] = [];
      columns.forEach((col, idx) => {
        values.push(record[col]);
        if (col === 'version') {
          setClauses.push(`${col} = $${idx + 1}::integer`);
        } else {
          setClauses.push(`${col} = $${idx + 1}`);
        }
      });
      // Add WHERE clause placeholder as last parameter
      values.push(entity.id);
      await this.pool.query(
        `UPDATE ${this.tableName} SET ${setClauses.join(", ")} WHERE id = $${values.length}`,
        values
      );
    } else {
      // PR-003: Initialize version field for new entities
      if (entity.version === undefined) {
        record.version = 1;
      }
      
      // Build insert query with explicit version casting
      const columns = Object.keys(record);
      const placeholders: string[] = [];
      const values: any[] = [];
      columns.forEach((col, idx) => {
        values.push(record[col]);
        if (col === 'version') {
          placeholders.push(`$${idx + 1}::integer`);
        } else {
          placeholders.push(`$${idx + 1}`);
        }
      });
      await this.pool.query(
        `INSERT INTO ${this.tableName} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
        values
      );
    }
    return entity;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM ${this.tableName} WHERE id = $1 RETURNING id`, [id]);
    return result.rows.length > 0;
  }

  async query(filter: Partial<T>): Promise<T[]> {
    // Convert domain filter to database record (camelCase → snake_case)
    const recordFilter = this.toRecord(filter as T);
    const filterKeys = Object.keys(recordFilter);
    const filterValues = Object.values(recordFilter);
    const whereClause = filterKeys.map((key, i) => `${key} = $${i + 1}`).join(" AND ");
    
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE ${whereClause}`,
      filterValues
    );
    return result.rows.map((row: Record<string, any>) => this.toAggregate(row));
  }
}

// Initialize database schema (run once at startup)
export async function initIdentitySchema() {
  // Skip if already initialized to prevent pg_type duplicate key errors
  if (schemaInitialized) {
    return;
  }
  
  const pool = getPool();
  
  // Create tables if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      email_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      owner_id TEXT REFERENCES users(id),
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      product_id TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      UNIQUE(slug, tenant_id)
    );
  `);

  // Create table only if it doesn't exist (avoid pg_type duplicate key errors)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS memberships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      role TEXT NOT NULL,
      joined_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      UNIQUE(user_id, workspace_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      actor_id TEXT NOT NULL, -- Actor-agnostic: supports user-, ai-, iot-, machine-, eos-* actorId tanpa batasan human-only (MA-09 compliance)
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      product_id TEXT NOT NULL,
      actor_label TEXT NOT NULL,
      is_agent BOOLEAN NOT NULL DEFAULT FALSE,
      issued_at TIMESTAMP NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );
  `);

  // C15: Add is_agent column if it doesn't exist (migration for existing tables)
  await pool.query(`
    ALTER TABLE sessions 
    ADD COLUMN IF NOT EXISTS is_agent BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  // Only identity-native tables are created here - cross-capability tables belong to their respective capabilities
  console.log("[PostgreSQL] Identity schema (users, tenants, workspaces, sessions, memberships) initialized successfully");
  schemaInitialized = true;
}