import assert from "node:assert/strict";
import test from "node:test";
import { GET as getConnectors } from "../app/api/connectors/route";
import { POST as syncConnector } from "../app/api/connectors/[id]/sync/route";

const headers = {
  "x-eos-api-key": "eos-dev-key",
  "content-type": "application/json",
} as const;

test("connectors API lists registered connectors", async () => {
  const response = await getConnectors(new Request("http://localhost/api/connectors", { headers }));
  assert.equal(response.status, 200);

  const payload = await response.json();
  assert.ok(Array.isArray(payload.items));
  assert.ok(payload.items.some((item: { id: string }) => item.id === "requirements-json-export"));
});

test("connectors API executes connector sync", async () => {
  const response = await syncConnector(
    new Request("http://localhost/api/connectors/requirements-json-export/sync", {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    }),
    {
      params: Promise.resolve({ id: "requirements-json-export" }),
    },
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.connectorId, "requirements-json-export");
  assert.equal(payload.status, "completed");
});
