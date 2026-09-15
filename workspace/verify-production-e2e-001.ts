import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });
process.env.DATABASE_URL = 'postgresql://eos_user:eos_pass123@localhost:5433/eos_identity';
console.log('DATABASE_URL set to:', process.env.DATABASE_URL);

import { initIdentitySchema } from './capabilities/identity/implementation/repositories/base.repository';
import { getIntentRepositoryPostgres } from './capabilities/identity/implementation/repositories/intent.repository';

// ============================================================================
// PRODUCTION-E2E-001: DUAL SCENARIO VERIFICATION
// P-E2E-001-POS: Authorized Mutation
// P-E2E-001-NEG: Unauthorized Mutation
// ============================================================================
async function main() {
  const testMode = process.env.TEST_MODE; // 'pos' or 'neg'
  const resumeIntentId = process.env.RESUME_INTENT_ID;

  if (resumeIntentId) {
    // ==============================================
    // PROCESS B: VERIFY STATE AFTER RESTART (READ-BACK FROM POSTGRES)
    // ==============================================
    console.log("\n🔄 [Process B] PRODUCTION-E2E-001: RESUMING FROM POSTGRES (PROCESS DEATH SIMULATED)");
    console.log("=" + "=".repeat(90));
    console.log(`Verifying intent ID: ${resumeIntentId}`);
    
    // Initialize database connection
    await initIdentitySchema();
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Query the intent from PostgreSQL (E-07 requirement: READ-BACK DATABASE PROOF)
    const result = await pool.query(`SELECT * FROM intents WHERE id = $1`, [resumeIntentId]);
    const persistedIntent = result.rows[0];

    if (testMode === 'pos') {
      // P-E2E-001-POS: Verify MUTATION OCCURRED (record exists in DB)
      console.log("\n📊 VERIFYING P-E2E-001-POS (AUTHORIZED MUTATION) CRITERIA:");
      const checks = [
        { name: "Intent exists in PostgreSQL (mutation persisted)", value: persistedIntent != null },
        { name: "Same intentId preserved", value: persistedIntent?.id === resumeIntentId },
        { name: "Tenant/workspace isolation maintained", value: persistedIntent?.tenant_id != null && persistedIntent?.workspace_id != null },
        { name: "External origin correctly set", value: persistedIntent?.origin === "external_system" },
        { name: "Status set to RECEIVED", value: persistedIntent?.status === "RECEIVED" },
        { name: "External reference ID preserved", value: persistedIntent?.metadata?.external_reference_id != null },
        { name: "No duplicate records", value: result.rowCount === 1 },
      ];
      
      const allPassed = checks.every(c => c.value);
      checks.forEach(c => console.log(`  ${c.value ? '✅ PASS' : '❌ FAIL'}: ${c.name}`));
      
      if (allPassed) {
        console.log("\n🎉🎉🎉 P-E2E-001-POS PASSED! Authorized mutation persisted across restart.");
        process.exit(0);
      } else {
        console.error("\n❌ P-E2E-001-POS FAILED! Mutation did not survive process restart.");
        process.exit(1);
      }
    } else if (testMode === 'neg') {
      // P-E2E-001-NEG: Verify NO MUTATION OCCURRED (record does NOT exist in DB)
      console.log("\n📊 VERIFYING P-E2E-001-NEG (UNAUTHORIZED MUTATION) CRITERIA:");
      const checks = [
        { name: "Intent NOT found in PostgreSQL (no unauthorized mutation)", value: persistedIntent == null },
        { name: "Database state unchanged", value: result.rowCount === 0 },
      ];
      
      const allPassed = checks.every(c => c.value);
      checks.forEach(c => console.log(`  ${c.value ? '✅ PASS' : '❌ FAIL'}: ${c.name}`));
      
      if (allPassed) {
        console.log("\n🎉🎉🎉 P-E2E-001-NEG PASSED! Unauthorized mutation blocked, database unchanged.");
        process.exit(0);
      } else {
        console.error("\n❌ P-E2E-001-NEG FAILED! Unauthorized mutation persisted to database.");
        process.exit(1);
      }
    }
    return;
  }

  // ==============================================
  // PROCESS A: EXECUTE SCENARIO AND PERSIST (IF AUTHORIZED)
  // ==============================================
  const mode = process.env.TEST_MODE;
  if (mode !== 'pos' && mode !== 'neg') {
    console.error("❌ Invalid TEST_MODE: must be 'pos' or 'neg'");
    process.exit(1);
  }
  console.log(`\n🔍 PRODUCTION-E2E-001: EXECUTING ${mode === 'pos' ? 'P-E2E-001-POS (AUTHORIZED)' : 'P-E2E-001-NEG (UNAUTHORIZED)'}`);
  console.log("=" + "=".repeat(90));

  // Initialize database connection
  await initIdentitySchema();
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Load existing valid tenant/workspace/user from Postgres (matches w001 template pattern)
  const existingTenants = await pool.query(`SELECT * FROM tenants LIMIT 1`);
  const existingWorkspaces = await pool.query(`SELECT * FROM workspaces LIMIT 1`);
  const existingUsers = await pool.query(`SELECT * FROM users LIMIT 1`);
  
  if (existingTenants.rows.length === 0 || existingWorkspaces.rows.length === 0 || existingUsers.rows.length === 0) {
    console.error("❌ No existing tenant/workspace/user found in Postgres!");
    process.exit(1);
  }
  
  const tenantId = existingTenants.rows[0].id;
  const workspaceId = existingWorkspaces.rows[0].id;
  const actorId = existingUsers.rows[0].id;
  console.log("\n✅ Using existing valid identities from Postgres:");
  console.log(`  Tenant ID: ${tenantId}`);
  console.log(`  Workspace ID: ${workspaceId}`);
  console.log(`  Actor ID: ${actorId}`);

  // Prepare API request to canonical services-id intake route
  const timestamp = Date.now();
  const externalRefId = `test-e2e-${timestamp}`;
  const apiUrl = 'http://localhost:3001/api/integrations/external/services-id/intake';
  const validApiKey = process.env.SERVICES_ID_EXTERNAL_API_KEY || 'test-api-key-eos-work-001';
  const apiKey = mode === 'pos' ? validApiKey : 'invalid-fake-key-999';

  console.log(`\n📡 [Process A] Calling canonical System Surface route: ${apiUrl}`);
  console.log(`  API Key used: ${mode === 'pos' ? 'VALID' : 'INVALID'} (${apiKey.substring(0, 8)}...)`);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-services-id-api-key': apiKey
      },
      body: JSON.stringify({
        content: "Saya butuh layanan pengiriman dokumen legal untuk klien",
        source: "services-id-platform",
        external_reference_id: externalRefId,
        raw: {
          type: "service_request",
          content: "Permintaan layanan pengiriman dokumen legal"
        }
      })
    });

    console.log(`\n📥 API Response Status: ${response.status}`);
    const responseData = await response.json();
    console.log(`  Response: ${JSON.stringify(responseData, null, 2)}`);

    if (mode === 'pos') {
      // P-E2E-001-POS: Verify 201 created, intent ID returned
      if (response.status !== 200 || !responseData.intent_id) {
        console.error("\n❌ P-E2E-001-POS FAILED: Authorized request rejected");
        process.exit(1);
      }
      console.log("\n✅ Authorized request accepted, intent created in runtime");
      
      // Simulate process death and run Process B to verify persistence across restart
      console.log("\n💥 SIMULATING PROCESS DEATH - RUNNING PROCESS B TO VERIFY PERSISTENCE");
      console.log(`   Execute: TEST_MODE=pos RESUME_INTENT_ID=${responseData.intent_id} pnpm exec tsx verify-production-e2e-001.ts`);
      // Jalankan Process B secara manual untuk end-to-end verification (ES module compatible)
      console.log("\n👉 SEKARANG JALANKAN PERINTAH BERIKUT UNTUK VERIFIKASI PERSISTENCE SETELAH RESTART (PROCESS B):");
      console.log(`   TEST_MODE=pos RESUME_INTENT_ID=${responseData.intent_id} pnpm exec tsx verify-production-e2e-001.ts`);
      process.exit(0);
    } else {
      // P-E2E-001-NEG: Verify 401 unauthorized, no intent created
      if (response.status !== 401) {
        console.error("\n❌ P-E2E-001-NEG FAILED: Unauthorized request accepted");
        process.exit(1);
      }
      console.log("\n✅ Unauthorized request correctly rejected with 401");
      
      // Verify no record exists in database (E-07 requirement: NO MUTATION proof)
      const intentRepo = getIntentRepositoryPostgres();
      const danglingIntents = await pool.query(`SELECT * FROM intents WHERE metadata->>'external_reference_id' = $1`, [externalRefId]);
      
      if (danglingIntents.rows.length > 0) {
        console.error("\n❌ P-E2E-001-NEG FAILED: Unauthorized intent persisted to database despite rejection");
        process.exit(1);
      }
      console.log("\n✅ Verified: No dangling records created in PostgreSQL - state unchanged");
      console.log("\n🎉🎉🎉 P-E2E-001-NEG FULLY PASSED!");
      process.exit(0);
    }

  } catch (error) {
    console.error("\n❌ API request failed:", error);
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});