import { Pool } from 'pg';
import { getEvidenceRepositoryPostgres } from './capabilities/evidence-registry/implementation/repository/index.js';
const pool = new Pool({ connectionString: 'postgresql://eos_user:eos_pass123@localhost:5433/eos_identity' });

async function debug() {
  // Ambil record terakhir dari DB
  const res = await pool.query('SELECT * FROM evidence ORDER BY created_at DESC LIMIT 1');
  const record = res.rows[0];
  console.log("🔍 Raw DB record keys:", Object.keys(record));
  console.log("🔍 actor_id exists?", 'actor_id' in record, "value:", record.actor_id);
  console.log("🔍 created_at exists?", 'created_at' in record, "value:", record.created_at);
  
  // Simulasikan toAggregate mapping
  const mapped = {
    id: record.id,
    workId: record.work_id,
    actorId: record.actor_id,
    createdAt: record.created_at?.toISOString?.() || record.created_at,
    updatedAt: record.updated_at?.toISOString?.() || record.created_at
  };
  console.log("\n✅ Mapped EvidenceRecord:", JSON.stringify(mapped, null, 2));
  
  // Coba akses langsung dari repository
  const pgRepo = getEvidenceRepositoryPostgres();
  const allEvidence = await pgRepo.listByWorkId(record.work_id);
  console.log("\n📦 Repository listByWorkId result:", JSON.stringify(allEvidence[0], null, 2));
  
  await pool.end();
}
debug().catch(console.error);
