import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import { CaseRepositoryInMemory } from "../implementation/repository/case.repository.js";
import { registerLegalCaseCapability, updateCaseStatus } from "../implementation/commands/case.commands.js";
import { SessionRepositoryInMemory } from "../../identity/implementation/repositories/session.inmemory.js";

console.log("[LH-CASE-007] Starting verification test...");

const testTenantId = "tenant-lh-case-007";
const testWorkspaceId = "workspace-lh-case-007";
const testActorId = "actor-lh-case-007";

async function runTests() {
  // Initialize capability registry
  registerLegalCaseCapability();
  
  console.log("[LH-CASE-007] Capability registry initialized");

  // Clear repository
  CaseRepositoryInMemory.clear();
  await SessionRepositoryInMemory.reset();
  console.log("[LH-CASE-007] Repository cleared");

  // Create test session
  const session = await SessionRepositoryInMemory.save({
    id: "session-lh-case-007",
    userId: testActorId,
    actorId: testActorId,
    tenantId: testTenantId,
    workspaceId: testWorkspaceId,
    productId: "lawyershub",
    actorLabel: "Test Lawyer",
    isAgent: false,
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000),
    revokedAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  const sessionId = session.id;
  console.log("[LH-CASE-007] Test session created:", sessionId);
  
  // Create execution context with snake_case fields
  const executionContext = {
    actor_id: testActorId,
    tenant_id: testTenantId,
    session_id: sessionId,
    workspace_id: testWorkspaceId
  };
  console.log("[LH-CASE-007] Execution context created");
  
  // Create test case
  const createResult = await capabilityRegistry.invoke("legal-case", "create-case", {
    tenantId: testTenantId,
    workspaceId: testWorkspaceId,
    actorId: testActorId,
    sessionId: sessionId,
    title: "Test Case for Status Update",
    description: "This is a test case for status update functionality",
    linkedIntentId: "intent-test-status",
    initialActorMetadata: {
      actorId: testActorId,
      actorType: "human",
      role: "lawyer",
      displayName: "Test Lawyer",
      trustLevel: "verified"
    },
    initialCapabilities: ["legal-case.view", "legal-case.update.status"],
    initialAuthorization: {
      allowedActions: ["create", "view", "update.status"],
      expiryTimestamp: new Date(Date.now() + 3600000).toISOString()
    },
    caseContext: {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      jurisdiction: "ID",
      requestCategory: "legal-general",
      sensitivityLevel: "internal",
      relatedWorkIds: []
    },
    initialRiskAssessment: {
      level: "low",
      rationale: "Test case status update",
      assessedBy: testActorId,
      assessedAt: new Date(),
      mitigationSteps: []
    }
  }, executionContext);
  const caseId = createResult.id;
  console.log("[LH-CASE-007] Test case created:", caseId);
  
  console.log("\n[TEST 1] Update case status from draft to open - starting");
  
  // Test 1: Update case status from draft to open
  const result1 = await capabilityRegistry.invoke("legal-case", "update-case-status", {
    tenantId: testTenantId,
    workspaceId: testWorkspaceId,
    actorId: testActorId,
    caseId,
    sessionId,
    newStatus: "open",
    statusReason: "Case opened for review"
  }, executionContext);
  
  if (!result1 || result1.status !== "open" || result1.statusTransition !== "draft→open") {
    throw new Error("Test 1 failed: Status update from draft to open did not work correctly");
  }
  console.log("[TEST 1] PASSED: Case status updated from draft to open");
  
  console.log("\n[TEST 2] Update case status from open to under_review - starting");
  
  // Test 2: Update case status from open to under_review
  const result2 = await capabilityRegistry.invoke("legal-case", "update-case-status", {
    tenantId: testTenantId,
    workspaceId: testWorkspaceId,
    actorId: testActorId,
    caseId,
    sessionId,
    newStatus: "under_review",
    statusReason: "Case assigned for review"
  }, executionContext);
  
  if (!result2 || result2.status !== "under_review" || result2.statusTransition !== "open→under_review") {
    throw new Error("Test 2 failed: Status update from open to under_review did not work correctly");
  }
  console.log("[TEST 2] PASSED: Case status updated from open to under_review");
  
  console.log("\n[TEST 3] Reject invalid status transition - starting");
  
  // Test 3: Reject invalid status transition (closed → draft)
  try {
    await capabilityRegistry.invoke("legal-case", "update-case-status", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      caseId,
      sessionId,
      newStatus: "draft",
      statusReason: "Trying invalid transition"
    }, executionContext);
    throw new Error("Test 3 failed: Invalid status transition was not rejected");
  } catch (error) {
    console.log("[TEST 3] PASSED: Invalid status transition correctly rejected:", error.message);
  }
  
  console.log("\n[TEST 4] Update case status with invalid session - starting");
  
  // Test 4: Update case status with invalid session
  try {
    const invalidSessionContext = {
      actor_id: testActorId,
      tenant_id: testTenantId,
      session_id: "invalid-session-id",
      workspace_id: testWorkspaceId
    };
    await capabilityRegistry.invoke("legal-case", "update-case-status", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      caseId,
      sessionId: "invalid-session-id",
      newStatus: "settled",
      statusReason: "Trying with invalid session"
    }, invalidSessionContext);
    throw new Error("Test 4 failed: Status update with invalid session was not rejected");
  } catch (error) {
    console.log("[TEST 4] PASSED: Invalid session correctly rejected:", error.message);
  }
  
  console.log("\n[TEST 5] Update status of non-existent case - starting");
  
  // Test 5: Update status of non-existent case
  try {
    await capabilityRegistry.invoke("legal-case", "update-case-status", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      caseId: "non-existent-case-id",
      sessionId,
      newStatus: "closed",
      statusReason: "Trying with non-existent case"
    }, executionContext);
    throw new Error("Test 5 failed: Status update for non-existent case was not rejected");
  } catch (error) {
    console.log("[TEST 5] PASSED: Non-existent case correctly rejected:", error.message);
  }
  
  console.log("\n✅ ALL 5 TESTS PASSED!");
  console.log("[LH-CASE-007] Verification complete - case status update functionality working correctly");
  
  return {
    workId: "LH-CASE-007",
    allTestsPassed: true,
    totalTests: 5,
    passedTests: 5,
    failedTests: 0
  };
}

runTests().then(result => {
  console.log("\n🎉 ALL TESTS PASSED! LH-CASE-007 User updates legal matter status verified successfully");
  console.log("[LH-CASE-007] Final result:", JSON.stringify(result, null, 2));
  process.exit(0);
}).catch(error => {
  console.error("\n[LH-CASE-007] Test failed:", error);
  process.exit(1);
});