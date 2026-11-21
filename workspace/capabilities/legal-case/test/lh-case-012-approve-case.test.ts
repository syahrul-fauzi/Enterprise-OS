import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import { CaseRepositoryInMemory } from "../implementation/repository/case.repository.js";
import { registerLegalCaseCapability } from "../implementation/commands/case.commands.js";
import { SessionRepositoryInMemory } from "../../identity/implementation/repositories/session.inmemory.js";

console.log("[LH-CASE-012] Starting verification test...");

const testTenantId = "tenant-lh-case-012";
const testWorkspaceId = "workspace-lh-case-012";
const testActorId = "actor-lh-case-012";

async function runTests() {
  registerLegalCaseCapability();
  console.log("[LH-CASE-012] Capability registry initialized");

  CaseRepositoryInMemory.clear();
  await SessionRepositoryInMemory.reset();
  console.log("[LH-CASE-012] Repository cleared");

  const session = await SessionRepositoryInMemory.save({
    id: "session-lh-case-012",
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
  console.log("[LH-CASE-012] Test session created:", validSessionId);

  let testPassed = 0;
  let testFailed = 0;

  try {
    console.log("\n[LH-CASE-012 Test 1] Create test case in draft status");
    const createResult = await capabilityRegistry.invoke("legal-case", "create-case", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      title: "Test Case for Approval",
      description: "This is a test case that will go through approval process",
      linkedIntentId: "intent-lh-case-012",
      initialActorMetadata: {
        actorId: testActorId,
        actorType: "human",
        role: "lawyer",
        displayName: "Test Lawyer",
        trustLevel: "verified"
      },
      initialCapabilities: ["legal-case.create", "legal-case.submit", "legal-case.mark-under-review", "legal-case.review", "legal-case.approve"],
      initialAuthorization: {
        allowedActions: ["create", "submit", "mark-under-review", "review", "approve"],
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
        rationale: "Test case approval",
        assessedBy: testActorId,
        assessedAt: new Date(),
        mitigationSteps: []
      }
    });

    const caseId = createResult.id;
    console.log("[LH-CASE-012 Test 1] Case created:", caseId);
    const createdCase = await CaseRepositoryInMemory.byId(caseId);
    console.log("[LH-CASE-012 Test 1] Case status:", createdCase.status);
    
    if (createdCase.status === "draft") {
      console.log("✅ Test 1 passed: Case created in draft status");
      testPassed++;
    } else {
      throw new Error(`Expected status 'draft' but got '${createdCase.status}'`);
    }

    console.log("\n[LH-CASE-012 Test 2] Submit case, mark under review, and review case");
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
    
    const reviewedCase = await CaseRepositoryInMemory.byId(caseId);
    console.log("[LH-CASE-012 Test 2] Case status after review:", reviewedCase.status);
    
    if (reviewedCase.status === "reviewed") {
      console.log("✅ Test 2 passed: Case workflow completed, status is 'reviewed'");
      testPassed++;
    } else {
      throw new Error(`Expected status 'reviewed' but got '${reviewedCase.status}'`);
    }

    console.log("\n[LH-CASE-012 Test 3] Approve case from reviewed status");
    const approveResult = await capabilityRegistry.invoke("legal-case", "approve", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      caseId
    });
    console.log("[LH-CASE-012 Test 3] Case approved");
    const approvedCase = await CaseRepositoryInMemory.byId(caseId);
    
    if (approvedCase.status === "approved") {
      console.log("✅ Test 3 passed: Case approved successfully, status changed to 'approved'");
      testPassed++;
    } else {
      throw new Error(`Expected status 'approved' but got '${approvedCase.status}'`);
    }

    console.log("\n[LH-CASE-012 Test 4] Verify approvedAt timestamp is set");
    if (approvedCase.approvedAt && approvedCase.approvedAt instanceof Date) {
      console.log("✅ Test 4 passed: approvedAt timestamp is correctly set");
      testPassed++;
    } else {
      throw new Error("approvedAt timestamp not set correctly");
    }

    console.log("\n[LH-CASE-012 Test 5] Verify full workflow: draft → submitted → under_review → reviewed → approved");
    if (approvedCase.submittedAt && approvedCase.underReviewAt && approvedCase.reviewedAt && approvedCase.approvedAt) {
      console.log("✅ Test 5 passed: All workflow timestamps are correctly recorded");
      testPassed++;
    } else {
      throw new Error("Not all workflow timestamps are recorded correctly");
    }

  } catch (error) {
    testFailed++;
    console.error("[LH-CASE-012] Test failed with error:", error);
    throw error;
  }

  console.log("\n" + "=".repeat(80));
  console.log(`🎉 ALL TESTS PASSED! LH-CASE-012 User approves legal matter verified successfully`);
  console.log(`✅ Total tests: ${testPassed}`);
  console.log("=".repeat(80));
  
  return { passed: testPassed, failed: testFailed };
}

runTests().catch(error => {
  console.error("[LH-CASE-012] Test suite failed:", error);
  process.exit(1);
});