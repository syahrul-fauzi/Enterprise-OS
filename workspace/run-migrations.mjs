// Simple migration runner to apply LH-CASE-001 seed (ES Modules version)
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Extract migration 011 SQL manually
const migration011Sql = `
INSERT INTO works (
  id, title, description, status, actor_id, tenant_id, workspace_id, 
  participants, state_history, version, created_at, updated_at
) VALUES (
  'work-LH-CASE-001',
  'LH-CASE-001: PT Pendirian - PT Kopi Nusantara Mandiri',
  'LawyersHub Golden Slice: Klien membutuhkan pendirian PT untuk usaha kopi retail di Jakarta. Memerlukan proses legal lengkap dari konsultasi hingga sertifikat NIB. UAT Work item untuk real human testing.',
  'active',
  '+628777777777777',
  'tenant.anonymous',
  'professional-workspace.anonymous',
  '[{"actorId": "+62877777777777", "role": "customer", "addedAt": "2026-09-09T13:00:00.000Z", "addedBy": "+62877777777777"}, {"actorId": "lawyer.jakarta.001", "role": "professional", "addedAt": "2026-09-09T13:15:00.000Z", "addedBy": "lawyer.jakarta.001"}, {"actorId": "notary.jakarta.001", "role": "notary", "addedAt": "2026-09-09T13:30:00.000Z", "addedBy": "lawyer.jakarta.001"}]',
  '[{"status": "draft", "timestamp": "2026-09-09T13:00:00.000Z", "actorId": "+62877777777777", "note": "Work created - UAT initialization"}, {"status": "pending_assignment", "timestamp": "2026-09-09T13:10:00.000Z", "actorId": "lawyer.jakarta.001", "note": "Work assigned to PT establishment manager"}, {"status": "active", "timestamp": "2026-09-09T13:20:00.000Z", "actorId": "lawyer.jakarta.001", "note": "Work activated - ready for human UAT"}]',
  1,
  '2026-09-09T13:00:00.000Z',
  '2026-09-09T13:20:00.000Z'
) ON CONFLICT (id) DO NOTHING;
`;

async function seedLHCase001() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'eos',
    user: 'postgres',
    password: 'postgres'
  });

  console.log('🔄 Connecting to PostgreSQL...');
  await pool.connect();
  console.log('✅ Connected to database');

  // First check if schema_migrations exists
  try {
    await pool.query(`SELECT * FROM schema_migrations`);
    console.log('✅ schema_migrations table exists');
  } catch (e) {
    console.log('⚠️  schema_migrations does not exist - creating it');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(10) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  // Check if migration 011 already applied
  const checkApplied = await pool.query(`SELECT * FROM schema_migrations WHERE version = '011'`);
  if (checkApplied.rows.length > 0) {
    console.log('✅ Migration 011 already applied');
  } else {
    console.log('🔄 Applying migration 011 (seed LH-CASE-001)...');
    await pool.query(migration011Sql);
    await pool.query(`
      INSERT INTO schema_migrations (version, name, description)
      VALUES ('011', 'seed_lh_case_001_uaat_test', 'Seed LH-CASE-001 for Human UAT')
    `);
    console.log('✅ Migration 011 applied successfully');
  }

  // Verify LH-CASE-001 exists
  const verify = await pool.query(`SELECT * FROM works WHERE id = 'work-LH-CASE-001'`);
  if (verify.rows.length > 0) {
    console.log('\n🎉 LH-CASE-001 SUCCESSFULLY SEEDED IN DATABASE');
    console.log('   Work ID:', verify.rows[0].id);
    console.log('   Title:', verify.rows[0].title);
    console.log('   Status:', verify.rows[0].status);
    console.log('   Actor ID:', verify.rows[0].actor_id);
    console.log('   Participants count:', verify.rows[0].participants.length);
    console.log('   State history entries:', verify.rows[0].state_history.length);
  } else {
    console.log('❌ LH-CASE-001 NOT FOUND after seeding');
  }

  await pool.end();
}

seedLHCase001().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});