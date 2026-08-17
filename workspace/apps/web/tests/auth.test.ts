import assert from "node:assert/strict";
import test from "node:test";
import { POST as signup } from "../app/api/auth/signup/route.js";
import { POST as login } from "../app/api/auth/login/route.js";
import { POST as logout } from "../app/api/auth/logout/route.js";
import { GET as getSession } from "../app/api/session/route.js";
import {
  WORKSPACE_SESSION_COOKIE,
  encodeWorkspaceSession,
} from "../lib/workspace-session.js";
import { UserRepositoryInMemory } from "../../capabilities/identity/implementation/repositories.js";

function jsonRequest<T = unknown>(url: string, body: T, cookie?: string): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (cookie) headers.cookie = cookie;
  return new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function extractSessionFromSetCookie(setCookie: string | null): { actorId: string; tenantId: string; workspaceId: string } | null {
  if (!setCookie) return null;
  const match = setCookie.match(/eos-workspace-session=([^;]+)/);
  if (!match) return null;
  try {
    const decoded = Buffer.from(match[1], "base64url").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

test("AUTH signup creates user + tenant + workspace + membership (4 entities)", async () => {
  const resp = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email: "new-user-signup@eos.dev",
      password: "password123",
      displayName: "New Signup User",
    }),
  );
  assert.equal(resp.status, 201, `expected 201 got ${resp.status}`);
  const body = await resp.json();
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, true, "signup result should be authenticated");
  assert.ok(body.userId.startsWith("user-"), `userId should be user-*, got ${body.userId}`);
  assert.ok(body.tenantId.startsWith("tenant-"), `tenantId should be tenant-*, got ${body.tenantId}`);
  assert.ok(body.workspaceId.startsWith("workspace-"), `workspaceId should be workspace-*, got ${body.workspaceId}`);
  assert.ok(body.membershipId.startsWith("membership-"), `membershipId should be membership-*, got ${body.membershipId}`);
  assert.equal(body.role, "owner");
  assert.equal(body.tenantName, "New Signup User Personal");
  assert.equal(body.workspaceName, "Professional Workspace");
  assert.ok(body.tenantSlug.includes("new-signup-user"));
  assert.equal(body.records.length, 4);
  body.records.forEach((r: { ok: boolean; commandKey: string }) => {
    assert.equal(r.ok, true, `${r.commandKey} must be ok:true`);
  });

  const sc = extractSessionFromSetCookie(resp.headers.get("set-cookie"));
  assert.notEqual(sc, null, "session cookie must be set on signup");
  assert.equal(sc!.actorId, body.userId, "cookie actorId must match created userId");
  assert.equal(sc!.tenantId, body.tenantId, "cookie tenantId matches new tenant");
  assert.equal(sc!.workspaceId, body.workspaceId, "cookie workspaceId matches new workspace");

  const saved = UserRepositoryInMemory.byEmail("new-user-signup@eos.dev");
  assert.notEqual(saved, undefined);
  assert.equal(saved!.displayName, "New Signup User");
  assert.notEqual(saved!.passwordHash, "password123", "plaintext password NEVER stored");
  assert.ok(saved!.passwordHash.includes("$"), "password hash should contain salt separator");
});

test("AUTH signup duplicate email returns 409", async () => {
  const first = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email: "dup-test@eos.dev",
      password: "password123",
      displayName: "First Dup",
    }),
  );
  assert.equal(first.status, 201);

  const second = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email: "dup-test@eos.dev",
      password: "password1234",
      displayName: "Second Dup",
    }),
  );
  assert.equal(second.status, 409, `duplicate email should be 409 got ${second.status}`);
});

test("AUTH signup short password returns 422", async () => {
  const resp = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email: "short@eos.dev",
      password: "short",
      displayName: "Short Pw",
    }),
  );
  assert.equal(resp.status, 422);
  const body = await resp.json();
  assert.match(body.error, /Validation failed/);
});

test("AUTH signup invalid email format returns 422", async () => {
  const resp = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email: "not-an-email",
      password: "password123",
      displayName: "Invalid",
    }),
  );
  assert.equal(resp.status, 422);
});

