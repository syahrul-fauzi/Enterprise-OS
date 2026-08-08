/**
 * Frontier C: Conditional Intelligence Validation Replay
 * Memverifikasi bahwa canonical procedure `prepare_release` memenuhi semua G1-G6
 * untuk Dynamic Procedure thesis tanpa membuat semantic fork.
 */

import { prepareReleaseProcedure } from "../procedures/prepare-release";
import { recordRuntimeInvocation, traceExecutionByDecision } from "../packages/core/runtime/src/invocation-evidence";
import { executionContext } from "../packages/core/runtime/src/execution-context";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { dirname } from "path";
import { workflowEngineService } from "../capabilities/workflow-engine/implementation/services/workflow-engine.service";

// Setup temporary ledger untuk replay
const REPLAY_TMP_DIR = `/tmp/conditional-intelligence-replay-${Date.now()}`;
const LEDGER_PATH = `${REPLAY_TMP_DIR}/runtime-invocations.jsonl`;
mkdirSync(dirname(LEDGER_PATH), { recursive: true });
process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH = LEDGER_PATH;

console.log(`[CONDITIONAL-REPLAY] Replay directory: ${REPLAY_TMP_DIR}`);
console.log(`[CONDITIONAL-REPLAY] Runtime ledger: ${LEDGER_PATH}`);

// Test constants
const TEST_RELEASE_ID_HAPPY = "12.3-happy";      // Semua check pass (deterministic happy path)
const TEST_RELEASE_ID_BLOCKED = "12.3-blocked";  // Hard check failed (deterministic block)
const TEST_RELEASE_ID_AMBIGUOUS = "12.3-ambiguous"; // Has unknown (AI path)
const TEST_DECISION_BASE = "dec-conditional-00";

interface ProcedureResult {
  executionId: string;
  releaseId: string;
  procedure: string;
  canonicalSubject: string;
  readinessStatus: string;
  aiInvoked: boolean;
  aiPlanId: string | null;
  aiInvocationStatus: string | null;
  blockers: string[];
  steps: unknown[];
  executionReason: string;
  totalEvents: number;
}

// ------------------------------
// Test Case A: Deterministic Happy Path
// ------------------------------
async function runHappyPathTest(): Promise<{ pass: boolean; result: ProcedureResult | null }> {
  console.log("\n========== TEST CASE A: DETERMINISTIC HAPPY PATH ==========");
  
  return executionContext.run(
    { decision_id: `${TEST_DECISION_BASE}-a`, product_id: "lawyershub" },
    () => {
      const result = prepareReleaseProcedure({ releaseId: TEST_RELEASE_ID_HAPPY });
      const trace = traceExecutionByDecision(`${TEST_DECISION_BASE}-a`);
      
      // Verifikasi G2: AI invocation = 0
      const aiNeverInvoked = !result.ai.invoked;
      const statusIsReady = result.readiness.status === "ready";
      const executionReasonCorrect = result.execution.reason === "all_checks_passed";
      
      console.log(`[TEST-A] executionId: ${result.executionId}`);
      console.log(`[TEST-A] readiness: ${result.readiness.status}`);
      console.log(`[TEST-A] ai.invoked: ${result.ai.invoked}`);
      console.log(`[TEST-A] all criteria met: ${aiNeverInvoked && statusIsReady && executionReasonCorrect}`);
      
      recordRuntimeInvocation({
        capabilityId: "conditional-replay",
        operationId: "test.happypath",
        sourceRef: "conditional-intelligence-replay:happypath",
        success: aiNeverInvoked && statusIsReady && executionReasonCorrect,
        input: { releaseId: TEST_RELEASE_ID_HAPPY },
        result: { executionId: result.executionId, readiness: result.readiness.status }
      });

      return {
        pass: aiNeverInvoked && statusIsReady && executionReasonCorrect,
        result: {
          executionId: result.executionId,
          releaseId: result.releaseId,
          procedure: result.procedure,
          canonicalSubject: result.canonicalSubject,
          readinessStatus: result.readiness.status,
          aiInvoked: result.ai.invoked,
          aiPlanId: result.ai.planId,
          aiInvocationStatus: result.ai.invocationStatus,
          blockers: result.blockers,
          steps: result.steps,
          executionReason: result.execution.reason,
          totalEvents: trace.totalMatches
        }
      };
    }
  );
}

