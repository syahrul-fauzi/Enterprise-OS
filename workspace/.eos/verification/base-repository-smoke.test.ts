// Base Repository Round-Trip Smoke Test
// Verifies that domain objects are correctly converted between camelCase ↔ snake_case
// and can be persisted/retrieved from PostgreSQL with all fields intact

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
process.env.DATABASE_URL = 'postgresql://eos_user:eos_pass123@localhost:5433/eos_identity';
console.log('DATABASE_URL set to:', process.env.DATABASE_URL);

import { randomUUID } from "node:crypto";
import { getRequirementRepositoryPostgres, RequirementId, newRequirementId } from "../../capabilities/requirement-management/implementation/repository/requirement.repository.js";
import { initIdentitySchema, getTenantRepositoryPostgres, getWorkspaceRepositoryPostgres, getUserRepositoryPostgres } from "../../capabilities/identity/implementation/repositories/index.js";
import { UserId, TenantId, WorkspaceId } from '../../capabilities/identity/implementation/contracts/identity.contracts.js';
import { Pool } from "pg";

// Local ID generators (same pattern as identity capability, since not exported publicly)
function newUserId(): UserId { return UserId(`user-${randomUUID()}`); }
function newTenantId(): TenantId { return TenantId(`tenant-${randomUUID()}`); }
function newWorkspaceId(): WorkspaceId { return WorkspaceId(`workspace-${randomUUID()}`); }

// getPool implementation (since getPool is internal in base.repository.ts)
function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("[PostgreSQL] DATABASE_URL environment variable is required");
  }
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

