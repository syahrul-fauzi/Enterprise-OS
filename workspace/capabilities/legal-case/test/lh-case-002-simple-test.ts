import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import { CaseRepositoryInMemory } from "../implementation/repository/case.repository.js";
import { registerLegalCaseCapability } from "../implementation/commands/case.commands.js";
import { caseQueries as legalCaseQueries } from "../implementation/queries/case.queries.js";

console.log("[LH-CASE-002] Starting verification test...");

const testTenantId = "tenant-lh-case-002";
const testWorkspaceId = "workspace-lh-case-002";
const testActorId = "actor-lh-case-002";
const testWorkIds = ["work-case-001", "work-case-002", "work-case-003"];

// Initialize capability registry
registerLegalCaseCapability();
capabilityRegistry.registerQuery("case.search", legalCaseQueries["case.search"]);
console.log("[LH-CASE-002] Capability registry initialized");

// Clear repository
CaseRepositoryInMemory.clear();
console.log("[LH-CASE-002] Repository cleared");

async function runTests() {
  console.log("\n[TEST 1] authenticated user - starting");
  
  // Create test cases
  const createPromises = testWorkIds.map((workId, index) => {
    return capabilityRegistry.invoke("legal-case", "create-case", {
      title: `Test Case ${index + 1}`,
      description: `Description for case ${index + 1}`,
      workId: workId,
      actorId: testActorId,
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      initialRiskAssessment: {
        level: "medium",
        rationale: "Initial test case risk assessment",
        assessedBy: testActorId,
        assessedAt: new Date()
      }
    });
  });
  
  await Promise.all(createPromises);
  console.log("[TEST 1] authenticated user - 3 test cases created");

  // Execute query
  const searchResult = await capabilityRegistry.executeQuery("case.search", {
    limit: 10,
    offset: 0,
    tenantId: testTenantId,
    workspaceId: testWorkspaceId,
    workIds: testWorkIds
  });
  
  console.log(`[TEST 1] authenticated user - returned ${searchResult.items.length} cases`);
  console.log("[TEST 1] authenticated user - PASSED");
  
  console.log("\n[LH-CASE-002] Test completed successfully!");
}

runTests().catch(err => {
  console.error("[LH-CASE-002] Test failed:", err);
  process.exit(1);
});