import { Pool } from "pg";

// Initialize connection pool once
let pool: Pool | null = null;
// Schema initialization flag - prevent multiple schema creation attempts (pg_type duplicate key errors)
let schemaInitialized = false;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("[PostgreSQL] DATABASE_URL environment variable is required");
    }
    pool = new Pool({
      connectionString,
      max: 10, // Connection pool limit
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

// Base repository class with common CRUD operations
export abstract class PostgresRepository<T extends { id: string }> {
  protected tableName: string;
  protected pool: Pool;

  // Abstract mapping methods for camelCase ↔ snake_case conversion
  protected abstract toRecord(entity: T): Record<string, any>;
  protected abstract toAggregate(record: Record<string, any>): T;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.pool = getPool();
  }

  /**
   * Set current tenant and workspace for RLS (Row Level Security) enforcement
   * Must be called before any database operation in production to enforce tenant isolation
   */
  protected async setSessionContext(tenantId: string, workspaceId: string): Promise<void> {
    await this.pool.query(`SELECT set_config('app.current_tenant', $1, false), set_config('app.current_workspace', $2, false)`, [tenantId, workspaceId]);
  }

  /**
   * Clear session context after operation completes
   */
  protected async clearSessionContext(): Promise<void> {
    await this.pool.query(`SELECT set_config('app.current_tenant', '', false), set_config('app.current_workspace', '', false)`);
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
    
    const result = await this.pool.query<Record<string, any>>(
      `SELECT * FROM ${this.tableName} WHERE ${whereClause}`,
      filterValues
    );
    return result.rows.map(row => this.toAggregate(row));
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
      actor_id TEXT NOT NULL REFERENCES users(id),
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

  // Create requirements table for requirement-management capability (PRODUCTION SCHEMA)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS requirements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      owner TEXT NOT NULL,
      source TEXT NOT NULL,
      actor_id TEXT REFERENCES users(id),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      logical_work_id TEXT,
      linked_capability_ids TEXT[] NOT NULL DEFAULT '{}',
      acceptance_criteria TEXT[] NOT NULL DEFAULT '{}',
      verification_status TEXT NOT NULL,
      depends_on TEXT[] NOT NULL DEFAULT '{}',
      version INTEGER NOT NULL DEFAULT 1,
      created_by TEXT,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      approved_at TIMESTAMP,
      implemented_at TIMESTAMP,
      verified_at TIMESTAMP
    );
  `);

  // Create cases table for legal-case capability
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      lawyer_id TEXT,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      actor_id TEXT REFERENCES users(id),
      source_discussion_id TEXT,
      work_id TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      closed_at TIMESTAMP
    );
  `);
  
  // Migrations for existing tables (add columns that may be missing)
  await pool.query(`
    ALTER TABLE cases 
    ADD COLUMN IF NOT EXISTS work_id TEXT;
  `);
  await pool.query(`
    ALTER TABLE cases 
    ADD COLUMN IF NOT EXISTS actor_id TEXT REFERENCES users(id);
  `);
  await pool.query(`
    ALTER TABLE cases 
    ADD COLUMN IF NOT EXISTS source_discussion_id TEXT;
  `);
  await pool.query(`
    ALTER TABLE cases 
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
  `);
  await pool.query(`
    ALTER TABLE cases 
    ADD COLUMN IF NOT EXISTS intent JSONB;
  `);

  // Create intents table for Intent primitive (first-class EOS primitive)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS intents (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      actor_id TEXT REFERENCES users(id),
      origin TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      raw JSONB,
      understanding JSONB,
      resolution JSONB,
      category TEXT NOT NULL,
      status TEXT NOT NULL,
      metadata JSONB,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      converted_to_work_id TEXT REFERENCES cases(id),
      version INTEGER NOT NULL DEFAULT 1
    );
  `);

  // ALTER TABLE migrations for Universal Intent (Universal Intake capability) - add new columns if missing
  await pool.query(`
    ALTER TABLE intents ADD COLUMN IF NOT EXISTS origin TEXT;
  `);
  await pool.query(`
    ALTER TABLE intents ADD COLUMN IF NOT EXISTS raw JSONB;
  `);
  await pool.query(`
    ALTER TABLE intents ADD COLUMN IF NOT EXISTS understanding JSONB;
  `);
  await pool.query(`
    ALTER TABLE intents ADD COLUMN IF NOT EXISTS resolution JSONB;
  `);
  // Make actor_id nullable to support non-human origins
  await pool.query(`
    ALTER TABLE intents ALTER COLUMN actor_id DROP NOT NULL;
  `);

  // Create service_requests table for service-directory capability
  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_requests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      status TEXT NOT NULL,
      requester_name TEXT,
      provider_id TEXT,
      budget TEXT,
      deadline TIMESTAMP,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      delivered_at TIMESTAMP
    );
  `);

  // Create requirements table for requirement-management capability
  await pool.query(`
    CREATE TABLE IF NOT EXISTS requirements (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      actor_id TEXT NOT NULL REFERENCES users(id),
      logical_work_id TEXT,
      title TEXT NOT NULL,
      summary TEXT,
      description TEXT,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      owner TEXT,
      source TEXT,
      linked_capability_ids TEXT[],
      acceptance_criteria TEXT[],
      verification_status TEXT,
      depends_on TEXT[],
      created_by TEXT REFERENCES users(id),
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      approved_at TIMESTAMP,
      implemented_at TIMESTAMP,
      verified_at TIMESTAMP,
      version INTEGER NOT NULL DEFAULT 1
    );
  `);

  console.log("[PostgreSQL] Identity + Legal Case + Service Directory + Requirement Management schema initialized successfully");
  schemaInitialized = true;
}