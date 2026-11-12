// Script untuk menjalankan migration v007 secara spesifik di staging-dev
// Mengaplikasikan perubahan work_id column dan RLS pada works table
import { Pool } from 'pg';
import { DatabaseMigrationManager } from './capabilities/shared/implementation/database/migrations/migration.manager.js';

// Staging database connection
const DATABASE_URL = 'postgresql://eos_user:eos_pass123@localhost:5433/eos_identity';
let pool: Pool;

async function initDB() {
  pool = new Pool({ connectionString: DATABASE_URL });
  console.log('[MigrationRunner] Koneksi database staging berhasil diinisialisasi');
}

async function main() {
  console.log('\n🔥 MENJALANKAN MIGRATION V007 DI STAGING-DEV');
  console.log('='.repeat(80));
  
  await initDB();
  
  // Jalankan semua migrasi (manager akan menjalankan yang belum dieksekusi)
  console.log('\n🚀 Memulai eksekusi migrasi via DatabaseMigrationManager');
  const result = await DatabaseMigrationManager.runMigrations(pool);
  
  if (result.errors.length > 0) {
    console.error('   ❌ Eksekusi migrasi GAGAL:');
    result.errors.forEach(err => console.error(`      - ${err}`));
    process.exit(1);
  }
  
  console.log(`   ✅ Migrasi dieksekusi: ${result.executed.join(', ')}`);
  console.log(`   ℹ️  Sudah terdaftar: ${result.already_applied.join(', ') || 'tidak ada'}`);
  
  // Verifikasi hasil migration v007
  console.log('\n🔍 VERIFIKASI HASIL MIGRASI V007');
  
  // 1. Cek works table ada
  const worksExists = await pool.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'works'
    );
  `);
  
  if (worksExists.rows[0].exists) {
    console.log('   ✅ works table terdeteksi');
  } else {
    console.error('   ❌ works table tidak ditemukan');
    process.exit(1);
  }
  
  // 2. Cek work_id column ada
  const workIdExists = await pool.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'works' AND column_name = 'work_id'
    );
  `);
  
  if (workIdExists.rows[0].exists) {
    console.log('   ✅ work_id column terdeteksi di works table');
  } else {
    console.error('   ❌ work_id column tidak ditemukan di works table');
    process.exit(1);
  }
  
  // 3. Cek RLS aktif
  const rlsEnabled = await pool.query(`
    SELECT relrowsecurity FROM pg_class 
    WHERE relname = 'works' AND relnamespace = 'public'::regnamespace;
  `);
  
  if (rlsEnabled.rows[0].relrowsecurity) {
    console.log('   ✅ RLS aktif di works table');
  } else {
    console.error('   ❌ RLS tidak aktif di works table');
    process.exit(1);
  }
  
  // 4. Cek FORCE RLS aktif
  const forceRlsEnabled = await pool.query(`
    SELECT relforcerowsecurity FROM pg_class 
    WHERE relname = 'works' AND relnamespace = 'public'::regnamespace;
  `);
  
  if (forceRlsEnabled.rows[0].relforcerowsecurity) {
    console.log('   ✅ FORCE RLS aktif di works table');
  } else {
    console.error('   ❌ FORCE RLS tidak aktif di works table');
    process.exit(1);
  }
  
  // 5. Cek policy tenant_isolation_works ada
  const policyExists = await pool.query(`
    SELECT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'works' AND policyname = 'tenant_isolation_works'
    );
  `);
  
  if (policyExists.rows[0].exists) {
    console.log('   ✅ Policy tenant_isolation_works terdeteksi di works table');
  } else {
    console.error('   ❌ Policy tenant_isolation_works tidak ditemukan di works table');
    process.exit(1);
  }
  
  console.log('\n✅ SEMUA VERIFIKASI MIGRASI V007 LULUS!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});