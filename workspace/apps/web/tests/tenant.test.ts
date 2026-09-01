import assert from "node:assert/strict";
import test from "node:test";
import { POST as signup } from "../app/api/auth/signup/route.js";
import { GET as getWorkspaces } from "../app/api/workspaces/route";
import { GET as getWorkspace } from "../app/api/workspaces/route";
import {
  WORKSPACE_SESSION_COOKIE,
  encodeWorkspaceSession,
} from "../lib/workspace-session.js";
import {
  TenantRepositoryInMemory,
  WorkspaceRepositoryInMemory,
  MembershipRepositoryInMemory,
  UserRepositoryInMemory,
} from "../../../capabilities/identity/implementation/repositories/index.js";
import { capabilityRegistry } from "../lib/capability-command-registry.js";

function jsonRequest<T = unknown>(url: string, body: T): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function authCookie(userId: string, tenantId: string, workspaceId: string): string {
  return `${WORKSPACE_SESSION_COOKIE}=${encodeWorkspaceSession({
    actorId: userId,
    actorLabel: "Auth User",
    tenantId,
    workspaceId,
    productId: "services-id.default",
    issuedAt: new Date().toISOString(),
  })}`;
}

const anonymousCookie = `${WORKSPACE_SESSION_COOKIE}=${encodeWorkspaceSession({
  actorId: "anonymous.user",
  actorLabel: "Anonymous",
  tenantId: "tenant.anonymous",
  workspaceId: "professional-workspace.anonymous",
  productId: "services-id.default",
  issuedAt: new Date().toISOString(),
})}`;

test("TENANT composition: signup → 4 writes persisted in repositories (user/tenant/workspace/membership)", async () => {
  const email = `comp-${Date.now()}@eos.dev`;
  const resp = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email,
      password: "password123",
      displayName: "Composition Owner",
    }),
  );
  assert.equal(resp.status, 201);
  const body = await resp.json();

  const user = await UserRepositoryInMemory.byEmail(email);
  assert.notEqual(user, undefined, "user persisted");
  if (user) {
    assert.equal(user.id, body.userId);
  }

  const tenant = await TenantRepositoryInMemory.byId(body.tenantId);
  assert.notEqual(tenant, undefined, "tenant persisted");
  assert.equal(tenant!.name, body.tenantName);

  const workspace = await WorkspaceRepositoryInMemory.byId(body.workspaceId);
  assert.notEqual(workspace, undefined, "workspace persisted");
  assert.equal(workspace!.tenantId, body.tenantId, "workspace.tenantId references created tenant");
  assert.equal(workspace!.name, "Professional Workspace");

  const membership = await MembershipRepositoryInMemory.byId(body.membershipId);
  assert.notEqual(membership, undefined, "membership persisted");
  assert.equal(membership!.userId, body.userId);
  assert.equal(membership!.tenantId, body.tenantId);
  assert.equal(membership!.workspaceId, body.workspaceId);
  assert.equal(membership!.role, "owner");
});

test("TENANT GET /api/workspaces with valid auth returns workspaces + tenant + roles", async () => {
  const resp = await getWorkspaces(
    new Request("http://localhost/api/workspaces", {
      headers: { cookie: authCookie("user-001", "tenant-001", "workspace-001") },
    }),
  );
  assert.equal(resp.status, 200);
  const body = await resp.json();
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, true);
  assert.equal(body.actorId, "user-001");
  assert.equal(body.tenant.id, "tenant-001");
  assert.equal(body.tenant.name, "Alice Personal");
  assert.ok(Array.isArray(body.workspaces), "tenant includes array of workspaces");
  const ws = body.workspaces.find((w: { id: string }) => w.id === "workspace-001");
  assert.notEqual(ws, undefined, "workspace-001 in tenant's workspace list");
  assert.equal(ws.role, "owner", "alice owns workspace-001 membership");
  assert.equal(ws.productId, "services-id.default");
});

test("TENANT GET /api/workspaces anonymous → 401", async () => {
  const resp = await getWorkspaces(
    new Request("http://localhost/api/workspaces"),
  );
  assert.equal(resp.status, 401);
  const body = await resp.json();
  assert.equal(body.authenticated, false);
  assert.match(body.error, /Authentication required/);
});

