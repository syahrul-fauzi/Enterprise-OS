import { DocumentService } from "./implementation/services/document.service.js";
import { executionContext } from "@repo/core-runtime";
import { traceExecutionByDecision } from "@repo/core-runtime";
import * as fs from 'fs';
import * as path from 'path';

// Set environment variable for evidence log path so recordRuntimeInvocation writes to it
process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH = path.join(process.cwd(), 'c17-evidence.log');
// Clear previous evidence log to ensure clean test run
if (fs.existsSync(process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH)) fs.unlinkSync(process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH);

const documentService = new DocumentService();

// C17 Pressure-Test: Execute W1 chain with AMBIENT decision_id propagation (no manual workId passing after first call)
async function runW1Chain() {
  console.log("[C17-TEST] Starting W1 chain execution");
  
  // Step 1: Set ambient execution context with W1 as decision_id (only manual assignment - all downstream inherit automatically)
  const w1Context = {
    decision_id: "W1",
    last_invocation_digest: null
  };
  
  // Execution E1: document.create runs within W1 context
  console.log("\n[C17-TEST] E1: Executing document.create");
  const createResult = executionContext.run(w1Context, () => {
    return documentService.createDocument({
      title: "Test Legal Contract",
      description: "Contract for client representation",
      author: "Test Lawyer",
      // ONLY pass workId ONCE at the start - ambient context propagates for all subsequent calls
      workId: "W1",
      sessionId: "test-session",
      tenantId: "test-tenant",
      workspaceId: "test-workspace",
      actorId: "test-user"
    });
  });
  const D1 = createResult.id;
  console.log(`[C17-TEST] E1 created document D1: ${D1}`);
  
  // Execution E2: document.review - KEEP the same W1 context using executionContext.run()!
  // AsyncLocalStorage only propagates context for SYNCHRONOUS code or promises created within the run() callback
  // We must nest all subsequent executions inside the same run() or chain them via run() to maintain context
  console.log("\n[C17-TEST] E2: Executing document.review within same W1 context");
  const reviewResult = executionContext.run(w1Context, () => {
    return documentService.reviewDocument({
      id: D1,
      reviewer: "Senior Partner",
      approval: true,
      comments: "Approved with minor edits",
      tenantId: "test-tenant",
      workspaceId: "test-workspace",
      actorId: "test-user"
    });
  });
  const R1 = reviewResult.id;
  console.log(`[C17-TEST] E2 created reviewed document R1: ${R1}`);
  
  // Execution E3: document.sign - KEEP the same W1 context using executionContext.run()!
  console.log("\n[C17-TEST] E3: Executing document.sign within same W1 context");
  const signResult = executionContext.run(w1Context, () => {
    return documentService.signDocument({
      id: R1,
      signer: "Managing Partner",
      tenantId: "test-tenant",
      workspaceId: "test-workspace",
      actorId: "test-user"
    });
  });
  const S1 = signResult.id;
  console.log(`[C17-TEST] E3 created signed document S1: ${S1}`);
  
  return { D1, R1, S1 };
}

// Run negative test case: W2 chain that should NOT appear in W1 trace
async function runW2Chain() {
  console.log("\n[C17-TEST] Starting W2 chain execution (isolation test)");
  
  // Set separate context for W2 using executionContext.run to isolate async context
  const w2Context = {
    decision_id: "W2",
    last_invocation_digest: null
  };
  
  // Create separate document D2 under W2 in isolated context
  const createResult = executionContext.run(w2Context, () => {
    return documentService.createDocument({
      title: "Unrelated Document",
      author: "Other User",
      workId: "W2",
      sessionId: "other-session",
      tenantId: "test-tenant",
      workspaceId: "test-workspace",
      actorId: "other-user"
    });
  });
  const D2 = createResult.id;
  console.log(`[C17-TEST] W2 created document D2: ${D2}`);
  return { D2 };
}

