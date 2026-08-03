import assert from "node:assert/strict";
import test from "node:test";
import { GET as getLogs } from "../app/api/observability/logs/route";
import { GET as getMetrics } from "../app/api/observability/metrics/route";
import { GET as getTraces } from "../app/api/observability/traces/route";

const headers = {
  "x-eos-api-key": "eos-dev-key",
} as const;

test("observability API exposes logs, metrics, and traces", async () => {
  const [logs, metrics, traces] = await Promise.all([
    getLogs(new Request("http://localhost/api/observability/logs", { headers })),
    getMetrics(new Request("http://localhost/api/observability/metrics", { headers })),
    getTraces(new Request("http://localhost/api/observability/traces", { headers })),
  ]);

  assert.equal(logs.status, 200);
  assert.equal(metrics.status, 200);
  assert.equal(traces.status, 200);

  const logsPayload = await logs.json();
  const metricsPayload = await metrics.json();
  const tracesPayload = await traces.json();

  assert.ok(logsPayload.items.length > 0);
  assert.ok(metricsPayload.items.length > 0);
  assert.ok(tracesPayload.items.length > 0);
});
