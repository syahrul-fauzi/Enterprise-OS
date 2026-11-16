import * as fs from 'node:fs/promises';
import { sendMockMidtransWebhook } from "./midtrans-sandbox-client.js";
import { collectEvidence } from "./evidence-collector.js";
import { getWorkRepositoryLazy } from "../../../capabilities/work-core/implementation/commands/work.commands.js";
import { finWebhookConsumer, FinWebhookConsumer } from "../src/contexts/fin-webhook/consumer.js";
import { redis } from '../../../packages/core/runtime/src/email-queue.js';
import * as queueModule from '../../../packages/core/runtime/src/email-queue.js';
import { statePath } from "@repo/eos-cli";

(globalThis as any).__EOS_QUEUE_STORE__ = (queueModule as any)._queueStore;
  
async function runAllTests() {
  console.log("[TestRunner] Starting WORKER-001 test suite...");
  console.log(`[TestRunner] Redis instance loaded successfully`);
  console.log(`[TestRunner] Redis instance check: test-runner's redis === consumer's redis? ${finWebhookConsumer.redis === redis}`);
  (globalThis as any)._forceMockPool = true;
  const workRepository = await getWorkRepositoryLazy();
  
  const testWork1 = {
    id: "work-TEST-001",
    workId: "work-TEST-001",
    workspaceId: "workspace-test-001",
    actorId: "actor-test-001",
    status: "IN_PROGRESS",
    type: "payment",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await workRepository.create(testWork1);
  console.log("[TestRunner] Test work created successfully");
  
  // Test 1: Basic webhook processing
  console.log("\n[TestRunner] Running TEST1: Basic webhook processing...");
  const test1Result = await runTest1();
  
  // Test 2: Duplicate idempotency
  console.log("\n[TestRunner] Running TEST2: Duplicate idempotency check...");
  const test2Result = await runTest2();
  
  // Test 3: Crash recovery
  console.log("\n[TestRunner] Running TEST3: Crash recovery...");
  const test3Result = await runTest3();
  
  const allPassed = test1Result.passed && test2Result.passed && test3Result.passed;
  console.log(`\n[TestRunner] Final Result: ${allPassed ? "ALL_PASSED" : "FAILED"}`);
  
  // Save overall evidence
  const overallEvidence = {
    testSuite: "WORKER-001",
    timestamp: new Date().toISOString(),
    allPassed,
    testResults: [test1Result, test2Result, test3Result]
  };
  
  const overallEvidencePath = statePath('evidence', 'FIN-001-W2', 'overall-results.json');
  await fs.mkdir(statePath('evidence', 'FIN-001-W2'), { recursive: true });
  await fs.writeFile(overallEvidencePath, JSON.stringify(overallEvidence, null, 2));
  console.log(`[TestRunner] Overall evidence saved to: ${overallEvidencePath}`);
  
  process.exit(allPassed ? 0 : 1);
}

async function runTest1() {
  try {
    const webhookPayload = {
      order_id: "TEST-ORDER-001",
      status_code: 200,
      gross_amount: 100000,
      payment_type: "gopay",
      transaction_time: new Date().toISOString(),
      transaction_status: "settlement"
    };
    
    const result = await finWebhookConsumer.handleMidtransWebhookUpdate(webhookPayload);
    const passed = result.success === true;
    
    const evidencePath = statePath('evidence', 'FIN-001-W2', 'test1-basic-processing.json');
    await fs.writeFile(evidencePath, JSON.stringify({
      testId: "TEST1-BASIC-PROCESSING",
      passed,
      payload: webhookPayload,
      result,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log(`[TestRunner] TEST1 ${passed ? "PASSED" : "FAILED"}`);
    return { testId: "TEST1", passed };
  } catch (error) {
    console.error("[TestRunner] TEST1 error:", error);
    return { testId: "TEST1", passed: false, error: String(error) };
  }
}

async function runTest2() {
  try {
    const webhookPayload = {
      order_id: "TEST-ORDER-002",
      status_code: 200,
      gross_amount: 50000,
      payment_type: "bank_transfer",
      transaction_time: new Date().toISOString(),
      transaction_status: "pending"
    };
    
    // First call
    await finWebhookConsumer.handleMidtransWebhookUpdate(webhookPayload);
    // Duplicate call
    const duplicateResult = await finWebhookConsumer.handleMidtransWebhookUpdate(webhookPayload);
    
    const passed = duplicateResult.idempotent === true;
    
    const evidencePath = statePath('evidence', 'FIN-001-W2', 'test2-idempotency.json');
    await fs.writeFile(evidencePath, JSON.stringify({
      testId: "TEST2-IDEMPOTENCY",
      passed,
      payload: webhookPayload,
      duplicateResult,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log(`[TestRunner] TEST2 ${passed ? "PASSED" : "FAILED"}`);
    return { testId: "TEST2", passed };
  } catch (error) {
    console.error("[TestRunner] TEST2 error:", error);
    return { testId: "TEST2", passed: false, error: String(error) };
  }
}

async function runTest3() {
  try {
    // Add stale item to queue
    const staleItem = {
      id: "STALE-TEST-001",
      status: "PROCESSING",
      createdAt: Date.now() - 10 * 60 * 1000 // 10 minutes old
    };
    
    await redis.set(FinWebhookConsumer.WEBHOOK_PROCESSING_KEY, JSON.stringify([staleItem]));
    
    // Trigger recovery
    await finWebhookConsumer.recoverStaleItems();
    
    // Check results
    const processingQueue = JSON.parse(await redis.get(FinWebhookConsumer.WEBHOOK_PROCESSING_KEY) || "[]");
    const mainQueue = JSON.parse(await redis.get(FinWebhookConsumer.WEBHOOK_QUEUE_KEY) || "[]");
    
    const wasRecovered = mainQueue.some(item => JSON.parse(item).id === "STALE-TEST-001");
    const wasRemoved = !processingQueue.some(item => JSON.parse(item).id === "STALE-TEST-001");
    const crashRecoveryPassed = wasRecovered && wasRemoved;
    
    const test3EvidencePath = statePath('evidence', 'FIN-001-W2', 'test3-crash-recovery.json');
    const test3Evidence = {
      testId: "TEST3-CRASH-RECOVERY",
      workItemId: "WORKER-001",
      timestamp: new Date().toISOString(),
      objective: "Verify worker crash recovery: stale items in processing queue are requeued without duplication",
      configuration: {
        staleThresholdMs: 5 * 60 * 1000,
        maxAttempts: 3,
        processingQueueKey: FinWebhookConsumer.WEBHOOK_PROCESSING_KEY,
        mainQueueKey: FinWebhookConsumer.WEBHOOK_QUEUE_KEY
      },
      results: {
        staleItemAdded: true,
        wasRecovered,
        wasRemoved,
        crashRecoveryPassed
      }
    };
    
    await fs.writeFile(test3EvidencePath, JSON.stringify(test3Evidence, null, 2));
    console.log(`[TestRunner] TEST3 Crash recovery passed: ${crashRecoveryPassed}`);
    
    const evidenceDir = statePath('evidence', 'FIN-001-W2');
    await fs.mkdir(evidenceDir, { recursive: true });
    
    return { testId: "TEST3", passed: crashRecoveryPassed };
  } catch (error) {
    console.error("[TestRunner] TEST3 error:", error);
    return { testId: "TEST3", passed: false, error: String(error) };
  }
}

runAllTests().catch(err => {
  console.error("[TestRunner] Fatal error:", err);
  process.exit(1);
});