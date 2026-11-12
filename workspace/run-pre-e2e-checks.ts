// Pre-E2E verification checks for PAYROLL-IDEMPOTENCY-001
// Runs 3 read-only SQL queries to validate idempotency key constraints and duplicates
import { Pool } from "pg";

async function runPreE2EChecks() {
  const pool = new Pool({
    host: "localhost",
    port: 5433,
    user: "eos_user",
    password: "eos_pass123",
    database: "eos_identity",
  });

  console.log("=== PRE-E2E READ-ONLY CHECKS ===\n");

  try {
    // 1. Check for duplicate idempotency keys in works table
    console.log("1. Checking for duplicate idempotency keys in works table...");
    const worksDuplicates = await pool.query(`
      SELECT idempotency_key, COUNT(*) AS total
      FROM works
      WHERE idempotency_key IS NOT NULL
      GROUP BY idempotency_key
      HAVING COUNT(*) > 1;
    `);
    if (worksDuplicates.rows.length === 0) {
      console.log("✅ PASSED: No duplicate idempotency keys found in works table");
    } else {
      console.log("❌ FAILED: Found duplicate idempotency keys in works table:");
      console.table(worksDuplicates.rows);
    }

    // 2. Check for duplicate idempotency keys in work_payments table
    console.log("\n2. Checking for duplicate idempotency keys in work_payments table...");
    const paymentsDuplicates = await pool.query(`
      SELECT idempotency_key, COUNT(*) AS total
      FROM work_payments
      GROUP BY idempotency_key
      HAVING COUNT(*) > 1;
    `);
    if (paymentsDuplicates.rows.length === 0) {
      console.log("✅ PASSED: No duplicate idempotency keys found in work_payments table");
    } else {
      console.log("❌ FAILED: Found duplicate idempotency keys in work_payments table:");
      console.table(paymentsDuplicates.rows);
    }

    // 3. Verify constraint definitions in work_payments table
    console.log("\n3. Checking constraint definitions in work_payments table...");
    const constraints = await pool.query(`
      SELECT
        conname,
        pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'work_payments'::regclass;
    `);
    console.log("📋 Found constraints in work_payments:");
    console.table(constraints.rows.map(row => ({
      constraint_name: row.conname,
      definition: row.definition.substring(0, 100) + "..." // Truncate for readability
    })));

    // Check specifically for required constraints
    const hasWorkIdPaymentIdUnique = constraints.rows.some(row => 
      row.definition.includes("work_id") && row.definition.includes("payment_id") && row.definition.includes("UNIQUE")
    );
    const hasIdempotencyKeyUnique = constraints.rows.some(row =>
      row.definition.includes("idempotency_key") && row.definition.includes("UNIQUE")
    );

    console.log("\n🔍 Required constraint validation:");
    console.log(`- (work_id, payment_id) unique constraint: ${hasWorkIdPaymentIdUnique ? "✅ FOUND" : "❌ MISSING"}`);
    console.log(`- idempotency_key unique constraint: ${hasIdempotencyKeyUnique ? "✅ FOUND" : "❌ MISSING"}`);

  } catch (e) {
    console.error("❌ Error running pre-E2E checks:", e instanceof Error ? e.message : e);
  } finally {
    await pool.end();
  }
}

runPreE2EChecks().catch(console.error);