test("AUTH login valid credentials returns authenticated session", async () => {
  await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email: "login-user@eos.dev",
      password: "mypassword",
      displayName: "Login User",
    }),
  );

  const resp = await login(
    jsonRequest("http://localhost/api/auth/login", {
      email: "login-user@eos.dev",
      password: "mypassword",
    }),
  );
  assert.equal(resp.status, 200);
  const body = await resp.json();
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, true);
  assert.ok(body.actorId.startsWith("user-"));
  assert.equal(body.role, "owner");
  assert.ok(body.tenantName.endsWith("Personal"));
  assert.equal(body.workspaceName, "Professional Workspace");

  const sc = extractSessionFromSetCookie(resp.headers.get("set-cookie"));
  assert.notEqual(sc, null);
  assert.equal(sc!.actorId, body.actorId);
});

test("AUTH login wrong password returns 401 and anonymous session", async () => {
  const resp = await login(
    jsonRequest("http://localhost/api/auth/login", {
      email: "alice@eos.dev",
      password: "WRONGPASSWORD",
    }),
  );
  assert.equal(resp.status, 401);
  const body = await resp.json();
  assert.equal(body.authenticated, false);
  assert.equal(body.ok, false);
  assert.match(body.error, /Invalid email or password/);

  const sc = extractSessionFromSetCookie(resp.headers.get("set-cookie"));
  assert.notEqual(sc, null);
  assert.equal(sc!.actorId, "anonymous.user", "failed login cookie should be anonymous");
});

test("AUTH login unknown user returns 401", async () => {
  const resp = await login(
    jsonRequest("http://localhost/api/auth/login", {
      email: "nobody-exists@eos.dev",
      password: "password123",
    }),
  );
  assert.equal(resp.status, 401);
  const body = await resp.json();
  assert.equal(body.authenticated, false);
});

test("AUTH logout clears session (cookie expired + anonymous)", async () => {
  const loginSessionCookie = `${WORKSPACE_SESSION_COOKIE}=${encodeWorkspaceSession({
    actorId: "user-002",
    actorLabel: "Bob",
    tenantId: "tenant-002",
    workspaceId: "workspace-002",
    productId: "lawyershub.default",
    issuedAt: new Date().toISOString(),
  })}`;

  const resp = await logout(
    new Request("http://localhost/api/auth/logout", {
      method: "POST",
      headers: { cookie: loginSessionCookie },
    }),
  );
  assert.equal(resp.status, 200);
  const body = await resp.json();
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, false);
  assert.equal(body.record.ok, true);
  assert.equal(body.record.commandKey, "identity.logoutUser");

  const setCookie = String(resp.headers.get("set-cookie"));
  assert.match(setCookie, /eos-workspace-session=/);
  assert.match(setCookie, /Expires=Thu, 01 Jan 1970/);
});

test("AUTH integration signup → login → session check → logout → session anonymous", async () => {
  const email = `flow-${Date.now()}@eos.dev`;
  const up = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email,
      password: "password123",
      displayName: "Flow User",
    }),
  );
  assert.equal(up.status, 201);
  const signupBody = await up.json();
  const sc1 = String(up.headers.get("set-cookie"));
  assert.match(sc1, /eos-workspace-session=/);

  const signupSessionCookie = `${WORKSPACE_SESSION_COOKIE}=${encodeWorkspaceSession({
    actorId: signupBody.userId,
    actorLabel: "Flow User",
    tenantId: signupBody.tenantId,
    workspaceId: signupBody.workspaceId,
    productId: signupBody.productId,
    issuedAt: new Date().toISOString(),
  })}`;

  const sessAfterSignup = await getSession(
    new Request("http://localhost/api/session", {
      headers: { cookie: signupSessionCookie },
    }),
  );
  const sAfter = await sessAfterSignup.json();
  assert.equal(sAfter.authenticated, true, "after signup session is authenticated");
  assert.equal(sAfter.session.actorId, signupBody.userId);

  const loginResp = await login(
    jsonRequest("http://localhost/api/auth/login", {
      email,
      password: "password123",
    }),
  );
  assert.equal(loginResp.status, 200);

  const logoutResp = await logout(
    new Request("http://localhost/api/auth/logout", {
      method: "POST",
      headers: { cookie: signupSessionCookie },
    }),
  );
  assert.equal(logoutResp.status, 200);
});

