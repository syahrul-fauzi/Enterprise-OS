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
    name: "add_deliveries_table",
    description: "Create deliveries table for DEL-001 product-delivery persistence",
    sql: `
      -- Deliveries table (v004 - DEL-001 persistence)
      CREATE TABLE IF NOT EXISTS deliveries (
        id VARCHAR(255) PRIMARY KEY,
        work_id VARCHAR(255) NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        customer_need TEXT NOT NULL,
        status VARCHAR(50) NOT NULL,
        priority VARCHAR(50) NOT NULL,
        category VARCHAR(100) NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        linked_work_item_id VARCHAR(255) NOT NULL,
        scheduled_delivery_date TIMESTAMP WITH TIME ZONE,
        customer_id VARCHAR(255),
        handler_id VARCHAR(255),
        tracking_number VARCHAR(255),
        tenant_id VARCHAR(255) NOT NULL,
        workspace_id VARCHAR(255) NOT NULL,
        actor_id VARCHAR(255) NOT NULL,
        actual_delivery_date TIMESTAMP WITH TIME ZONE,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Indexes untuk query performance dan join dengan works table
      CREATE INDEX IF NOT EXISTS idx_deliveries_work_id ON deliveries(work_id);
      CREATE INDEX IF NOT EXISTS idx_deliveries_tenant_id ON deliveries(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
      CREATE INDEX IF NOT EXISTS idx_deliveries_handler_id ON deliveries(handler_id);
    `
  },
  {
    version: "005",
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
    version: "006",
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
  // Add work_id column to works table (007 migration - backward compatibility)
  {
    version: "007",
    name: "add_work_id_column_to_works_table",
    up: `
        -- Create works table (core Work aggregate table for DB-AUTHORITY-001)
         CREATE TABLE IF NOT EXISTS works (
           id VARCHAR(255) PRIMARY KEY,
           work_id VARCHAR(255),
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
           updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
           session_id VARCHAR(255),
           linked_expression_id VARCHAR(255),
           active_execution_id VARCHAR(255),
           lease_until TIMESTAMP WITH TIME ZONE,
           claim_status VARCHAR(50) DEFAULT 'unclaimed',
           previous_execution_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
           boundaries_crossed JSONB NOT NULL DEFAULT '[]'::JSONB
         );
         
         -- Add missing columns idempotently for existing databases
         DO $$ 
         BEGIN 
           -- Add work_id column
           IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'works') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'work_id') THEN 
             ALTER TABLE works ADD COLUMN work_id VARCHAR(255);
           END IF;
           -- Add session_id column
           IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'works') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'session_id') THEN 
             ALTER TABLE works ADD COLUMN session_id VARCHAR(255);
           END IF;
           -- Add linked_expression_id column
           IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'works') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'linked_expression_id') THEN 
             ALTER TABLE works ADD COLUMN linked_expression_id VARCHAR(255);
           END IF;
           -- Add active_execution_id column
           IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'works') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'active_execution_id') THEN 
             ALTER TABLE works ADD COLUMN active_execution_id VARCHAR(255);
           END IF;
           -- Add lease_until column
           IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'works') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'lease_until') THEN 
             ALTER TABLE works ADD COLUMN lease_until TIMESTAMP WITH TIME ZONE;
           END IF;
           -- Add claim_status column
           IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'works') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'claim_status') THEN 
             ALTER TABLE works ADD COLUMN claim_status VARCHAR(50) DEFAULT 'unclaimed';
           END IF;
           -- Add previous_execution_ids column
           IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'works') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'previous_execution_ids') THEN 
             ALTER TABLE works ADD COLUMN previous_execution_ids JSONB NOT NULL DEFAULT '[]'::JSONB;
           END IF;
           -- Add boundaries_crossed column
           IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'works') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'boundaries_crossed') THEN 
             ALTER TABLE works ADD COLUMN boundaries_crossed JSONB NOT NULL DEFAULT '[]'::JSONB;
           END IF;
           -- Add processed_event_ids column (EDGE-A-001: untuk durable deduplikasi event di edge device)
           IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'works') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'processed_event_ids') THEN 
             ALTER TABLE works ADD COLUMN processed_event_ids JSONB NOT NULL DEFAULT '[]'::JSONB;
           END IF;
         END $$;
    `,
    down: `
        -- Revert work_id column addition - idempotent rollback
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'works') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'work_id') THEN
            ALTER TABLE works DROP COLUMN IF EXISTS work_id;
          END IF;
        END $$;
    `
  },

  {
    version: "008",
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
    version: "010",
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
    version: "011",
    name: "add_service_directory_rls_policies",
    description: "Add RLS policies for service_requests and service_providers tables (TENANT-ISOLATION-001)",
    sql: `
      -- Enable RLS on service_requests and service_providers tables
      ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
      ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
      
      -- Drop existing policies if they exist (idempotent execution)
      DROP POLICY IF EXISTS tenant_isolation_service_requests ON service_requests;
      DROP POLICY IF EXISTS tenant_isolation_service_providers ON service_providers;
      
      -- Tenant isolation policies for service directory tables
      CREATE POLICY tenant_isolation_service_requests ON service_requests
        FOR ALL USING (
          tenant_id = current_setting('app.current_tenant', true) 
          AND workspace_id = current_setting('app.current_workspace', true)
        );
      
      CREATE POLICY tenant_isolation_service_providers ON service_providers
        FOR ALL USING (
          tenant_id = current_setting('app.current_tenant', true) 
          AND workspace_id = current_setting('app.current_workspace', true)
        );
    `
  },
  {
    version: "012",
    name: "add_communication_rls_policies",
    description: "Add RLS policies for communication_events table (TENANT-ISOLATION-001)",
    sql: `
      ALTER TABLE communication_events ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS tenant_isolation_communication_events ON communication_events;
      
      CREATE POLICY tenant_isolation_communication_events ON communication_events
        FOR ALL USING (
          tenant_id = current_setting('app.current_tenant', true) 
          AND workspace_id = current_setting('app.current_workspace', true)
        );
    `
  },
  {
    version: "013",
    name: "create_compliance_cases_table",
    description: "Create compliance_cases table for investment-compliance (ILC) vertical slice",
    sql: `
      -- Create compliance_cases table (v012) for ILC vertical slice - matches legal_cases pattern with work-centric schema
      CREATE TABLE IF NOT EXISTS compliance_cases (
        id VARCHAR(255) PRIMARY KEY,
        work_id VARCHAR(255) NOT NULL,
        tenant_id VARCHAR(255) NOT NULL,
        workspace_id VARCHAR(255),
        title TEXT NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL,
        priority VARCHAR(50) NOT NULL,
        auditor_id VARCHAR(255),
        investment_amount NUMERIC NOT NULL,
        sector VARCHAR(255) NOT NULL,
        risk_rating VARCHAR(50) NOT NULL,
        source_discussion_id VARCHAR(255),
        deadline_at TIMESTAMP WITH TIME ZONE,
        closed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
        execution_frame VARCHAR(50),
        metadata JSONB
      );
      
      -- Indexes for work-centric queries (workId > workspaceId precedence per EOS mandate)
      CREATE INDEX IF NOT EXISTS idx_compliance_cases_work_id ON compliance_cases(work_id);
      CREATE INDEX IF NOT EXISTS idx_compliance_cases_tenant_id ON compliance_cases(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_compliance_cases_status ON compliance_cases(status);
      
      -- Enable RLS for tenant isolation (TENANT-ISOLATION-001 compliance)
      ALTER TABLE compliance_cases ENABLE ROW LEVEL SECURITY;
      
      -- Create RLS policy with work_id support (same pattern as service_requests/legal_cases)
      DROP POLICY IF EXISTS tenant_isolation_compliance_cases ON compliance_cases;
      CREATE POLICY tenant_isolation_compliance_cases ON compliance_cases
        FOR ALL USING (
          tenant_id = current_setting('app.current_tenant', true) 
          AND (
            workspace_id = current_setting('app.current_workspace', true) 
            OR work_id = current_setting('app.current_work', true)
          )
        );
    `
  },
  {
    version: "014",
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
    version: "015",
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
    version: "016",
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
  },
  {
    version: "017",
    name: "add-occ-to-core-tables",
    description: "Add optimistic concurrency control version column to communication_events, evidence, users, sessions tables",
    sql: `
      -- Add version column to communication_events (idempotent - IF NOT EXISTS)
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communication_events' AND column_name = 'version') THEN
          ALTER TABLE communication_events ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
        END IF;
      END $$;

      -- Add version column to evidence
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'version') THEN
          ALTER TABLE evidence ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
        END IF;
      END $$;

      -- Add version column to users (idempotent - IF NOT EXISTS)
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'version') THEN
          ALTER TABLE users ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
        END IF;
      END $$;

      -- Add version column to sessions (idempotent - IF NOT EXISTS)
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'version') THEN
          ALTER TABLE sessions ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
        END IF;
      END $$;
    `
  },
  {
    version: "018",
    name: "add-work-claim-columns-to-works",
    description: "Add WORK CLAIM v0.1 columns to works table: claim_status, lease_until, active_execution_id, previous_execution_ids, session_id",
    sql: `
      -- Add claim_status column (idempotent - IF NOT EXISTS)
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'claim_status') THEN
          ALTER TABLE works ADD COLUMN claim_status VARCHAR(50) NOT NULL DEFAULT 'UNCLAIMED';
        END IF;
      END $$;

      -- Add lease_until column (timestamp for execution lease expiry)
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'lease_until') THEN
          ALTER TABLE works ADD COLUMN lease_until TIMESTAMP WITH TIME ZONE;
        END IF;
      END $$;

      -- Add active_execution_id column (current execution session ID)
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'active_execution_id') THEN
          ALTER TABLE works ADD COLUMN active_execution_id VARCHAR(255);
        END IF;
      END $$;

      -- Add previous_execution_ids column (execution lineage history)
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'previous_execution_ids') THEN
          ALTER TABLE works ADD COLUMN previous_execution_ids JSONB NOT NULL DEFAULT '[]'::JSONB;
        END IF;
      END $$;

      -- Add session_id column (current session ID)
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'session_id') THEN
          ALTER TABLE works ADD COLUMN session_id VARCHAR(255);
        END IF;
      END $$;

      -- Create indexes for claim-related queries
      CREATE INDEX IF NOT EXISTS idx_works_claim_status ON works(claim_status);
      CREATE INDEX IF NOT EXISTS idx_works_active_execution_id ON works(active_execution_id);
      CREATE INDEX IF NOT EXISTS idx_works_lease_until ON works(lease_until);
    `
  },
  {
    version: "019",
    name: "add-work-id-to-core-tables-mandatory-workcentric",
    description: "MANDATORY: Add work_id column to service_requests, communication_events, evidence_records (legal_cases already has work_id), make workspace_id optional, enforce workId > workspaceId precedence per EOS Work Continuity mandate",
    sql: `
      -- 1. Update knowledge_graph_nodes: add work_id, make workspace_id optional (supports High-Value Work Graph)
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_graph_nodes' AND column_name = 'work_id') THEN
          ALTER TABLE knowledge_graph_nodes ADD COLUMN work_id VARCHAR(255);
        END IF;
      END $$;
      
      -- Make workspace_id optional in knowledge_graph_nodes
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_graph_nodes' AND column_name = 'workspace_id' AND is_nullable = 'NO') THEN
          ALTER TABLE knowledge_graph_nodes ALTER COLUMN workspace_id DROP NOT NULL;
        END IF;
      END $$;

      -- 2. Update knowledge_graph_edges: add work_id, make workspace_id optional
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_graph_edges' AND column_name = 'work_id') THEN
          ALTER TABLE knowledge_graph_edges ADD COLUMN work_id VARCHAR(255);
        END IF;
      END $$;
      
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_graph_edges' AND column_name = 'workspace_id' AND is_nullable = 'NO') THEN
          ALTER TABLE knowledge_graph_edges ALTER COLUMN workspace_id DROP NOT NULL;
        END IF;
      END $$;

      -- 3. Add work_id to service_requests (MIGRATION 014 CORE REQUIREMENT)
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_requests' AND column_name = 'work_id') THEN
          ALTER TABLE service_requests ADD COLUMN work_id VARCHAR(255) NOT NULL;
        END IF;
      END $$;
      
      -- Make workspace_id optional in service_requests
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_requests' AND column_name = 'workspace_id' AND is_nullable = 'NO') THEN
          ALTER TABLE service_requests ALTER COLUMN workspace_id DROP NOT NULL;
        END IF;
      END $$;

      -- 4. Update evidence table: ensure work_id is present, make workspace_id optional
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'workspace_id' AND is_nullable = 'NO') THEN
          ALTER TABLE evidence ALTER COLUMN workspace_id DROP NOT NULL;
        END IF;
      END $$;

      -- 5. Update legal_cases: make workspace_id optional (already has work_id from v001)
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'legal_cases' AND column_name = 'workspace_id' AND is_nullable = 'NO') THEN
          ALTER TABLE legal_cases ALTER COLUMN workspace_id DROP NOT NULL;
        END IF;
      END $$;

      -- 6. Add work_id indexes for all tables to support work-centric RLS queries
      CREATE INDEX IF NOT EXISTS idx_kg_nodes_work_id ON knowledge_graph_nodes(work_id);
      CREATE INDEX IF NOT EXISTS idx_kg_edges_work_id ON knowledge_graph_edges(work_id);
      CREATE INDEX IF NOT EXISTS idx_service_requests_work_id ON service_requests(work_id);
      
      -- 7. Update RLS policies to support work_id filtering (app.current_work)
      -- Update service_requests RLS policy to allow work_id-based access (workId > workspaceId precedence)
      DROP POLICY IF EXISTS tenant_isolation_service_requests ON service_requests;
      CREATE POLICY tenant_isolation_service_requests ON service_requests
        FOR ALL USING (
          tenant_id = current_setting('app.current_tenant', true) 
          AND (
            workspace_id = current_setting('app.current_workspace', true) 
            OR work_id = current_setting('app.current_work', true)
          )
        );
      
      -- Update knowledge_graph_nodes RLS policy
      DROP POLICY IF EXISTS tenant_isolation_kg_nodes ON knowledge_graph_nodes;
      CREATE POLICY tenant_isolation_kg_nodes ON knowledge_graph_nodes
        FOR ALL USING (
          tenant_id = current_setting('app.current_tenant', true) 
          AND (
            workspace_id = current_setting('app.current_workspace', true) 
            OR work_id = current_setting('app.current_work', true)
          )
        );
      
      -- Update knowledge_graph_edges RLS policy
      DROP POLICY IF EXISTS tenant_isolation_kg_edges ON knowledge_graph_edges;
      CREATE POLICY tenant_isolation_kg_edges ON knowledge_graph_edges
        FOR ALL USING (
          tenant_id = current_setting('app.current_tenant', true) 
          AND (
            workspace_id = current_setting('app.current_workspace', true) 
            OR work_id = current_setting('app.current_work', true)
          )
        );
    `
  },
  {
    version: "020",
    name: "add-high-value-work-graph-tables",
    description: "Create products, requirements, outcomes tables for High-Value Work Graph implementation (CORE-002 mandate)",
    sql: `
      -- 1. Create products table (core High-Value Work Graph node)
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        owner_id VARCHAR(255) NOT NULL,
        tenant_id VARCHAR(255) NOT NULL,
        linked_requirement_ids TEXT[] NOT NULL DEFAULT '{}',
        linked_work_ids TEXT[] NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for products table
      CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_products_owner_id ON products(owner_id);

      -- 2. Create requirements table (connected to products and work)
      CREATE TABLE IF NOT EXISTS requirements (
        id VARCHAR(255) PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        priority VARCHAR(50) NOT NULL DEFAULT 'medium',
        owner_id VARCHAR(255) NOT NULL,
        tenant_id VARCHAR(255) NOT NULL,
        product_id VARCHAR(255) REFERENCES products(id),
        linked_work_ids TEXT[] NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for requirements table
      CREATE INDEX IF NOT EXISTS idx_requirements_tenant_id ON requirements(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_requirements_product_id ON requirements(product_id);
      CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);

      -- 3. Create outcomes table (connected to work, captures work results)
      CREATE TABLE IF NOT EXISTS outcomes (
        id VARCHAR(255) PRIMARY KEY,
        work_id VARCHAR(255) NOT NULL REFERENCES works(id),
        type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        evidence_ids TEXT[] NOT NULL DEFAULT '{}',
        actor_id VARCHAR(255) NOT NULL,
        tenant_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for outcomes table
      CREATE INDEX IF NOT EXISTS idx_outcomes_work_id ON outcomes(work_id);
      CREATE INDEX IF NOT EXISTS idx_outcomes_tenant_id ON outcomes(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_outcomes_type ON outcomes(type);

      -- 4. Add foreign key constraints to enforce graph integrity
      -- Ensure all linked_work_ids in products reference valid works
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_products_linked_work_ids') THEN
          -- PostgreSQL doesn't support array foreign keys directly, so we add a trigger to validate
          CREATE OR REPLACE FUNCTION validate_product_work_ids() RETURNS TRIGGER AS $$
          BEGIN
            IF NEW.linked_work_ids IS NOT NULL AND array_length(NEW.linked_work_ids, 1) > 0 THEN
              IF NOT EXISTS (
                SELECT 1 FROM works WHERE id = ANY(NEW.linked_work_ids)
              ) THEN
                RAISE EXCEPTION 'Invalid work_id in linked_work_ids for product %', NEW.id;
              END IF;
            END IF;
            RETURN NEW;
          END $$ LANGUAGE plpgsql;

          CREATE TRIGGER trigger_validate_product_work_ids BEFORE INSERT OR UPDATE ON products
            FOR EACH ROW EXECUTE FUNCTION validate_product_work_ids();
        END IF;
      END $$;

      -- 5. Add indexes to support HighValueWorkGraphQuery methods
      -- Support getWorksForProduct: query works linked to a product
      CREATE INDEX IF NOT EXISTS idx_products_linked_work_ids_gin ON products USING GIN(linked_work_ids);
      -- Support getProductForWork: query products linked to a work
      CREATE INDEX IF NOT EXISTS idx_products_linked_work_ids ON products(linked_work_ids);
      -- Support getOutcomesForWork: query outcomes linked to a work (already has work_id index)
    `
  },
  {
    version: "021",
    name: "add-boundaries-crossed-to-works-table",
    description: "Add boundaries_crossed JSONB column to works table for W-002 High-Value Work boundary tracking mandate",
    sql: `
      -- Add boundaries_crossed column (JSONB for storing array of boundary crossing events)
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'boundaries_crossed') THEN
          ALTER TABLE works ADD COLUMN boundaries_crossed JSONB NOT NULL DEFAULT '[]'::JSONB;
        END IF;
      END $$;

      -- Create GIN index for efficient querying of boundaries_crossed array
      CREATE INDEX IF NOT EXISTS idx_works_boundaries_crossed ON works USING GIN (boundaries_crossed);
    `
  },
  {
    version: "022",
    name: "add-rls-audit-policy",
    description: "Add audit policy for RLS compliance logging and traceability",
    sql: `
      -- Create RLS audit policy for all core tables to enforce compliance logging
      CREATE OR REPLACE FUNCTION audit_rls_access() RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO audit_logs (
          resource_type, 
          resource_id, 
          actor_id, 
          tenant_id, 
          workspace_id,
          access_timestamp,
          access_type
        ) VALUES (
          TG_TABLE_NAME,
          NEW.id,
          current_setting('app.current_actor', true),
          current_setting('app.current_tenant', true),
          current_setting('app.current_workspace', true),
          NOW(),
          TG_OP
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
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