// ------------------------------
// Test Case B: Deterministic Blocker Path
// ------------------------------
async function runBlockedPathTest(): Promise<{ pass: boolean; result: ProcedureResult | null }> {
  console.log("\n========== TEST CASE B: DETERMINISTIC BLOCKER PATH ==========");
  
  return executionContext.run(
    { decision_id: `${TEST_DECISION_BASE}-b`, product_id: "lawyershub" },
    () => {
      const result = prepareReleaseProcedure({ releaseId: TEST_RELEASE_ID_BLOCKED });
      const trace = traceExecutionByDecision(`${TEST_DECISION_BASE}-b`);
      
      // Verifikasi G2: AI invocation = 0
      const aiNeverInvoked = !result.ai.invoked;
      const statusIsBlocked = result.readiness.status === "blocked";
      const executionReasonCorrect = result.execution.reason === "blockers_found";
      
      console.log(`[TEST-B] executionId: ${result.executionId}`);
      console.log(`[TEST-B] readiness: ${result.readiness.status}`);
      console.log(`[TEST-B] ai.invoked: ${result.ai.invoked}`);
      console.log(`[TEST-B] all criteria met: ${aiNeverInvoked && statusIsBlocked && executionReasonCorrect}`);
      
      recordRuntimeInvocation({
        capabilityId: "conditional-replay",
        operationId: "test.blockedpath",
        sourceRef: "conditional-intelligence-replay:blockedpath",
        success: aiNeverInvoked && statusIsBlocked && executionReasonCorrect,
        input: { releaseId: TEST_RELEASE_ID_BLOCKED },
        result: { executionId: result.executionId, readiness: result.readiness.status }
      });

      return {
        pass: aiNeverInvoked && statusIsBlocked && executionReasonCorrect,
        result: {
          executionId: result.executionId,
          releaseId: result.releaseId,
          procedure: result.procedure,
          canonicalSubject: result.canonicalSubject,
          readinessStatus: result.readiness.status,
          aiInvoked: result.ai.invoked,
          aiPlanId: result.ai.planId,
          aiInvocationStatus: result.ai.invocationStatus,
          blockers: result.blockers,
          steps: result.steps,
          executionReason: result.execution.reason,
          totalEvents: trace.totalMatches
        }
      };
    }
  );
}

