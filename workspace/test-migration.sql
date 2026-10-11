DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'work_id') THEN
    ALTER TABLE works ADD COLUMN work_id VARCHAR(255);
  END IF;
END $$;
