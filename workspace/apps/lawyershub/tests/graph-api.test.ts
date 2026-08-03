import assert from "node:assert/strict";
import test from "node:test";
import { GET as getGraph } from "../app/api/graph/route";
import { GET as getGraphNode } from "../app/api/graph/[id]/route";

const headers = {
  "x-eos-api-key": "eos-dev-key",
} as const;

test("graph API exposes knowledge graph snapshot", async () => {
  const response = await getGraph(new Request("http://localhost/api/graph", { headers }));
  assert.equal(response.status, 200);

  const payload = await response.json();
  assert.ok(payload.nodes.length > 0);
  assert.ok(payload.edges.length > 0);
});

test("graph API resolves workflow node detail", async () => {
  const response = await getGraphNode(
    new Request("http://localhost/api/graph/workflow:requirement-delivery-readiness", { headers }),
    {
      params: Promise.resolve({ id: "workflow:requirement-delivery-readiness" }),
    },
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.id, "workflow:requirement-delivery-readiness");
});
