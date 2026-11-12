import { Pool } from "pg";
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import * as path from 'path';

async function testUpdate() {
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

  // Coba buat test work dulu
  await pool.query(`
    INSERT INTO works (id, tenant_id, workspace_id, actor_id, title, status, version, created_at, updated_at, domain_type)
    VALUES ('test-domain-001', 'test-tenant', 'test-workspace', 'test-actor', 'Test', 'pending', 1, NOW(), NOW(), 'payroll')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Coba jalankan UPDATE yang sama dengan yang dilakukan base.repository.ts
  try {
    const updateQuery = `
      UPDATE works SET title = $1, description = $2, status = $3, actor_id = $4, version = $5, created_at = $6, updated_at = $7, composition_id = $8, tenant_id = $9, workspace_id = $10, session_id = $11, domain_type = $12, active_execution_id = $13, lease_until = $14, claim_status = $15, previous_execution_ids = $16, processed_event_ids = $17, boundaries_crossed = $18 WHERE id = $19
    `;
    const values = [
      "Test Updated", null, "pending", "test-actor", 2, new Date(), new Date(), null,
      "test-tenant", "test-workspace", "test-session", "payroll", null, null, "unclaimed",
      "[]", "[]", "[]", "test-domain-001"
    ];
    
    console.log("Jalankan query UPDATE...");
    const result = await pool.query(updateQuery, values);
    console.log("✅ UPDATE berhasil! rowCount:", result.rowCount);
  } catch (err) {
    console.error("❌ ERROR UPDATE:", err);
  }

  await pool.end();
}

testUpdate().catch(err => {
  console.error(err);
  process.exit(1);
});