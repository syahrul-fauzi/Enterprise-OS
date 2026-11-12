DO $$
BEGIN
  -- Memeriksa apakah role eos_user ada sebelum mengubahnya
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eos_user') THEN
    -- Menghapus BYPASSRLS untuk memastikan RLS enforced
    ALTER ROLE eos_user NOBYPASSRLS;
    RAISE NOTICE 'Flag BYPASSRLS berhasil dihapus dari role eos_user. RLS sekarang akan diterapkan.';
  ELSE
    RAISE NOTICE 'Role eos_user tidak ditemukan di database.';
  END IF;
END $$;