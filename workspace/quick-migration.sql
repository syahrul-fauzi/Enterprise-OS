-- Quick migration untuk membuat semua tabel yang dibutuhkan di eos_staging
-- Jalankan dengan: PGPASSWORD=eos_pass123 psql -h localhost -U eos_user -d eos_staging -f quick-migration.sql

-- 1. Buat tabel works terlebih dahulu
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
  processed_event_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  idempotency_key VARCHAR(255)
);

-- 2. Jalankan migrasi 023: tambahkan idempotency_key dan constraint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'idempotency_key') THEN
    ALTER TABLE works ADD COLUMN idempotency_key VARCHAR(255);
  END IF;
  -- Tambahkan unique constraint untuk idempotency_key
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'works_idempotency_key_key') THEN
    ALTER TABLE works ADD CONSTRAINT works_idempotency_key_key UNIQUE(idempotency_key);
  END IF;
  -- Buat index
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_works_idempotency_key') THEN
    CREATE INDEX idx_works_idempotency_key ON works(idempotency_key);
  END IF;
END $$;

-- 3. Migrasi 024: buat tabel work_payments
CREATE TABLE IF NOT EXISTS work_payments (
  id VARCHAR(255) PRIMARY KEY,
  work_id VARCHAR(255) NOT NULL REFERENCES works(id),
  payment_id VARCHAR(255) NOT NULL,
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
  status VARCHAR(50) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  workspace_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT work_payments_work_id_payment_id_key UNIQUE(work_id, payment_id)
);

-- 4. Enable FORCE RLS
ALTER TABLE works FORCE ROW LEVEL SECURITY;
ALTER TABLE work_payments FORCE ROW LEVEL SECURITY;

-- 5. Buat schema_migrations untuk tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_migrations (version, name, description) 
VALUES ('001', 'quick-migration', 'All tables created in one go')
ON CONFLICT (version) DO NOTHING;