test("AUTH password verify: same password different signup → different hashes (salt random)", async () => {
  const u1 = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email: `salt-test-1-${Date.now()}@eos.dev`,
      password: "samePassword123!",
      displayName: "Salt A",
    }),
  );
  const u2 = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email: `salt-test-2-${Date.now()}@eos.dev`,
      password: "samePassword123!",
      displayName: "Salt B",
    }),
  );
  assert.equal(u1.status, 201);
  assert.equal(u2.status, 201);
  const b1 = await u1.json();
  const b2 = await u2.json();
  const record1 = UserRepositoryInMemory.byEmail(b1.email)!;
  const record2 = UserRepositoryInMemory.byEmail(b2.email)!;
  assert.notEqual(record1.passwordHash, record2.passwordHash, "two users same password MUST have different hashes due to random salt");
});

test("AUTH BATTLE-1A CRITICAL: signup issues sessionId → session check valid → logout revokes server-side → REPLAY cookie = NOT authenticated", async () => {
  const email = `replay-test-${Date.now()}@eos.dev`;
  const up = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email,
      password: "replayTest123!",
      displayName: "Replay Test User",
    }),
  );
  assert.equal(up.status, 201, "signup must be 201");
  const signupBody = await up.json();
  assert.equal(signupBody.authenticated, true, "signup must be authenticated");
  assert.ok(signupBody.sessionId, "signup response MUST contain sessionId (server-side persistent session)");
  assert.ok(signupBody.sessionId.startsWith("session-"), `sessionId must start with session-*, got ${signupBody.sessionId}`);

  const signupRawCookie = extractCookieValue(String(up.headers.get("set-cookie")), WORKSPACE_SESSION_COOKIE);
  assert.notEqual(signupRawCookie, null, "session cookie MUST be issued");
  const decodedSignup = decodeWorkspaceSessionSafe(signupRawCookie ?? undefined);
  assert.notEqual(decodedSignup, null, "signup cookie must decode to WorkspaceSession");
  assert.equal(decodedSignup!.sessionId, signupBody.sessionId, "cookie sessionId MUST match response sessionId");

  const sessionCookieHeader = `${WORKSPACE_SESSION_COOKIE}=${signupRawCookie!}`;

  const sess1 = await getSession(
    new Request("http://localhost/api/session", { headers: { cookie: sessionCookieHeader } }),
  );
  assert.equal(sess1.status, 200);
  const sess1Body = await sess1.json();
  assert.equal(sess1Body.authenticated, true, "BEFORE logout: session must be authenticated with valid sessionId");
  assert.equal(sess1Body.session.sessionId, signupBody.sessionId, "session.sessionId must match");

  const logoutResp = await logout(
    new Request("http://localhost/api/auth/logout", {
      method: "POST",
      headers: { cookie: sessionCookieHeader },
    }),
  );
  assert.equal(logoutResp.status, 200);
  const logoutBody = await logoutResp.json();
  assert.equal(logoutBody.authenticated, false, "logout response must be authenticated:false");
  assert.equal(logoutBody.revokedSessionId, signupBody.sessionId, "logout MUST revoke the exact sessionId from cookie");
  assert.ok(logoutBody.revokedAt, "logout MUST return revokedAt timestamp from server-side revocation");

  // CRITICAL PROOF: REPLAY the ORIGINAL session cookie (from BEFORE logout, still intact).
  // Before BATTLE-1A, this would still be authenticated=true (cookie-only check, no server-side revoke).
  // After BATTLE-1A: sessionId is revoked server-side → this must be ANONYMOUS / NOT authenticated.
  const replayResp = await getSession(
    new Request("http://localhost/api/session", { headers: { cookie: sessionCookieHeader } }),
  );
  assert.equal(replayResp.status, 200);
  const replayBody = await replayResp.json();
  assert.equal(
    replayBody.authenticated,
    false,
    "AFTER logout: REPLAY of original session cookie must be NOT authenticated (sessionId revoked server-side — Commander Test 3)",
  );
  assert.equal(
    replayBody.session.actorId,
    "anonymous.user",
    "AFTER logout: REPLAY session must become anonymous.user (fallback to anonymous when sessionId revoked)",
  );
  assert.notEqual(
    replayBody.session.sessionId,
    signupBody.sessionId,
    "AFTER logout: returned session MUST no longer contain the revoked sessionId",
  );
});

