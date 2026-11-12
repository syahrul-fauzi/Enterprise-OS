import { Pool } from "pg";
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import * as path from 'path';

async function debugQuery() {
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

  // Gunakan record dari log test untuk W2A:
  const record = {
    "id": "work-w2a-001",
    "work_id": "work-w2a-001",
    "title": "W2-A Test: Interrupted Work",
    "description": "Test work continuity when actor crashes mid-execution",
    "status": "pending",
    "actor_id": "human-actor-a-001",
    "participants": "[\"human-actor-a-001\",\"human-actor-b-002\"]",
    "version": 2,
    "state_history": "[{\"note\":\"Work created\",\"status\":\"pending\",\"actorId\":\"human-actor-a-001\",\"timestamp\":\"2026-10-30T10:00:03.213Z\"}]",
    "created_at": "2026-10-30T11:18:33.096Z",
    "updated_at": "2026-10-30T11:18:33.123Z",
    "composition_id": null,
    "tenant_id": "test-tenant-001",
    "workspace_id": "test-workspace-001",
    "session_id": "session-a-001",
    "domain_type": "payroll",
    "domain_specific_data": null,
    "active_execution_id": null,
    "lease_until": "2026-10-30T10:18:33.096Z",
    "claim_status": "UNCLAIMED",
    "previous_execution_ids": "[]",
    "processed_event_ids": "[]",
    "boundaries_crossed": "[]"
  };

  // Build query yang SAMA dengan base.repository.ts
  const columns = Object.keys(record).filter(col => col !== 'id');
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  columns.forEach((col) => {
    values.push(record[col as keyof typeof record]);
    setClauses.push(`${col} = $${paramIndex}${col === 'version' ? '::integer' : ''}`);
    paramIndex++;
  });
  let whereClause = `id = $${paramIndex}`;
  values.push(record.id);
  paramIndex++;

  const finalQuery = `UPDATE works SET ${setClauses.join(", ")} WHERE ${whereClause}`;
  console.log("=== QUERY YANG DIGUNAKAN ===");
  console.log(finalQuery);
  console.log("\n=== VALUES ===");
  console.log(values);

  try {
    const result = await pool.query(finalQuery, values);
    console.log("\n✅ QUERY BERHASIL! rowCount:", result.rowCount);
  } catch (err) {
    console.error("\n❌ QUERY ERROR:", err);
  }

  await pool.end();
}

debugQuery().catch(err => {
  console.error(err);
  process.exit(1);
});