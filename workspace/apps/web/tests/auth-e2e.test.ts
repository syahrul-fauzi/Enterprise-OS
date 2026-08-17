import assert from "node:assert/strict";
import test from "node:test";
import { POST as signup } from "../app/api/auth/signup/route.js";
import { POST as login } from "../app/api/auth/login/route.js";
import { POST as logout } from "../app/api/auth/logout/route.js";
import { GET as getSession } from "../app/api/session/route.js";
import {
  WORKSPACE_SESSION_COOKIE,
  encodeWorkspaceSession,
  decodeWorkspaceSession,
  isAuthenticatedSession,
  createAnonymousWorkspaceSession,
} from "../lib/workspace-session.js";

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

function getRequest(url: string, cookie?: string): Request {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  return new Request(url, { method: "GET", headers });
}

function extractCookieValue(setCookie: string | null, name: string): string | null {
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

test("AUTH-E2E home session check: anonymous user → authenticated=false", async () => {
  const resp = await getSession(getRequest("http://localhost/api/session"));
  assert.equal(resp.status, 200);
  const body = await resp.json();
  assert.equal(body.authenticated, false, "fresh visitor should NOT be authenticated");
  assert.equal(body.session.actorId, "anonymous.user");
  assert.equal(isAuthenticatedSession(body.session), false);
});

test("AUTH-E2E home session check: user-* session → authenticated=true with user actorId", async () => {
  const userSession = {
    actorId: "user-abc123",
    actorLabel: "E2E Test User",
    tenantId: "tenant-xyz",
    workspaceId: "workspace-xyz",
    productId: "services-id.default",
    issuedAt: new Date().toISOString(),
  };
  const cookie = `${WORKSPACE_SESSION_COOKIE}=${encodeWorkspaceSession(userSession)}`;
  const resp = await getSession(getRequest("http://localhost/api/session", cookie));
  assert.equal(resp.status, 200);
  const body = await resp.json();
  assert.equal(body.authenticated, true, "user-* actorId MUST be authenticated");
  assert.equal(body.session.actorId, "user-abc123");
  assert.equal(body.session.actorLabel, "E2E Test User");
  assert.equal(isAuthenticatedSession(body.session), true);
  assert.ok(body.session.actorId.startsWith("user-"), "actorId must start with user- prefix");
});

test("AUTH-E2E signup flow: valid payload → 201 + session cookie + authenticated=true", async () => {
  const email = `e2e-signup-${Date.now()}@eos.dev`;
  const resp = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email,
      password: "password123",
      displayName: "E2E Signup User",
    }),
  );
  assert.equal(resp.status, 201, `signup should return 201, got ${resp.status}`);
  const body = await resp.json();
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, true, "signup result must report authenticated=true");
  assert.ok(body.userId.startsWith("user-"), "userId must start with user-");
  assert.ok(body.actorId.startsWith("user-"), "actorId must start with user- (matches UI check)");
  assert.equal(body.actorLabel, "E2E Signup User");
  assert.equal(body.role, "owner");
  assert.ok(body.tenantId.startsWith("tenant-"));
  assert.ok(body.workspaceId.startsWith("workspace-"));

  const rawCookie = extractCookieValue(
    String(resp.headers.get("set-cookie")),
    WORKSPACE_SESSION_COOKIE,
  );
  assert.notEqual(rawCookie, null, "session cookie MUST be set after signup");
  const decoded = decodeWorkspaceSession(rawCookie ?? undefined);
  assert.notEqual(decoded, null, "cookie must decode to valid WorkspaceSession");
  assert.equal(decoded!.actorId, body.userId, "cookie actorId matches signup userId");
  assert.equal(decoded!.tenantId, body.tenantId);
  assert.equal(decoded!.workspaceId, body.workspaceId);
  assert.equal(isAuthenticatedSession(decoded), true, "decoded session MUST be authenticated");
});

test("AUTH-E2E signup flow: password < 8 chars → 422 validation error", async () => {
  const resp = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email: "shortpw@eos.dev",
      password: "seven77",
      displayName: "Short",
    }),
  );
  assert.equal(resp.status, 422);
  const body = await resp.json();
  assert.match(body.error, /Validation failed/);
  assert.match(body.error, /password/);
});

test("AUTH-E2E signup flow: missing displayName → 422 validation error", async () => {
  const resp = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email: "noname@eos.dev",
      password: "password123",
      displayName: "",
    }),
  );
  assert.equal(resp.status, 422);
  const body = await resp.json();
  assert.match(body.error, /Validation failed/);
});

