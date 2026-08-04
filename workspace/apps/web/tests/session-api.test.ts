import assert from "node:assert/strict";
import test from "node:test";
import { GET as getSession } from "../app/api/session/route";
import {
  WORKSPACE_SESSION_COOKIE,
  createDefaultWorkspaceSession,
  encodeWorkspaceSession,
} from "../lib/workspace-session";

const sessionCookie = `${WORKSPACE_SESSION_COOKIE}=${encodeWorkspaceSession(
  createDefaultWorkspaceSession(),
)}`;

test("apps/web session API exposes actor tenant and workspace context", async () => {
  const response = await getSession(
    new Request("http://localhost/api/session", {
      headers: {
        cookie: sessionCookie,
        "x-eos-product-id": "lawyershub",
        "x-eos-product-domain": "staging.lawyershub.id",
        "x-forwarded-host": "staging.lawyershub.id",
      },
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-eos-tenant-id"), "tenant.default");
  assert.equal(response.headers.get("x-eos-workspace-id"), "professional-workspace.default");
  assert.equal(response.headers.get("x-eos-product-id"), "lawyershub");
  assert.equal(response.headers.get("x-eos-product-domain"), "staging.lawyershub.id");
  const payload = await response.json();
  assert.equal(payload.authenticated, true);
  assert.equal(payload.session.actorId, "operator.web");
  assert.equal(payload.session.tenantId, "tenant.default");
  assert.equal(payload.product.productId, "lawyershub");
  assert.equal(payload.product.productDomain, "staging.lawyershub.id");
});

test("apps/web session API bootstraps a default session when cookie is missing", async () => {
  const response = await getSession(new Request("http://localhost/api/session"));

  assert.equal(response.status, 200);
  assert.match(String(response.headers.get("set-cookie")), /eos-workspace-session=/);
  const payload = await response.json();
  assert.equal(payload.authenticated, true);
  assert.equal(payload.session.workspaceId, "professional-workspace.default");
});
