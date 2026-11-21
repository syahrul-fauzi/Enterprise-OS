import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import { CaseRepositoryInMemory } from "../implementation/repository/case.repository.js";
import { registerLegalCaseCapability } from "../implementation/commands/case.commands.js";
import { SessionRepositoryInMemory } from "../../identity/implementation/repositories/session.inmemory.js";

console.log("[LH-CASE-013] Starting verification test...");

const testTenantId = "tenant-lh-case-013";
const testWorkspaceId = "workspace-lh-case-013";
const testActorId = "actor-lh-case-013";

async function runTests() {
  registerLegalCaseCapability();
  console.log("[LH-CASE-013] Capability registry initialized");

  CaseRepositoryInMemory.clear();
  await SessionRepositoryInMemory.reset();
  console.log("[LH-CASE-013] Repository cleared");

  const session = await SessionRepositoryInMemory.save({
    id: "session-lh-case-013",
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
    updatedAt: new Date(),
    context: {
      jurisdiction: "ID",
      requestCategory: "legal-litigation",
      sensitivityLevel: "internal"
    }
  });
  const validSessionId = session.id;
  console.log("[LH-CASE-013] Test session created:", validSessionId);

  let testPassed = 0;
  let testFailed = 0;

  try {
    console.log("\n[LH-CASE-013 Test 1] Create test case in draft status");
    const createResult = await capabilityRegistry.invoke("legal-case", "create-case", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      title: "Test Case for Archiving",
      description: "This is a test case that will go through archive process",
      linkedIntentId: "intent-lh-case-013",
      initialActorMetadata: {
        actorId: testActorId,
        actorType: "human",
        role: "lawyer",
        displayName: "Test Lawyer",
        trustLevel: "verified"
      },
      initialCapabilities: ["legal-case.create", "legal-case.submit", "legal-case.mark-under-review", "legal-case.review", "legal-case.approve", "legal-case.close", "legal-case.archive"],
      initialAuthorization: {
        allowedActions: ["create", "submit", "mark-under-review", "review", "approve", "close", "archive"],
        expiryTimestamp: new Date(Date.now() + 3600000).toISOString()
      },
      caseContext: {
        tenantId: testTenantId,
        workspaceId: testWorkspaceId,
        jurisdiction: "ID",
        requestCategory: "legal-litigation",
        sensitivityLevel: "internal",
        relatedWorkIds: []
      },
      initialRiskAssessment: {
        level: "low",
        rationale: "Test case archiving",
        assessedBy: testActorId,
        assessedAt: new Date(),
        mitigationSteps: []
      }
    });

    const caseId = createResult.id;
    console.log("[LH-CASE-013 Test 1] Case created:", caseId);
    const createdCase = await CaseRepositoryInMemory.byId(caseId);
    console.log("[LH-CASE-013 Test 1] Case status:", createdCase.status);
    
    if (createdCase.status === "draft") {
      console.log("✅ Test 1 passed: Case created in draft status");
      testPassed++;
    } else {
      throw new Error(`Expected status 'draft' but got '${createdCase.status}'`);
    }

    console.log("\n[LH-CASE-013 Test 2] Complete workflow up to settled status");
    await capabilityRegistry.invoke("legal-case", "submit", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      caseId
    });
    
    await capabilityRegistry.invoke("legal-case", "mark-under-review", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      caseId,
      paymentAmount: 5000000
    });
    
    await capabilityRegistry.invoke("legal-case", "review", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      caseId
    });
    
    await capabilityRegistry.invoke("legal-case", "approve", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      caseId
    });
    
    await capabilityRegistry.invoke("legal-case", "close", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      caseId
    });
    
    const closedCase = await CaseRepositoryInMemory.byId(caseId);
    console.log("[LH-CASE-013 Test 2] Case status after close:", closedCase.status);
    
    if (closedCase.status === "settled") {
      console.log("✅ Test 2 passed: Case workflow completed, status is 'settled'");
      testPassed++;
    } else {
      throw new Error(`Expected status 'settled' but got '${closedCase.status}'`);
    }

    console.log("\n[LH-CASE-013 Test 3] Archive case from settled status");
    const archiveResult = await capabilityRegistry.invoke("legal-case", "archive", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      caseId
    });
    console.log("[LH-CASE-013 Test 3] Case archived");
    const archivedCase = await CaseRepositoryInMemory.byId(caseId);
    
    if (archivedCase.status === "archived") {
      console.log("✅ Test 3 passed: Case archived successfully, status changed to 'archived'");
      testPassed++;
    } else {
      throw new Error(`Expected status 'archived' but got '${archivedCase.status}'`);
    }

    console.log("\n[LH-CASE-013 Test 4] Verify archivedAt timestamp is set");
    if (archivedCase.archivedAt && archivedCase.archivedAt instanceof Date) {
      console.log("✅ Test 4 passed: archivedAt timestamp is correctly set");
      testPassed++;
    } else {
      throw new Error("archivedAt timestamp not set correctly");
    }

    console.log("\n[LH-CASE-013 Test 5] Verify full workflow: draft → submitted → under_review → reviewed → approved → settled → archived");
    if (archivedCase.submittedAt && archivedCase.underReviewAt && archivedCase.reviewedAt && archivedCase.approvedAt && archivedCase.closedAt && archivedCase.archivedAt) {
      console.log("✅ Test 5 passed: All workflow timestamps are correctly recorded");
      testPassed++;
    } else {
      throw new Error("Not all workflow timestamps are recorded correctly");
    }

  } catch (error) {
    testFailed++;
    console.error("[LH-CASE-013] Test failed with error:", error);
    throw error;
  }

  console.log("\n" + "=".repeat(80));
  console.log(`🎉 ALL TESTS PASSED! LH-CASE-013 User archives legal matter verified successfully`);
  console.log(`✅ Total tests: ${testPassed}`);
  console.log("=".repeat(80));
  
  return { passed: testPassed, failed: testFailed };
}

runTests().catch(error => {
  console.error("[LH-CASE-013] Test suite failed:", error);
  process.exit(1);
});