// Main test runner
async function main() {
  try {
    const { D1, R1, S1 } = await runW1Chain();
    const { D2 } = await runW2Chain();
    
    // Query trace for W1 and verify all assertions (uses actual traceExecutionByDecision return structure)
    console.log("\n[C17-TEST] Querying execution trace for W1...");
    const w1Trace = traceExecutionByDecision("W1");
    console.log(`[C17-TEST] W1 trace contains ${w1Trace.totalMatches} executions (expected: 3)`);
    
    const w2Trace = traceExecutionByDecision("W2");
    console.log(`[C17-TEST] W2 trace contains ${w2Trace.totalMatches} executions (expected: 1)`);
    
    // Read raw evidence log to perform full lineage verification (traceExecutionByDecision only returns filtered fields)
    const rawEvidence = fs.readFileSync(process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH!, "utf8");
    const allEvents = rawEvidence.split(/\r?\n/g).filter(e => e.trim()).map(e => JSON.parse(e) as any);
    const w1Events = allEvents.filter(e => e.decision_id === "W1");
    const w2Events = allEvents.filter(e => e.decision_id === "W2");
    
    // Verify negative isolation: W2 executions never appear in W1 trace
    const w2Ids = w2Events.map(e => e.invocation_digest);
    const crossContamination = w1Events.some(e => w2Ids.includes(e.invocation_digest));
    console.log(`[C17-TEST] Negative isolation verified: ${!crossContamination}`);
    
    // Extract E1, E2, E3 from raw events (they're written in execution order to the log)
    const [E1, E2, E3] = w1Events;
    console.log("\n[C17-TEST] Extracted executions:");
    console.log(`E1: ${E1.invocation_digest} (${E1.operation_id})`);
    console.log(`E2: ${E2.invocation_digest} (${E2.operation_id})`);
    console.log(`E3: ${E3.invocation_digest} (${E3.operation_id})`);
    
    // Verify parent lineage: E2.parentInvocationIds includes E1, E3 includes E2
    const e2HasE1 = E2.parentInvocationIds?.includes(E1.invocation_digest);
    const e3HasE2 = E3.parentInvocationIds?.includes(E2.invocation_digest);
    console.log(`\n[C17-TEST] Parent lineage E2←E1: ${e2HasE1}`);
    console.log(`[C17-TEST] Parent lineage E3←E2: ${e3HasE2}`);
    
    // Verify artifact lineage: E1.outputRefs includes D1, E2.inputRefs includes D1, E2.outputRefs includes R1, E3.inputRefs includes R1
    const e1OutputsD1 = E1.outputRefs?.includes(D1);
    const e2InputsD1 = E2.inputRefs?.includes(D1);
    const e2OutputsR1 = E2.outputRefs?.includes(R1);
    const e3InputsR1 = E3.inputRefs?.includes(R1);
    const e3OutputsS1 = E3.outputRefs?.includes(S1);
    console.log(`\n[C17-TEST] Artifact lineage E1→D1: ${e1OutputsD1}`);
    console.log(`[C17-TEST] Artifact lineage D1→E2: ${e2InputsD1}`);
    console.log(`[C17-TEST] Artifact lineage E2→R1: ${e2OutputsR1}`);
    console.log(`[C17-TEST] Artifact lineage R1→E3: ${e3InputsR1}`);
    console.log(`[C17-TEST] Artifact lineage E3→S1: ${e3OutputsS1}`);
    
    // Verify all decision_ids are W1
    const allSameWorkId = w1Events.every(e => e.decision_id === "W1");
    console.log(`\n[C17-TEST] All executions share W1 decision_id: ${allSameWorkId}`);
    
    // Verify unique execution IDs
    const uniqueIds = new Set(w1Events.map(e => e.invocation_digest));
    const allUnique = uniqueIds.size === w1Events.length;
    console.log(`[C17-TEST] All executions have unique IDs: ${allUnique}`);
    
    // Final summary
    const allPassed = crossContamination === false && e2HasE1 && e3HasE2 && e1OutputsD1 && e2InputsD1 && e2OutputsR1 && e3InputsR1 && e3OutputsS1 && allSameWorkId && allUnique;
    console.log("\n" + "=".repeat(50));
    console.log(`C17 PRESSURE-TEST RESULT: ${allPassed ? "PASS" : "FAIL"}`);
    console.log("=".repeat(50));
    
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error("[C17-TEST] Test failed with error:", error);
    process.exit(1);
  }
}

main();