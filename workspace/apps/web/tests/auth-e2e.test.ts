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
  return match ? (match[1] ?? null) : null;
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
  const cookie = `${WORKSPACE_SESSION_COOKIE}=${await encodeWorkspaceSession(userSession)}`;
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
  const decoded = await decodeWorkspaceSession(rawCookie ?? undefined);
  assert.notEqual(decoded, null, "cookie must decode to valid WorkspaceSession");
  assert.equal(decoded!.actorId, body.userId, "cookie actorId matches signup userId");
  assert.equal(decoded!.tenantId, body.tenantId);
  assert.equal(decoded!.workspaceId, body.workspaceId);
  assert.equal(isAuthenticatedSession(decoded), true, "decoded session MUST be authenticated");
});

test("AUTH-E2E signup flow: password < 8 chars → 422 validation error", async () => {
  const resp = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email,
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
      email,
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
      email,
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
  const decoded = await decodeWorkspaceSession(rawCookie ?? undefined);
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
  const decoded = await decodeWorkspaceSession(rawCookie ?? undefined);
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
  const userCookie = `${WORKSPACE_SESSION_COOKIE}=${await encodeWorkspaceSession({
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
});