import { Pool } from "pg";
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import * as path from 'path';

async function checkPosition() {
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

  // Buat query persis seperti yang dihasilkan base.repository.ts untuk work-w2a-001
  const setClauses = [
    "work_id = $1",
    "title = $2",
    "description = $3",
    "status = $4",
    "actor_id = $5",
    "participants = $6",
    "version = $7::integer",
    "state_history = $8",
    "created_at = $9",
    "updated_at = $10",
    "composition_id = $11",
    "tenant_id = $12",
    "workspace_id = $13",
    "session_id = $14",
    "domain_type = $15",
    "domain_specific_data = $16",
    "active_execution_id = $17",
    "lease_until = $18",
    "claim_status = $19",
    "previous_execution_ids = $20",
    "processed_event_ids = $21",
    "boundaries_crossed = $22"
  ];
  const whereClause = "id = $23";
  const fullQuery = `UPDATE works SET ${setClauses.join(", ")} WHERE ${whereClause}`;
  
  console.log("=== FULL QUERY ===");
  console.log(fullQuery);
  console.log("\n=== LENGTH QUERY SET CLAUSES ===");
  console.log(`"UPDATE works SET ${setClauses.join(", ")}".length =`, `UPDATE works SET ${setClauses.join(", ")}`.length);
  console.log("\n=== POSISI 292 dalam string query ===");
  console.log(fullQuery[290], fullQuery[291], fullQuery[292], fullQuery[293], fullQuery[294]);
  console.log("\n=== Substring dari posisi 280-310 ===");
  console.log(fullQuery.substring(280, 310));

  // Coba jalankan query
  try {
    const result = await pool.query(fullQuery, [
      'work-w2a-001',
      'W2-A Test: Interrupted Work',
      'Test work continuity when actor crashes mid-execution',
      'pending',
      'human-actor-a-001',
      '["human-actor-a-001","human-actor-b-002"]',
      2,
      '[{"note":"Work created","status":"pending","actorId":"human-actor-a-001","timestamp":"2026-10-30T10:00:03.213Z"}]',
      '2026-10-30T11:18:33.096Z',
      '2026-10-30T11:18:33.123Z',
      null,
      'test-tenant-001',
      'test-workspace-001',
      'session-a-001',
      'payroll',
      null,
      null,
      '2026-10-30T10:18:33.096Z',
      'UNCLAIMED',
      '[]',
      '[]',
      '[]',
      'work-w2a-001'
    ]);
    console.log("\n✅ Query berhasil! rowCount:", result.rowCount);
  } catch (err: any) {
    console.error("\n❌ ERROR QUERY:", err);
  }

  await pool.end();
}

checkPosition().catch(err => {
  console.error(err);
  process.exit(1);
});