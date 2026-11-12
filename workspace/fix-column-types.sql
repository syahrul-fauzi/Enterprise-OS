DO $$
BEGIN
  -- Ubah semua kolom VARCHAR di works table menjadi TEXT untuk konsistensi dengan kolom lain
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'works') THEN
    -- work_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'work_id' AND data_type = 'character varying') THEN
      ALTER TABLE works ALTER COLUMN work_id TYPE TEXT;
    END IF;
    
    -- session_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'session_id' AND data_type = 'character varying') THEN
      ALTER TABLE works ALTER COLUMN session_id TYPE TEXT;
    END IF;
    
    -- linked_expression_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'linked_expression_id' AND data_type = 'character varying') THEN
      ALTER TABLE works ALTER COLUMN linked_expression_id TYPE TEXT;
    END IF;
    
    -- active_execution_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'active_execution_id' AND data_type = 'character varying') THEN
      ALTER TABLE works ALTER COLUMN active_execution_id TYPE TEXT;
    END IF;
    
    -- idempotency_key
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'idempotency_key' AND data_type = 'character varying') THEN
      ALTER TABLE works ALTER COLUMN idempotency_key TYPE TEXT;
    END IF;
    
    -- claim_status
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'claim_status' AND data_type = 'character varying') THEN
      ALTER TABLE works ALTER COLUMN claim_status TYPE TEXT;
    END IF;
  END IF;
  
  RAISE NOTICE 'Semua tipe kolom di works table telah diseragamkan menjadi TEXT';
END $$;

-- Tampilkan tipe kolom setelah perubahan
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'works' 
ORDER BY ordinal_position;