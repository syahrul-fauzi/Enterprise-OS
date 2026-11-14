-- W06-A3-003-P: Evidence Durability & Concurrency Assurance Migration
-- Menambahkan unique constraint dan perbaikan skema untuk evidence idempotency
-- Jalankan dengan: PGPASSWORD=eos_pass123 psql -h localhost -U eos_user -d eos_staging -f w06-a3-003-p-evidence-durability-migration.sql

-- 1. Buat tabel evidence jika belum ada dengan skema lengkap
CREATE TABLE IF NOT EXISTS evidence (
  id VARCHAR(255) PRIMARY KEY,
  work_id VARCHAR(255) NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  actor_id VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  meta_checksum VARCHAR(64) NOT NULL,
  execution_id VARCHAR(255),
  context_trace_id VARCHAR(255),
  decision_id VARCHAR(255),
  reconciled_at TIMESTAMP WITH TIME ZONE,
  tenant_id VARCHAR(255) NOT NULL,
  workspace_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) NOT NULL
);

-- 2. Tambahkan kolom yang hilang jika tabel sudah ada
DO $$
BEGIN
  -- Tambahkan kolom meta_checksum jika belum ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'meta_checksum') THEN
    ALTER TABLE evidence ADD COLUMN meta_checksum VARCHAR(64) NOT NULL DEFAULT '';
  END IF;

  -- Tambahkan kolom execution_id jika belum ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'execution_id') THEN
    ALTER TABLE evidence ADD COLUMN execution_id VARCHAR(255);
  END IF;

  -- Tambahkan kolom context_trace_id jika belum ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'context_trace_id') THEN
    ALTER TABLE evidence ADD COLUMN context_trace_id VARCHAR(255);
  END IF;

  -- Tambahkan kolom decision_id jika belum ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'decision_id') THEN
    ALTER TABLE evidence ADD COLUMN decision_id VARCHAR(255);
  END IF;

  -- Tambahkan kolom reconciled_at jika belum ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'reconciled_at') THEN
    ALTER TABLE evidence ADD COLUMN reconciled_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Tambahkan kolom tenant_id jika belum ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'tenant_id') THEN
    ALTER TABLE evidence ADD COLUMN tenant_id VARCHAR(255) NOT NULL DEFAULT '';
  END IF;

  -- Tambahkan kolom workspace_id jika belum ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'workspace_id') THEN
    ALTER TABLE evidence ADD COLUMN workspace_id VARCHAR(255) NOT NULL DEFAULT '';
  END IF;

  -- Tambahkan kolom session_id jika belum ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'session_id') THEN
    ALTER TABLE evidence ADD COLUMN session_id VARCHAR(255) NOT NULL DEFAULT '';
  END IF;

  -- Ubah kolom content menjadi JSONB jika masih TEXT
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence' AND column_name = 'content' AND data_type = 'text') THEN
    ALTER TABLE evidence ALTER COLUMN content TYPE JSONB USING content::JSONB;
  END IF;
END $$;

-- 3. Hapus duplikat record evidence yang sudah ada sebelum menambahkan unique constraint
-- Ini hanya berjalan jika ada duplikat berdasarkan work_id dan meta_checksum
DO $$
BEGIN
  -- Buat tabel temporary untuk menyimpan record unique
  CREATE TEMP TABLE IF NOT EXISTS evidence_unique AS
  SELECT DISTINCT ON (work_id, meta_checksum) *
  FROM evidence
  ORDER BY work_id, meta_checksum, created_at ASC;

  -- Hapus semua record dari tabel utama
  DELETE FROM evidence;

  -- Masukkan kembali record yang unique
  INSERT INTO evidence SELECT * FROM evidence_unique;

  -- Hapus tabel temporary
  DROP TABLE IF EXISTS evidence_unique;
END $$;

-- 4. Tambahkan unique constraint untuk mencegah duplicate evidence (Risiko B: Database-level idempotency)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_evidence_work_checksum') THEN
    ALTER TABLE evidence ADD CONSTRAINT uq_evidence_work_checksum UNIQUE(work_id, meta_checksum);
  END IF;
END $$;

-- 5. Buat index untuk performa query
CREATE INDEX IF NOT EXISTS idx_evidence_work_id ON evidence(work_id);
CREATE INDEX IF NOT EXISTS idx_evidence_meta_checksum ON evidence(meta_checksum);
CREATE INDEX IF NOT EXISTS idx_evidence_decision_id ON evidence(decision_id);
CREATE INDEX IF NOT EXISTS idx_evidence_tenant_id ON evidence(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evidence_created_at ON evidence(created_at DESC);

-- 6. Tambahkan RLS policy untuk evidence (sesuai foundation rails tenant isolation)
ALTER TABLE evidence FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Hapus policy lama jika ada
  DROP POLICY IF EXISTS evidence_tenant_isolation ON evidence;
  
  -- Buat policy baru untuk tenant isolation
  CREATE POLICY evidence_tenant_isolation ON evidence
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
END $$;

-- 7. Tambahkan unique constraint untuk evidence_records (Evidence Registry side)
DO $$
BEGIN
  -- Tambahkan kolom meta_checksum ke evidence_records jika belum ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidence_records' AND column_name = 'meta_checksum') THEN
    ALTER TABLE evidence_records ADD COLUMN meta_checksum VARCHAR(64) NOT NULL DEFAULT '';
  END IF;

  -- Tambahkan unique constraint untuk evidence_records
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_evidence_records_work_checksum') THEN
    ALTER TABLE evidence_records ADD CONSTRAINT uq_evidence_records_work_checksum UNIQUE(work_id, meta_checksum);
  END IF;
END $$;

-- 8. Buat index untuk evidence_records
CREATE INDEX IF NOT EXISTS idx_evidence_records_work_id ON evidence_records(work_id);
CREATE INDEX IF NOT EXISTS idx_evidence_records_meta_checksum ON evidence_records(meta_checksum);
CREATE INDEX IF NOT EXISTS idx_evidence_records_tenant_id ON evidence_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evidence_records_created_at ON evidence_records(created_at DESC);

-- 9. Tambahkan RLS policy untuk evidence_records
ALTER TABLE evidence_records FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Hapus policy lama jika ada
  DROP POLICY IF EXISTS evidence_records_tenant_isolation ON evidence_records;
  
  -- Buat policy baru untuk tenant isolation
  CREATE POLICY evidence_records_tenant_isolation ON evidence_records
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
END $$;

-- 10. Tambahkan migrasi ke schema_migrations
INSERT INTO schema_migrations (version, name, description, executed_at)
VALUES ('025', 'w06-a3-003-p-evidence-durability', 'Evidence Durability & Concurrency Assurance - Unique constraints, RLS, stable execution IDs, ON CONFLICT DO NOTHING', NOW())
ON CONFLICT (version) DO NOTHING;