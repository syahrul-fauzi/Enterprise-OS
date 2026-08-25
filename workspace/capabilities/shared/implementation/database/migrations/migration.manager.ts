// Database migration manager - implements schema versioning for Postgres
// Ensures all environments run identical database schema versions
import { Pool } from "pg";

interface DatabaseMigration {
  version: string;
  name: string;
  description: string;
  executed_at?: Date;
  sql: string;
}

// Migration registry - add new migrations in chronological order
const MIGRATIONS: DatabaseMigration[] = [
  {
    version: "001",
    name: "initial_schema",
    description: "Create communication_events and legal_cases tables with indexes",
    sql: `
      -- Communication events table (v001)
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
      
      -- Legal cases table (v001)
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
    `
  },
  {
    version: "002",
    name: "add_migrations_table",
    description: "Create schema_migrations table to track executed migrations",
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(10) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
  }
];

export class DatabaseMigrationManager {
  /**
   * Initialize migrations table and run any pending migrations
   * Must be called on application startup to ensure schema is up-to-date
   */
  static async runMigrations(pool: Pool): Promise<{
    executed: string[];
    already_applied: string[];
    errors: string[];
  }> {
    const executed: string[] = [];
    const alreadyApplied: string[] = [];
    const errors: string[] = [];
    
    try {
      // First ensure migrations table exists (bootstrap)
      await this.ensureMigrationsTable(pool);
      
      // Get list of already executed migrations
      const applied = await this.getAppliedMigrations(pool);
      const appliedVersions = new Set(applied.map(m => m.version));
      
      // Run migrations in order
      for (const migration of MIGRATIONS) {
        if (appliedVersions.has(migration.version)) {
          alreadyApplied.push(migration.version);
          continue;
        }
        
        console.log(`[MigrationManager] Applying migration ${migration.version}: ${migration.name}`);
        
        try {
          // Execute migration SQL in a transaction
          const client = await pool.connect();
          try {
            await client.query("BEGIN");
            await client.query(migration.sql);
            await client.query(
              "INSERT INTO schema_migrations (version, name, description) VALUES ($1, $2, $3)",
              [migration.version, migration.name, migration.description]
            );
            await client.query("COMMIT");
            executed.push(migration.version);
            console.log(`[MigrationManager] Successfully applied migration ${migration.version}`);
          } catch (e) {
            await client.query("ROLLBACK");
            throw e;
          } finally {
            client.release();
          }
        } catch (e) {
          const errMsg = `Migration ${migration.version} failed: ${e instanceof Error ? e.message : "Unknown error"}`;
          console.error(`[MigrationManager] ${errMsg}`);
          errors.push(errMsg);
          // Stop migration chain on first failure to prevent partial schema
          break;
        }
      }
      
    } catch (e) {
      const errMsg = `Migration system failed: ${e instanceof Error ? e.message : "Unknown error"}`;
      console.error(`[MigrationManager] ${errMsg}`);
      errors.push(errMsg);
    }
    
    return { executed, alreadyApplied, errors };
  }
  
  /**
   * Bootstrap the migrations table if it doesn't exist
   */
  private static async ensureMigrationsTable(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(10) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  
  /**
   * Get list of migrations already applied to the database
   */
  private static async getAppliedMigrations(pool: Pool): Promise<Array<{version: string; executed_at: Date}>> {
    const result = await pool.query("SELECT version, executed_at FROM schema_migrations ORDER BY version ASC");
    return result.rows.map((row: any) => ({
      version: row.version,
      executed_at: new Date(row.executed_at),
    }));
  }
  
  /**
   * Get all registered migrations (for debugging/auditing)
   */
  static getRegisteredMigrations(): DatabaseMigration[] {
    return [...MIGRATIONS];
  }
}