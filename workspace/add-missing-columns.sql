-- Tambahkan kolom yang hilang di works table yang dibutuhkan oleh verify-rls-staging.ts
DO $$
BEGIN
  -- Tambahkan idempotency_key jika belum ada
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'works') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'idempotency_key') THEN
    ALTER TABLE works ADD COLUMN idempotency_key VARCHAR(255);
  END IF;
END $$;

-- Verifikasi kolom ditambahkan
SELECT column_name FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'idempotency_key';