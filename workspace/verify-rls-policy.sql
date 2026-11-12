-- Verifikasi RLS policy untuk tabel works dengan WITH CHECK clause yang benar
DO $$
DECLARE
    v_policy record;
    v_with_check_exists boolean;
    v_tenant_context text;
    v_workspace_context text;
BEGIN
    -- 1. Cek policy yang aktif pada tabel works
    RAISE NOTICE '=== Memeriksa RLS policies pada tabel works ===';
    FOR v_policy IN 
        SELECT policyname, cmd, qual, with_check
        FROM pg_policies 
        WHERE tablename = 'works' AND schemaname = 'public'
    LOOP
        RAISE NOTICE 'Policy: %, Operasi: %, USING clause: %, WITH CHECK clause: %', 
            v_policy.policyname, v_policy.cmd, v_policy.qual, v_policy.with_check;
        
        -- Cek apakah WITH CHECK ada (bukan null)
        IF v_policy.with_check IS NOT NULL THEN
            v_with_check_exists := true;
        END IF;
    END LOOP;

    -- 2. Verifikasi bahwa WITH CHECK clause terdefinisi
    IF NOT v_with_check_exists THEN
        RAISE EXCEPTION 'GAGAL: Tidak ada policy dengan WITH CHECK clause yang terdefinisi! Operasi INSERT/UPDATE tidak terlindungi.';
    ELSE
        RAISE NOTICE 'SUKSES: Minimal satu policy memiliki WITH CHECK clause yang valid.';
    END IF;

    -- 3. Cek apakah FORCE RLS diaktifkan
    IF EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'works' AND relrowsecurity = true AND relforcerowsecurity = true
    ) THEN
        RAISE NOTICE 'SUKSES: FORCE RLS aktif pada tabel works.';
    ELSE
        RAISE WARNING 'PERINGATAN: FORCE RLS tidak aktif, superuser dapat bypass RLS.';
    END IF;

    RAISE NOTICE '=== Audit RLS selesai ===';
END $$;
