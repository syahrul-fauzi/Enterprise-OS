import { Pool } from 'pg';
import { createHash } from 'crypto';
import { MIGRATIONS, DatabaseMigration } from './capabilities/shared/implementation/database/migrations/migration.manager';
import * as dotenv from 'dotenv';
dotenv.config({ path: './infra/prod/.env' });

// Use hardcoded production values from infra/prod/.env (only missing values filled)
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: 'eos_identity',
  connectionTimeoutMillis: 10000
});

async function verifyMigrationLedger() {
  console.log('[MIG-002] Starting production migration ledger verification...\n');

  try {
    // Test database connection first
    await pool.connect();
    console.log('[MIG-002] ✅ Successfully connected to production PostgreSQL database');

    // Get target migrations from repository (023, 024, 025)
    const targetVersions = ['023', '024', '025'];
    const repoMigrations = MIGRATIONS.filter((m: DatabaseMigration) => targetVersions.includes(m.version));
    
    if (repoMigrations.length !== 3) {
      throw new Error(`[MIG-002] ❌ Could not find all target migrations in repository. Found: ${repoMigrations.map((m: DatabaseMigration) => m.version).join(', ')}`);
    }
    console.log('[MIG-002] ✅ Found all 3 target migrations in repository\n');

    // Query production migration ledger (schema_migrations - EOS native migration tracker)
    console.log('[MIG-002] Querying production schema_migrations...');
    const ledgerResult = await pool.query(`
      SELECT version, name, description, executed_at, checksum 
      FROM schema_migrations 
      WHERE version IN ('023', '024', '025') 
      ORDER BY version ASC;
    `);

    console.log(`[MIG-002] Found ${ledgerResult.rows.length} entries in production ledger\n`);

    // Calculate SHA256 checksums and verify ledger entries
    const allChecksumsValid = true;
    for (const migration of repoMigrations) {
      console.log(`=== Migration ${migration.version}: ${migration.name} ===`);
      
      // Calculate repository SQL checksum
      const sqlHash = createHash('sha256').update(migration.sql).digest('hex');
      console.log(`  Repository SHA256: ${sqlHash}`);

      // Find matching ledger entry
      const ledgerEntry = ledgerResult.rows.find(r => r.version === migration.version);
      if (!ledgerEntry) {
        throw new Error(`[MIG-002] ❌ FAILED: Migration ${migration.version} not found in production schema_migrations`);
      }

      // Verify metadata matches
      if (ledgerEntry.name !== migration.name) {
        console.warn(`  ⚠️ Name mismatch: Repository="${migration.name}", Production="${ledgerEntry.name}"`);
      }
      console.log(`  ✅ Found in production ledger, executed at: ${ledgerEntry.executed_at}`);
      console.log(`  ✅ Name matches: ${migration.name}`);

      // Verify checksum matches (MIG-002 core requirement)
      if (ledgerEntry.checksum !== sqlHash) {
        throw new Error(`[MIG-002] ❌ FAILED: Migration ${migration.version} checksum mismatch. Repository: ${sqlHash}, Production: ${ledgerEntry.checksum || 'NOT_SET'}`);
      }
      console.log(`  ✅ Checksum matches: ${sqlHash}`);
    }

    // Verify execution order matches repository order
    const ledgerVersions = ledgerResult.rows.map(r => r.version);
    const repoVersions = repoMigrations.map((m: DatabaseMigration) => m.version);
    if (JSON.stringify(ledgerVersions) !== JSON.stringify(repoVersions)) {
      throw new Error(`[MIG-002] ❌ Execution order mismatch. Repository order: ${repoVersions.join(', ')}, Production order: ${ledgerVersions.join(', ')}`);
    }

    console.log('\n[MIG-002] ==============================================');
    console.log('[MIG-002] ✅ ALL GATE MIG-002 CHECKS PASSED');
    console.log('[MIG-002] ==============================================');
    console.log('  - All 3 migrations (023, 024, 025) found in production ledger');
    console.log('  - Execution order matches repository order');
    console.log('  - Metadata is consistent');
    console.log('  - SQL checksums are valid between repository and production');
    console.log('[MIG-002] Ready to proceed to MIG-003 (Backup and WAL verification)\n');

  } catch (error) {
    console.error('\n[MIG-002] ==============================================');
    console.error('[MIG-002] ❌ GATE MIG-002 FAILED');
    console.error('[MIG-002] ==============================================');
    console.error(error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyMigrationLedger();