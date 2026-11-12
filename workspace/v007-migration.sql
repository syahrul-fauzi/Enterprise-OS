-- Migration v007: Add work_id column to works table and enable RLS
-- Dijalankan secara langsung di staging-dev database untuk bypass TypeScript/ESM issues

-- 1. Pastikan works table ada (jika belum, buat)
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
  boundaries_crossed JSONB NOT NULL DEFAULT '[]'::JSONB,
  processed_event_ids JSONB NOT NULL DEFAULT '[]'::JSONB
);

-- 2. Tambahkan semua missing column idempotently
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
  -- Add processed_event_ids column (EDGE-A-001)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'works') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'processed_event_ids') THEN 
    ALTER TABLE works ADD COLUMN processed_event_ids JSONB NOT NULL DEFAULT '[]'::JSONB;
  END IF;
END $$;

-- 3. Enable RLS dan FORCE RLS
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE works FORCE ROW LEVEL SECURITY;

-- 4. Grant permissions ke app_user
GRANT SELECT, INSERT, UPDATE, DELETE ON works TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- 5. Drop policy jika sudah ada
DROP POLICY IF EXISTS tenant_isolation_works ON works;

-- 6. Buat tenant isolation policy
CREATE POLICY tenant_isolation_works ON works
  FOR ALL TO app_user
  USING (
    (tenant_id)::text = current_setting('app.current_tenant', true) 
    AND (workspace_id)::text = current_setting('app.current_workspace', true)
  )
  WITH CHECK (
    (tenant_id)::text = current_setting('app.current_tenant', true) 
    AND (workspace_id)::text = current_setting('app.current_workspace', true)
  );

-- 7. Catat migrasi di schema_migrations
INSERT INTO schema_migrations (version, name, description)
VALUES ('007', 'add_work_id_column_to_works_table_and_enable_rls', 'Add work_id column to works table and enable RLS/FORCE RLS with tenant isolation policy')
ON CONFLICT (version) DO NOTHING;