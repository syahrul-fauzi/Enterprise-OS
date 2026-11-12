import { Pool } from "pg";
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import * as path from 'path';

async function cleanup() {
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

  console.log("=== Hapus kolom domain yang redundant ===");
  // Hapus kolom domaintype, domainType, domainSpecificData yang tidak terpakai
  try {
    await pool.query(`
      ALTER TABLE works DROP COLUMN IF EXISTS domaintype;
      ALTER TABLE works DROP COLUMN IF EXISTS "domainType";
      ALTER TABLE works DROP COLUMN IF EXISTS "domainSpecificData";
    `);
    console.log("✅ Semua kolom redundant berhasil dihapus!");
    
    // Cek kolom yang tersisa
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'works' AND column_name LIKE '%domain%'
      ORDER BY ordinal_position;
    `);
    console.table(columns.rows);
  } catch (err) {
    console.error("❌ Error cleanup:", err);
  }

  await pool.end();
}

cleanup().catch(err => {
  console.error(err);
  process.exit(1);
});