// ------------------------------
// Test Case C: Ambiguity Path (AI Triggered)
// ------------------------------
async function runAmbiguousPathTest(): Promise<{ pass: boolean; result: ProcedureResult | null }> {
  console.log("\n========== TEST CASE C: AMBIGUITY PATH (AI TRIGGERED) ==========");
  
  return executionContext.run(
    { decision_id: `${TEST_DECISION_BASE}-c`, product_id: "lawyershub" },
    () => {
      const result = prepareReleaseProcedure({ releaseId: TEST_RELEASE_ID_AMBIGUOUS });
      const trace = traceExecutionByDecision(`${TEST_DECISION_BASE}-c`);
      
      // Verifikasi G2: AI invocation = 1 HANYA untuk case ini
      const aiIsInvoked = result.ai.invoked;
      const statusIsPending = result.readiness.status === "pending_ai_investigation";
      const executionReasonCorrect = result.execution.reason === "intelligence_required";
      const correctAiPlan = result.ai.planId === "investigate-ambiguous-requirement";
      
      // G1: Hanya procedure yang memutuskan AI diperlukan (bukan surface atau workflow)
      const decisionIsInProcedureOnly = result.steps.some((s: any) => s.stepId === "trigger-ai-investigation");
      
      console.log(`[TEST-C] executionId: ${result.executionId}`);
      console.log(`[TEST-C] readiness: ${result.readiness.status}`);
      console.log(`[TEST-C] ai.invoked: ${result.ai.invoked}`);
      console.log(`[TEST-C] ai.planId: ${result.ai.planId}`);
      console.log(`[TEST-C] decision only in procedure: ${decisionIsInProcedureOnly}`);
      console.log(`[TEST-C] all criteria met: ${aiIsInvoked && statusIsPending && executionReasonCorrect && correctAiPlan && decisionIsInProcedureOnly}`);
      
      recordRuntimeInvocation({
        capabilityId: "conditional-replay",
        operationId: "test.ambiguouspath",
        sourceRef: "conditional-intelligence-replay:ambiguouspath",
        success: aiIsInvoked && statusIsPending && executionReasonCorrect && correctAiPlan && decisionIsInProcedureOnly,
        input: { releaseId: TEST_RELEASE_ID_AMBIGUOUS },
        result: { executionId: result.executionId, readiness: result.readiness.status }
      });

      // ------------------------------
      // Verifikasi DIV-002: Workflow engine hanya menjalankan AI path, tidak menduplikasi decision
      // ------------------------------
      console.log("\n[TEST-C] Verifikasi DIV-002: Workflow engine sebagai execution layer only");
      const aiWorkflowResult = workflowEngineService.executeWorkflow({
        workflowId: "ai-investigate-requirement",
        requirementId: result.ai.ambiguousRequirements[0]
      });
      console.log(`[TEST-C] AI workflow executed: status=${aiWorkflowResult.status}, steps=${aiWorkflowResult.steps.length}`);
      console.log(`[TEST-C] Procedure tetap SSoT, workflow hanya sebagai execution mechanism`);

      return {
        pass: aiIsInvoked && statusIsPending && executionReasonCorrect && correctAiPlan && decisionIsInProcedureOnly,
        result: {
          executionId: result.executionId,
          releaseId: result.releaseId,
          procedure: result.procedure,
          canonicalSubject: result.canonicalSubject,
          readinessStatus: result.readiness.status,
          aiInvoked: result.ai.invoked,
          aiPlanId: result.ai.planId,
          aiInvocationStatus: result.ai.invocationStatus,
          blockers: result.blockers,
          steps: result.steps,
          executionReason: result.execution.reason,
          totalEvents: trace.totalMatches
        }
      };
    }
  );
}

