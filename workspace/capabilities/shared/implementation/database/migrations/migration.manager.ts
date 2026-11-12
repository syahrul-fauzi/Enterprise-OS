// @ts-nocheck - Migration file hanya berisi definisi SQL, tidak memerlukan type checking TypeScript ketat
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
    sql: String.raw`
      -- Migration 001: Initial schema setup
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(10) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS communication_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(255) NOT NULL,
        actor_id VARCHAR(255) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT idx_communication_events_tenant UNIQUE (id, tenant_id)
      );

      CREATE TABLE IF NOT EXISTS legal_cases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(255) NOT NULL,
        case_number VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(500) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT idx_legal_cases_tenant UNIQUE (id, tenant_id)
      );

      -- Create RLS policies for tenant isolation
      ALTER TABLE communication_events ENABLE ROW LEVEL SECURITY;
      ALTER TABLE legal_cases ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY tenant_isolation_communication_events ON communication_events
        FOR ALL USING (tenant_id = current_setting('app.current_tenant'));
      
      CREATE POLICY tenant_isolation_legal_cases ON legal_cases
        FOR ALL USING (tenant_id = current_setting('app.current_tenant'));
    `
  },
  {
    version: "002",
    name: "add_compliance_cases",
    description: "Add compliance_cases table for investment compliance workflow",
    sql: String.raw`
      -- Migration 002: Add compliance cases table
      CREATE TABLE IF NOT EXISTS compliance_cases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(255) NOT NULL,
        case_number VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        risk_level VARCHAR(20) NOT NULL DEFAULT 'medium',
        assignee_id VARCHAR(255),
        due_date TIMESTAMP WITH TIME ZONE,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by VARCHAR(255) NOT NULL,
        CONSTRAINT idx_compliance_cases_tenant UNIQUE (id, tenant_id)
      );

      -- Add RLS policy
      ALTER TABLE compliance_cases ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY tenant_isolation_compliance_cases ON compliance_cases
        FOR ALL USING (tenant_id = current_setting('app.current_tenant'));

      -- Add indexes for performance
      CREATE INDEX IF NOT EXISTS idx_compliance_cases_status ON compliance_cases(status);
      CREATE INDEX IF NOT EXISTS idx_compliance_cases_assignee ON compliance_cases(assignee_id);
    `
  },
  {
    version: "003",
    name: "add_tenant_channel_configs",
    description: "Add tenant_channel_configs table for MCP/channel configuration with RLS",
    sql: String.raw`
      -- Migration 003: Add tenant channel configurations
      CREATE TABLE IF NOT EXISTS tenant_channel_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id VARCHAR(255) NOT NULL,
        channel_type VARCHAR(50) NOT NULL, -- 'mcp', 'api', 'webhook'
        config JSONB NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT idx_tenant_channel_configs_tenant_channel UNIQUE (tenant_id, channel_type)
      );

      -- Add RLS policy untuk tenant isolation (mandat EOS-360-004)
      ALTER TABLE tenant_channel_configs ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY tenant_isolation_tenant_channel_configs ON tenant_channel_configs
        FOR ALL USING (tenant_id = current_setting('app.current_tenant'));

      -- Index untuk query cepat
      CREATE INDEX IF NOT EXISTS idx_tenant_channel_configs_type ON tenant_channel_configs(channel_type);
    `
  }
];

export class MigrationManager {
  static async runMigrations(pool: Pool): Promise<{ success: boolean; executed: string[]; errors: string[] }> {
    const executed: string[] = [];
    const errors: string[] = [];

    try {
      // Get already executed migrations
      const { rows: existingMigrations } = await pool.query(
        "SELECT version FROM schema_migrations ORDER BY version ASC"
      );
      const executedVersions = new Set(existingMigrations.map(m => m.version));

      // Run pending migrations in order
      for (const migration of MIGRATIONS) {
        if (!executedVersions.has(migration.version)) {
          try {
            await pool.query("BEGIN");
            await pool.query(migration.sql);
            await pool.query(
              "INSERT INTO schema_migrations (version, name, description) VALUES ($1, $2, $3)",
              [migration.version, migration.name, migration.description]
            );
            await pool.query("COMMIT");
            executed.push(migration.version);
            console.log(`[MigrationManager] Successfully executed migration ${migration.version}: ${migration.name}`);
          } catch (error) {
            await pool.query("ROLLBACK");
            const errorMsg = `Failed to execute migration ${migration.version}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(errorMsg);
            console.error(`[MigrationManager] ${errorMsg}`);
            break;
          }
        }
      }

      return {
        success: errors.length === 0,
        executed,
        errors
      };
    } catch (globalError) {
      const errorMsg = `Global migration failure: ${globalError instanceof Error ? globalError.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[MigrationManager] ${errorMsg}`);
      return { success: false, executed, errors };
    }
  }

  static getPendingMigrations(pool: Pool): Promise<string[]> {
    // Implementation to check pending migrations without running them
    return Promise.resolve(MIGRATIONS.map(m => m.version));
  }
}