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
  },
  {
    version: "003",
    name: "communication_events_workspace_id",
    description: "Add workspace_id column to communication_events for existing databases",
    sql: `
      -- Add workspace_id column if it doesn't exist (for backward compatibility)
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communication_events' AND column_name = 'workspace_id') THEN
          ALTER TABLE communication_events ADD COLUMN workspace_id VARCHAR(255) NOT NULL DEFAULT 'professional-workspace.anonymous';
        END IF;
      END $$;
      
      -- Add index if it doesn't exist
      CREATE INDEX IF NOT EXISTS idx_communication_workspace_id ON communication_events(workspace_id);
    `
  },
  {
    version: "004",
    name: "seed_work_staging_001_communication",
    description: "Seed golden communication events for work-staging-001 with correct tenant/workspace",
    sql: `
      -- Insert golden communication events for work-staging-001 with anonymous session values
      INSERT INTO communication_events (
        event_id, work_id, tenant_id, workspace_id, sender_id, recipient_ids, 
        event_type, content, adapter_type, timestamp, status
      ) VALUES 
      (
        'comm-staging-001-001',
        'work-staging-001',
        'tenant.anonymous',
        'professional-workspace.anonymous',
        'anonymous.user',
        ARRAY['lawyer-001', 'client-001'],
        'CommunicationSent',
        'Selamat datang di golden fixture work-staging-001. Ini adalah event komunikasi pertama yang terdaftar dengan workspace_id yang benar.',
        'whatsapp',
        NOW() - INTERVAL '1 hour',
        'delivered'
      ),
      (
        'comm-staging-001-002',
        'work-staging-001',
        'tenant.anonymous',
        'professional-workspace.anonymous',
        'lawyer-001',
        ARRAY['anonymous.user'],
        'CommunicationSent',
        'Terima kasih telah mengirimkan permohonan pendirian PT. Saya akan membantu proses hukum Anda dari awal sampai selesai.',
        'whatsapp',
        NOW() - INTERVAL '30 minutes',
        'delivered'
      ),
      (
        'comm-staging-001-003',
        'work-staging-001',
        'tenant.anonymous',
        'professional-workspace.anonymous',
        'anonymous.user',
        ARRAY['lawyer-001'],
        'CommunicationSent',
        'Terima kasih kembali. Dokumen yang diperlukan saya lampirkan dalam sistem untuk review.',
        'email',
        NOW() - INTERVAL '10 minutes',
        'sent'
      )
      ON CONFLICT (event_id) DO NOTHING;
    `
  },
  {
    version: "005",
    name: "add_evidence_table_rls",
    description: "Enable Row Level Security on evidence table to enforce evidence-immutable invariant",
    sql: `
      -- Create evidence table if it doesn't exist (supports evidence-immutable invariant)
      CREATE TABLE IF NOT EXISTS evidence (
        id VARCHAR(255) PRIMARY KEY,
        work_id VARCHAR(255) NOT NULL,
        actor_id VARCHAR(255) NOT NULL,
        tenant_id VARCHAR(255) NOT NULL,
        workspace_id VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      );
      
      -- Enable RLS on evidence table
      ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
      
      -- Create policy that only allows INSERT, never UPDATE or DELETE (enforces evidence immutability)
      -- Users can only insert new evidence, never modify or delete existing ones
      -- Allow INSERT only when tenant/workspace matches current session
      CREATE POLICY evidence_insert_only ON evidence
        FOR ALL USING (false)
        WITH CHECK (
          tenant_id = current_setting('app.current_tenant', true) 
          AND workspace_id = current_setting('app.current_workspace', true)
        );
      
      -- Create indexes for evidence queries
      CREATE INDEX IF NOT EXISTS idx_evidence_work_id ON evidence(work_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_tenant_id ON evidence(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_workspace_id ON evidence(workspace_id);
    `
  },
  {
    version: "006",
    name: "enable_rls_on_core_tables",
    description: "Enable Row Level Security on legal_cases and communication_events for tenant isolation",
    sql: `
      -- Enable RLS on legal_cases table for tenant isolation
      ALTER TABLE legal_cases ENABLE ROW LEVEL SECURITY;
      
      -- Policy: Users can only access rows from their own tenant/workspace
      CREATE POLICY tenant_isolation_legal_cases ON legal_cases
        FOR ALL USING (
          tenant_id = current_setting('app.current_tenant', true) 
          AND workspace_id = current_setting('app.current_workspace', true)
        );
      
      -- Enable RLS on communication_events table for tenant isolation
      ALTER TABLE communication_events ENABLE ROW LEVEL SECURITY;
      
      -- Policy: Users can only access communication from their own tenant/workspace
      CREATE POLICY tenant_isolation_communication ON communication_events
        FOR ALL USING (
          tenant_id = current_setting('app.current_tenant', true) 
          AND workspace_id = current_setting('app.current_workspace', true)
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
    
    return { executed, already_applied: alreadyApplied, errors };
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