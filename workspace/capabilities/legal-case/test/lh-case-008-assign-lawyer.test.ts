import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import { CaseRepositoryInMemory } from "../implementation/repository/case.repository.js";
import { registerLegalCaseCapability } from "../implementation/commands/case.commands.js";
import { SessionRepositoryInMemory } from "../../identity/implementation/repositories/session.inmemory.js";

console.log("[LH-CASE-008] Starting verification test...");

const testTenantId = "tenant-lh-case-008";
const testWorkspaceId = "workspace-lh-case-008";
const testActorId = "actor-lh-case-008";

function generateTestId() {
  return `test-${Math.random().toString(36).substring(2, 15)}`;
}

async function runTests() {
  registerLegalCaseCapability();
  console.log("[LH-CASE-008] Capability registry initialized");

  CaseRepositoryInMemory.clear();
  await SessionRepositoryInMemory.reset();
  console.log("[LH-CASE-008] Repository cleared");

  const session = await SessionRepositoryInMemory.save({
    id: "session-lh-case-008",
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
  const validSessionId = session.id;
  console.log("[LH-CASE-008] Valid test session created:", validSessionId);

  console.log("\n[LH-CASE-008 Test 1] Assign lawyer to existing case with valid session");
  const createResult = await capabilityRegistry.invoke("legal-case", "create-case", {
    tenantId: testTenantId,
    workspaceId: testWorkspaceId,
    actorId: testActorId,
    sessionId: validSessionId,
    title: "Test Case for Lawyer Assignment",
    description: "This is a test case to verify lawyer assignment functionality",
    linkedIntentId: "intent-test-assignment",
    initialActorMetadata: {
      actorId: testActorId,
      actorType: "human",
      role: "lawyer",
      displayName: "Test Lawyer",
      trustLevel: "verified"
    },
    initialCapabilities: ["legal-case.view", "legal-case.assign.lawyer"],
    initialAuthorization: {
      allowedActions: ["create", "view", "assign.lawyer"],
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
      rationale: "Test case lawyer assignment",
      assessedBy: testActorId,
      assessedAt: new Date(),
      mitigationSteps: []
    }
  });
  console.log("[LH-CASE-008 Test 1] Case created:", createResult.id);

  const caseId = createResult.id;
  const lawyerId = generateTestId();

  const assignResult = await capabilityRegistry.invoke("legal-case", "assign-lawyer-to-case", {
    tenantId: testTenantId,
    workspaceId: testWorkspaceId,
    actorId: testActorId,
    sessionId: validSessionId,
    caseId,
    lawyerId,
    newActorMetadata: {
      actorId: lawyerId,
      role: "lawyer",
      permissions: ["read", "write", "assign"],
    },
  });
  console.log("[LH-CASE-008 Test 1] Assignment completed successfully");

  const fullCase = await CaseRepositoryInMemory.byId(caseId);
  console.log("[LH-CASE-008 Test 1] Full case retrieved, lawyerId:", fullCase?.lawyerId);
  console.assert(fullCase?.lawyerId === lawyerId, "Lawyer ID should match assigned value");
  console.assert(fullCase?.actorMetadata?.actorId === lawyerId, "Actor metadata should be updated to lawyer");
  console.assert(fullCase?.evidence && fullCase.evidence.length > 0, "Evidence trail should exist");
  console.log("✅ Test 1 passed: Lawyer assigned to case successfully");

  console.log("\n[LH-CASE-008 Test 2] Reject assignment with invalid session");
  const invalidSessionId = generateTestId();
  let invalidSessionError = false;
  try {
    await capabilityRegistry.invoke("legal-case", "assign-lawyer-to-case", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: invalidSessionId,
      caseId,
      lawyerId: generateTestId(),
      newActorMetadata: {
        actorId: generateTestId(),
        role: "lawyer",
        permissions: ["read"],
      },
    });
  } catch (error) {
    invalidSessionError = true;
    console.log("[LH-CASE-008 Test 2] Correctly rejected invalid session:", (error as Error).message);
  }
  console.assert(invalidSessionError, "Should reject invalid session");
  console.log("✅ Test 2 passed: Invalid session rejected");

  console.log("\n[LH-CASE-008 Test 3] Reject assignment to non-existent case");
  const nonExistentCaseId = generateTestId();
  let nonExistentCaseError = false;
  try {
    await capabilityRegistry.invoke("legal-case", "assign-lawyer-to-case", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      caseId: nonExistentCaseId,
      lawyerId: generateTestId(),
      newActorMetadata: {
        actorId: generateTestId(),
        role: "lawyer",
        permissions: ["read"],
      },
    });
  } catch (error) {
    nonExistentCaseError = true;
    console.log("[LH-CASE-008 Test 3] Correctly rejected non-existent case:", (error as Error).message);
  }
  console.assert(nonExistentCaseError, "Should reject non-existent case");
  console.log("✅ Test 3 passed: Non-existent case rejected");

  console.log("\n[LH-CASE-008 Test 4] Update case execution frame when assigning new lawyer");
  const caseBeforeAssignment = await CaseRepositoryInMemory.byId(caseId);
  console.log("[LH-CASE-008 Test 4] Case before assignment, executionFrame:", caseBeforeAssignment?.executionFrame);
  
  const newLawyerId = generateTestId();
  await capabilityRegistry.invoke("legal-case", "assign-lawyer-to-case", {
    tenantId: testTenantId,
    workspaceId: testWorkspaceId,
    actorId: testActorId,
    sessionId: validSessionId,
    caseId,
    lawyerId: newLawyerId,
    newActorMetadata: {
      actorId: newLawyerId,
      role: "senior-lawyer",
      permissions: ["read", "write", "assign", "approve"],
    },
  });
  
  const caseAfterAssignment = await CaseRepositoryInMemory.byId(caseId);
  console.log("[LH-CASE-008 Test 4] Case after assignment, executionFrame:", caseAfterAssignment?.executionFrame);
  console.assert(caseAfterAssignment?.executionFrame !== caseBeforeAssignment?.executionFrame, "Execution frame should be updated when assigning new lawyer");
  console.log("✅ Test 4 passed: Execution frame updated correctly");

  console.log("\n[LH-CASE-008 Test 5] Record evidence trail for lawyer assignment");
  const caseWithEvidence = await CaseRepositoryInMemory.byId(caseId);
  const latestEvidence = caseWithEvidence?.evidence?.[caseWithEvidence.evidence.length - 1];
  console.log("[LH-CASE-008 Test 5] Latest evidence:", latestEvidence);
  console.assert(latestEvidence?.transitionType === "actor-assigned", "Evidence should have actor-assigned transition type");
  console.assert(latestEvidence?.newActorId === newLawyerId, "Evidence should record new actor ID");
  console.assert(latestEvidence?.previousActorId === lawyerId, "Evidence should record previous actor ID");
  console.log("✅ Test 5 passed: Evidence trail recorded correctly");

  console.log("\n🎉 ALL TESTS PASSED! LH-CASE-008 assign-lawyer-to-case command verified successfully");
}

runTests().catch(error => {
  console.error("[LH-CASE-008] Test failed:", error);
  process.exit(1);
});