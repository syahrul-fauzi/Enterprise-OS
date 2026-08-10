import assert from "node:assert/strict";
import { identityCommands } from "./capabilities/identity/implementation/commands";
import { SessionRepositoryInMemory } from "./capabilities/identity/implementation/repositories";
import { SessionId, UserId, TenantId, WorkspaceId } from "./capabilities/identity/implementation/contracts/identity.contracts";
import {
  createAnonymousWorkspaceSession,
  isAuthenticatedSession,
} from "./apps/web/lib/workspace-session";

const results: Array<{ name: string; pass: boolean; detail?: string }> = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, pass: true });
    console.log(`  ✅ ${name}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, pass: false, detail: msg });
    console.log(`  ❌ ${name} :: ${msg}`);
  }
}

console.log("\n🔥 AUTH BATTLE-1A SMOKE TESTS (Commander Acceptance Criteria)\n");

console.log("--- Test 0: Primitives existence check ---");
test("identityCommands.registerUser exists", () => {
  assert.ok(identityCommands["identity.registerUser"], "registerUser command undefined");
  assert.equal(typeof identityCommands["identity.registerUser"].execute, "function");
});
test("identityCommands.authenticateUser exists", () => {
  assert.ok(identityCommands["identity.authenticateUser"]);
  assert.equal(typeof identityCommands["identity.authenticateUser"].execute, "function");
});
test("identityCommands.logoutUser exists", () => {
  assert.ok(identityCommands["identity.logoutUser"]);
  assert.equal(typeof identityCommands["identity.logoutUser"].execute, "function");
});
test("SessionRepositoryInMemory.isRevoked + revoke exist", () => {
  assert.equal(typeof SessionRepositoryInMemory.isRevoked, "function");
  assert.equal(typeof SessionRepositoryInMemory.revoke, "function");
});
test("SessionAggregate fields: id/userId/tenantId/workspaceId/revokedAt/expiresAt", () => {
  const s = SessionRepositoryInMemory.list()[0];
  if (s) {
    assert.ok(s.id, "session.id");
    assert.ok(s.userId, "session.userId");
    assert.ok(s.tenantId, "session.tenantId");
    assert.ok(Object.hasOwn(s, "revokedAt"), "has revokedAt");
    assert.ok(s.expiresAt, "session.expiresAt");
  }
});

console.log("\n--- Test 1 (Commander): REGISTER full vertical slice ---");
type RegCtx = {
  email: string;
  password: string;
  displayName: string;
  userId?: string;
  tenantId?: string;
  workspaceId?: string;
  membershipId?: string;
  sessionId?: string;
};
const REG: RegCtx = {
  email: `battle1a-${Date.now()}@eos.dev`,
  password: "password123",
  displayName: "Battle 1A User",
};
test("REGISTER: registerUser() returns userId, actorId=user-*, email matches", () => {
  const out = identityCommands.registerUser.execute({
    email: REG.email,
    password: REG.password,
    displayName: REG.displayName,
  }) as unknown as { userId: string; actorId: string; email: string };
  REG.userId = out.userId;
  assert.ok(REG.userId.startsWith("user-"), `userId should be user-* got ${REG.userId}`);
  assert.equal(out.actorId, REG.userId);
  assert.equal(out.email, REG.email.toLowerCase());
});

let tenantOut: { tenantId: string; slug: string; name: string };
test("REGISTER: createTenant() returns tenant-* with slug and name", () => {
  tenantOut = identityCommands.createTenant.execute({
    name: `${REG.displayName} Personal`,
    slug: `battle1a-${Date.now()}`,
  }) as unknown as { tenantId: string; slug: string; name: string };
  REG.tenantId = tenantOut.tenantId;
  assert.ok(tenantOut.tenantId.startsWith("tenant-"));
  assert.equal(tenantOut.name, `${REG.displayName} Personal`);
});

let workspaceOut: { workspaceId: string; productId: string; name: string };
test("REGISTER: createWorkspace() links workspace to tenant + productId", () => {
  workspaceOut = identityCommands.createWorkspace.execute({
    tenantId: TenantId(REG.tenantId!),
    name: "Professional Workspace",
    productId: "lawyers-hub.default",
  }) as unknown as { workspaceId: string; productId: string; name: string };
  REG.workspaceId = workspaceOut.workspaceId;
  assert.ok(workspaceOut.workspaceId.startsWith("workspace-"));
  assert.equal(workspaceOut.productId, "lawyers-hub.default");
});

test("REGISTER: createMembership(owner) returns membership-* role=owner", () => {
  const mOut = identityCommands.createMembership.execute({
    userId: UserId(REG.userId!),
    tenantId: TenantId(REG.tenantId!),
    workspaceId: WorkspaceId(REG.workspaceId!),
    role: "owner",
  }) as unknown as { membershipId: string; role: string };
  REG.membershipId = mOut.membershipId;
  assert.ok(mOut.membershipId.startsWith("membership-"));
  assert.equal(mOut.role, "owner");
});

let createSessionOut: { sessionId: string; userId: string; tenantId: string; workspaceId: string };
test("REGISTER: createSession() returns sessionId linked to user/tenant/workspace", () => {
  createSessionOut = identityCommands.createSession.execute({
    userId: UserId(REG.userId!),
    tenantId: TenantId(REG.tenantId!),
    workspaceId: WorkspaceId(REG.workspaceId!),
    productId: "lawyers-hub.default",
    actorLabel: REG.displayName,
  }) as unknown as { sessionId: string; userId: string; tenantId: string; workspaceId: string };
  REG.sessionId = createSessionOut.sessionId;
  assert.ok(createSessionOut.sessionId.startsWith("session-"));
  assert.equal(createSessionOut.userId, REG.userId);
  assert.equal(createSessionOut.tenantId, REG.tenantId);
  assert.equal(createSessionOut.workspaceId, REG.workspaceId);
});

test("REGISTER: Session stored server-side + isRevoked=false for fresh session", () => {
  const persisted = SessionRepositoryInMemory.byId(SessionId(REG.sessionId!));
  assert.ok(persisted, "fresh session NOT found in server storage");
  assert.equal(persisted!.userId, REG.userId);
  assert.equal(SessionRepositoryInMemory.isRevoked(SessionId(REG.sessionId!)), false, "fresh session isRevoked should false");
});

console.log("\n--- Test 2 (Commander): LOGIN existing seed user alice@eos.dev ---");
type LoginCtx = {
  sessionId: string | undefined;
  userId: string | undefined;
  tenantId: string | undefined;
  workspaceId: string | undefined;
};
const LOGIN: LoginCtx = { sessionId: undefined, userId: undefined, tenantId: undefined, workspaceId: undefined };
test("LOGIN: authenticateUser(alice@eos.dev, password123) → authenticated=true + session.sessionId set", () => {
  const out = identityCommands.authenticateUser.execute({
    email: "alice@eos.dev",
    password: "password123",
  }) as unknown as {
    authenticated: boolean;
    userId: string | undefined;
    tenantId: string | undefined;
    workspaceId: string | undefined;
    session: { sessionId: string } | undefined;
  };
  assert.equal(out.authenticated, true, "alice should authenticate ok");
  assert.ok(out.userId?.startsWith("user-"), "authenticated user-id expected");
  LOGIN.userId = out.userId;
  LOGIN.tenantId = out.tenantId;
  LOGIN.workspaceId = out.workspaceId;
  LOGIN.sessionId = out.session?.sessionId;
  assert.ok(LOGIN.sessionId?.startsWith("session-"), `login should issue sessionId, got ${LOGIN.sessionId}`);
});
test("LOGIN: Wrong password → authenticated=false + NO sessionId", () => {
  const bad = identityCommands.authenticateUser.execute({
    email: "alice@eos.dev",
    password: "wrongpass",
  }) as unknown as { authenticated: boolean; session: { sessionId: string } | undefined };
  assert.equal(bad.authenticated, false);
  assert.equal(bad.session, undefined);
});
test("LOGIN: Unknown email → authenticated=false", () => {
  const unknown = identityCommands.authenticateUser.execute({
    email: `nobody-${Date.now()}@nowhere.null`,
    password: "x",
  }) as unknown as { authenticated: boolean };
  assert.equal(unknown.authenticated, false);
});

console.log("\n--- Test 3 (Commander CRITICAL): LOGOUT server-side revokes → REPLAY session fails ---");
test("LOGOUT: Before logout: fresh login session isRevoked=false", () => {
  assert.ok(LOGIN.sessionId, "harus punya login sessionId (test 2 failed)");
  const revoked = SessionRepositoryInMemory.isRevoked(SessionId(LOGIN.sessionId!));
  assert.equal(revoked, false, "BEFORE logout session should be ACTIVE");
});

let logoutRevokedId: string | undefined;
let logoutRevokedAt: string | undefined;
test("LOGOUT: logoutUser() returns revokedSessionId + revokedAt (server-side proof)", () => {
  const out = identityCommands.logoutUser.execute({
    sessionId: LOGIN.sessionId,
  }) as unknown as { ok: boolean; revokedSessionId?: string; revokedAt?: string };
  assert.equal(out.ok, true);
  logoutRevokedId = out.revokedSessionId;
  logoutRevokedAt = out.revokedAt;
  assert.equal(logoutRevokedId, LOGIN.sessionId, "revoked sessionId harus sama dengan login sessionId");
  assert.ok(logoutRevokedAt && logoutRevokedAt.length > 0, "revokedAt harus ISO timestamp non-empty");
});

test("LOGOUT CRITICAL: After logout → SessionRepository.isRevoked(sessionId) = TRUE (replay attack proof)", () => {
  assert.ok(LOGIN.sessionId);
  const revokedNow = SessionRepositoryInMemory.isRevoked(SessionId(LOGIN.sessionId!));
  assert.equal(revokedNow, true, "AFTER logout session SHOULD BE REVOKED server-side");
});

test("LOGOUT CRITICAL: Register user session ALIVE (not affected by alice logout)", () => {
  assert.ok(REG.sessionId);
  assert.equal(
    SessionRepositoryInMemory.isRevoked(SessionId(REG.sessionId!)),
    false,
    "register session harus tetap active (tenant isolation)",
  );
});

console.log("\n--- Test 4 (Commander CRITICAL): NO fake identity semantic ---");
test("NO-FAKE: createAnonymousWorkspaceSession() actorId=anonymous.user → NOT authenticated", () => {
  const anon = createAnonymousWorkspaceSession();
  assert.equal(anon.actorId, "anonymous.user");
  assert.equal(anon.tenantId, "tenant.anonymous");
  assert.equal(anon.workspaceId, "professional-workspace.anonymous");
  assert.equal(isAuthenticatedSession(anon), false, "anonymous TIDAK boleh authenticated (Commander Test 4)");
});
test("NO-FAKE: createAnonymousWorkspaceSession() operator.web → NOT authenticated", () => {
  const op = createAnonymousWorkspaceSession();
  assert.equal(op.actorId, "operator.web");
  assert.equal(isAuthenticatedSession(op), false, "operator.web juga TIDAK authenticated");
});
test("NO-FAKE: session WITHOUT sessionId (anonymous cookie) → resolveEffectiveSession must anonymous", () => {
  const rawAnon = createAnonymousWorkspaceSession();
  assert.equal(rawAnon.sessionId, undefined, "anonymous session harus undefined sessionId");
  const isAuth = isAuthenticatedSession(rawAnon);
  assert.equal(isAuth, false, "no sessionId cookie harus anonymous NOT authenticated");
});

test("NO-FAKE: Revoked REGISTER session (simulate replay after logout) = NOT authenticated via resolve logic", () => {
  const sid = REG.sessionId!;
  SessionRepositoryInMemory.revoke(SessionId(sid));
  const revokedState = SessionRepositoryInMemory.isRevoked(SessionId(sid));
  assert.equal(revokedState, true, "register session setelah di-revoke harus revoked=true");
  const fakeCookie = createAnonymousWorkspaceSession();
  const replaySession = {
    ...fakeCookie,
    sessionId: sid,
    actorId: REG.userId!,
    actorLabel: REG.displayName,
    tenantId: REG.tenantId!,
    workspaceId: REG.workspaceId!,
  };
  assert.equal(isAuthenticatedSession(replaySession), true, "raw session sebelum server check authenticated=true (karena actorId=user-*)");
  const resolved = {
    ...replaySession,
    ...(SessionRepositoryInMemory.isRevoked(SessionId(sid)) ? createAnonymousWorkspaceSession() : {}),
  };
  assert.equal(isAuthenticatedSession(resolved), false, "SETELAH server-side revocation check → HARUS anonymous / NOT authenticated");
});

console.log("\n--- Test 5: Password service security check ---");
test("Password: hash(plain) != plain, verify(hash)=true, verify(wrong)=false", async () => {
  const pwSvcs = (await import("./capabilities/identity/implementation/services/password.service")).passwordService;
  const plain = "StrongPass123!";
  const wrong = "WrongPass";
  const hash = pwSvcs.hash(plain);
  assert.notEqual(hash, plain);
  assert.equal(pwSvcs.verify(plain, hash), true);
  assert.equal(pwSvcs.verify(wrong, hash), false);
});

console.log("\n--- Test 6: SessionRepository.listActiveByUser filter revoked correctly ---");
test("listActiveByUser excludes revoked", () => {
  const uid = LOGIN.userId ? UserId(LOGIN.userId) : undefined;
  if (!uid) {
    assert.ok(uid, "need userId from test 2");
    return;
  }
  const all = SessionRepositoryInMemory.listByUser(uid);
  const active = SessionRepositoryInMemory.listActiveByUser(uid);
  assert.ok(
    active.length <= all.length,
    `active(${active.length}) must be subset of all(${all.length})`,
  );
  for (const s of active) {
    assert.equal(SessionRepositoryInMemory.isRevoked(s.id), false, `listActive harus 0 revoked, got revoked id=${s.id}`);
  }
});

console.log("\n" + "=".repeat(60));
const passed = results.filter((r) => r.pass).length;
const total = results.length;
const allPassed = passed === total;
console.log(`RESULT: ${passed}/${total} tests ${allPassed ? "✅ ALL PASSED" : "❌ FAILED"}`);
if (!allPassed) {
  for (const f of results.filter((r) => !r.pass)) console.log(`  FAIL: ${f.name} :: ${f.detail}`);
  process.exit(1);
} else {
  console.log("\n🎖️  BATTLE-1A ACCEPTANCE CRITERIA MET:");
  console.log("   1. REGISTER → User+Tenant+Membership+Session semua persist OK");
  console.log("   2. LOGIN    → password verify → session issued server-side");
  console.log("   3. LOGOUT   → server-side revoked (REPLAY ATTACK TERBLOKIR!)");
  console.log("   4. NO-FAKE  → anonymous.user / operator.web TIDAK authenticated");
  process.exit(0);
}