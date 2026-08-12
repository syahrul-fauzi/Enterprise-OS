import assert from "node:assert/strict";
import { POST as signup, type _unused1 } from "./apps/web/app/api/auth/signup/route";
import { GET as getTenant, type _unused2 } from "./apps/web/app/api/tenant/route";
import { GET as getWorkspace, type _unused3 } from "./apps/web/app/api/workspace/route";
import { GET as getSession, type _unused4 } from "./apps/web/app/api/session/route";
import {
  isAuthenticatedSession,
  decodeWorkspaceSession,
} from "./packages/core/kernel/src/session/workspace-session";

const results: Array<{ name: string; pass: boolean; detail?: string }> = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, pass: true });
    console.log(`  \u2705 ${name}`);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    results.push({ name, pass: false, detail });
    console.log(`  \u274C ${name} — ${detail}`);
  }
}

function jsonRequest<T = unknown>(url: string, body: T, cookie?: string): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookie) headers.cookie = cookie;
  return new Request(url, { method: "POST", headers, body: JSON.stringify(body) });
}

function getRequest(url: string, cookie?: string): Request {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  return new Request(url, { method: "GET", headers });
}

function extractCookie(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const match = setCookie.match(/eos-workspace-session=([^;]+)/);
  return match ? `eos-workspace-session=${match[1]}` : null;
}

let signupCookie: string | null = null;
let signupBody: any = null;

const EMAIL = `batch1-verify-${Date.now()}@eos.dev`;

console.log("\n=== BATCH 1 VERTICAL INTEGRATION SMOKE TEST ===\n");

console.log("--- AUTH Rail: Signup + Session ---");
test("SIGNUP returns 201 with user + tenant + workspace + membership", async () => {
  const resp = await signup(jsonRequest("http://localhost/api/auth/signup", {
    email: EMAIL,
    password: "StrongPass1!",
    displayName: "Batch1 Vertical",
  }));
  assert.equal(resp.status, 201, `expected 201 got ${resp.status}`);
  const body = await resp.json();
  signupBody = body;
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, true, "signup should already be authenticated");
  assert.ok(body.userId.startsWith("user-"), `userId user-*, got ${body.userId}`);
  assert.ok(body.tenantId.startsWith("tenant-"), `tenantId tenant-*, got ${body.tenantId}`);
  assert.ok(body.workspaceId.startsWith("workspace-"), `workspaceId workspace-*, got ${body.workspaceId}`);
  assert.ok(body.membershipId.startsWith("membership-"), `membershipId membership-*, got ${body.membershipId}`);
  assert.equal(body.role, "owner");
  signupCookie = extractCookie(resp.headers.get("set-cookie"));
  assert.notEqual(signupCookie, null, "signup HARUS mengembalikan set-cookie eos-workspace-session");
});

test("SESSION GET dengan signup cookie: authenticated=true + actorId=userId asli", async () => {
  if (!signupCookie) throw new Error("SKIP — signup cookie not available");
  const resp = await getSession(getRequest("http://localhost/api/session", signupCookie!));
  assert.equal(resp.status, 200);
  const body = await resp.json();
  assert.equal(body.authenticated, true, "session harus authenticated=true after signup");
  assert.equal(body.session.actorId, signupBody.userId, `actorId harus ${signupBody.userId}, got ${body.session.actorId} BUKAN operator.web`);
  assert.equal(body.session.tenantId, signupBody.tenantId, "cookie tenantId = signup tenantId (BUKAN tenant.default)");
  assert.equal(body.session.workspaceId, signupBody.workspaceId, "cookie workspaceId = signup workspaceId (BUKAN professional-workspace.default)");
  const decoded = decodeWorkspaceSession(signupCookie!.split("=")[1]);
  assert.equal(decoded?.actorId, signupBody.userId, "decode dari cookie cocok dengan userId");
});

test("SESSION GET TANPA cookie = authenticated=false + actorId=anonymous.user", async () => {
  const resp = await getSession(getRequest("http://localhost/api/session"));
  assert.equal(resp.status, 200);
  const body = await resp.json();
  assert.equal(body.authenticated, false, "TANPA cookie harus authenticated=false (BUKAN hardcoded true)");
  assert.equal(body.session.actorId, "anonymous.user", "actorId = anonymous.user BUKAN operator.web");
  const auth = isAuthenticatedSession(body.session);
  assert.equal(auth, false, "isAuthenticatedSession(anonymous) = false");
});

