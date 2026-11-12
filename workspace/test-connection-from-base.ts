import { getPool } from './capabilities/identity/implementation/repositories/base.repository.js';
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import * as path from 'path';

async function main() {
  // Load staging env seperti yang dilakukan test
  const STAGING_ENV_PATH = path.join(process.cwd(), 'infra', 'staging', '.env');
  if (existsSync(STAGING_ENV_PATH)) {
    dotenv.config({ path: STAGING_ENV_PATH });
  }
  
  console.log("=== ENV VARS ===");
  console.log("POSTGRES_CONNECTION_STRING:", process.env.POSTGRES_CONNECTION_STRING);
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  
  const pool = getPool();
  console.log("\n=== Cek tabel works di database yang terhubung base.repository.ts ===");
  
  try {
    const columns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'works'
      ORDER BY ordinal_position;
    `);
    console.log("Kolom di tabel works:", columns.rows.map(r => r.column_name));
  } catch (err) {
    console.error("Error:", err);
  }
  
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});