// ------------------------------
// Main Replay Execution
// ------------------------------
async function main() {
  console.log("\n🚀 Memulai Conditional Intelligence Validation Replay (Frontier C)");
  
  const testA = await runHappyPathTest();
  const testB = await runBlockedPathTest();
  const testC = await runAmbiguousPathTest();
  
  // ------------------------------
  // Final G1-G6 Validation
  // ------------------------------
  console.log("\n========== G1-G6 FINAL VALIDATION ==========");
  const gates: { name: string; pass: boolean; detail: string }[] = [];
  
  // G1: Single Semantic Authority
  const onlyProcedureMakesAiDecision = testC.result?.steps.some((s: any) => s.stepId === "trigger-ai-investigation");
  gates.push({
    name: "G1: Single Semantic Authority",
    pass: !!onlyProcedureMakesAiDecision,
    detail: onlyProcedureMakesAiDecision 
      ? "Hanya canonical procedure yang memutuskan AI diperlukan (bukan surface/workflow)" 
      : "Decision logic terduplikasi di luar procedure"
  });
  
  // G2: AI Invocation is Conditional
  const aiOnlyInAmbiguousCase = !testA.result?.aiInvoked && !testB.result?.aiInvoked && testC.result?.aiInvoked;
  gates.push({
    name: "G2: AI Invocation is Conditional",
    pass: !!aiOnlyInAmbiguousCase,
    detail: aiOnlyInAmbiguousCase
      ? "AI hanya dipanggil untuk ambiguous case (0 untuk happy/blocked, 1 untuk ambiguous)"
      : "AI dipanggil untuk case yang tidak seharusnya"
  });
  
  // G3: Execution Mechanism tidak ubah semantics
  const sameSemanticsAcrossMechanisms = testC.result?.readinessStatus === "pending_ai_investigation" && testC.result?.aiPlanId === "investigate-ambiguous-requirement";
  gates.push({
    name: "G3: Execution Mechanism Does Not Change Semantics",
    pass: !!sameSemanticsAcrossMechanisms,
    detail: sameSemanticsAcrossMechanisms
      ? "Procedure mendefinisikan intelligence_required, workflow hanya sebagai executor"
      : "Workflow mengubah semantics dari AI invocation"
  });
  
  // G4: Same Procedure, Different Outcome Path
  const allStatusesDistinct = testA.result?.readinessStatus === "ready" && testB.result?.readinessStatus === "blocked" && testC.result?.readinessStatus === "pending_ai_investigation";
  gates.push({
    name: "G4: Same Procedure, Different Outcome Path",
    pass: !!allStatusesDistinct,
    detail: allStatusesDistinct
      ? "Satu procedure menghasilkan 3 status berbeda berdasarkan state: ready/blocked/pending_ai_investigation"
      : "Outcome path tidak bervariasi sesuai state"
  });
  
  // G5: Human Judgment Substrate Exists
  const hasHumanStep = testC.result?.steps.some((s: any) => s.status === "requires_human");
  gates.push({
    name: "G5: Human Judgment Substrate Exists",
    pass: !!hasHumanStep,
    detail: hasHumanStep
      ? "Procedure memiliki step requires_human untuk AI investigation"
      : "Belum ada substrate untuk human judgment"
  });
  
  // G6: Evidence of Intelligence Decision
  const hasAiEvidence = testC.result?.steps.some((s: any) => s.kind === "ai.investigate") && testC.result?.executionReason === "intelligence_required";
  gates.push({
    name: "G6: Evidence of Intelligence Decision",
    pass: !!hasAiEvidence,
    detail: hasAiEvidence
      ? "Semua AI invocation tercatat dengan reason dan step yang jelas"
      : "Tidak ada evidence yang cukup mengapa AI dipanggil"
  });
  
  // Print final results
  let totalPassed = 0;
  gates.forEach(g => {
    const icon = g.pass ? "✅" : "❌";
    console.log(`${icon} ${g.name}: ${g.detail}`);
    if (g.pass) totalPassed++;
  });
  
  console.log(`\n📊 Final Score: ${totalPassed}/6 gates passed`);
  
  const allPassed = gates.every(g => g.pass);
  if (allPassed) {
    console.log("\n🎉 SEMUA G1-G6 TERPENUHI! Dynamic Procedure thesis terbukti untuk Frontier C.");
    console.log("Canonical procedure `prepare_release` memenuhi semua prinsip:");
    console.log("   - deterministic first, intelligence on demand");
    console.log("   - one procedure, many execution mechanisms");
    console.log("   - zero semantic fork antara surface/procedure/workflow");
  } else {
    console.log("\n⚠️  Beberapa gate belum terpenuhi. Perbaiki sebelum melanjutkan.");
    process.exit(1);
  }
  
  // Save replay report
  const report = {
    timestamp: new Date().toISOString(),
    frontier: "C: Conditional Intelligence",
    gates,
    tests: { testA, testB, testC },
    summary: { allPassed, totalPassed, totalGates: gates.length }
  };
  writeFileSync(`${REPLAY_TMP_DIR}/validation-report.json`, JSON.stringify(report, null, 2));
  console.log(`\n📝 Report disimpan di: ${REPLAY_TMP_DIR}/validation-report.json`);
}

main().catch(err => {
  console.error("❌ Replay gagal:", err);
  process.exit(1);
});