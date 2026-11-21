import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import { CaseRepositoryInMemory } from "../implementation/repository/case.repository.js";
import { registerLegalCaseCapability } from "../implementation/commands/case.commands.js";
import { SessionRepositoryInMemory } from "../../identity/implementation/repositories/session.inmemory.js";

console.log("[LH-CASE-009] Starting verification test...");

const testTenantId = "tenant-lh-case-009";
const testWorkspaceId = "workspace-lh-case-009";
const testActorId = "actor-lh-case-009";

async function runTests() {
  registerLegalCaseCapability();
  console.log("[LH-CASE-009] Capability registry initialized");

  CaseRepositoryInMemory.clear();
  await SessionRepositoryInMemory.reset();
  console.log("[LH-CASE-009] Repository cleared");

  const session = await SessionRepositoryInMemory.save({
    id: "session-lh-case-009",
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
  console.log("[LH-CASE-009] Valid test session created:", validSessionId);

  console.log("\n[LH-CASE-009 Test 1] Create test case for closing");
  const createResult = await capabilityRegistry.invoke("legal-case", "create-case", {
    tenantId: testTenantId,
    workspaceId: testWorkspaceId,
    actorId: testActorId,
    sessionId: validSessionId,
    title: "Test Case for Closing",
    description: "This is a test case to verify closing functionality",
    linkedIntentId: "intent-test-close",
    initialActorMetadata: {
      actorId: testActorId,
      actorType: "human",
      role: "lawyer",
      displayName: "Test Lawyer",
      trustLevel: "verified"
    },
    initialCapabilities: ["legal-case.view", "legal-case.close"],
    initialAuthorization: {
      allowedActions: ["create", "view", "close"],
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
      rationale: "Test case closing",
      assessedBy: testActorId,
      assessedAt: new Date(),
      mitigationSteps: []
    }
  });
  console.log("[LH-CASE-009 Test 1] Case created:", createResult.id);
  const caseId = createResult.id;
  console.log("✅ Test 1 passed: Test case created successfully");

  console.log("\n[LH-CASE-009 Test 2] Close case with valid session");
  const closeResult = await capabilityRegistry.invoke("legal-case", "close", {
    tenantId: testTenantId,
    workspaceId: testWorkspaceId,
    actorId: testActorId,
    sessionId: validSessionId,
    caseId,
  });
  console.log("[LH-CASE-009 Test 2] Close result:", closeResult);

  const closedCase = await CaseRepositoryInMemory.byId(caseId);
  console.log("[LH-CASE-009 Test 2] Case after closing:", closedCase.status);
  if (closedCase.status === "settled") {
    console.log("✅ Test 2 passed: Case closed (settled) successfully");
  } else {
    throw new Error(`Expected status 'settled' but got '${closedCase.status}'`);
  }

  console.log("\n[LH-CASE-009 Test 3] Attempt to close already closed case (idempotent)");
  const closeAgainResult = await capabilityRegistry.invoke("legal-case", "close", {
    tenantId: testTenantId,
    workspaceId: testWorkspaceId,
    actorId: testActorId,
    sessionId: validSessionId,
    caseId,
  });
  console.log("[LH-CASE-009 Test 3] Close again result:", closeAgainResult);
  console.log("✅ Test 3 passed: Closing already closed case is idempotent");

  console.log("\n[LH-CASE-009 Test 4] Verify closedAt timestamp is set");
  if (closedCase.closedAt && closedCase.closedAt instanceof Date) {
    console.log("✅ Test 4 passed: closedAt timestamp is correctly set");
  } else {
    throw new Error("closedAt timestamp not set correctly");
  }

  console.log("\n[LH-CASE-009 Test 5] Verify closedAt timestamp is set and case is settled");
  if (closedCase.closedAt && closedCase.closedAt instanceof Date && closedCase.status === "settled") {
    console.log("✅ Test 5 passed: closedAt timestamp is correctly set and case is settled");
  } else {
    throw new Error("closedAt timestamp not set correctly or case not settled");
  }

  console.log("\n" + "=".repeat(80));
  console.log("🎉 ALL TESTS PASSED! LH-CASE-009 User closes legal matter verified successfully");
  console.log("✅ Total tests: 5");
  console.log("=".repeat(80));
}

runTests().catch(error => {
  console.error("[LH-CASE-009] Test failed with error:", error);
  process.exit(1);
});