test("AUTH BATTLE-1A: login creates persistent sessionId → logout revokes → replay fails", async () => {
  const loginResp = await login(
    jsonRequest("http://localhost/api/auth/login", {
      email: "alice@eos.dev",
      password: "password123",
    }),
  );
  assert.equal(loginResp.status, 200, "alice seeded login must succeed");
  const lb = await loginResp.json();
  assert.equal(lb.authenticated, true);
  assert.ok(lb.sessionId, "login response MUST include persistent sessionId");
  assert.ok(lb.expiresAt, "login response MUST include expiresAt from server-side session");

  const loginCookieRaw = extractCookieValue(String(loginResp.headers.get("set-cookie")), WORKSPACE_SESSION_COOKIE);
  assert.notEqual(loginCookieRaw, null, "login must set session cookie");
  const decodedLogin = decodeWorkspaceSessionSafe(loginCookieRaw ?? undefined);
  assert.equal(decodedLogin!.sessionId, lb.sessionId, "cookie sessionId must match login response sessionId");

  const loginCookieHeader = `${WORKSPACE_SESSION_COOKIE}=${loginCookieRaw!}`;

  const sessionBefore = await getSession(
    new Request("http://localhost/api/session", { headers: { cookie: loginCookieHeader } }),
  );
  const sbb = await sessionBefore.json();
  assert.equal(sbb.authenticated, true, "session before logout must be authenticated=true");

  const lo = await logout(
    new Request("http://localhost/api/auth/logout", { method: "POST", headers: { cookie: loginCookieHeader } }),
  );
  assert.equal(lo.status, 200);
  const loBody = await lo.json();
  assert.equal(loBody.revokedSessionId, lb.sessionId, "logout must revoke sessionId from login cookie");

  const replayAfter = await getSession(
    new Request("http://localhost/api/session", { headers: { cookie: loginCookieHeader } }),
  );
  const raBody = await replayAfter.json();
  assert.equal(
    raBody.authenticated,
    false,
    "Login-created session: after logout, replay MUST fail authenticated=false",
  );
  assert.equal(raBody.session.actorId, "anonymous.user");
});

test("AUTH BATTLE-1A: No cookie → NO fake/default identity → anonymous / authenticated=false", async () => {
  const resp = await getSession(new Request("http://localhost/api/session"));
  assert.equal(resp.status, 200);
  const body = await resp.json();
  assert.equal(
    body.authenticated,
    false,
    "Commander Test 4: no cookie → NO fake identity → authenticated=false",
  );
  assert.equal(
    body.session.actorId,
    "anonymous.user",
    "Commander Test 4: no cookie → MUST be anonymous.user (not operator.web / default / user-*)",
  );
  assert.equal(
    body.session.tenantId,
    "tenant.anonymous",
    "no cookie → tenant MUST be tenant.anonymous",
  );
  assert.equal(
    body.session.workspaceId,
    "professional-workspace.anonymous",
    "no cookie → workspace MUST be professional-workspace.anonymous",
  );
  assert.equal(
    Object.hasOwn(body.session, "sessionId"),
    false,
    "anonymous session MUST NOT contain sessionId (never persisted)",
  );
});

function decodeWorkspaceSessionSafe(raw: string | undefined): ReturnType<typeof JSON.parse> | null {
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function extractCookieValue(setCookie: string | null, name: string): string | null {
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}
