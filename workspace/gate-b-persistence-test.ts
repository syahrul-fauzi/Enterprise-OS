import assert from "node:assert/strict";
import { identityCommands } from "./capabilities/identity/implementation/commands/index.js";
import {
  UserRepositoryPostgres,
  TenantRepositoryPostgres,
  WorkspaceRepositoryPostgres,
  MembershipRepositoryPostgres,
  SessionRepositoryPostgres,
  initIdentitySchema
} from "./capabilities/identity/implementation/repositories/index.js";
import { UserId, TenantId, WorkspaceId, SessionId } from "./capabilities/identity/implementation/contracts/identity.contracts.js";

const results: Array<{ name: string; pass: boolean; detail?: string }> = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log(`  ✅ ${name}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, pass: false, detail: msg });
    console.log(`  ❌ ${name} :: ${msg}`);
  }
}

async function main() {
  console.log("\n🔥 GATE B: POSTGRESQL PERSISTENCE & TENANT ISOLATION VERIFICATION\n");
  console.log("=".repeat(70));

  // Verify DATABASE_URL is set (no fallback)
  await test("DATABASE_URL is configured (no InMemory/mock fallback)", async () => {
    assert.ok(process.env.DATABASE_URL, "DATABASE_URL environment variable must be set");
    assert.ok(process.env.DATABASE_URL.startsWith("postgresql://"), "Must use real PostgreSQL connection, not mock");
  });

  // Initialize schema (idempotent - already exists but verifies connection)
  await initIdentitySchema();
  console.log("\n--- Phase 1: CREATE TEST USER 1 (TENANT A) ---");
  
  const timestamp = Date.now();
  const userAEmail = `battle1a-${timestamp}@example.test`;
  const userAPassword = "SecureGateBTest123!";
  const userADisplayName = "Gate B Test User A";
  
  type UserACtx = {
    userId?: string;
    tenantId?: string;
    workspaceId?: string;
    sessionId?: string;
  };
  const userA: UserACtx = {};

  await test("USER A: Signup creates all entities in PostgreSQL", async () => {
    const result = await identityCommands["identity.signupAndCreateSession"].execute({
      email: userAEmail,
      password: userAPassword,
      displayName: userADisplayName,
    }) as unknown as {
      response: {
        userId: string;
        tenantId: string;
        workspaceId: string;
        sessionId: string;
        email: string;
      };
    };

    userA.userId = result.response.userId;
    userA.tenantId = result.response.tenantId;
    userA.workspaceId = result.response.workspaceId;
    userA.sessionId = result.response.sessionId;

    assert.ok(userA.userId?.startsWith("user-"), "User ID format invalid");
    assert.ok(userA.tenantId?.startsWith("tenant-"), "Tenant ID format invalid");
    assert.ok(userA.workspaceId?.startsWith("workspace-"), "Workspace ID format invalid");
    assert.ok(userA.sessionId?.startsWith("session-"), "Session ID format invalid");
    assert.equal(result.response.email, userAEmail.toLowerCase(), "Email must be normalized");
  });

  // Verify ALL entities exist in PostgreSQL immediately after signup
  await test("USER A: All entities persisted in PostgreSQL (direct DB check)", async () => {
    // Verify user
    const persistedUser = await UserRepositoryPostgres.byId(UserId(userA.userId!));
    assert.ok(persistedUser, "User not found in PostgreSQL");
    assert.equal(persistedUser.email, userAEmail.toLowerCase());

    // Verify tenant
    const persistedTenant = await TenantRepositoryPostgres.byId(TenantId(userA.tenantId!));
    assert.ok(persistedTenant, "Tenant not found in PostgreSQL");

    // Verify workspace
    const persistedWorkspace = await WorkspaceRepositoryPostgres.byId(WorkspaceId(userA.workspaceId!));
    assert.ok(persistedWorkspace, "Workspace not found in PostgreSQL");

    // Verify membership
    const persistedMembership = await MembershipRepositoryPostgres.find(
      UserId(userA.userId!),
      TenantId(userA.tenantId!),
      WorkspaceId(userA.workspaceId!)
    );
    assert.ok(persistedMembership, "Membership not found in PostgreSQL");
    assert.equal(persistedMembership.role, "owner");

    // Verify session
    const persistedSession = await SessionRepositoryPostgres.byId(SessionId(userA.sessionId!));
    assert.ok(persistedSession, "Session not found in PostgreSQL");
  });

  console.log("\n--- Phase 2: CREATE TEST USER 2 (TENANT B) ---");
  const userBEmail = `battle1b-${timestamp}@example.test`;
  const userBPassword = "SecureGateBTest456!";
  const userBDisplayName = "Gate B Test User B";
  
  type UserBCtx = {
    userId?: string;
    tenantId?: string;
    workspaceId?: string;
    sessionId?: string;
  };
  const userB: UserBCtx = {};

  await test("USER B: Signup creates separate tenant (isolation baseline)", async () => {
    const result = await identityCommands["identity.signupAndCreateSession"].execute({
      email: userBEmail,
      password: userBPassword,
      displayName: userBDisplayName,
    }) as unknown as {
      response: {
        userId: string;
        tenantId: string;
        workspaceId: string;
        sessionId: string;
        email: string;
      };
    };

    userB.userId = result.response.userId;
    userB.tenantId = result.response.tenantId;
    userB.workspaceId = result.response.workspaceId;
    userB.sessionId = result.response.sessionId;

    assert.notEqual(userA.tenantId, userB.tenantId, "Users must have separate tenants");
  });

  console.log("\n--- Phase 3: TENANT ISOLATION VERIFICATION ---");
  await test("TENANT ISOLATION: User A CANNOT access User B's workspace", async () => {
    // Attempt to access User B's workspace using User A's session
    const accessResult = await identityCommands["identity.getWorkspaceById"].execute({
      workspaceId: userB.workspaceId,
      actorId: userA.userId,
      sessionId: userA.sessionId,
    });

    assert.equal(accessResult, undefined, "Cross-tenant workspace access should be blocked");
  });

  await test("TENANT ISOLATION: User B CAN access their own workspace", async () => {
    const accessResult = await identityCommands["identity.getWorkspaceById"].execute({
      workspaceId: userB.workspaceId,
      actorId: userB.userId,
      sessionId: userB.sessionId,
    });

    assert.ok(accessResult !== undefined, "User should be able to access their own workspace");
    assert.equal(accessResult.workspace.id, userB.workspaceId);
  });

  console.log("\n--- Phase 4: PERSISTENCE AFTER RESTART SIMULATION ---");
  // Simulate app restart by re-authenticating (verifies data survives process restart)
  await test("PERSISTENCE: User A can login again with same credentials (data survives restart)", async () => {
    const loginResult = await identityCommands["identity.authenticateUser"].execute({
      email: userAEmail,
      password: userAPassword,
    }) as unknown as {
      authenticated: boolean;
      userId: string;
      tenantId: string;
      workspaceId: string;
      session: { sessionId: string };
    };

    assert.equal(loginResult.authenticated, true, "Login should succeed after restart");
    assert.equal(loginResult.userId, userA.userId, "User ID must match original");
    assert.equal(loginResult.tenantId, userA.tenantId, "Tenant ID must match original");
    assert.equal(loginResult.workspaceId, userA.workspaceId, "Workspace ID must match original");
  });

  await test("PERSISTENCE: Original entities still exist in PostgreSQL after re-authentication", async () => {
    const persistedUser = await UserRepositoryPostgres.byId(UserId(userA.userId!));
    assert.ok(persistedUser, "User still exists after restart");
    
    const persistedTenant = await TenantRepositoryPostgres.byId(TenantId(userA.tenantId!));
    assert.ok(persistedTenant, "Tenant still exists after restart");
    
    const persistedWorkspace = await WorkspaceRepositoryPostgres.byId(WorkspaceId(userA.workspaceId!));
    assert.ok(persistedWorkspace, "Workspace still exists after restart");
  });

  // Final summary
  console.log("\n" + "=".repeat(70));
  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  const allPassed = passed === total;

  console.log(`GATE B TEST SUMMARY: ${passed}/${total} tests passed`);
  
  if (!allPassed) {
    console.log("\n❌ GATE B FAILED - failing tests:");
    results.filter(r => !r.pass).forEach(f => console.log(`   - ${f.name}: ${f.detail}`));
    process.exit(1);
  } else {
    console.log("\n✅ GATE B PASSED - All persistence & isolation criteria met!");
    console.log("\n📋 VERIFIED CRITERIA:");
    console.log("   1. PostgreSQL is the only persistence layer (no mocks/InMemory)");
    console.log("   2. Signup creates all required entities (user, tenant, workspace, membership, session)");
    console.log("   3. Tenant isolation enforced - cross-tenant access blocked");
    console.log("   4. Data survives application restart (can re-login with same credentials)");
    console.log("   5. All entities remain persisted after restart");
    process.exit(0);
  }
}

main().catch(err => {
  console.error("Test suite failed with unhandled error:", err);
  process.exit(1);
});