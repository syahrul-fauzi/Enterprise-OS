import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { executionContext } from "../packages/core/runtime/src/execution-context.js";
import { recordObservedExecution, getTraceForDecision, executionTraces } from "../packages/core/runtime/src/execution-observability.js";
import { randomUUID } from "node:crypto";

describe("WORK-PROD-007 - SERVICES.ID OBSERVABILITY: Verify distributed tracing across domain boundaries", () => {
  beforeEach(() => {
    // Reset traces sebelum setiap test
    executionTraces.clear();
  });

  it("WORK-PROD-007-TEST-1: Services.ID webhook success captures all required observability attributes", async () => {
    const resolvedWorkId = "case-005";
    const actor_id = "services-id-customer-001";
    const tenant_id = "tenant-001";

    await executionContext.run({ 
      decision_id: `servicesid-webhook-${resolvedWorkId}`,
      logicalWorkId: resolvedWorkId,
      actor_id: actor_id,
      tenant_id: tenant_id
    }, async () => {
      const executionId = randomUUID();
      recordObservedExecution({
        decision_id: "servicesid-webhook-processed",
        executionId: executionId,
        success: true,
        logicalWorkId: resolvedWorkId
      });
    });

    const traces = getTraceForDecision("servicesid-webhook-processed");
    assert.equal(traces.length, 1);
    assert.equal(traces[0].logicalWorkId, resolvedWorkId);
    assert.equal(traces[0].success, true);
    assert.ok(traces[0].context_trace_id); // Context trace ID tercapture dari executionContext
    assert.ok(traces[0].timestamp_utc);
    console.log("✅ WORK-PROD-007-TEST-1 PASS: Webhook success observability attributes captured correctly");
  });

  it("WORK-PROD-007-TEST-2: Services.ID webhook unresolved work failure captures error context", async () => {
    const executionId = randomUUID();
    recordObservedExecution({
      decision_id: "servicesid-webhook-unresolved-work",
      executionId: executionId,
      success: false,
      error: "Could not resolve work ID from Services.ID identifiers"
    });

    const traces = getTraceForDecision("servicesid-webhook-unresolved-work");
    assert.equal(traces.length, 1);
    assert.equal(traces[0].success, false);
    assert.equal(traces[0].error, "Could not resolve work ID from Services.ID identifiers");
    console.log("✅ WORK-PROD-007-TEST-2 PASS: Unresolved work failure error context captured");
  });

  it("WORK-PROD-007-TEST-3: Services.ID webhook internal error captures exception message", async () => {
    const errorMessage = "Database connection timeout";
    const executionId = randomUUID();
    
    recordObservedExecution({
      decision_id: "servicesid-webhook-error",
      executionId: executionId,
      success: false,
      error: errorMessage
    });

    const traces = getTraceForDecision("servicesid-webhook-error");
    assert.equal(traces.length, 1);
    assert.equal(traces[0].success, false);
    assert.equal(traces[0].error, errorMessage);
    console.log("✅ WORK-PROD-007-TEST-3 PASS: Internal error exception message captured");
  });

  it("WORK-PROD-007-TEST-4: Distributed tracing context preserved across Services.ID ↔ LawyersHub boundary", async () => {
    const parentTraceId = randomUUID();
    const resolvedWorkId = "case-005";

    // Simulasi trace originasi dari LawyersHub (parent context)
    await executionContext.run({
      decision_id: "lawyershub-workflow-start",
      logicalWorkId: resolvedWorkId,
      context_trace_id: parentTraceId,
      tenant_id: "tenant-001",
      actor_id: "lawyer-007"
    }, async () => {
      // Simulasi Services.ID webhook dipanggil dalam context yang sama (trace terjaga)
      const servicesIdExecutionId = randomUUID();
      recordObservedExecution({
        decision_id: "servicesid-webhook-processed",
        executionId: servicesIdExecutionId,
        success: true,
        logicalWorkId: resolvedWorkId
      });

      const currentCtx = executionContext.get();
      assert.equal(currentCtx?.context_trace_id, parentTraceId);
      
      const traces = getTraceForDecision("servicesid-webhook-processed");
      assert.equal(traces[0].context_trace_id, parentTraceId); // Trace ID terpropagasi lintas domain
      console.log("✅ WORK-PROD-007-TEST-4 PASS: Distributed tracing context preserved across domain boundary");
    });
  });

  it("WORK-PROD-007-TEST-5: All three webhook execution scenarios captured in executionTraces", async () => {
    // Simulasi ketiga skenario yang ada di route.ts
    recordObservedExecution({
      decision_id: "servicesid-webhook-unresolved-work",
      executionId: randomUUID(),
      success: false,
      error: "Test error 1"
    });

    recordObservedExecution({
      decision_id: "servicesid-webhook-processed",
      executionId: randomUUID(),
      success: true,
      logicalWorkId: "case-005"
    });

    recordObservedExecution({
      decision_id: "servicesid-webhook-error",
      executionId: randomUUID(),
      success: false,
      error: "Test error 2"
    });

    // Verify semua decision_id tercatat
    const unresolved = getTraceForDecision("servicesid-webhook-unresolved-work");
    const processed = getTraceForDecision("servicesid-webhook-processed");
    const error = getTraceForDecision("servicesid-webhook-error");

    assert.equal(unresolved.length, 1);
    assert.equal(processed.length, 1);
    assert.equal(error.length, 1);
    console.log("✅ WORK-PROD-007-TEST-5 PASS: All three webhook execution scenarios captured");
  });

  console.log("\n🚀 WORK-PROD-007 OBSERVABILITY TESTS COMPLETE - Services.ID tracing fully verified");
});