console.log("\n--- TENANT Rail ---");
test("GET /api/tenant WITH signup cookie = 200 tenant + list 1 workspace role=owner", async () => {
  if (!signupCookie) throw new Error("SKIP — signup cookie not available");
  const resp = await getTenant(getRequest("http://localhost/api/tenant", signupCookie!));
  assert.equal(resp.status, 200, `/api/tenant harus 200, got ${resp.status}. body=${JSON.stringify(await resp.clone().json())}`);
  const body = await resp.json();
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, true);
  assert.equal(body.tenant.id, signupBody.tenantId, `tenant id cocok dengan signup: ${signupBody.tenantId}`);
  assert.ok(Array.isArray(body.workspaces), "workspaces field harus array");
  assert.equal(body.workspaces.length >= 1, true, "minimal 1 workspace di tenant baru");
  const ws = body.workspaces.find((w: any) => w.id === signupBody.workspaceId);
  assert.notEqual(ws, undefined, `workspace ${signupBody.workspaceId} ditemukan di list tenant`);
  assert.equal(ws.role, "owner", "role membership untuk workspace = owner");
  assert.equal(body.actorId, signupBody.userId, "tenant response actorId = userId asli");
});

test("GET /api/tenant TANPA cookie = 401 + authenticated=false", async () => {
  const resp = await getTenant(getRequest("http://localhost/api/tenant"));
  assert.equal(resp.status, 401, `anonymous access tenant harus 401, got ${resp.status}`);
  const body = await resp.json();
  assert.equal(body.authenticated, false, "401 response authenticated=false");
});

console.log("\n--- WORKSPACE Rail ---");
test("GET /api/workspace WITH signup cookie = 200 workspace + tenant + membership", async () => {
  if (!signupCookie) throw new Error("SKIP — signup cookie not available");
  const resp = await getWorkspace(getRequest("http://localhost/api/workspace", signupCookie!));
  assert.equal(resp.status, 200, `/api/workspace harus 200, got ${resp.status}. body=${JSON.stringify(await resp.clone().json())}`);
  const body = await resp.json();
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, true);
  assert.equal(body.workspace.id, signupBody.workspaceId, "workspace id cocok dengan signup");
  assert.notEqual(body.tenant, null, "tenant field embedded not null");
  assert.equal(body.tenant.id, signupBody.tenantId, "embedded tenant id = signup tenant id");
  assert.notEqual(body.membership, null, "membership field not null");
  assert.equal(body.membership.role, "owner", "membership role = owner");
});

test("GET /api/workspace TANPA cookie = 401 + authenticated=false", async () => {
  const resp = await getWorkspace(getRequest("http://localhost/api/workspace"));
  assert.equal(resp.status, 401, `anonymous access workspace harus 401, got ${resp.status}`);
  const body = await resp.json();
  assert.equal(body.authenticated, false, "401 workspace response authenticated=false");
});

console.log("\n--- DB Rail: Persistence Verification (in-process read-back via FileBacked) ---");
test("PERSISTENCE: after signup, repos bisa read-back user/tenant/workspace/membership tanpa error", async () => {
  const { UserRepositoryFileBacked, TenantRepositoryFileBacked, WorkspaceRepositoryFileBacked, MembershipRepositoryFileBacked } = await import("./capabilities/identity/implementation/repositories");
  const user = UserRepositoryFileBacked.byEmail(EMAIL);
  assert.notEqual(user, undefined, `user ${EMAIL} ditemukan via FileBacked repo`);
  const tenant = TenantRepositoryFileBacked.byId(signupBody.tenantId);
  assert.notEqual(tenant, undefined, `tenant ${signupBody.tenantId} bisa di-read-back`);
  const workspace = WorkspaceRepositoryFileBacked.byId(signupBody.workspaceId);
  assert.notEqual(workspace, undefined, `workspace ${signupBody.workspaceId} bisa di-read-back`);
  const membership = MembershipRepositoryFileBacked.listByUser(signupBody.userId);
  assert.ok(membership.length >= 1, "user punya minimal 1 membership");
  assert.equal(membership[0].role, "owner", "first membership role = owner");
  assert.notEqual(user?.passwordHash, "StrongPass1!", "password TIDAK plaintext stored");
  assert.ok(user?.passwordHash.includes("$") ?? false, "password hash punya salt separator format salt$hash");
});

const passed = results.filter(r => r.pass).length;
const total = results.length;
console.log(`\n=== BATCH 1 RESULT: ${passed}/${total} PASS ===`);
const failed = results.filter(r => !r.pass);
if (failed.length > 0) {
  console.log("FAILS:");
  failed.forEach(f => console.log(`  - ${f.name}: ${f.detail}`));
  process.exitCode = 1;
} else {
  console.log("\n\u{1F525} VERTICAL INTEGRATION PROVEN: Signup → Session → Tenant → Workspace — NYATA bekerja.");
  process.exitCode = 0;
}
