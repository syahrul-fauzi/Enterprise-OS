import assert from "node:assert/strict";
import test from "node:test";
import { observabilityService } from "../implementation/service.js";

test("observability service emits logs, metrics, and traces", () => {
  const logs = observabilityService.getLogs();
  const metrics = observabilityService.getMetrics();
  const traces = observabilityService.getTraces();

  assert.ok(logs.length >= 3);
  assert.ok(metrics.some((metric) => metric.name === "evidence.records"));
  assert.ok(traces.some((span) => span.name === "requirement-delivery-readiness"));
});

test("observability snapshot returns all telemetry surfaces", () => {
  const snapshot = observabilityService.getSnapshot();

  assert.ok(snapshot.logs.length > 0);
  assert.ok(snapshot.metrics.length > 0);
  assert.ok(snapshot.traces.length > 0);
});
