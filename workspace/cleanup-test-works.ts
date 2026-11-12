import { Pool } from "pg";
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import * as path from 'path';

async function cleanupTestWorks() {
  const STAGING_ENV_PATH = path.join(process.cwd(), 'infra', 'staging', '.env');
  if (existsSync(STAGING_ENV_PATH)) {
    dotenv.config({ path: STAGING_ENV_PATH });
  }
  
  const pool = new Pool({
    host: "localhost",
    port: 5433,
    user: process.env.POSTGRES_USER || "eos_user",
    password: process.env.POSTGRES_PASSWORD || "eos_pass123",
    database: "eos_identity",
  });

  console.log("🧹 Menghapus semua test work dari tabel works...");
  
  // Hapus semua work yang id diawali dengan "work-w2a-" atau "work-idem-"
  const deleteResult = await pool.query(`
    DELETE FROM works 
    WHERE id LIKE 'work-w2a-%' OR id LIKE 'work-idem-%';
  `);
  
  console.log(`✅ Berhasil menghapus ${deleteResult.rowCount} test work`);
  
  // Hapus juga semua test work_payments
  const deletePaymentsResult = await pool.query(`
    DELETE FROM work_payments
    WHERE work_id LIKE 'work-w2a-%' OR work_id LIKE 'work-idem-%';
  `);
  
  console.log(`✅ Berhasil menghapus ${deletePaymentsResult.rowCount} test payment records`);

  await pool.end();
}

cleanupTestWorks().catch(err => {
  console.error(err);
  process.exit(1);
});