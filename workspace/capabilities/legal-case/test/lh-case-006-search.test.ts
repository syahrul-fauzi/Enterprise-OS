import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import { CaseRepositoryInMemory, newCaseId } from "../implementation/repository/case.repository.js";
import { SessionRepositoryInMemory } from "../../identity/implementation/repositories/session.inmemory.js";
import { searchCases } from "../implementation/queries/case.queries.js";

const testTenantId = "tenant-lh-case-006";
const testWorkspaceId = "workspace-lh-case-006";
const testActorId = "actor-lh-case-006";

async function runLHCase006Tests() {
  console.log("=".repeat(80));
  console.log("LH-CASE-006: User searches legal matters");
  console.log("=".repeat(80));
  
  let allPassed = true;
  let testCount = 0;
  
  try {
    // Register required commands/queries manually
    if (!capabilityRegistry.capabilityCommands['legal-case.case.search']) {
      console.log("[DEBUG] Manually registering searchCases query...");
      capabilityRegistry.register(searchCases);
    }
    
    // Clear repositories
    CaseRepositoryInMemory.clear();
    await SessionRepositoryInMemory.reset();
    
    // Create and save test session
    const session = await SessionRepositoryInMemory.save({
      id: "session-lh-case-006",
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
    
    // Create execution context
    const executionContext = {
      actor_id: testActorId,
      tenant_id: testTenantId,
      session_id: validSessionId,
      workspace_id: testWorkspaceId
    };
    
    // ==========================================
    // Test 1: Create test cases directly via repository
    // ==========================================
    testCount++;
    console.log(`\nTest ${testCount}: Create test cases for searching`);
    
    const case1 = await CaseRepositoryInMemory.save({
      id: newCaseId(),
      workId: "work-lh-case-006-1",
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      context: {
        tenantId: testTenantId,
        workspaceId: testWorkspaceId,
        actorId: testActorId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      title: "Contract Dispute PT ABC",
      description: "Dispute regarding service agreement with PT ABC",
      priority: "high",
      status: "open",
      owner: testActorId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const case2 = await CaseRepositoryInMemory.save({
      id: newCaseId(),
      workId: "work-lh-case-006-2",
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      context: {
        tenantId: testTenantId,
        workspaceId: testWorkspaceId,
        actorId: testActorId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      title: "Intellectual Property Infringement",
      description: "Patent infringement case against competitor",
      priority: "medium",
      status: "open",
      owner: testActorId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const case3 = await CaseRepositoryInMemory.save({
      id: newCaseId(),
      workId: "work-lh-case-006-3",
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      context: {
        tenantId: testTenantId,
        workspaceId: testWorkspaceId,
        actorId: testActorId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      title: "Employment Lawsuit John Doe",
      description: "Wrongful termination lawsuit",
      priority: "low",
      status: "open",
      owner: testActorId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log(`✅ Created 3 test cases successfully`);
    
    // ==========================================
    // Test 2: Search by keyword "contract"
    // ==========================================
    testCount++;
    console.log(`\nTest ${testCount}: Search by keyword "contract"`);
    
    const searchContractResult = await capabilityRegistry.invoke("legal-case", "case.search", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      query: "contract"
    }, executionContext);
    
    console.log(`✅ Search returned ${searchContractResult.items.length} results`);
    console.log(`   Total: ${searchContractResult.total}, Matched: ${searchContractResult.matched}`);
    
    if (searchContractResult.items.length === 1) {
      console.log(`✅ Correctly found only "Contract Dispute PT ABC"`);
    } else {
      console.log(`❌ Expected 1 result, got ${searchContractResult.items.length}`);
      allPassed = false;
    }
    
    // ==========================================
    // Test 3: Search by priority "high"
    // ==========================================
    testCount++;
    console.log(`\nTest ${testCount}: Search by priority "high"`);
    
    const searchHighResult = await capabilityRegistry.invoke("legal-case", "case.search", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      priority: "high"
    }, executionContext);
    
    console.log(`✅ Search returned ${searchHighResult.items.length} high priority cases`);
    
    if (searchHighResult.items.every((item: any) => item.priority === "high")) {
      console.log(`✅ All results have correct priority "high"`);
    } else {
      console.log(`❌ Not all results have priority "high"`);
      allPassed = false;
    }
    
    // ==========================================
    // Test 4: Search with empty query returns all cases
    // ==========================================
    testCount++;
    console.log(`\nTest ${testCount}: Search with empty query returns all cases`);
    
    const searchAllResult = await capabilityRegistry.invoke("legal-case", "case.search", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      query: ""
    }, executionContext);
    
    console.log(`✅ Search returned ${searchAllResult.items.length} total cases`);
    
    if (searchAllResult.items.length >= 3) {
      console.log(`✅ Correctly returned all test cases`);
    } else {
      console.log(`❌ Expected at least 3 results, got ${searchAllResult.items.length}`);
      allPassed = false;
    }
    
    // ==========================================
    // Test 5: Search with pagination works correctly
    // ==========================================
    testCount++;
    console.log(`\nTest ${testCount}: Search with pagination works correctly`);
    
    const searchPaginationResult = await capabilityRegistry.invoke("legal-case", "case.search", {
      tenantId: testTenantId,
      workspaceId: testWorkspaceId,
      actorId: testActorId,
      sessionId: validSessionId,
      query: "",
      limit: 2,
      offset: 0
    }, executionContext);
    
    console.log(`✅ Search with pagination returned ${searchPaginationResult.items.length} items (limit=2)`);
    
    if (searchPaginationResult.items.length === 2) {
      console.log(`✅ Pagination limit works correctly`);
    } else {
      console.log(`❌ Expected 2 items with limit=2, got ${searchPaginationResult.items.length}`);
      allPassed = false;
    }
    
  } catch (error) {
    console.error(`❌ Test failed with error:`, error);
    allPassed = false;
  }
  
  console.log("\n" + "=".repeat(80));
  if (allPassed) {
    console.log(`🎉 ALL TESTS PASSED! LH-CASE-006 User searches legal matters verified successfully`);
    console.log(`✅ Total tests: ${testCount}`);
  } else {
    console.log(`❌ SOME TESTS FAILED!`);
  }
  console.log("=".repeat(80));
  
  return allPassed;
}

runLHCase006Tests().catch(console.error);