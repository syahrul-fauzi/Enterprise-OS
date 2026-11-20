// Test verifikasi independen untuk LH-CASE-002: User views list of legal matters
// NO MOCKS - menggunakan capability registry asli
import { describe, it, before, beforeEach } from "node:test";
import assert from "node:assert";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import { CaseRepositoryInMemory } from "../implementation/repository/case.repository.js";
import { registerLegalCaseCapability } from "../implementation/commands/case.commands.js";
import { caseQueries as legalCaseQueries } from "../implementation/queries/case.queries.js";
import { createDevAuthenticatedSession } from "../../../packages/core/kernel/src/session/workspace-session.js";
import { SessionRepositoryInMemory } from "../../identity/implementation/repositories/session.inmemory.js";

describe("LH-CASE-002: User views list of legal matters", () => {
  let testSession: any;
  let testExecutionContext: any;
  const testWorkIds = ["work-case-001", "work-case-002", "work-case-003"];

  before(() => {
    registerLegalCaseCapability();
    capabilityRegistry.registerQuery("case.search", legalCaseQueries["case.search"]);
    console.log("[LH-CASE-002] Capability registry initialized");
  });

  beforeEach(async () => {
    CaseRepositoryInMemory.clear();
    await SessionRepositoryInMemory.reset();
    testSession = createDevAuthenticatedSession();
    testExecutionContext = {
      actor_id: testSession.actorId,
      tenant_id: testSession.tenantId,
      workspace_id: testSession.workspaceId,
      session_id: testSession.sessionId
    };
    await SessionRepositoryInMemory.save({
      id: testSession.sessionId as any,
      userId: testSession.actorId as any,
      actorId: testSession.actorId as any,
      tenantId: testSession.tenantId as any,
      workspaceId: testSession.workspaceId as any,
      productId: "lawyershub",
      actorLabel: testSession.actorLabel,
      isAgent: testSession.actorId.startsWith("ai-"),
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log("[LH-CASE-002] Repository cleared, new session created");
  });

  it("should return list of cases for authenticated user (criterion: authenticated user)", async () => {
    console.log("[TEST] authenticated user - starting");
    
    // Buat beberapa case test
    const createPromises = testWorkIds.map((workId, index) => {
      const input = {
        title: `Test Case ${index + 1}`,
        description: `Description for case ${index + 1}`,
        sessionId: testSession.sessionId,
        linkedIntentId: `intent.test.${index}`,
        initialActorMetadata: {
          actorId: testSession.actorId,
          actorType: "human" as const,
          role: "client",
          displayName: "Test Client",
          trustLevel: "verified" as const
        },
        initialCapabilities: ["legal-case.create-case"],
        initialAuthorization: {
          allowedActions: ["legal-case.create-case", "legal-case.view-case", "legal-case.search"]
        },
        caseContext: {
          tenantId: testSession.tenantId,
          workspaceId: testSession.workspaceId,
          jurisdiction: "ID-JABODETABEK",
          requestCategory: "test",
          sensitivityLevel: "internal" as const,
          relatedWorkIds: [workId]
        },
        initialRiskAssessment: {
          level: "medium",
          rationale: "Initial test case risk assessment",
          assessedBy: testSession.actorId,
          assessedAt: new Date()
        }
      };
      return capabilityRegistry.invoke("legal-case", "create-case", input, testExecutionContext);
    });
    
    await Promise.all(createPromises);
    console.log("[TEST] authenticated user - 3 test cases created");

    // Panggil query dengan tenant test
    const searchResult = await capabilityRegistry.executeQuery("case.search", {
      limit: 10,
      offset: 0,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId
    });
    
    console.log(`[TEST] authenticated user - returned ${searchResult.items.length} cases`);
    assert.ok(searchResult.items.length >= 3, "Should return at least 3 cases");
    assert.equal(searchResult.total, searchResult.items.length, "Total should match items length");
    console.log("[TEST] authenticated user - PASSED");
  });

  it("should enforce tenant isolation (criterion: tenant isolated)", async () => {
    console.log("[TEST] tenant isolated - starting");
    
    // Buat session tenant lain
    const otherTenantSession = createDevAuthenticatedSession();
    otherTenantSession.tenantId = "tenant-other";
    otherTenantSession.workspaceId = "workspace-other";
    await SessionRepositoryInMemory.save({
      id: otherTenantSession.sessionId as any,
      userId: otherTenantSession.actorId as any,
      actorId: otherTenantSession.actorId as any,
      tenantId: otherTenantSession.tenantId as any,
      workspaceId: otherTenantSession.workspaceId as any,
      productId: "lawyershub",
      actorLabel: otherTenantSession.actorLabel,
      isAgent: otherTenantSession.actorId.startsWith("ai-"),
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const otherTenantContext = {
      actor_id: otherTenantSession.actorId,
      tenant_id: otherTenantSession.tenantId,
      workspace_id: otherTenantSession.workspaceId,
      session_id: otherTenantSession.sessionId
    };
    
    // Buat case di tenant yang berbeda
    const otherTenantInput = {
      title: "Other Tenant Case",
      description: "Case from another tenant",
      sessionId: otherTenantSession.sessionId,
      linkedIntentId: "intent.other.tenant",
      initialActorMetadata: {
        actorId: otherTenantSession.actorId,
        actorType: "human" as const,
        role: "client",
        displayName: "Other Tenant Client",
        trustLevel: "verified" as const
      },
      initialCapabilities: ["legal-case.create-case"],
      initialAuthorization: {
        allowedActions: ["legal-case.create-case", "legal-case.view-case", "legal-case.search"]
      },
      caseContext: {
        tenantId: otherTenantSession.tenantId,
        workspaceId: otherTenantSession.workspaceId,
        jurisdiction: "ID-JABODETABEK",
        requestCategory: "test",
        sensitivityLevel: "internal" as const,
        relatedWorkIds: ["work-other-tenant"]
      },
      initialRiskAssessment: {
        level: "low",
        rationale: "Other tenant case risk",
        assessedBy: otherTenantSession.actorId,
        assessedAt: new Date()
      }
    };
    await capabilityRegistry.invoke("legal-case", "create-case", otherTenantInput, otherTenantContext);
    
    // Buat case di test tenant
    const testTenantInput = {
      title: "Test Tenant Case",
      description: "Case from test tenant",
      sessionId: testSession.sessionId,
      linkedIntentId: "intent.test.tenant",
      initialActorMetadata: {
        actorId: testSession.actorId,
        actorType: "human" as const,
        role: "client",
        displayName: "Test Client",
        trustLevel: "verified" as const
      },
      initialCapabilities: ["legal-case.create-case"],
      initialAuthorization: {
        allowedActions: ["legal-case.create-case", "legal-case.view-case", "legal-case.search"]
      },
      caseContext: {
        tenantId: testSession.tenantId,
        workspaceId: testSession.workspaceId,
        jurisdiction: "ID-JABODETABEK",
        requestCategory: "test",
        sensitivityLevel: "internal" as const,
        relatedWorkIds: [testWorkIds[0]]
      },
      initialRiskAssessment: {
        level: "medium",
        rationale: "Test tenant case risk",
        assessedBy: testSession.actorId,
        assessedAt: new Date()
      }
    };
    await capabilityRegistry.invoke("legal-case", "create-case", testTenantInput, testExecutionContext);
    
    console.log("[TEST] tenant isolated - cases from different tenants created");

    // Panggil query dengan tenant test
    const searchResult = await capabilityRegistry.executeQuery("case.search", {
      limit: 10,
      offset: 0,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId
    });
    
    console.log(`[TEST] tenant isolated - returned ${searchResult.items.length} cases`);
    console.log(`[TEST] tenant isolated - returned case titles: ${JSON.stringify(searchResult.items.map((item: any) => item.title))}`);
    assert.equal(searchResult.items.length, 1, "Should only return cases from test tenant");
    assert.equal(searchResult.items[0].title, "Test Tenant Case", "Should return correct case from test tenant");
    console.log("[TEST] tenant isolated - PASSED");
  });

  it("should return list correctly (criterion: list returned correctly)", async () => {
    console.log("[TEST] list returned correctly - starting");
    
    // Buat case dengan berbagai status dan priority
    const case1Input = {
      title: "Active High Priority Case",
      description: "Active case with high priority",
      sessionId: testSession.sessionId,
      linkedIntentId: "intent.test.case1",
      initialActorMetadata: {
        actorId: testSession.actorId,
        actorType: "human" as const,
        role: "client",
        displayName: "Test Client",
        trustLevel: "verified" as const
      },
      initialCapabilities: ["legal-case.create-case"],
      initialAuthorization: {
        allowedActions: ["legal-case.create-case", "legal-case.view-case", "legal-case.search"]
      },
      caseContext: {
        tenantId: testSession.tenantId,
        workspaceId: testSession.workspaceId,
        jurisdiction: "ID-JABODETABEK",
        requestCategory: "test",
        sensitivityLevel: "internal" as const,
        relatedWorkIds: [testWorkIds[0]]
      },
      initialRiskAssessment: {
        level: "high",
        rationale: "High priority case risk",
        assessedBy: testSession.actorId,
        assessedAt: new Date()
      }
    };
    
    const case2Input = {
      title: "Draft Medium Priority Case",
      description: "Draft case with medium priority",
      sessionId: testSession.sessionId,
      linkedIntentId: "intent.test.case2",
      initialActorMetadata: {
        actorId: testSession.actorId,
        actorType: "human" as const,
        role: "client",
        displayName: "Test Client",
        trustLevel: "verified" as const
      },
      initialCapabilities: ["legal-case.create-case"],
      initialAuthorization: {
        allowedActions: ["legal-case.create-case", "legal-case.view-case", "legal-case.search"]
      },
      caseContext: {
        tenantId: testSession.tenantId,
        workspaceId: testSession.workspaceId,
        jurisdiction: "ID-JABODETABEK",
        requestCategory: "test",
        sensitivityLevel: "internal" as const,
        relatedWorkIds: [testWorkIds[1]]
      },
      initialRiskAssessment: {
        level: "medium",
        rationale: "Medium priority case risk",
        assessedBy: testSession.actorId,
        assessedAt: new Date()
      }
    };
    
    const case3Input = {
      title: "Closed Low Priority Case",
      description: "Closed case with low priority",
      sessionId: testSession.sessionId,
      linkedIntentId: "intent.test.case3",
      initialActorMetadata: {
        actorId: testSession.actorId,
        actorType: "human" as const,
        role: "client",
        displayName: "Test Client",
        trustLevel: "verified" as const
      },
      initialCapabilities: ["legal-case.create-case"],
      initialAuthorization: {
        allowedActions: ["legal-case.create-case", "legal-case.view-case", "legal-case.search"]
      },
      caseContext: {
        tenantId: testSession.tenantId,
        workspaceId: testSession.workspaceId,
        jurisdiction: "ID-JABODETABEK",
        requestCategory: "test",
        sensitivityLevel: "internal" as const,
        relatedWorkIds: [testWorkIds[2]]
      },
      initialRiskAssessment: {
        level: "low",
        rationale: "Low priority case risk",
        assessedBy: testSession.actorId,
        assessedAt: new Date()
      }
    };
    
    await Promise.all([
      capabilityRegistry.invoke("legal-case", "create-case", case1Input, testExecutionContext),
      capabilityRegistry.invoke("legal-case", "create-case", case2Input, testExecutionContext),
      capabilityRegistry.invoke("legal-case", "create-case", case3Input, testExecutionContext)
    ]);
    
    console.log("[TEST] list returned correctly - 3 cases with different priorities created");

    // Panggil query dengan pagination
    const searchResult = await capabilityRegistry.executeQuery("case.search", {
      limit: 2,
      offset: 0,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId
    });
    
    console.log(`[TEST] list returned correctly - returned ${searchResult.items.length} cases (limit 2)`);
    assert.equal(searchResult.items.length, 2, "Should return only 2 cases with limit=2");
    assert.equal(searchResult.total, 3, "Total should be 3 (all cases)");
    
    // Pagination test - page 2
    const page2Result = await capabilityRegistry.executeQuery("case.search", {
      limit: 2,
      offset: 2,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId
    });
    
    console.log(`[TEST] list returned correctly - page 2 returned ${page2Result.items.length} cases`);
    assert.equal(page2Result.items.length, 1, "Page 2 should return 1 remaining case");
    
    console.log("[TEST] list returned correctly - PASSED");
  });

  it("should filter cases by workIds (criterion: filter by workIds)", async () => {
    console.log("[TEST] filter by workIds - starting");
    
    // Buat 3 case
    const createPromises = testWorkIds.map((workId, index) => {
      const input = {
        title: `Filter Test Case ${index + 1}`,
        description: `Case for filter test ${index + 1}`,
        sessionId: testSession.sessionId,
        linkedIntentId: `intent.filter.${index}`,
        initialActorMetadata: {
          actorId: testSession.actorId,
          actorType: "human" as const,
          role: "client",
          displayName: "Test Client",
          trustLevel: "verified" as const
        },
        initialCapabilities: ["legal-case.create-case"],
        initialAuthorization: {
          allowedActions: ["legal-case.create-case", "legal-case.view-case", "legal-case.search"]
        },
        caseContext: {
          tenantId: testSession.tenantId,
          workspaceId: testSession.workspaceId,
          jurisdiction: "ID-JABODETABEK",
          requestCategory: "test",
          sensitivityLevel: "internal" as const,
          relatedWorkIds: [workId]
        },
        initialRiskAssessment: {
          level: "medium",
          rationale: "Filter test case risk",
          assessedBy: testSession.actorId,
          assessedAt: new Date()
        }
      };
      return capabilityRegistry.invoke("legal-case", "create-case", input, testExecutionContext);
    });
    
    await Promise.all(createPromises);
    console.log("[TEST] filter by workIds - 3 test cases created");

    // Filter hanya work-case-001 dan work-case-002
    const searchResult = await capabilityRegistry.executeQuery("case.search", {
      limit: 10,
      offset: 0,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId,
      workIds: ["work-case-001", "work-case-002"]
    });
    
    console.log(`[TEST] filter by workIds - returned ${searchResult.items.length} cases`);
    console.log(`[TEST] filter by workIds - returned relatedWorkIds: ${JSON.stringify(searchResult.items.map((item: any) => item.context?.relatedWorkIds))}`);
    assert.equal(searchResult.items.length, 2, "Should only return 2 filtered cases");
    
    // Verifikasi workIds yang dikembalikan sesuai - workIds disimpan di context.relatedWorkIds
    const returnedRelatedWorkIds = searchResult.items.flatMap((item: any) => item.context?.relatedWorkIds || []);
    assert.ok(returnedRelatedWorkIds.includes("work-case-001"), "Should include work-case-001");
    assert.ok(returnedRelatedWorkIds.includes("work-case-002"), "Should include work-case-002");
    
    console.log("[TEST] filter by workIds - PASSED");
  });

  it("should return empty list when no cases match (criterion: empty list handling)", async () => {
    console.log("[TEST] empty list handling - starting");
    
    // Panggil query tanpa ada case yang dibuat
    const searchResult = await capabilityRegistry.executeQuery("case.search", {
      limit: 10,
      offset: 0,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId
    });
    
    console.log(`[TEST] empty list handling - returned ${searchResult.items.length} cases`);
    assert.equal(searchResult.items.length, 0, "Should return empty list when no cases exist");
    assert.equal(searchResult.total, 0, "Total should be 0 when no cases exist");
    
    console.log("[TEST] empty list handling - PASSED");
  });

  it("should return correct pagination metadata (criterion: pagination metadata)", async () => {
    console.log("[TEST] pagination metadata - starting");
    
    // Buat 5 case
    const createPromises = Array.from({ length: 5 }, (_, index) => {
      const input = {
        title: `Pagination Test Case ${index + 1}`,
        description: `Case for pagination test ${index + 1}`,
        sessionId: testSession.sessionId,
        linkedIntentId: `intent.pagination.${index}`,
        initialActorMetadata: {
          actorId: testSession.actorId,
          actorType: "human" as const,
          role: "client",
          displayName: "Test Client",
          trustLevel: "verified" as const
        },
        initialCapabilities: ["legal-case.create-case"],
        initialAuthorization: {
          allowedActions: ["legal-case.create-case", "legal-case.view-case", "legal-case.search"]
        },
        caseContext: {
          tenantId: testSession.tenantId,
          workspaceId: testSession.workspaceId,
          jurisdiction: "ID-JABODETABEK",
          requestCategory: "test",
          sensitivityLevel: "internal" as const,
          relatedWorkIds: [`work-pagination-${index}`]
        },
        initialRiskAssessment: {
          level: "medium",
          rationale: "Pagination test case risk",
          assessedBy: testSession.actorId,
          assessedAt: new Date()
        }
      };
      return capabilityRegistry.invoke("legal-case", "create-case", input, testExecutionContext);
    });
    
    await Promise.all(createPromises);
    console.log("[TEST] pagination metadata - 5 test cases created");

    // Test page 1
    const page1Result = await capabilityRegistry.executeQuery("case.search", {
      limit: 2,
      offset: 0,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId
    });
    
    console.log(`[TEST] pagination metadata - page 1: ${page1Result.items.length} items, total: ${page1Result.total}`);
    assert.equal(page1Result.items.length, 2, "Page 1 should have 2 items");
    assert.equal(page1Result.total, 5, "Total should be 5");
    
    // Test page 2
    const page2Result = await capabilityRegistry.executeQuery("case.search", {
      limit: 2,
      offset: 2,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId
    });
    
    console.log(`[TEST] pagination metadata - page 2: ${page2Result.items.length} items`);
    assert.equal(page2Result.items.length, 2, "Page 2 should have 2 items");
    
    // Test page 3
    const page3Result = await capabilityRegistry.executeQuery("case.search", {
      limit: 2,
      offset: 4,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId
    });
    
    console.log(`[TEST] pagination metadata - page 3: ${page3Result.items.length} items`);
    assert.equal(page3Result.items.length, 1, "Page 3 should have 1 remaining item");
    
    console.log("[TEST] pagination metadata - PASSED");
  });
});