/**
 * Thin App Vertical Slice Validation Replay
 * Memverifikasi bahwa prepare_release yang dipanggil dari Workspace dan Conversation
 * menghasilkan outcome yang sama persis sesuai Thin App Strategy.
 */

import { prepareReleaseProcedure } from "../procedures/prepare-release";
import { recordRuntimeInvocation, traceExecutionByDecision } from "../packages/core/runtime/src/invocation-evidence";
import { executionContext } from "../packages/core/runtime/src/execution-context";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { dirname } from "path";

// Setup temporary ledger untuk replay
const REPLAY_TMP_DIR = `/tmp/thinapp-replay-${Date.now()}`;
const LEDGER_PATH = `${REPLAY_TMP_DIR}/runtime-invocations.jsonl`;
mkdirSync(dirname(LEDGER_PATH), { recursive: true });
process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH = LEDGER_PATH;

console.log(`[THINAPP-REPLAY] Replay directory: ${REPLAY_TMP_DIR}`);
console.log(`[THINAPP-REPLAY] Runtime ledger: ${LEDGER_PATH}`);

// Test constants — gunakan release ID yang sama untuk kedua path
const TEST_RELEASE_ID = "12.3";
const TEST_DECISION_WORKSPACE = "dec-thinapp-workspace-001";
const TEST_DECISION_CHAT = "dec-thinapp-chat-001";
const TEST_PRODUCT = "lawyershub";

interface PathResult {
  executionId: string;
  releaseId: string;
  procedure: string;
  canonicalSubject: string;
  blockers: string[];
  readinessStatus: string;
  totalInvocations: number;
  allEvents: unknown[];
}

async function runWorkspacePath(): Promise<PathResult> {
  console.log("\n========== PATH A: WORKSPACE ==========");
  
  return executionContext.run(
    { decision_id: TEST_DECISION_WORKSPACE, product_id: TEST_PRODUCT },
    () => {
      const result = prepareReleaseProcedure({ releaseId: TEST_RELEASE_ID });
      
      // Catat invokasi dari surface Workspace
      recordRuntimeInvocation({
        capabilityId: "thinapp-surface",
        operationId: "workspace.prepare_release",
        sourceRef: "thinapp-replay:workspace-path",
        success: result.execution.status === "passed",
        input: { releaseId: TEST_RELEASE_ID, path: "workspace" },
        result: { executionId: result.executionId, readiness: result.readiness.status }
      });

      // Ambil semua event untuk decision ini
      const trace = traceExecutionByDecision(TEST_DECISION_WORKSPACE);
      
      console.log(`[PATH-A] executionId: ${result.executionId}`);
      console.log(`[PATH-A] canonicalSubject: ${result.canonicalSubject}`);
      console.log(`[PATH-A] readiness: ${result.readiness.status}`);
      console.log(`[PATH-A] blockers: ${result.blockers.length}`);
      console.log(`[PATH-A] trace matched events: ${trace.totalMatches}`);

      return {
        executionId: result.executionId,
        releaseId: result.releaseId,
        procedure: result.procedure,
        canonicalSubject: result.canonicalSubject,
        blockers: result.blockers,
        readinessStatus: result.readiness.status,
        totalInvocations: trace.totalMatches,
        allEvents: trace.matchingExecutions
      };
    }
  );
}

async function runChatPath(): Promise<PathResult> {
  console.log("\n========== PATH B: CONVERSATION ==========");
  
  return executionContext.run(
    { decision_id: TEST_DECISION_CHAT, product_id: TEST_PRODUCT },
    () => {
      // Simulasikan extractReleaseId dari chat message seperti di route.ts
      const extractedReleaseId = TEST_RELEASE_ID;
      const result = prepareReleaseProcedure({ releaseId: extractedReleaseId });
      
      // Catat invokasi dari surface Conversation
      recordRuntimeInvocation({
        capabilityId: "thinapp-surface",
        operationId: "chat.prepare_release",
        sourceRef: "thinapp-replay:chat-path",
        success: result.execution.status === "passed",
        input: { releaseId: extractedReleaseId, path: "chat", userMessage: `Prepare release ${TEST_RELEASE_ID}` },
        result: { executionId: result.executionId, readiness: result.readiness.status }
      });

      // Ambil semua event untuk decision ini
      const trace = traceExecutionByDecision(TEST_DECISION_CHAT);
      
      console.log(`[PATH-B] executionId: ${result.executionId}`);
      console.log(`[PATH-B] canonicalSubject: ${result.canonicalSubject}`);
      console.log(`[PATH-B] readiness: ${result.readiness.status}`);
      console.log(`[PATH-B] blockers: ${result.blockers.length}`);
      console.log(`[PATH-B] trace matched events: ${trace.totalMatches}`);

      return {
        executionId: result.executionId,
        releaseId: result.releaseId,
        procedure: result.procedure,
        canonicalSubject: result.canonicalSubject,
        blockers: result.blockers,
        readinessStatus: result.readiness.status,
        totalInvocations: trace.totalMatches,
        allEvents: trace.matchingExecutions
      };
    }
  );
}

