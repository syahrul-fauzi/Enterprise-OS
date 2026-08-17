import assert from "node:assert/strict";
import test from "node:test";
import { POST as postDelivery } from "../app/api/delivery/route.js";
import {
  WORKSPACE_SESSION_COOKIE,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession,
} from "../lib/workspace-session.js";

const sessionCookie = `${WORKSPACE_SESSION_COOKIE}=${encodeWorkspaceSession(
  createAnonymousWorkspaceSession(),
)}`;
const productHeaders = {
  "x-eos-product-id": "services-id",
  "x-eos-product-domain": "staging.services-id.com",
  "x-forwarded-host": "staging.services-id.com",
};

test("apps/web delivery API rejects unauthorized requests (missing session)", async () => {
  const response = await postDelivery(
    new Request("http://localhost/api/delivery", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...productHeaders,
      },
      body: JSON.stringify({
        requirementId: "test-requirement-123",
      }),
    }),
  );

  // B7.8 NEGATIVE CASE: 401 for missing session (validated)
  assert.equal(response.status, 401);
  const payload = await response.json();
  assert.equal(payload.error, "unauthorized");
});

test("apps/web delivery API rejects invalid payload (missing requirementId)", async () => {
  const response = await postDelivery(
    new Request("http://localhost/api/delivery", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie,
        ...productHeaders,
      },
      body: JSON.stringify({}),
    }),
  );

  // B7.8 NEGATIVE CASE: 400 for invalid schema (validated)
  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.error, "invalid_request");
});