test("AUTH-E2E signup flow: invalid email → 422 validation error", async () => {
  const resp = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email: "not-email-format",
      password: "password123",
      displayName: "Bad Email",
    }),
  );
  assert.equal(resp.status, 422);
  const body = await resp.json();
  assert.match(body.error, /Validation failed/);
});

test("AUTH-E2E signup flow: duplicate email → 409 conflict", async () => {
  const email = `e2e-dup-${Date.now()}@eos.dev`;
  const first = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email,
      password: "password123",
      displayName: "First",
    }),
  );
  assert.equal(first.status, 201);

  const second = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email,
      password: "password1234",
      displayName: "Second",
    }),
  );
  assert.equal(second.status, 409, "duplicate email MUST return 409");
});

test("AUTH-E2E login flow: seeded alice → 200 + authenticated cookie", async () => {
  const resp = await login(
    jsonRequest("http://localhost/api/auth/login", {
      email: "alice@eos.dev",
      password: "password123",
    }),
  );
  assert.equal(resp.status, 200, `alice login should be 200, got ${resp.status}`);
  const body = await resp.json();
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, true);
  assert.ok(body.actorId.startsWith("user-"), "alice actorId must start with user-");

  const rawCookie = extractCookieValue(
    String(resp.headers.get("set-cookie")),
    WORKSPACE_SESSION_COOKIE,
  );
  assert.notEqual(rawCookie, null, "cookie must be set after login");
  const decoded = decodeWorkspaceSession(rawCookie ?? undefined);
  assert.notEqual(decoded, null);
  assert.ok(decoded!.actorId.startsWith("user-"), "decoded login cookie actorId must be user-*");
  assert.equal(isAuthenticatedSession(decoded), true, "decoded session from cookie must be authenticated");
});

test("AUTH-E2E login flow: seeded bob → 200 + authenticated cookie", async () => {
  const resp = await login(
    jsonRequest("http://localhost/api/auth/login", {
      email: "bob@eos.dev",
      password: "password123",
    }),
  );
  assert.equal(resp.status, 200);
  const body = await resp.json();
  assert.equal(body.authenticated, true);
  assert.ok(body.actorId.startsWith("user-"));
});

test("AUTH-E2E login flow: wrong password → 401 + anonymous session cookie", async () => {
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

  const rawCookie = extractCookieValue(
    String(resp.headers.get("set-cookie")),
    WORKSPACE_SESSION_COOKIE,
  );
  assert.notEqual(rawCookie, null);
  const decoded = decodeWorkspaceSession(rawCookie ?? undefined);
  assert.notEqual(decoded, null);
  assert.equal(decoded!.actorId, "anonymous.user", "failed login cookie must be anonymous");
  assert.equal(isAuthenticatedSession(decoded), false);
});

test("AUTH-E2E login flow: unknown user → 401", async () => {
  const resp = await login(
    jsonRequest("http://localhost/api/auth/login", {
      email: `ghost-${Date.now()}@eos.dev`,
      password: "password123",
    }),
  );
  assert.equal(resp.status, 401);
  const body = await resp.json();
  assert.equal(body.authenticated, false);
});

test("AUTH-E2E logout flow: authenticated session → anonymous + expired cookie", async () => {
  const userCookie = `${WORKSPACE_SESSION_COOKIE}=${encodeWorkspaceSession({
    actorId: "user-e2e-logout",
    actorLabel: "Logout Test User",
    tenantId: "tenant-e2e",
    workspaceId: "workspace-e2e",
    productId: "services-id.default",
    issuedAt: new Date().toISOString(),
  })}`;

  const resp = await logout(
    new Request("http://localhost/api/auth/logout", {
      method: "POST",
      headers: { cookie: userCookie },
    }),
  );
  assert.equal(resp.status, 200);
  const body = await resp.json();
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, false);

  const setCookie = String(resp.headers.get("set-cookie"));
  assert.match(setCookie, /eos-workspace-session=/);
  assert.match(setCookie, /Expires=Thu, 01 Jan 1970/, "logout must expire cookie");
  assert.match(setCookie, /Max-Age=0/, "logout must set Max-Age=0");
});