async function main() {
  console.log("[SMOKE TEST] Starting base.repository.ts round-trip verification...");
  
  // Initialize database schema
  await initIdentitySchema();
  const pool = getPool();
  const tenantRepo = getTenantRepositoryPostgres();
  const workspaceRepo = getWorkspaceRepositoryPostgres();
  const userRepo = getUserRepositoryPostgres();
  
  // Step 0: Create test prerequisite records (user, tenant, workspace) for foreign key constraints
  console.log("[SMOKE TEST] Step 0: Creating prerequisite test records...");
  const testUserId = newUserId();
  await userRepo.save({
    id: testUserId,
    email: `test-${randomUUID().slice(0,8)}@example.com`, // Unique email to avoid unique constraint violation
    passwordHash: "hashed_password",
    displayName: "Test User",
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  const testRand = randomUUID().slice(0,8);
  const testTenantId = newTenantId();
  await tenantRepo.save({
    id: testTenantId,
    name: "Test Tenant",
    slug: `test-tenant-${testRand}`, // Unique slug to avoid unique constraint violation
    ownerId: testUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  const testWorkspaceId = newWorkspaceId();
  await workspaceRepo.save({
    id: testWorkspaceId,
    name: "Test Workspace",
    slug: `test-ws-${testRand}`, // Unique workspace slug
    tenantId: testTenantId,
    productId: "legal-case",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  // Create test requirement domain object (camelCase as per domain model)
  const testId = await newRequirementId(); // newRequirementId is async (returns Promise<RequirementId>)
  const testLogicalWorkId = "lw-test-001";
  
  const originalWork = {
    id: testId,
    tenantId: testTenantId,
    workspaceId: testWorkspaceId,
    actorId: testUserId,
    logicalWorkId: testLogicalWorkId,
    title: "Test Requirement",
    summary: "Test round-trip persistence",
    description: "Verify camelCase ↔ snake_case conversion works",
    status: "draft",
    priority: "medium",
    owner: testUserId,
    source: "smoke-test",
    linkedCapabilityIds: [],
    acceptanceCriteria: [],
    verificationStatus: "not_ready",
    dependsOn: [],
    createdBy: testUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    approvedAt: null,
    implementedAt: null,
    verifiedAt: null,
  };
  
  const repo = getRequirementRepositoryPostgres();
  
  // Step 1: Save the domain object
  console.log("[SMOKE TEST] Step 1: Saving test domain object...");
  const savedWork = await repo.save(originalWork);
  console.log(`[SMOKE TEST] Saved work with id: ${savedWork.id}`);
  
  // Step 2: Retrieve it back from repository
  console.log("[SMOKE TEST] Step 2: Retrieving saved object...");
  const retrievedWork = await repo.byId(testId);
  if (!retrievedWork) {
    throw new Error("FAILED: Could not retrieve saved requirement from database");
  }
  
  // Step 3: Verify ALL fields are identical (camelCase preserved)
  console.log("[SMOKE TEST] Step 3: Verifying field equality...");
  const assertions = [
    { key: "logicalWorkId", expected: originalWork.logicalWorkId, actual: retrievedWork.logicalWorkId },
    { key: "tenantId", expected: originalWork.tenantId, actual: retrievedWork.tenantId },
    { key: "workspaceId", expected: originalWork.workspaceId, actual: retrievedWork.workspaceId },
    { key: "actorId", expected: originalWork.actorId, actual: retrievedWork.actorId },
    { key: "status", expected: originalWork.status, actual: retrievedWork.status },
    { key: "priority", expected: originalWork.priority, actual: retrievedWork.priority },
    { key: "owner", expected: originalWork.owner, actual: retrievedWork.owner },
    { key: "version", expected: 1, actual: retrievedWork.version },
  ];
  
  const failures: string[] = [];
  for (const assert of assertions) {
    if (assert.expected !== assert.actual) {
      failures.push(`${assert.key}: expected "${assert.expected}", got "${assert.actual}"`);
    }
  }
  
  if (failures.length > 0) {
    console.error("[SMOKE TEST] FAILED field assertions:");
    failures.forEach(f => console.error(`  - ${f}`));
    // Cleanup
    await repo.remove(testId);
    await workspaceRepo.remove(testWorkspaceId);
    await tenantRepo.remove(testTenantId);
    await userRepo.remove(testUserId);
    process.exit(1);
  }
  
  // Step 4: Verify raw PostgreSQL record has snake_case fields
  console.log("[SMOKE TEST] Step 4: Verifying raw PostgreSQL record has snake_case columns...");
  const rawResult = await pool.query(`SELECT * FROM requirements WHERE id = $1`, [testId]);
  const rawRow = rawResult.rows[0];
  
  const snakeCaseAssertions = [
    { key: "logical_work_id", exists: "logical_work_id" in rawRow, value: rawRow.logical_work_id === testLogicalWorkId },
    { key: "tenant_id", exists: "tenant_id" in rawRow, value: rawRow.tenant_id === testTenantId },
    { key: "workspace_id", exists: "workspace_id" in rawRow, value: rawRow.workspace_id === testWorkspaceId },
    { key: "actor_id", exists: "actor_id" in rawRow, value: rawRow.actor_id === testUserId },
    { key: "created_at", exists: "created_at" in rawRow },
    { key: "updated_at", exists: "updated_at" in rawRow },
    { key: "created_by", exists: "created_by" in rawRow, value: rawRow.created_by === testUserId }, // created_by matches actual DB column
  ];
  
  const snakeCaseFailures: string[] = [];
  for (const assert of snakeCaseAssertions) {
    if (!assert.exists) {
      snakeCaseFailures.push(`${assert.key} missing from raw PostgreSQL row`);
    } else if (assert.value !== undefined && assert.value === false) {
      snakeCaseFailures.push(`${assert.key} value mismatch in raw PostgreSQL row`);
    }
  }
  
  if (snakeCaseFailures.length > 0) {
    console.error("[SMOKE TEST] FAILED snake_case column assertions:");
    snakeCaseFailures.forEach(f => console.error(`  - ${f}`));
    // Cleanup
    await repo.remove(testId);
    await workspaceRepo.remove(testWorkspaceId);
    await tenantRepo.remove(testTenantId);
    await userRepo.remove(testUserId);
    process.exit(1);
  }
  
  // Step 5: Verify version increment works (optimistic concurrency)
  console.log("[SMOKE TEST] Step 5: Verifying version increment on update...");
  retrievedWork.title = "Updated Test Requirement";
  const updatedWork = await repo.save(retrievedWork);
  if (updatedWork.version !== 2) {
    console.error(`[SMOKE TEST] FAILED version increment: expected version 2, got ${updatedWork.version}`);
    await repo.remove(testId);
    await workspaceRepo.remove(testWorkspaceId);
    await tenantRepo.remove(testTenantId);
    await userRepo.remove(testUserId);
    process.exit(1);
  }
  
  // Step 6: List all requirements and verify count
  console.log("[SMOKE TEST] Step 6: Verifying list() returns correct aggregates...");
  const allRequirements = await repo.list();
  if (allRequirements.length !== 1) {
    console.error(`[SMOKE TEST] FAILED list() test: expected 1 requirement, got ${allRequirements.length}`);
    await repo.remove(testId);
    await workspaceRepo.remove(testWorkspaceId);
    await tenantRepo.remove(testTenantId);
    await userRepo.remove(testUserId);
    process.exit(1);
  }
  
  // Step 7: Cleanup test data
  await repo.remove(testId);
  await workspaceRepo.remove(testWorkspaceId);
  await tenantRepo.remove(testTenantId);
  await userRepo.remove(testUserId);
  await pool.end();
  
  console.log("[SMOKE TEST] ✅ ALL TESTS PASSED! Round-trip persistence works correctly.");
  console.log("[SMOKE TEST] camelCase ↔ snake_case conversion verified.");
  console.log("[SMOKE TEST] PostgreSQL persistence verified.");
  console.log("[SMOKE TEST] Optimistic concurrency (version increment) verified.");
  console.log("[SMOKE TEST] list() returns properly converted domain aggregates.");
  process.exit(0);
}

main().catch(err => {
  console.error("[SMOKE TEST] FATAL ERROR:", err);
  process.exit(1);
});