function compareResults(a: PathResult, b: PathResult) {
  console.log("\n========== THINAPP VERTICAL SLICE VALIDATION ==========");
  const criteria: { name: string; pass: boolean; detail: string }[] = [];

  // 1. Same procedure
  const sameProcedure = a.procedure === b.procedure;
  criteria.push({
    name: "Same procedure",
    pass: sameProcedure,
    detail: sameProcedure ? `${a.procedure} (both)` : `A: ${a.procedure}, B: ${b.procedure}`
  });

  // 2. Same canonical subject (untuk release ID yang sama)
  const sameCanonicalSubject = a.canonicalSubject === b.canonicalSubject;
  criteria.push({
    name: "Same canonical subject",
    pass: sameCanonicalSubject,
    detail: sameCanonicalSubject ? `${a.canonicalSubject} (both)` : `A: ${a.canonicalSubject}, B: ${b.canonicalSubject}`
  });

  // 3. Same executionId pattern (harus sama karena release ID sama)
  const expectedExecutionId = `prepare_release:release/${TEST_RELEASE_ID}`;
  const aMatchesExpected = a.executionId === expectedExecutionId;
  const bMatchesExpected = b.executionId === expectedExecutionId;
  criteria.push({
    name: "Same work identity (executionId)",
    pass: aMatchesExpected && bMatchesExpected && a.executionId === b.executionId,
    detail: `A: ${a.executionId}, B: ${b.executionId}, expected: ${expectedExecutionId}`
  });

  // 4. Same readiness status
  const sameReadiness = a.readinessStatus === b.readinessStatus;
  criteria.push({
    name: "Same readiness status",
    pass: sameReadiness,
    detail: sameReadiness ? `${a.readinessStatus} (both)` : `A: ${a.readinessStatus}, B: ${b.readinessStatus}`
  });

  // 5. Same number of blockers
  const sameBlockersCount = a.blockers.length === b.blockers.length;
  criteria.push({
    name: "Same blocker count",
    pass: sameBlockersCount,
    detail: `A: ${a.blockers.length}, B: ${b.blockers.length}`
  });

  // 6. Same capability calls (jumlah invokasi sama)
  const sameInvocationCount = Math.abs(a.totalInvocations - b.totalInvocations) <= 1; // +1 untuk surface record sendiri
  criteria.push({
    name: "Same capability invocation pattern",
    pass: sameInvocationCount,
    detail: `A: ${a.totalInvocations} events, B: ${b.totalInvocations} events`
  });

  // 7. No cross-contamination (event A tidak ada di B, dan sebaliknya)
  const aDecisionIds = a.allEvents.map((e: any) => e.decision_id);
  const bDecisionIds = b.allEvents.map((e: any) => e.decision_id);
  const crossContaminationA = aDecisionIds.some(id => id === TEST_DECISION_CHAT);
  const crossContaminationB = bDecisionIds.some(id => id === TEST_DECISION_WORKSPACE);
  criteria.push({
    name: "Zero cross-contamination",
    pass: !crossContaminationA && !crossContaminationB,
    detail: crossContaminationA ? "A contains B's decision_id" : crossContaminationB ? "B contains A's decision_id" : "No leakage"
  });

  // 8. All events have correct product_id
  const aWrongProduct = a.allEvents.some((e: any) => e.product_id !== TEST_PRODUCT);
  const bWrongProduct = b.allEvents.some((e: any) => e.product_id !== TEST_PRODUCT);
  criteria.push({
    name: "All events have correct product_id",
    pass: !aWrongProduct && !bWrongProduct,
    detail: aWrongProduct ? "A has wrong product" : bWrongProduct ? "B has wrong product" : `${TEST_PRODUCT} (all)`
  });

  // Print results
  let passed = 0;
  criteria.forEach(c => {
    const icon = c.pass ? "✅" : "❌";
    console.log(`${icon} ${c.name}: ${c.detail}`);
    if (c.pass) passed++;
  });

  console.log("\n--- FINAL SCORE ---");
  console.log(`${passed}/${criteria.length} criteria passed`);
  
  const allPassed = criteria.every(c => c.pass);
  if (allPassed) {
    console.log("\n🎉 THIN APP VERTICAL SLICE: ALL CRITERIA PASS — Surface independence verified!");
  } else {
    console.log("\n⚠️  THIN APP VERTICAL SLICE: Some criteria failed — review findings above.");
  }

  // Save full results
  writeFileSync(`${REPLAY_TMP_DIR}/replay-results.json`, JSON.stringify({
    workspaceResult: a,
    chatResult: b,
    criteria,
    allPassed,
    timestamp: new Date().toISOString()
  }, null, 2));

  console.log(`\nFull results saved to: ${REPLAY_TMP_DIR}/replay-results.json`);
}

// Run replay
async function main() {
  const workspaceResult = await runWorkspacePath();
  const chatResult = await runChatPath();
  compareResults(workspaceResult, chatResult);
}

main().catch(err => {
  console.error("[THINAPP-REPLAY] Fatal error:", err);
  process.exit(1);
});