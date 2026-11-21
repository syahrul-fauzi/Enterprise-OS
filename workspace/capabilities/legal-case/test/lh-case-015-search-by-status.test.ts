import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import { CaseRepositoryInMemory } from "../implementation/repository/case.repository.js";
import { registerLegalCaseCapability } from "../implementation/commands/case.commands.js";
import { SessionRepositoryInMemory } from "../../identity/implementation/repositories/session.inmemory.js";

console.log("[LH-CASE-015] Starting verification test...");

const testTenantId = "tenant-lh-case-015";
const testWorkspaceId = "workspace-lh-case-015";
const testActorId = "actor-lh-case-015";

async function runTests() {
  registerLegalCaseCapability();
  console.log("[LH-CASE-015] Capability registry initialized");

  CaseRepositoryInMemory.clear();
  await SessionRepositoryInMemory.reset();
  console.log("[LH-CASE-015] Repository cleared");

  const session = await SessionRepositoryInMemory.save({
    id: "session-lh-case-015",
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
  console.log("[LH-CASE-015] Test session created:", validSessionId);

  let testPassed = 0;
  let testFailed = 0;

  try {
    console.log("\n[LH-CASE-015 Test 1] Create test cases with different statuses");
    
    const createCase = async (title: string, status: string) => {
      const createResult = await capabilityRegistry.invoke("legal-case", "create-case", {
        tenantId: testTenantId,
        workspaceId: testWorkspaceId,
        actorId: testActorId,
        sessionId: validSessionId,
        title,
        description: `Test case ${title}`,
        linkedIntentId: `intent-lh-case-015-${title}`,
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
          rationale: "Test case for status search",
          assessedBy: testActorId,
          assessedAt: new Date(),
          mitigationSteps: []
        }
      });
      
      const caseId = createResult.id;
      
      if (status === "submitted") {
        await capabilityRegistry.invoke("legal-case", "submit", {
          tenantId: testTenantId,
          workspaceId: testWorkspaceId,
          actorId: testActorId,
          sessionId: validSessionId,
          caseId
        });
      } else if (status === "under_review") {
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
      } else if (status === "reviewed") {
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
      } else if (status === "settled") {
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
      } else if (status === "archived") {
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
      }
      
      return caseId;
    };
    
    await createCase("Draft Case 1", "draft");
    await createCase("Draft Case 2", "draft");
    await createCase("Submitted Case", "submitted");
    await createCase("Under Review Case", "under_review");
    await createCase("Reviewed Case", "reviewed");
    await createCase("Settled Case", "settled");
    await createCase("Archived Case", "archived");
    
    console.log("[LH-CASE-015 Test 1] Created 7 test cases with different statuses");
    const allCases = await CaseRepositoryInMemory.list();
    console.log("[LH-CASE-015 Test 1] Total cases in repository:", allCases.length);
    
    if (allCases.length === 7) {
      console.log("✅ Test 1 passed: All 7 test cases created successfully");
      testPassed++;
    } else {
      throw new Error(`Expected 7 test cases but got ${allCases.length}`);
    }

    console.log("\n[LH-CASE-015 Test 2] Search cases by status 'draft'");
    const draftResults = await capabilityRegistry.invoke("legal-case", "case.search", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      status: "draft"
    });
    console.log("[LH-CASE-015 Test 2] Found", draftResults.items.length, "draft cases");
    
    if (draftResults.items.length === 2) {
      console.log("✅ Test 2 passed: Search by status 'draft' returns correct count");
      testPassed++;
    } else {
      throw new Error(`Expected 2 draft cases but got ${draftResults.items.length}`);
    }

    console.log("\n[LH-CASE-015 Test 3] Search cases by status 'submitted'");
    const submittedResults = await capabilityRegistry.invoke("legal-case", "case.search", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      status: "submitted"
    });
    console.log("[LH-CASE-015 Test 3] Found", submittedResults.items.length, "submitted cases");
    
    if (submittedResults.items.length === 1) {
      console.log("✅ Test 3 passed: Search by status 'submitted' returns correct count");
      testPassed++;
    } else {
      throw new Error(`Expected 1 submitted case but got ${submittedResults.items.length}`);
    }

    console.log("\n[LH-CASE-015 Test 4] Search cases by status 'archived'");
    const archivedResults = await capabilityRegistry.invoke("legal-case", "case.search", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      status: "archived"
    });
    console.log("[LH-CASE-015 Test 4] Found", archivedResults.items.length, "archived cases");
    
    if (archivedResults.items.length === 1) {
      console.log("✅ Test 4 passed: Search by status 'archived' returns correct count");
      testPassed++;
    } else {
      throw new Error(`Expected 1 archived case but got ${archivedResults.items.length}`);
    }

    console.log("\n[LH-CASE-015 Test 5] Search cases with status 'all' returns all cases");
    const allResults = await capabilityRegistry.invoke("legal-case", "case.search", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      status: "all"
    });
    console.log("[LH-CASE-015 Test 5] Found", allResults.items.length, "total cases with status 'all'");
    
    if (allResults.items.length === 7) {
      console.log("✅ Test 5 passed: Search with status 'all' returns all cases");
      testPassed++;
    } else {
      throw new Error(`Expected 7 total cases but got ${allResults.items.length}`);
    }

  } catch (error) {
    testFailed++;
    console.error("[LH-CASE-015] Test failed with error:", error);
    throw error;
  }

  console.log("\n" + "=".repeat(80));
  console.log(`🎉 ALL TESTS PASSED! LH-CASE-015 User searches legal matters by status verified successfully`);
  console.log(`✅ Total tests: ${testPassed}`);
  console.log("=".repeat(80));
  
  return { passed: testPassed, failed: testFailed };
}

runTests().catch(error => {
  console.error("[LH-CASE-014] Test suite failed:", error);
  process.exit(1);
});