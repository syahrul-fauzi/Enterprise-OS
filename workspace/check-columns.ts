import { Pool } from "pg";
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import * as path from 'path';

async function checkColumns() {
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
  
  console.log("=== Cek semua kolom di tabel works ===");
  const columns = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'works'
    ORDER BY ordinal_position;
  `);
  
  console.table(columns.rows);
  
  await pool.end();
}

checkColumns().catch(err => {
  console.error(err);
  process.exit(1);
});