test("AUTH-E2E full roundtrip: signup → session check → logout → session anonymous", async () => {
  const email = `e2e-roundtrip-${Date.now()}@eos.dev`;

  const signupResp = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email,
      password: "password123",
      displayName: "Roundtrip User",
    }),
  );
  assert.equal(signupResp.status, 201);
  const signupBody = await signupResp.json();
  assert.equal(signupBody.authenticated, true);
  const signupRawCookie = extractCookieValue(
    String(signupResp.headers.get("set-cookie")),
    WORKSPACE_SESSION_COOKIE,
  );
  assert.notEqual(signupRawCookie, null);
  const signupCookieHeader = `${WORKSPACE_SESSION_COOKIE}=${signupRawCookie!}`;

  const sessionAfterSignup = await getSession(
    getRequest("http://localhost/api/session", signupCookieHeader),
  );
  assert.equal(sessionAfterSignup.status, 200);
  const sess1 = await sessionAfterSignup.json();
  assert.equal(sess1.authenticated, true, "session MUST be authenticated after signup");
  assert.equal(sess1.session.actorId, signupBody.userId);
  assert.ok(sess1.session.actorId.startsWith("user-"));

  const logoutResp = await logout(
    new Request("http://localhost/api/auth/logout", {
      method: "POST",
      headers: { cookie: signupCookieHeader },
    }),
  );
  assert.equal(logoutResp.status, 200);

  const sessionAfterLogout = await getSession(
    getRequest("http://localhost/api/session"),
  );
  assert.equal(sessionAfterLogout.status, 200);
  const sess2 = await sessionAfterLogout.json();
  assert.equal(sess2.authenticated, false, "after logout, fresh session must NOT be authenticated");
  assert.equal(sess2.session.actorId, "anonymous.user");
});

test("AUTH-E2E full roundtrip: login(alice) → session check → logout → anonymous", async () => {
  const loginResp = await login(
    jsonRequest("http://localhost/api/auth/login", {
      email: "alice@eos.dev",
      password: "password123",
    }),
  );
  assert.equal(loginResp.status, 200);
  const loginBody = await loginResp.json();
  assert.equal(loginBody.authenticated, true);
  const loginRawCookie = extractCookieValue(
    String(loginResp.headers.get("set-cookie")),
    WORKSPACE_SESSION_COOKIE,
  );
  assert.notEqual(loginRawCookie, null);
  const loginCookieHeader = `${WORKSPACE_SESSION_COOKIE}=${loginRawCookie!}`;

  const sessionResp = await getSession(
    getRequest("http://localhost/api/session", loginCookieHeader),
  );
  const sess = await sessionResp.json();
  assert.equal(sess.authenticated, true, "after login session MUST be authenticated");
  assert.equal(sess.session.actorId, loginBody.actorId);
  assert.ok(sess.session.actorId.startsWith("user-"), "alice session actorId must start with user-");
  assert.equal(isAuthenticatedSession(sess.session), true);

  const logoutResp = await logout(
    new Request("http://localhost/api/auth/logout", {
      method: "POST",
      headers: { cookie: loginCookieHeader },
    }),
  );
  assert.equal(logoutResp.status, 200);
  const logoutBody = await logoutResp.json();
  assert.equal(logoutBody.authenticated, false);
});

test("AUTH-E2E isAuthenticatedSession: edge cases match UI logic", () => {
  assert.equal(
    isAuthenticatedSession(null),
    false,
    "null session → NOT authenticated (UI will show signup/login)",
  );
  assert.equal(
    isAuthenticatedSession(undefined),
    false,
    "undefined session → NOT authenticated",
  );
  assert.equal(
    isAuthenticatedSession(createAnonymousWorkspaceSession()),
    false,
    "anonymous.user → NOT authenticated",
  );
  assert.equal(
    isAuthenticatedSession({
      actorId: "operator.web",
      actorLabel: "Operator",
      tenantId: "tenant.default",
      workspaceId: "ws.default",
      productId: "default",
      issuedAt: new Date().toISOString(),
    }),
    false,
    "operator.web legacy → NOT authenticated",
  );
  assert.equal(
    isAuthenticatedSession({
      actorId: "user-001",
      actorLabel: "Alice",
      tenantId: "tenant-001",
      workspaceId: "workspace-001",
      productId: "default",
      issuedAt: new Date().toISOString(),
    }),
    true,
    "user-* prefix → AUTHENTICATED (UI will show workspace CTA)",
  );
  assert.equal(
    isAuthenticatedSession({
      actorId: "user-custom-uuid-12345",
      actorLabel: "Custom",
      tenantId: "tenant-x",
      workspaceId: "workspace-x",
      productId: "default",
      issuedAt: new Date().toISOString(),
    }),
    true,
    "any user-* prefix variant must be authenticated",
  );
  assert.equal(
    isAuthenticatedSession({
      actorId: "bot-user-001",
      actorLabel: "Bot",
      tenantId: "tenant-x",
      workspaceId: "workspace-x",
      productId: "default",
      issuedAt: new Date().toISOString(),
    }),
    false,
    "bot-user-* does NOT start with user- → must NOT be authenticated",
  );
});
