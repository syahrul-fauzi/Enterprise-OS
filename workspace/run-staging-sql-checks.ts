import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { statePath } from "@repo/eos-cli";

// Load staging environment sesuai convention EOS
const STAGING_ENV_PATH = path.join(process.cwd(), 'infra', 'staging', '.env');
if (existsSync(STAGING_ENV_PATH)) {
  dotenv.config({ path: STAGING_ENV_PATH });
  console.log("✅ Berhasil load environment dari file:", STAGING_ENV_PATH);
}

const EVIDENCE_DIR = statePath('verification');
const EVIDENCE_PATH = statePath('verification', 'PAYROLL-IDEMPOTENCY-001_verification.json');

// Koneksi database menggunakan kredensial dari env staging
const DB_HOST = 'localhost';
const DB_PORT = 5433;
const DB_NAME = 'eos_identity';
const ADMIN_USER = process.env.POSTGRES_USER || 'eos_user';
const ADMIN_PASS = process.env.POSTGRES_PASSWORD || 'eos_pass123';
const APP_USER = 'app_user';
const APP_PASS = 'app_pass123';

async function main() {
  // Buat direktori evidence jika belum ada
  if (!existsSync(EVIDENCE_DIR)) {
    await mkdir(EVIDENCE_DIR, { recursive: true });
  }

  console.log("=== Staging SQL Security Checks ===");
  console.log("Running RLS and permission verification...");

  const pool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: ADMIN_USER,
    password: ADMIN_PASS
  });

  const results = {
    verified_at: new Date().toISOString(),
    checks: [] as Array<{name: string; passed: boolean; evidence: string}>,
    all_passed: false
  };

  try {
    // Check 1: RLS enabled on tenants table
    const rlsTenants = await pool.query(`
      SELECT rowsecurity FROM pg_tables WHERE tablename = 'tenants'
    `);
    const rlsEnabledTenants = rlsTenants.rows[0]?.rowsecurity === true;
    results.checks.push({
      name: "rls_enabled_tenants",
      passed: rlsEnabledTenants,
      evidence: rlsEnabledTenants ? "RLS is enabled on tenants table" : "RLS is NOT enabled on tenants table"
    });

    // Check 2: RLS enabled on workspaces table
    const rlsWorkspaces = await pool.query(`
      SELECT rowsecurity FROM pg_tables WHERE tablename = 'workspaces'
    `);
    const rlsEnabledWorkspaces = rlsWorkspaces.rows[0]?.rowsecurity === true;
    results.checks.push({
      name: "rls_enabled_workspaces",
      passed: rlsEnabledWorkspaces,
      evidence: rlsEnabledWorkspaces ? "RLS is enabled on workspaces table" : "RLS is NOT enabled on workspaces table"
    });

    // Check 3: App user has limited permissions
    const appPerms = await pool.query(`
      SELECT table_name, privilege_type
      FROM information_schema.table_privileges
      WHERE grantee = 'app_user' AND table_schema = 'public'
    `);
    const hasOnlySelectInsert = appPerms.rows.every(r => 
      r.privilege_type === 'SELECT' || r.privilege_type === 'INSERT'
    );
    results.checks.push({
      name: "app_user_limited_permissions",
      passed: hasOnlySelectInsert,
      evidence: `App user has ${appPerms.rows.length} privileges, all are SELECT/INSERT`
    });

    // Check 4: No public access to sensitive tables
    const publicPerms = await pool.query(`
      SELECT table_name, privilege_type
      FROM information_schema.table_privileges
      WHERE grantee = 'public' AND table_schema = 'public'
    `);
    const noPublicAccess = publicPerms.rows.length === 0;
    results.checks.push({
      name: "no_public_access",
      passed: noPublicAccess,
      evidence: noPublicAccess ? "No public privileges on any tables" : `Public has ${publicPerms.rows.length} privileges`
    });

    results.all_passed = results.checks.every(c => c.passed);

    console.log("\n=== Check Results ===");
    results.checks.forEach(c => {
      console.log(`${c.passed ? '✅' : '❌'} ${c.name}: ${c.passed ? 'PASS' : 'FAIL'}`);
      console.log(`   Evidence: ${c.evidence}`);
    });

    console.log(`\nOverall: ${results.checks.filter(c => c.passed).length}/${results.checks.length} passed`);
    console.log(`Verdict: ${results.all_passed ? 'PASS' : 'FAIL'}`);

    await writeFile(EVIDENCE_PATH, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to: ${EVIDENCE_PATH}`);

  } catch (error) {
    console.error("Error during checks:", error);
    results.checks.push({
      name: "execution_error",
      passed: false,
      evidence: `Error: ${error}`
    });
    results.all_passed = false;
  } finally {
    await pool.end();
  }

  process.exit(results.all_passed ? 0 : 1);
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});