import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://eos_user:eos_pass123@localhost:5433/eos_identity' });

async function debug() {
  const res = await pool.query('SELECT * FROM evidence WHERE work_id = $1', ['golden-work-1789692200750']);
  console.log("🔍 FULL DB RECORD:", JSON.stringify(res.rows[0], null, 2));
  console.log("\n🔍 ALL KEYS:", Object.keys(res.rows[0]));
  console.log("\n🔍 actor_id type:", typeof res.rows[0].actor_id, "value:", res.rows[0].actor_id);
  console.log("🔍 created_at type:", typeof res.rows[0].created_at, "value:", res.rows[0].created_at);
  
  // Simulasikan toAggregate dengan console log setiap field
  const record = res.rows[0];
  const mapped = {
    id: record.id,
    workId: record.work_id,
    actorId: record.actor_id,
    createdAt: record.created_at?.toISOString ? record.created_at.toISOString() : record.created_at,
    updatedAt: record.updated_at?.toISOString ? record.updated_at.toISOString() : record.created_at
  };
  console.log("\n✅ MAPPED:", JSON.stringify(mapped, null, 2));
  console.log("\n✅ EVERY CHECK PASSES?", mapped.workId && mapped.id && mapped.actorId && mapped.createdAt);
  
  await pool.end();
}
debug().catch(console.error);