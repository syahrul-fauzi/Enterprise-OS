import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import { CaseRepositoryInMemory } from "../implementation/repository/case.repository.js";
import { registerLegalCaseCapability } from "../implementation/commands/case.commands.js";
import { SessionRepositoryInMemory } from "../../identity/implementation/repositories/session.inmemory.js";

console.log("[LH-CASE-011] Starting verification test...");

const testTenantId = "tenant-lh-case-011";
const testWorkspaceId = "workspace-lh-case-011";
const testActorId = "actor-lh-case-011";

async function runTests() {
  registerLegalCaseCapability();
  console.log("[LH-CASE-011] Capability registry initialized");

  CaseRepositoryInMemory.clear();
  await SessionRepositoryInMemory.reset();
  console.log("[LH-CASE-011] Repository cleared");

  const session = await SessionRepositoryInMemory.save({
    id: "session-lh-case-011",
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
  console.log("[LH-CASE-011] Test session created:", validSessionId);

  let testPassed = 0;
  let testFailed = 0;

  try {
    console.log("\n[LH-CASE-011 Test 1] Create test case in draft status");
    const createResult = await capabilityRegistry.invoke("legal-case", "create-case", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      title: "Test Case for Review",
      description: "This is a test case that will go through review process",
      linkedIntentId: "intent-lh-case-011",
      initialActorMetadata: {
        actorId: testActorId,
        actorType: "human",
        role: "lawyer",
        displayName: "Test Lawyer",
        trustLevel: "verified"
      },
      initialCapabilities: ["legal-case.create", "legal-case.submit", "legal-case.mark-under-review", "legal-case.review"],
      initialAuthorization: {
        allowedActions: ["create", "submit", "mark-under-review", "review"],
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
        rationale: "Test case review",
        assessedBy: testActorId,
        assessedAt: new Date(),
        mitigationSteps: []
      }
    });

    const caseId = createResult.id;
    console.log("[LH-CASE-011 Test 1] Case created:", caseId);
    const createdCase = await CaseRepositoryInMemory.byId(caseId);
    console.log("[LH-CASE-011 Test 1] Case status:", createdCase.status);
    
    if (createdCase.status === "draft") {
      console.log("✅ Test 1 passed: Case created in draft status");
      testPassed++;
    } else {
      throw new Error(`Expected status 'draft' but got '${createdCase.status}'`);
    }

    console.log("\n[LH-CASE-011 Test 2] Submit case to get to submitted status");
    const submitResult = await capabilityRegistry.invoke("legal-case", "submit", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      caseId
    });
    console.log("[LH-CASE-011 Test 2] Case submitted");
    const submittedCase = await CaseRepositoryInMemory.byId(caseId);
    
    if (submittedCase.status === "submitted") {
      console.log("✅ Test 2 passed: Case submitted successfully, status changed to 'submitted'");
      testPassed++;
    } else {
      throw new Error(`Expected status 'submitted' but got '${submittedCase.status}'`);
    }

    console.log("\n[LH-CASE-011 Test 3] Mark case under review (payment trigger)");
    const markUnderReviewResult = await capabilityRegistry.invoke("legal-case", "mark-under-review", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      caseId,
      paymentAmount: 5000000
    });
    console.log("[LH-CASE-011 Test 3] Case marked under review");
    const underReviewCase = await CaseRepositoryInMemory.byId(caseId);
    
    if (underReviewCase.status === "under_review") {
      console.log("✅ Test 3 passed: Case marked under review, status changed to 'under_review'");
      testPassed++;
    } else {
      throw new Error(`Expected status 'under_review' but got '${underReviewCase.status}'`);
    }

    console.log("\n[LH-CASE-011 Test 4] Review case from under_review status");
    const reviewResult = await capabilityRegistry.invoke("legal-case", "review", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      caseId
    });
    console.log("[LH-CASE-011 Test 4] Case reviewed");
    const reviewedCase = await CaseRepositoryInMemory.byId(caseId);
    
    if (reviewedCase.status === "reviewed") {
      console.log("✅ Test 4 passed: Case reviewed successfully, status changed to 'reviewed'");
      testPassed++;
    } else {
      throw new Error(`Expected status 'reviewed' but got '${reviewedCase.status}'`);
    }

    console.log("\n[LH-CASE-011 Test 5] Verify reviewedAt timestamp is set");
    if (reviewedCase.reviewedAt && reviewedCase.reviewedAt instanceof Date) {
      console.log("✅ Test 5 passed: reviewedAt timestamp is correctly set");
      testPassed++;
    } else {
      throw new Error("reviewedAt timestamp not set correctly");
    }

  } catch (error) {
    testFailed++;
    console.error("[LH-CASE-011] Test failed with error:", error);
    throw error;
  }

  console.log("\n" + "=".repeat(80));
  console.log(`🎉 ALL TESTS PASSED! LH-CASE-011 User reviews legal matter verified successfully`);
  console.log(`✅ Total tests: ${testPassed}`);
  console.log("=".repeat(80));
  
  return { passed: testPassed, failed: testFailed };
}

runTests().catch(error => {
  console.error("[LH-CASE-011] Test suite failed:", error);
  process.exit(1);
});