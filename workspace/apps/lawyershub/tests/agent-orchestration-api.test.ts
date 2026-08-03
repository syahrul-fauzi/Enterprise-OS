import assert from "node:assert/strict";
import test from "node:test";
import { GET as getOrchestration } from "../app/api/orchestration/route";
import { POST as dispatchOrchestration } from "../app/api/orchestration/[id]/dispatch/route";

const headers = {
  "x-eos-api-key": "eos-dev-key",
  "content-type": "application/json",
} as const;

test("agent orchestration API lists available plans", async () => {
  const response = await getOrchestration(
    new Request("http://localhost/api/orchestration", { headers }),
  );
  assert.equal(response.status, 200);

  const payload = await response.json();
  assert.ok(Array.isArray(payload.items));
  assert.ok(
    payload.items.some((plan: { id: string }) => plan.id === "orchestrate-requirement-delivery"),
  );
});

test("agent orchestration API dispatches a plan", async () => {
  const response = await dispatchOrchestration(
    new Request("http://localhost/api/orchestration/orchestrate-evidence-review/dispatch", {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    }),
    {
      params: Promise.resolve({ id: "orchestrate-evidence-review" }),
    },
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.planId, "orchestrate-evidence-review");
  assert.equal(payload.status, "completed");
});
