import { getEvidenceRepositoryPostgres } from "./capabilities/evidence-registry/implementation/repository/index.js";

async function debug() {
  const pgRepo = getEvidenceRepositoryPostgres();
  // Get raw record from DB first
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: 'postgresql://eos_user:eos_pass123@localhost:5433/eos_identity' });
  const res = await pool.query('SELECT * FROM evidence ORDER BY created_at DESC LIMIT 1');
  const rawRecord = res.rows[0];
  console.log("Raw record from DB:", rawRecord);
  
  // Convert to aggregate using repository's toAggregate (we need to access protected method - let's replicate manually)
  const toAggregate = (record) => {
    return {
      id: record.id,
      workId: record.work_id,
      actorId: record.actor_id,
      name: record.name || `Evidence ${record.id}`,
      kind: (record.type) || "record",
      scope: (record.scope) || "requirement",
      path: record.path || "",
      sizeBytes: record.size_bytes || 0,
      createdAt: record.created_at?.toISOString ? record.created_at.toISOString() : new Date(record.created_at).toISOString(),
      updatedAt: record.updated_at?.toISOString ? record.updated_at.toISOString() : record.created_at?.toISOString ? record.created_at.toISOString() : new Date().toISOString(),
      runId: record.run_id,
      requirementRefs: record.requirement_refs || [],
      tags: record.tags || []
    };
  };
  const aggregate = toAggregate(rawRecord);
  console.log("\nConverted to aggregate:", aggregate);
  console.log("\nCheck fields:", {
    actorId: aggregate.actorId,
    createdAt: aggregate.createdAt,
    hasAllFields: !!(aggregate.actorId && aggregate.createdAt)
  });
  await pool.end();
}
debug().catch(console.error);
