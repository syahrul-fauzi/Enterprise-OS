DO $$
BEGIN
  -- Tambahkan semua kolom yang hilang untuk works table jika belum ada
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'works') THEN
    -- participants
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'participants') THEN
      ALTER TABLE works ADD COLUMN participants JSONB DEFAULT '[]';
    END IF;
    
    -- state_history
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'state_history') THEN
      ALTER TABLE works ADD COLUMN state_history JSONB DEFAULT '[]';
    END IF;
    
    -- claim_status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'claim_status') THEN
      ALTER TABLE works ADD COLUMN claim_status VARCHAR(50) DEFAULT 'UNCLAIMED';
    END IF;
    
    -- previous_execution_ids
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'previous_execution_ids') THEN
      ALTER TABLE works ADD COLUMN previous_execution_ids JSONB DEFAULT '[]';
    END IF;
    
    -- idempotency_key (sudah ditambahkan sebelumnya, pastikan tetap ada)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'idempotency_key') THEN
      ALTER TABLE works ADD COLUMN idempotency_key VARCHAR(255);
    END IF;
  END IF;
  
  -- Tampilkan kolom yang sudah ada untuk verifikasi
  RAISE NOTICE 'Semua kolom yang diperlukan telah ditambahkan ke works table';
END $$;

-- Tampilkan semua kolom yang ada di works table sekarang
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'works' 
ORDER BY ordinal_position;