import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import { CaseRepositoryInMemory } from "../implementation/repository/case.repository.js";
import { registerLegalCaseCapability } from "../implementation/commands/case.commands.js";
import { SessionRepositoryInMemory } from "../../identity/implementation/repositories/session.inmemory.js";

console.log("[LH-CASE-014] Starting verification test...");

const testTenantId = "tenant-lh-case-014";
const testWorkspaceId = "workspace-lh-case-014";
const testActorId = "actor-lh-case-014";

async function runTests() {
  registerLegalCaseCapability();
  console.log("[LH-CASE-014] Capability registry initialized");

  CaseRepositoryInMemory.clear();
  await SessionRepositoryInMemory.reset();
  console.log("[LH-CASE-014] Repository cleared");

  const session = await SessionRepositoryInMemory.save({
    id: "session-lh-case-014",
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
  console.log("[LH-CASE-014] Test session created:", validSessionId);

  let testPassed = 0;
  let testFailed = 0;

  try {
    console.log("\n[LH-CASE-014 Test 1] Create test case and go through full workflow to archived status");
    const createResult = await capabilityRegistry.invoke("legal-case", "create-case", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      title: "Test Case for Reopening",
      description: "This is a test case that will go through reopen process",
      linkedIntentId: "intent-lh-case-014",
      initialActorMetadata: {
        actorId: testActorId,
        actorType: "human",
        role: "lawyer",
        displayName: "Test Lawyer",
        trustLevel: "verified"
      },
      initialCapabilities: ["legal-case.create", "legal-case.submit", "legal-case.mark-under-review", "legal-case.review", "legal-case.approve", "legal-case.close", "legal-case.archive", "legal-case.reopen"],
      initialAuthorization: {
        allowedActions: ["create", "submit", "mark-under-review", "review", "approve", "close", "archive", "reopen"],
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
        rationale: "Test case reopening",
        assessedBy: testActorId,
        assessedAt: new Date(),
        mitigationSteps: []
      }
    });

    const caseId = createResult.id;
    console.log("[LH-CASE-014 Test 1] Case created:", caseId);
    
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
    
    await capabilityRegistry.invoke("legal-case", "archive", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      caseId
    });
    
    const archivedCase = await CaseRepositoryInMemory.byId(caseId);
    console.log("[LH-CASE-014 Test 1] Case status after archive:", archivedCase.status);
    
    if (archivedCase.status === "archived") {
      console.log("✅ Test 1 passed: Case workflow completed, status is 'archived'");
      testPassed++;
    } else {
      throw new Error(`Expected status 'archived' but got '${archivedCase.status}'`);
    }

    console.log("\n[LH-CASE-014 Test 2] Reopen case from archived status");
    const reopenResult = await capabilityRegistry.invoke("legal-case", "reopen", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      caseId
    });
    console.log("[LH-CASE-014 Test 2] Case reopened");
    const reopenedCase = await CaseRepositoryInMemory.byId(caseId);
    
    if (reopenedCase.status === "draft") {
      console.log("✅ Test 2 passed: Case reopened successfully, status changed to 'draft'");
      testPassed++;
    } else {
      throw new Error(`Expected status 'draft' but got '${reopenedCase.status}'`);
    }

    console.log("\n[LH-CASE-014 Test 3] Verify reopenedAt timestamp is set");
    if (reopenedCase.reopenedAt && reopenedCase.reopenedAt instanceof Date) {
      console.log("✅ Test 3 passed: reopenedAt timestamp is correctly set");
      testPassed++;
    } else {
      throw new Error("reopenedAt timestamp not set correctly");
    }

    console.log("\n[LH-CASE-014 Test 4] Verify full workflow: draft → submitted → under_review → reviewed → approved → settled → archived → draft");
    if (reopenedCase.submittedAt && reopenedCase.underReviewAt && reopenedCase.reviewedAt && reopenedCase.approvedAt && reopenedCase.closedAt && reopenedCase.archivedAt && reopenedCase.reopenedAt) {
      console.log("✅ Test 4 passed: All workflow timestamps including reopenedAt are correctly recorded");
      testPassed++;
    } else {
      throw new Error("Not all workflow timestamps are recorded correctly");
    }

    console.log("\n[LH-CASE-014 Test 5] Verify case can go through workflow again after reopening");
    await capabilityRegistry.invoke("legal-case", "submit", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      caseId
    });
    
    const resubmittedCase = await CaseRepositoryInMemory.byId(caseId);
    console.log("[LH-CASE-014 Test 5] Case status after resubmit:", resubmittedCase.status);
    
    if (resubmittedCase.status === "submitted") {
      console.log("✅ Test 5 passed: Case can go through workflow again after reopening");
      testPassed++;
    } else {
      throw new Error(`Expected status 'submitted' but got '${resubmittedCase.status}'`);
    }

  } catch (error) {
    testFailed++;
    console.error("[LH-CASE-014] Test failed with error:", error);
    throw error;
  }

  console.log("\n" + "=".repeat(80));
  console.log(`🎉 ALL TESTS PASSED! LH-CASE-014 User reopens legal matter verified successfully`);
  console.log(`✅ Total tests: ${testPassed}`);
  console.log("=".repeat(80));
  
  return { passed: testPassed, failed: testFailed };
}

runTests().catch(error => {
  console.error("[LH-CASE-014] Test suite failed:", error);
  process.exit(1);
});