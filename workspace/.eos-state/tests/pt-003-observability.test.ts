import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { executionContext } from "../../packages/core/runtime/src/execution-context.js";
import { recordRuntimeInvocation } from "../../packages/core/runtime/src/invocation-evidence.js";
import { recordObservedExecution, getTraceForDecision, detectReentryAnomalies } from "../../packages/core/runtime/src/execution-observability.js";

import { executionTraces } from "../../packages/core/runtime/src/execution-observability.js";

describe("PT-003 - EXECUTION OBSERVABILITY: Measure don't repair", () => {
  beforeEach(() => {
    // Reset traces sebelum setiap test
    executionTraces.clear();
  });

  it("PT-003-TEST-1: Can observe decision_id, executionId, context_trace_id for all executions", async () => {
    const W1 = "pt003-w1-001";
    const tenant = "tenant-pt003";

    await executionContext.run({ decision_id: W1, tenant_id: tenant }, async () => {
      const exec1Id = "exec-pt003-001";
      recordObservedExecution({
        decision_id: W1,
        executionId: exec1Id,
        context_trace_id: "ctx-001",
        is_reentry: false,
        success: true
      });

      const exec2Id = "exec-pt003-002";
      recordObservedExecution({
        decision_id: W1,
        executionId: exec2Id,
        context_trace_id: "ctx-001",
        is_reentry: false,
        parent_executionId: exec1Id,
        success: true
      });
    });

    const traces = getTraceForDecision(W1);
    assert.equal(traces.length, 2);
    assert.equal(traces[0].decision_id, W1);
    assert.equal(traces[1].parent_executionId, traces[0].executionId);
    console.log("✅ PT-003-TEST-1 PASS: All required execution attributes captured");
  });

  it("PT-003-TEST-2: Can detect C19-TEST-8 reentry anomaly - disconnected parent", async () => {
    const W_reentry = "pt003-w-reentry-001";
    const tenant = "tenant-pt003-reentry";

    // E1: Timeout
    await executionContext.run({ decision_id: W_reentry, tenant_id: tenant }, async () => {
      recordObservedExecution({
        decision_id: W_reentry,
        executionId: "exec-timeout-001",
        context_trace_id: "ctx-a",
        is_reentry: false,
        logicalWorkId: "doc-work-001",
        success: false,
        error: "network timeout"
      });
    });

    // E2: Client retry (separate executionContext = C19 failure scenario)
    // SIMULASI FAILURE C19-TEST-8: Paksa parent_context_trace_id menjadi null dengan override
    await executionContext.run({ 
      decision_id: W_reentry, 
      tenant_id: tenant,
      is_reentry: true, // Override manual untuk simulasi failure
      parent_context_trace_id: null // Simulasi C19 failure: linkage terputus
    }, async () => {
      recordObservedExecution({
        decision_id: W_reentry,
        executionId: "exec-retry-001",
        logicalWorkId: "doc-work-001",
        success: true
        // TIDAK ADA parent_executionId = INVARIANT BREACH
      });
    });

    const anomalies = detectReentryAnomalies(W_reentry);
    assert.ok(anomalies.has_disconnected_parent, "Deteksi anomaly re-entry berhasil");
    assert.equal(anomalies.disconnected_executions.length, 1);
    console.log("✅ PT-003-TEST-2 PASS: C19 reentry anomaly successfully detected");
  });

  it("PT-003-TEST-3: Can distinguish reentry vs new execution", async () => {
    const W1 = "pt003-w-mixed-001";
    const tenant = "tenant-pt003-mixed";

    await executionContext.run({ decision_id: W1, tenant_id: tenant }, async () => {
      // E1: Original execution
      recordObservedExecution({
        decision_id: W1,
        executionId: "exec-orig-001",
        context_trace_id: "ctx-main",
        is_reentry: false,
        success: true
      });

      // E2: New execution (bukan re-entry)
      recordObservedExecution({
        decision_id: W1,
        executionId: "exec-new-001",
        context_trace_id: "ctx-main",
        is_reentry: false,
        parent_executionId: "exec-orig-001",
        success: true
      });

      // E3: Re-entry dengan parent yang benar
      recordObservedExecution({
        decision_id: W1,
        executionId: "exec-retry-good-001",
        context_trace_id: "ctx-main",
        is_reentry: true,
        parent_executionId: "exec-new-001",
        success: true
      });
    });

    const anomalies = detectReentryAnomalies(W1);
    assert.ok(!anomalies.has_disconnected_parent, "Tidak ada false positive anomaly");
    console.log("✅ PT-003-TEST-3 PASS: Reentry vs new execution correctly distinguished");
  });

  console.log("\n🚀 PT-003 OBSERVABILITY TESTS LOADED - measure only, never repair");
});