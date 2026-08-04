import assert from "node:assert/strict";
import test from "node:test";
import { GET as getRequirements, POST as postRequirements } from "../app/api/requirements/route";
import {
  GET as getRequirementById,
  PATCH as patchRequirementById,
} from "../app/api/requirements/[id]/route";
import {
  WORKSPACE_SESSION_COOKIE,
  createDefaultWorkspaceSession,
  encodeWorkspaceSession,
} from "../lib/workspace-session";

const sessionCookie = `${WORKSPACE_SESSION_COOKIE}=${encodeWorkspaceSession(
  createDefaultWorkspaceSession(),
)}`;
const productHeaders = {
  "x-eos-product-id": "services-id",
  "x-eos-product-domain": "staging.services-id.com",
  "x-forwarded-host": "staging.services-id.com",
};

test("apps/web requirement API creates, reads, searches, and updates requirements", async () => {
  const createResponse = await postRequirements(
    new Request("http://localhost/api/requirements", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie,
        ...productHeaders,
      },
      body: JSON.stringify({
        title: "apps/web requirement api proof",
        owner: "web-proof",
        linkedCapabilityIds: ["requirement-management"],
        acceptanceCriteria: ["Route is served by apps/web"],
      }),
    }),
  );

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.headers.get("x-eos-tenant-id"), "tenant.default");
  assert.equal(createResponse.headers.get("x-eos-product-id"), "services-id");
  assert.equal(typeof createResponse.headers.get("x-eos-request-id"), "string");
  const created = await createResponse.json();
  assert.equal(created.status, "draft");
  assert.equal(typeof created.id, "string");

  const listResponse = await getRequirements(
    new Request(
      "http://localhost/api/requirements?owner=web-proof&linkedCapabilityId=requirement-management",
      {
        headers: { cookie: sessionCookie, ...productHeaders },
      },
    ),
  );
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.headers.get("x-eos-product-id"), "services-id");
  const listPayload = await listResponse.json();
  assert.ok(listPayload.items.length >= 1);
  assert.ok(listPayload.items.some((item: { id: string }) => item.id === created.id));

  const getResponse = await getRequirementById(
    new Request("http://localhost", {
      headers: { cookie: sessionCookie, ...productHeaders },
    }),
    {
      params: Promise.resolve({ id: created.id }),
    },
  );
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.headers.get("x-eos-product-id"), "services-id");
  const detail = await getResponse.json();
  assert.equal(detail.id, created.id);

  const patchResponse = await patchRequirementById(
    new Request(`http://localhost/api/requirements/${created.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie,
        ...productHeaders,
      },
      body: JSON.stringify({ action: "approve" }),
    }),
    {
      params: Promise.resolve({ id: created.id }),
    },
  );
  assert.equal(patchResponse.status, 200);
  assert.equal(patchResponse.headers.get("x-eos-product-id"), "services-id");
  const patched = await patchResponse.json();
  assert.equal(patched.status, "approved");
});

test("apps/web requirement API rejects invalid payloads", async () => {
  const response = await postRequirements(
    new Request("http://localhost/api/requirements", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie,
      },
      body: JSON.stringify({ title: "" }),
    }),
  );

  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.error, "validation_error");
});

test("apps/web requirement API rejects requests without workspace session", async () => {
  const response = await getRequirements(
    new Request("http://localhost/api/requirements"),
  );

  assert.equal(response.status, 401);
  assert.equal(typeof response.headers.get("x-eos-request-id"), "string");
  const payload = await response.json();
  assert.equal(payload.error, "unauthorized");
});
