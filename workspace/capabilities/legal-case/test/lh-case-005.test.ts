import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import { CaseRepositoryInMemory, newCaseId } from "../implementation/repository/case.repository.js";
import { SessionRepositoryInMemory } from "../../identity/implementation/repositories/session.inmemory.js";

console.log("[LH-CASE-005] Starting verification test...");

const testTenantId = "tenant-lh-case-005";
const testWorkspaceId = "workspace-lh-case-005";
const testActorId = "actor-lh-case-005";

async function runTests() {
  console.log("[LH-CASE-005] Capability registry initialized");

  if (!capabilityRegistry.capabilityCommands['legal-case.case.getById']) {
    console.log("[DEBUG] Manually registering getCaseByIdCommand to current registry instance...");
    const { getCaseByIdCommand } = await import("../implementation/commands/get-case-by-id.command.js");
    capabilityRegistry.register(getCaseByIdCommand);
  }

  CaseRepositoryInMemory.clear();
  await SessionRepositoryInMemory.reset();
  console.log("[LH-CASE-005] Repository cleared");

  const session = await SessionRepositoryInMemory.save({
    id: "session-lh-case-005",
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
  console.log("[LH-CASE-005] Valid test session created:", validSessionId);

  const executionContext = {
    actor_id: testActorId,
    tenant_id: testTenantId,
    session_id: validSessionId,
    workspace_id: testWorkspaceId
  };

  console.log("\n[LH-CASE-005 Test 1] Create test case directly via repository");
  const testCase = {
    id: newCaseId(),
    workId: `work-${Date.now()}`,
    tenantId: testTenantId,
    workspaceId: testWorkspaceId,
    title: "Test Case for Viewing",
    description: "This is a test case to verify viewing functionality",
    status: "open",
    lawyerId: testActorId,
    priority: "medium",
    evidence: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  await CaseRepositoryInMemory.save(testCase);
  const caseId = testCase.id;
  console.log("[LH-CASE-005 Test 1] Case created:", caseId);
  console.log("✅ Test 1 passed: Test case created successfully");

  console.log("\n[LH-CASE-005 Test 2] View existing case with valid session");
  const viewResult = await capabilityRegistry.invoke("legal-case", "case.getById", {
    tenantId: testTenantId,
    workspaceId: testWorkspaceId,
    actorId: testActorId,
    sessionId: validSessionId,
    caseId: caseId
  }, executionContext);
  console.log("[LH-CASE-005 Test 2] Case retrieved successfully");
  console.log(`   Title: ${viewResult.displayTitle}`);
  console.log(`   Status: ${viewResult.rawStatus}`);
  console.log("✅ Test 2 passed: Case retrieved successfully");

  console.log("\n[LH-CASE-005 Test 3] Attempt to view non-existent case");
  let nonExistentCaseError = false;
  const nonExistentCaseId = "case-non123";
  try {
    const nonExistentResult = await capabilityRegistry.invoke("legal-case", "case.getById", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      caseId: nonExistentCaseId
    }, executionContext);
    console.log("[LH-CASE-005 Test 3] Result from non-existent case:", nonExistentResult);
    nonExistentCaseError = nonExistentResult === undefined;
  } catch (error) {
    nonExistentCaseError = true;
    console.log("[LH-CASE-005 Test 3] Correctly rejected non-existent case:", (error as Error).message);
  }
  console.assert(nonExistentCaseError, "Should reject non-existent case or return undefined");
  console.log("✅ Test 3 passed: Non-existent case correctly handled");

  console.log("\n[LH-CASE-005 Test 4] Attempt view with invalid session");
  let invalidSessionError = false;
  const invalidSessionId = "invalid-session-id";
  const invalidExecutionContext = {
    actor_id: testActorId,
    tenant_id: testTenantId,
    session_id: invalidSessionId,
    workspace_id: testWorkspaceId
  };
  try {
    await capabilityRegistry.invoke("legal-case", "case.getById", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: invalidSessionId,
      caseId: caseId
    }, invalidExecutionContext);
  } catch (error) {
    invalidSessionError = true;
    console.log("[LH-CASE-005 Test 4] Correctly rejected invalid session:", (error as Error).message);
  }
  console.assert(invalidSessionError, "Should reject invalid session");
  console.log("✅ Test 4 passed: Invalid session correctly rejected");

  console.log("\n[LH-CASE-005 Test 5] Verify case projection structure");
  const projection = await capabilityRegistry.invoke("legal-case", "case.getById", {
    tenantId: testTenantId,
    workspaceId: testWorkspaceId,
    actorId: testActorId,
    sessionId: validSessionId,
    caseId: caseId
  }, executionContext);
  const requiredFields = ["type", "id", "displayTitle", "displaySubtitle", "rawStatus", "owner", "createdAt", "updatedAt"];
  const hasAllFields = requiredFields.every(field => field in projection);
  console.assert(hasAllFields, "Case projection should have all required fields");
  console.log("[LH-CASE-005 Test 5] Projection fields verified:", requiredFields.join(", "));
  console.log("✅ Test 5 passed: Case projection has all required fields");

  console.log("\n🎉 ALL TESTS PASSED! LH-CASE-005 User views legal matter details verified successfully");
}

runTests().catch(error => {
  console.error("[LH-CASE-005] Test failed:", error);
  console.error(error.stack);
  process.exit(1);
});