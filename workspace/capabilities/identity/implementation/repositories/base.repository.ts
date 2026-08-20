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

  constructor(tableName: string) {
    this.tableName = tableName;
    this.pool = getPool();
  }

  async byId(id: string): Promise<T | undefined> {
    const result = await this.pool.query<T>(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  async list(): Promise<readonly T[]> {
    const result = await this.pool.query<T>(`SELECT * FROM ${this.tableName}`);
    return result.rows;
  }

  async save(entity: T & { version?: number }): Promise<T> {
    const exists = await this.byId(entity.id);
    const columns = Object.keys(entity);
    const values = Object.values(entity);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

    if (exists) {
      // PR-003: Optimistic concurrency control - check version if present
      const existingEntity = exists as T & { version?: number };
      if (entity.version !== undefined && existingEntity.version !== undefined) {
        // Version check failed - concurrent modification detected
        if (entity.version !== existingEntity.version) {
          throw new Error(`[PostgresRepository] Concurrent modification detected for ${this.tableName}:${entity.id} - current version ${existingEntity.version}, attempted update from version ${entity.version}`);
        }
        // Increment version for successful update
        (entity as any).version = entity.version + 1;
      } else if (entity.version === undefined && existingEntity.version === undefined) {
        // Initialize version if not present on existing record
        (entity as any).version = 1;
      }
      
      // Refresh columns and values with updated version
      const updatedColumns = Object.keys(entity);
      const updatedValues = Object.values(entity);
      const updatedSetClause = updatedColumns.map((col, i) => `${col} = $${i + 1}`).join(", ");
      await this.pool.query(
        `UPDATE ${this.tableName} SET ${updatedSetClause} WHERE id = $${updatedValues.length}`,
        [...updatedValues, entity.id]
      );
    } else {
      // PR-003: Initialize version field for new entities
      (entity as any).version = 1;
      // Insert new with initialized version
      const newColumns = Object.keys(entity);
      const newValues = Object.values(entity);
      const newPlaceholders = newValues.map((_, i) => `$${i + 1}`).join(", ");
      await this.pool.query(
        `INSERT INTO ${this.tableName} (${newColumns.join(", ")}) VALUES (${newPlaceholders})`,
        newValues
      );
    }
    return entity;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM ${this.tableName} WHERE id = $1 RETURNING id`, [id]);
    return result.rows.length > 0;
  }

  async query(filter: Partial<T>): Promise<T[]> {
    const filterKeys = Object.keys(filter);
    const filterValues = Object.values(filter);
    const whereClause = filterKeys.map((key, i) => `${key} = $${i + 1}`).join(" AND ");
    
    const result = await this.pool.query<T>(
      `SELECT * FROM ${this.tableName} WHERE ${whereClause}`,
      filterValues
    );
    return result.rows;
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
      issued_at TIMESTAMP NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
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
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      closed_at TIMESTAMP
    );
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

  console.log("[PostgreSQL] Identity + Legal Case + Service Directory schema initialized successfully");
  schemaInitialized = true;
}