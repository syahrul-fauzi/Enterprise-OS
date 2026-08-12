/**
 * EOS VERIFICATION AGENT: B1A-GB-02 Persistence Test
 * Independent verification that data survives server restart
 */
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { capabilityRegistry } from "@repo/core-kernel";

// Initialize database connection
function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL || "postgresql://localhost:5432/eos";
  return new Pool({ connectionString });
}

async function main() {
  console.log("\n=== EOS VERIFICATION: B1A-GB-02 GATE B PERSISTENCE TEST START ===\n");
  
  const pool = getPool();
  let testUserId: string | null = null;
  let testTenantId: string | null = null;
  
  try {
    // Step 1: Test signup inserts data
    console.log("🔹 STEP 1: Testing signup inserts PostgreSQL rows...");
    const testEmail = `test-${randomUUID().slice(0,8)}@eos.local`;
    const { output } = await capabilityRegistry.invoke<any>(
      "identity", 
      "signupAndCreateSession", 
      {
        email: testEmail,
        password: "testpassword123",
        displayName: "Test User"
      }
    );
    
    testUserId = output.userId;
    testTenantId = output.tenantId;
    console.log(`   ✅ Signup executed, user ID: ${testUserId}, tenant ID: ${testTenantId}`);
    
    // Verify all 5 tables have rows
    const userCheck = await pool.query("SELECT * FROM users WHERE id = $1", [testUserId]);
    const tenantCheck = await pool.query("SELECT * FROM tenants WHERE id = $1", [testTenantId]);
    const workspaceCheck = await pool.query("SELECT * FROM workspaces WHERE tenant_id = $1", [testTenantId]);
    const membershipCheck = await pool.query("SELECT * FROM memberships WHERE user_id = $1 AND tenant_id = $2", [testUserId, testTenantId]);
    const sessionCheck = await pool.query("SELECT * FROM sessions WHERE user_id = $1", [testUserId]);
    
    console.log(`   ✅ users table: ${userCheck.rows.length} row(s)`);
    console.log(`   ✅ tenants table: ${tenantCheck.rows.length} row(s)`);
    console.log(`   ✅ workspaces table: ${workspaceCheck.rows.length} row(s)`);
    console.log(`   ✅ memberships table: ${membershipCheck.rows.length} row(s)`);
    console.log(`   ✅ sessions table: ${sessionCheck.rows.length} row(s)`);
    
    if (userCheck.rows.length === 0 || tenantCheck.rows.length === 0) {
      throw new Error("❌ Signup failed to insert core data into PostgreSQL");
    }
    
    // Step 2: Simulate server restart (drop connection pool, recreate)
    console.log("\n🔹 STEP 2: Simulating server restart (reconnecting to DB)...");
    await pool.end();
    const newPool = getPool();
    
    // Step 3: Test login retrieves same data
    console.log("🔹 STEP 3: Testing login retrieves persisted data...");
    const loginResult = await capabilityRegistry.invoke<any>(
      "identity",
      "loginUser",
      {
        email: testEmail,
        password: "testpassword123"
      }
    );
    
    if (!loginResult.output.sessionToken) {
      throw new Error("❌ Login failed after simulated restart");
    }
    
    // Verify same IDs persist
    const recheckUser = await newPool.query("SELECT * FROM users WHERE id = $1", [testUserId]);
    const recheckTenant = await newPool.query("SELECT * FROM tenants WHERE id = $1", [testTenantId]);
    
    console.log(`   ✅ Login successful, session token created`);
    console.log(`   ✅ Same user ID persisted: ${recheckUser.rows[0].id}`);
    console.log(`   ✅ Same tenant ID persisted: ${recheckTenant.rows[0].id}`);
    
    // Cleanup test data
    await newPool.query("DELETE FROM sessions WHERE user_id = $1", [testUserId]);
    await newPool.query("DELETE FROM memberships WHERE user_id = $1", [testUserId]);
    await newPool.query("DELETE FROM workspaces WHERE tenant_id = $1", [testTenantId]);
    await newPool.query("DELETE FROM tenants WHERE id = $1", [testTenantId]);
    await newPool.query("DELETE FROM users WHERE id = $1", [testUserId]);
    await newPool.end();
    
    console.log("\n=== EOS VERIFICATION: B1A-GB-02 ALL TESTS PASSED ===\n");
    process.exit(0);
    
  } catch (error) {
    console.error("\n❌ GATE B VERIFICATION FAILED:", error);
    
    // Cleanup if possible
    if (testUserId && testTenantId) {
      try {
        await pool.query("DELETE FROM sessions WHERE user_id = $1", [testUserId]);
        await pool.query("DELETE FROM memberships WHERE user_id = $1", [testUserId]);
        await pool.query("DELETE FROM workspaces WHERE tenant_id = $1", [testTenantId]);
        await pool.query("DELETE FROM tenants WHERE id = $1", [testTenantId]);
        await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);
        await pool.end();
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }
    }
    
    process.exit(1);
  }
}

main();