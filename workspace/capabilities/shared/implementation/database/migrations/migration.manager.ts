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
      DROP POLICY IF EXISTS evidence_insert_only ON evidence;
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
      -- Create works table (core Work aggregate table for DB-AUTHORITY-001)
      CREATE TABLE IF NOT EXISTS works (
        id VARCHAR(255) PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL,
        actor_id VARCHAR(255) NOT NULL,
        tenant_id VARCHAR(255) NOT NULL,
        workspace_id VARCHAR(255) NOT NULL,
        participants JSONB NOT NULL DEFAULT '[]'::JSONB,
        state_history JSONB NOT NULL DEFAULT '[]'::JSONB,
        composition_id VARCHAR(255),
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create indexes for works table
      CREATE INDEX IF NOT EXISTS idx_works_tenant_id ON works(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_works_workspace_id ON works(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_works_actor_id ON works(actor_id);
      CREATE INDEX IF NOT EXISTS idx_works_status ON works(status);
      
      -- Enable RLS on works table for tenant isolation
      ALTER TABLE works ENABLE ROW LEVEL SECURITY;
      
      -- Policy: Users can only access rows from their own tenant/workspace
      DROP POLICY IF EXISTS tenant_isolation_works ON works;
      CREATE POLICY tenant_isolation_works ON works
        FOR ALL USING (
          tenant_id = current_setting('app.current_tenant', true) 
           AND workspace_id = current_setting('app.current_workspace', true)
        );
      
      -- Enable RLS on legal_cases table for tenant isolation
      ALTER TABLE legal_cases ENABLE ROW LEVEL SECURITY;
      
      -- Policy: Users can only access rows from their own tenant/workspace
      DROP POLICY IF EXISTS tenant_isolation_legal_cases ON legal_cases;
      CREATE POLICY tenant_isolation_legal_cases ON legal_cases
        FOR ALL USING (
          tenant_id = current_setting('app.current_tenant', true) 
          AND workspace_id = current_setting('app.current_workspace', true)
        );
      
      -- Enable RLS on communication_events table for tenant isolation
      ALTER TABLE communication_events ENABLE ROW LEVEL SECURITY;
      
      -- Policy: Users can only access communication from their own tenant/workspace
      DROP POLICY IF EXISTS tenant_isolation_communication ON communication_events;
      CREATE POLICY tenant_isolation_communication ON communication_events
        FOR ALL USING (
          tenant_id = current_setting('app.current_tenant', true) 
          AND workspace_id = current_setting('app.current_workspace', true)
        );
    `
  },
  {
    version: "007",
    name: "add_knowledge_graph_tables",
    description: "Create knowledge_graph_nodes and knowledge_graph_edges tables for BETTER EOS value-reality hyper-relationships",
    sql: `
      -- Knowledge Graph Nodes table (supports BETTER EOS value-reality entities)
      CREATE TABLE IF NOT EXISTS knowledge_graph_nodes (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        tenant_id VARCHAR(255) NOT NULL,
        workspace_id VARCHAR(255) NOT NULL,
        properties JSONB NOT NULL DEFAULT '{}'::JSONB,
        metadata JSONB,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Knowledge Graph Edges table (supports hyper-relationships between entities)
      CREATE TABLE IF NOT EXISTS knowledge_graph_edges (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        source_node_id VARCHAR(255) NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,
        target_node_id VARCHAR(255) NOT NULL REFERENCES knowledge_graph_nodes(id) ON DELETE CASCADE,
        tenant_id VARCHAR(255) NOT NULL,
        workspace_id VARCHAR(255) NOT NULL,
        properties JSONB NOT NULL DEFAULT '{}'::JSONB,
        metadata JSONB,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create indexes for knowledge graph queries
      CREATE INDEX IF NOT EXISTS idx_kg_nodes_tenant_id ON knowledge_graph_nodes(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_kg_nodes_workspace_id ON knowledge_graph_nodes(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_kg_nodes_type ON knowledge_graph_nodes(type);
      CREATE INDEX IF NOT EXISTS idx_kg_edges_source ON knowledge_graph_edges(source_node_id);
      CREATE INDEX IF NOT EXISTS idx_kg_edges_target ON knowledge_graph_edges(target_node_id);
      CREATE INDEX IF NOT EXISTS idx_kg_edges_tenant_id ON knowledge_graph_edges(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_kg_edges_workspace_id ON knowledge_graph_edges(workspace_id);
      
      -- Enable RLS on knowledge graph tables for tenant isolation
      ALTER TABLE knowledge_graph_nodes ENABLE ROW LEVEL SECURITY;
      ALTER TABLE knowledge_graph_edges ENABLE ROW LEVEL SECURITY;
      
      -- Drop existing policies if they exist (idempotent execution)
      DROP POLICY IF EXISTS tenant_isolation_kg_nodes ON knowledge_graph_nodes;
      DROP POLICY IF EXISTS tenant_isolation_kg_edges ON knowledge_graph_edges;
      
      -- Tenant isolation policies for knowledge graph
      CREATE POLICY tenant_isolation_kg_nodes ON knowledge_graph_nodes
        FOR ALL USING (
          tenant_id = current_setting('app.current_tenant', true) 
          AND workspace_id = current_setting('app.current_workspace', true)
        );
      
      CREATE POLICY tenant_isolation_kg_edges ON knowledge_graph_edges
        FOR ALL USING (
          tenant_id = current_setting('app.current_tenant', true) 
          AND workspace_id = current_setting('app.current_workspace', true)
        );
    `
  },
  {
    version: "008",
    name: "add_external_signals_table",
    description: "Create external_signals table for REALITY-002 inbound signal persistence",
    sql: `
      -- External Signals table (supports REALITY-002 inbound signal processing)
      CREATE TABLE IF NOT EXISTS external_signals (
        id VARCHAR(255) PRIMARY KEY,
        source_type VARCHAR(50) NOT NULL,
        source_metadata JSONB,
        work_id VARCHAR(255) NOT NULL,
        tenant_id VARCHAR(255) NOT NULL,
        workspace_id VARCHAR(255) NOT NULL,
        raw_input TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'received',
        observed_at TIMESTAMP WITH TIME ZONE NOT NULL,
        processed_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create indexes for external signals queries
      CREATE INDEX IF NOT EXISTS idx_external_signals_work_id ON external_signals(work_id);
      CREATE INDEX IF NOT EXISTS idx_external_signals_tenant_id ON external_signals(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_external_signals_workspace_id ON external_signals(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_external_signals_source_type ON external_signals(source_type);
      CREATE INDEX IF NOT EXISTS idx_external_signals_status ON external_signals(status);
      
      -- Enable RLS on external_signals table for tenant isolation
      ALTER TABLE external_signals ENABLE ROW LEVEL SECURITY;
      
      -- Drop existing policy if it exists (idempotent execution)
      DROP POLICY IF EXISTS tenant_isolation_external_signals ON external_signals;
      
      -- Tenant isolation policy for external signals
      CREATE POLICY tenant_isolation_external_signals ON external_signals
        FOR ALL USING (
          tenant_id = current_setting('app.current_tenant', true) 
          AND workspace_id = current_setting('app.current_workspace', true)
        );
    `
  },
  {
    version: "009",
    name: "seed_work_001_golden_path",
    description: "Seed WORK-001 for G2-01 Real Work → Browser golden path verification",
    sql: `
      INSERT INTO works (
        id, title, description, status, actor_id, tenant_id, workspace_id, 
        participants, state_history, version, created_at, updated_at
      ) VALUES (
        'work-WORK-001',
        'WORK-001: Pendirian PT. EOS Indonesia',
        'G2-01 Golden Path: First real canonical work flowing from PostgreSQL → CanonicalWorkRepository → buildWorkRealityModel() → WorkRealityModel → browser. No mocks, no fixtures, 100% real data.',
        'active',
        '+628999999999',
        'tenant.anonymous',
        'professional-workspace.anonymous',
        '[{"actorId": "+628999999999", "role": "customer", "addedAt": "2026-09-09T00:00:00.000Z", "addedBy": "+628999999999"}, {"actorId": "lawyer-001", "role": "professional", "addedAt": "2026-09-09T00:30:00.000Z", "addedBy": "+628999999999"}]',
        '[{"status": "draft", "timestamp": "2026-09-09T00:00:00.000Z", "actorId": "+628999999999", "note": "Work created - G2-01 initialization"}, {"status": "active", "timestamp": "2026-09-09T01:00:00.000Z", "actorId": "lawyer-001", "note": "Work activated - ready for client interaction"}]',
        1,
        '2026-09-09T00:00:00.000Z',
        '2026-09-09T01:00:00.000Z'
      ) ON CONFLICT (id) DO NOTHING;
    `
  },
  {
    version: "010",
    name: "seed_work_002_lh_case",
    description: "Seed work-WORK-002 for LawyersHub golden path testing",
    sql: `
      INSERT INTO works (
        id, title, description, status, actor_id, tenant_id, workspace_id, 
        participants, state_history, version, created_at, updated_at
      ) VALUES (
        'work-WORK-002',
        'WORK-002: Pendirian PT - PT Teknologi Nusantara',
        'Klien membutuhkan pendirian PT untuk usaha teknologi di Bandung. Memerlukan proses legal lengkap.',
        'active',
        '+62888888888888',
        'tenant.anonymous',
        'professional-workspace.anonymous',
        '[{"actorId": "+62888888888888", "role": "customer", "addedAt": "2026-09-08T10:00:00.000Z", "addedBy": "+62888888888888"}, {"actorId": "lawyer.bandung.001", "role": "professional", "addedAt": "2026-09-08T10:15:00.000Z", "addedBy": "lawyer.bandung.001"}]',
        '[{"status": "draft", "timestamp": "2026-09-08T10:00:00.000Z", "actorId": "+62888888888888", "note": "Work created"}, {"status": "pending_assignment", "timestamp": "2026-09-08T10:10:00.000Z", "actorId": "lawyer.bandung.001", "note": "Work assigned"}, {"status": "active", "timestamp": "2026-09-08T10:20:00.000Z", "actorId": "lawyer.bandung.001", "note": "Work activated"}]',
        1,
        '2026-09-08T10:00:00.000Z',
        '2026-09-08T10:20:00.000Z'
      ) ON CONFLICT (id) DO NOTHING;
    `
  },
  {
    version: "011",
    name: "seed_lh_case_001_uaat_test",
    description: "Seed LH-CASE-001 for Human UAT - PT Pendirian PT Kopi Nusantara Mandiri",
    sql: `
      INSERT INTO works (
        id, title, description, status, actor_id, tenant_id, workspace_id, 
        participants, state_history, version, created_at, updated_at
      ) VALUES (
        'work-LH-CASE-001',
        'LH-CASE-001: PT Pendirian - PT Kopi Nusantara Mandiri',
        'LawyersHub Golden Slice: Klien membutuhkan pendirian PT untuk usaha kopi retail di Jakarta. Memerlukan proses legal lengkap dari konsultasi hingga sertifikat NIB. UAT Work item untuk real human testing.',
        'active',
        '+62877777777777',
        'tenant.anonymous',
        'professional-workspace.anonymous',
        '[{"actorId": "+62877777777777", "role": "customer", "addedAt": "2026-09-09T13:00:00.000Z", "addedBy": "+62877777777777"}, {"actorId": "lawyer.jakarta.001", "role": "professional", "addedAt": "2026-09-09T13:15:00.000Z", "addedBy": "lawyer.jakarta.001"}, {"actorId": "notary.jakarta.001", "role": "notary", "addedAt": "2026-09-09T13:30:00.000Z", "addedBy": "lawyer.jakarta.001"}]',
        '[{"status": "draft", "timestamp": "2026-09-09T13:00:00.000Z", "actorId": "+62877777777777", "note": "Work created - UAT initialization"}, {"status": "pending_assignment", "timestamp": "2026-09-09T13:10:00.000Z", "actorId": "lawyer.jakarta.001", "note": "Work assigned to PT establishment manager"}, {"status": "active", "timestamp": "2026-09-09T13:20:00.000Z", "actorId": "lawyer.jakarta.001", "note": "Work activated - ready for human UAT"}]',
        1,
        '2026-09-09T13:00:00.000Z',
        '2026-09-09T13:20:00.000Z'
      ) ON CONFLICT (id) DO NOTHING;
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

// Standalone execution: run migrations directly when this file is executed with tsx
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    console.log("[MigrationManager] Starting standalone migration execution...");
    const { Pool } = await import("pg");
    
    // Create pool with staging credentials from docker compose (correct port and database name)
      const pool = new Pool({
        host: "localhost",
        port: 5433, // Docker compose maps container port 5432 to host port 5433
        user: "eos_user",
        password: "eos_pass123",
        database: "eos_identity" // Correct database name from compose.yaml
      });
    
    try {
      // Test connection first
      await pool.connect();
      console.log("[MigrationManager] Successfully connected to PostgreSQL database");
      
      // Reset schema_migrations to re-run all migrations (fixes "works table missing" issue)
      const client = await pool.connect();
      try {
        await client.query("TRUNCATE TABLE schema_migrations");
        console.log("[MigrationManager] Reset schema_migrations table to re-run all migrations");
      } finally {
        client.release();
      }
      
      // Run all migrations
      const result = await DatabaseMigrationManager.runMigrations(pool);
      console.log("\n[MigrationManager] Migration execution complete:");
      console.log(`  Executed: ${result.executed.join(", ") || "None"}`);
      console.log(`  Already applied: ${result.already_applied.join(", ") || "None"}`);
      
      if (result.errors.length > 0) {
        console.error("\n[MigrationManager] Errors encountered:");
        result.errors.forEach(err => console.error(`  - ${err}`));
        process.exit(1);
      }
      
      console.log("\n[MigrationManager] All migrations applied successfully!");
      process.exit(0);
    } catch (error) {
      console.error("[MigrationManager] Fatal error:", error);
      process.exit(1);
    } finally {
      await pool.end();
    }
  })();
}