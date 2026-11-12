-- W06-A2 Migration: Tambahkan kolom locking untuk anti-TOCTOU protection
DO $$
BEGIN
  -- Tambahkan kolom locked_at (timestamp untuk audit lock)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'locked_at') THEN
    ALTER TABLE works ADD COLUMN locked_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Tambahkan kolom lock_holder (siapa yang memegang lock)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'works' AND column_name = 'lock_holder') THEN
    ALTER TABLE works ADD COLUMN lock_holder VARCHAR(255);
  END IF;
END $$;

-- Catat migrasi di schema_migrations
INSERT INTO schema_migrations (version, name, description)
VALUES ('027', 'add-locking-columns-for-w06-a2', 'Add locked_at and lock_holder columns for W06-A2 TOCTOU protection')
ON CONFLICT (version) DO NOTHING;