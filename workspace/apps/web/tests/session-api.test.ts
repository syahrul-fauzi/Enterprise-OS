import assert from "node:assert/strict";
import test from "node:test";
import { GET as getSession } from "../app/api/session/route";
import {
  WORKSPACE_SESSION_COOKIE,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession,
} from "../lib/workspace-session";

const anonymousCookie = `${WORKSPACE_SESSION_COOKIE}=${encodeWorkspaceSession(
  createAnonymousWorkspaceSession(),
)}`;

test("apps/web session API exposes anonymous actor when no login happened", async () => {
  const response = await getSession(
    new Request("http://localhost/api/session", {
      headers: {
        cookie: anonymousCookie,
        "x-eos-product-id": "lawyershub",
        "x-eos-product-domain": "staging.lawyershub.id",
        "x-forwarded-host": "staging.lawyershub.id",
      },
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-eos-product-id"), "lawyershub");
  assert.equal(response.headers.get("x-eos-product-domain"), "staging.lawyershub.id");
  const payload = await response.json();
  assert.equal(payload.authenticated, false, "anonymous session should NOT be authenticated");
  assert.equal(payload.session.actorId, "anonymous.user");
  assert.equal(payload.session.tenantId, "tenant.anonymous");
  assert.equal(payload.product.productId, "lawyershub");
});

test("apps/web session API bootstraps anonymous session when cookie missing", async () => {
  const response = await getSession(new Request("http://localhost/api/session"));

  assert.equal(response.status, 200);
  assert.match(String(response.headers.get("set-cookie")), /eos-workspace-session=/);
  const payload = await response.json();
  assert.equal(payload.authenticated, false, "no cookie session should NOT be authenticated");
  assert.equal(payload.session.actorId, "anonymous.user");
  assert.equal(payload.session.workspaceId, "professional-workspace.anonymous");
});

test("apps/web session API with seeded user cookie is authenticated", async () => {
  const seededCookie = `${WORKSPACE_SESSION_COOKIE}=${encodeWorkspaceSession({
    actorId: "user-001",
    actorLabel: "Alice Operator",
    tenantId: "tenant-001",
    workspaceId: "workspace-001",
    productId: "services-id.default",
    issuedAt: new Date().toISOString(),
  })}`;
  const response = await getSession(
    new Request("http://localhost/api/session", {
      headers: { cookie: seededCookie },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-eos-actor-id"), "user-001");
  assert.equal(response.headers.get("x-eos-tenant-id"), "tenant-001");
  assert.equal(response.headers.get("x-eos-workspace-id"), "workspace-001");
  const payload = await response.json();
  assert.equal(payload.authenticated, true, "real user (user-001) should be authenticated");
  assert.equal(payload.session.actorId, "user-001");
});