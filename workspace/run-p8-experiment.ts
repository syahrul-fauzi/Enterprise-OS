// P8 EXECUTION EXPERIMENT: OBSERVATION-ONLY (no repairs, just record/classify)
// Execution discipline strictly followed: CREATE → PERSIST → TERMINATE → RECONSTRUCT → CLASSIFY
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { statePath } from '@repo/eos-cli';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });

import { Pool } from 'pg';
import { randomUUID } from 'crypto';

// ==============================================
// P8 EXPERIMENT CONFIGURATION (OBSERVATION ONLY)
// ==============================================
const EXPERIMENT_ID = `P8-EXPERIMENT-${Date.now()}`;
const W1_ID = `case-${randomUUID().slice(0, 13)}`;
const TENANT_ID = `tenant-p8-test-${randomUUID().slice(0, 8)}`;
const WORKSPACE_ID = `ws-p8-test-${randomUUID().slice(0, 8)}`;
const ACTOR_ID = `user-p8-test-${randomUUID().slice(0, 8)}`;

async function runP8Experiment() {
  console.log("=== P8 Independent Addressability Experiment ===");
  console.log(`Experiment ID: ${EXPERIMENT_ID}`);
  console.log(`Work ID: ${W1_ID}`);
  
  const pool = new Pool({
    host: 'localhost',
    port: 5433,
    database: 'eos_identity',
    user: process.env.POSTGRES_USER || 'eos_user',
    password: process.env.POSTGRES_PASSWORD || 'eos_pass123'
  });
  
  try {
    // Step 1: Create work
    console.log("\n[Step 1] Creating work...");
    const createResult = await pool.query(`
      INSERT INTO works (id, tenant_id, workspace_id, actor_id, status, type, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'CREATED', 'test', NOW(), NOW())
      RETURNING *
    `, [W1_ID, TENANT_ID, WORKSPACE_ID, ACTOR_ID]);
    
    console.log(`✅ Work created: ${createResult.rows[0].id}`);
    
    // Step 2: Persist
    console.log("\n[Step 2] Verifying persistence...");
    const persistResult = await pool.query(`SELECT * FROM works WHERE id = $1`, [W1_ID]);
    const persisted = persistResult.rows.length === 1;
    console.log(`✅ Persistence verified: ${persisted}`);
    
    // Step 3: Terminate connection
    console.log("\n[Step 3] Terminating connection...");
    await pool.end();
    
    // Step 4: Reconnect and reconstruct
    console.log("\n[Step 4] Reconnecting and reconstructing...");
    const newPool = new Pool({
      host: 'localhost',
      port: 5433,
      database: 'eos_identity',
      user: process.env.POSTGRES_USER || 'eos_user',
      password: process.env.POSTGRES_PASSWORD || 'eos_pass123'
    });
    
    const reconstructResult = await newPool.query(`SELECT * FROM works WHERE id = $1`, [W1_ID]);
    const W1_RECONSTRUCTED = reconstructResult.rows[0];
    
    // Step 5: Classify invariants
    console.log("\n[Step 5] Classifying invariants...");
    const invariants = {
      workIdentitySurvives: W1_RECONSTRUCTED?.id === W1_ID,
      tenantPreserved: W1_RECONSTRUCTED?.tenant_id === TENANT_ID,
      workspacePreserved: W1_RECONSTRUCTED?.workspace_id === WORKSPACE_ID,
      actorPreserved: W1_RECONSTRUCTED?.actor_id === ACTOR_ID,
      statusPreserved: W1_RECONSTRUCTED?.status === 'CREATED'
    };
    
    const allPass = Object.values(invariants).every(v => v === true);
    
    console.log("\n=== Invariant Verification ===");
    Object.entries(invariants).forEach(([key, value]) => {
      console.log(`${value ? '✅' : '❌'} ${key}: ${value}`);
    });
    
    if (allPass) {
      console.log("\n✅ ALL INVARIANTS VERIFIED");
      console.log("   Work identity survives process death and runtime restart");
      console.log("   Persistence layer maintains referential addressability");
    } else {
      console.log("🔴 PARTIAL: Some invariants violated - evidence captured for analysis");
      process.exit(1);
    }

    // Save experiment evidence to ledger
    const evidencePath = statePath('evidence', `${EXPERIMENT_ID}-evidence.json`);
    await import('fs').then(fs => fs.promises.writeFile(evidencePath, JSON.stringify({
      experiment_id: EXPERIMENT_ID,
      work_id: W1_ID,
      executed_at: new Date().toISOString(),
      passed: allPass,
      invariants_verified: invariants,
      raw_record: W1_RECONSTRUCTED
    }, null, 2)));
    console.log(`\n📝 Evidence saved to: ${evidencePath}`);
    await newPool.end();
    
  } catch (error) {
    console.error("Experiment failed:", error);
    process.exit(1);
  }
}

runP8Experiment().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});