test("TENANT GET /api/workspaces with valid auth returns workspace + tenant + membership", async () => {
  const resp = await getWorkspace(
    new Request("http://localhost/api/workspaces", {
      headers: { cookie: authCookie("user-002", "tenant-002", "workspace-002") },
    }),
  );
  assert.equal(resp.status, 200);
  const body = await resp.json();
  assert.equal(body.ok, true);
  assert.equal(body.authenticated, true);
  assert.equal(body.workspace.id, "workspace-002");
  assert.equal(body.workspace.name, "Professional Workspace");
  assert.equal(body.tenant.id, "tenant-002");
  assert.equal(body.tenant.name, "Bob Personal");
  assert.equal(body.membership.role, "owner");
  assert.equal(body.actorId, "user-002");
});

test("TENANT GET /api/workspaces anonymous → 401", async () => {
  const resp = await getWorkspace(
    new Request("http://localhost/api/workspaces"),
  );
  assert.equal(resp.status, 401);
  const body = await resp.json();
  assert.equal(body.authenticated, false);
});

test("TENANT signup slug auto-deduplicate when same displayName+email", async () => {
  const a = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email: `sluga-${Date.now()}@eos.dev`,
      password: "password123",
      displayName: "SameName",
    }),
  );
  const b = await signup(
    jsonRequest("http://localhost/api/auth/signup", {
      email: `slugb-${Date.now()}@eos.dev`,
      password: "password123",
      displayName: "SameName",
    }),
  );
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  const ba = await a.json();
  const bb = await b.json();
  assert.notEqual(ba.tenantSlug, bb.tenantSlug, "two signups with same displayName should have different slugs");
  assert.ok(TenantRepositoryInMemory.bySlug(ba.tenantSlug));
  assert.ok(TenantRepositoryInMemory.bySlug(bb.tenantSlug));
});

test("TENANT registry capabilityRegistry invoke works for identity.* commands (6 keys)", async () => {
  const keys = await capabilityRegistry.listCommandKeys();
  const idKeys = keys.filter((k: any) => k.startsWith("identity."));
  assert.ok(idKeys.length >= 6, `expected >=6 identity keys, got ${idKeys.length}: ${idKeys.join(", ")}`);
  assert.ok(idKeys.includes("identity.registerUser"));
  assert.ok(idKeys.includes("identity.authenticateUser"));
  assert.ok(idKeys.includes("identity.logoutUser"));
  assert.ok(idKeys.includes("identity.createTenant"));
  assert.ok(idKeys.includes("identity.createWorkspace"));
  assert.ok(idKeys.includes("identity.createMembership"));
});

test("TENANT resolveByParts with short aliases resolves correctly", async () => {
  const reg1 = await capabilityRegistry.resolveByParts("auth", "registerUser");
  assert.notEqual(reg1.command, undefined, `auth.registerUser should resolve, attempted: ${reg1.attemptedKeys.join("|")}`);
  const reg2 = await capabilityRegistry.resolveByParts("tenant", "createTenant");
  assert.notEqual(reg2.command, undefined, `tenant.createTenant should resolve, attempted: ${reg2.attemptedKeys.join("|")}`);
  const reg3 = await capabilityRegistry.resolveByParts("ws", "createWorkspace");
  assert.notEqual(reg3.command, undefined, `ws.createWorkspace should resolve, attempted: ${reg3.attemptedKeys.join("|")}`);
});

test("TENANT idempotent membership: createMembership twice for same (user,tenant,workspace) returns same record", async () => {
  interface MembershipInvokeResult {
    output: {
      membershipId: string;
    };
  }
  const first = (await capabilityRegistry.invoke("identity", "createMembership", {
    userId: "user-001",
    tenantId: "tenant-001",
    workspaceId: "workspace-001",
    role: "member",
  })) as unknown as MembershipInvokeResult;
  const second = (await capabilityRegistry.invoke("identity", "createMembership", {
    userId: "user-001",
    tenantId: "tenant-001",
    workspaceId: "workspace-001",
    role: "admin",
  })) as unknown as MembershipInvokeResult;
  assert.equal(first.output.membershipId, second.output.membershipId, "find existing membership instead of duplicate create (idempotent)");
});