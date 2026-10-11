/**
 * PROD-001-02 End-to-End Test
 * LAYER 9: Executable test with real invocation (NO MOCKS)
 * Verifikasi bahwa High-Value Work Graph untuk Product Requirements berjalan sesuai kontrak eos-product-slice
 * Chain: Product → Requirement → Work dengan semua edge terhubung
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDevAuthenticatedSession } from "../../../packages/core/kernel/src/session/workspace-session.js";
import { capabilityRegistry } from "../../../packages/core/kernel/src/registry/capability-command-registry.js";

describe("PROD-001-02: High-Value Work Graph Product Requirements End-to-End", () => {
  let session: any;
  const TEST_WORK_ID = "work.prod-001-test.001";

  beforeEach(async () => {
    // Buat session dev terautentikasi untuk testing (CORE-001: workspace hanya execution boundary)
    session = createDevAuthenticatedSession();
    // Override default tenant/workspace untuk test isolation
    session.tenantId = "tenant.test";
    session.workspaceId = "workspace.test";
    session.actorId = "actor.test";

    // Register semua command yang dibutuhkan sebelum test
    await import("../../requirement-management/implementation/commands/requirement.commands.js");
    await import("../implementation/commands/knowledge-graph.commands.js");
  });

  it("should create a requirement linked to a workId and retrieve full graph chain (CORE-001 compliance)", async () => {
    // 1. Buat requirement dengan workId (CORE-001: workId sebagai primary boundary)
    const createRequirementInput = {
      title: "Test Requirement - Product Launch v1",
      summary: "Requirement test untuk verifikasi High-Value Work Graph",
      description: "Requirement yang terhubung ke workId untuk verifikasi chain Product→Requirement→Work",
      priority: "high",
      owner: "EOS Product Team",
      linkedIntentId: "intent.product-launch-requirements",
      workId: TEST_WORK_ID, // CORE-001: Satu-satunya boundary metadata yang dibutuhkan
      sessionId: session.sessionId
    };

    // Panggil capability secara langsung (NO MOCKS)
    const createdRequirement = await capabilityRegistry.invoke("requirement-management", "create-requirement", createRequirementInput);
    
    // Verifikasi requirement berhasil dibuat
    assert.ok(createdRequirement, "Requirement creation result should be defined");
    assert.ok(createdRequirement.id, "Result should have a requirement id");
    assert.strictEqual(createdRequirement.workId, TEST_WORK_ID, "Requirement harus memiliki workId yang sesuai (CORE-001)");
    assert.strictEqual(createdRequirement.linkedIntentId, createRequirementInput.linkedIntentId, "linkedIntentId harus terpreservasi untuk graph edge");
    console.log(`[PROD-001-02 TEST] ✅ Requirement created: ${createdRequirement.id}, workId: ${createdRequirement.workId}`);

    // 2. Ambil graph by workId untuk verifikasi chain lengkap
    const graphSnapshot = await capabilityRegistry.invoke("knowledge-graph", "get-graph-by-work-id", {
      workId: TEST_WORK_ID,
      sessionId: session.sessionId
    });

    // Verifikasi graph snapshot berhasil diambil
    assert.ok(graphSnapshot, "Graph snapshot should be defined");
    assert.ok(graphSnapshot.nodes, "Graph should have nodes array");
    assert.ok(graphSnapshot.edges, "Graph should have edges array");
    console.log(`[PROD-001-02 TEST] ✅ Graph snapshot retrieved: ${graphSnapshot.nodes.length} nodes, ${graphSnapshot.edges.length} edges`);

    // 3. Verifikasi semua node yang dibutuhkan ada di graph
    const workNode = graphSnapshot.nodes.find((n: any) => n.id === `work:${TEST_WORK_ID}`);
    const requirementNode = graphSnapshot.nodes.find((n: any) => n.id === `requirement:${createdRequirement.id}`);
    const intentNode = graphSnapshot.nodes.find((n: any) => n.id === `intent:${createRequirementInput.linkedIntentId}`);
    
    assert.ok(workNode, "Work node harus ada di graph (CORE-001 compliance)");
    assert.ok(requirementNode, "Requirement node harus ada di graph");
    assert.ok(intentNode, "Intent node harus ada di graph (linkedIntentId edge)");

    // 4. Verifikasi semua edge yang dibutuhkan ada di graph
    const requirementToWorkEdge = graphSnapshot.edges.find((e: any) => 
      e.from === `requirement:${createdRequirement.id}` && 
      e.to === `work:${TEST_WORK_ID}` &&
      e.relation === "belongs_to"
    );
    const requirementToIntentEdge = graphSnapshot.edges.find((e: any) => 
      e.from === `requirement:${createdRequirement.id}` && 
      e.to === `intent:${createRequirementInput.linkedIntentId}` &&
      e.relation === "links_to"
    );

    assert.ok(requirementToWorkEdge, "Edge requirement→work harus ada (High-Value Work Graph chain lengkap)");
    assert.ok(requirementToIntentEdge, "Edge requirement→intent harus ada (linkedIntentId integration)");
    console.log(`[PROD-001-02 TEST] ✅ Semua edge High-Value Work Graph terverifikasi: requirement→work dan requirement→intent`);

    // 5. Verifikasi requirement query join dengan WorkAggregate (PROD-001-02-03)
    const fetchedRequirement = await capabilityRegistry.invoke("requirement-management", "get-requirement-by-id", {
      id: createdRequirement.id,
      sessionId: session.sessionId
    });

    assert.ok(fetchedRequirement.work, "Requirement query harus mengembalikan work data (join dengan WorkAggregate)");
    assert.strictEqual(fetchedRequirement.work.id, TEST_WORK_ID, "WorkAggregate yang di-join harus memiliki workId yang sesuai");
    console.log(`[PROD-001-02 TEST] ✅ Requirement query join dengan WorkAggregate berhasil: PROD-001-02-03 verified`);
  });

  it("should search requirements by workId (workId filter implementation)", async () => {
    // Buat requirement kedua dengan workId yang sama
    const secondRequirementInput = {
      title: "Test Requirement 2 - Product Launch v1",
      summary: "Requirement kedua untuk test search by workId",
      workId: TEST_WORK_ID,
      sessionId: session.sessionId
    };

    const secondRequirement = await capabilityRegistry.invoke("requirement-management", "create-requirement", secondRequirementInput);
    
    // Panggil search requirements dengan workId filter
    const searchResults = await capabilityRegistry.invoke("requirement-management", "search-requirements", {
      workId: TEST_WORK_ID,
      sessionId: session.sessionId
    });

    // Verifikasi semua requirement dengan workId yang sama ditemukan
    assert.ok(searchResults, "Search results should be defined");
    assert.ok(Array.isArray(searchResults), "Search results harus berupa array");
    assert.ok(searchResults.length >= 2, "Search by workId harus mengembalikan semua requirement yang terhubung");
    
    const allHaveCorrectWorkId = searchResults.every((item: any) => item.workId === TEST_WORK_ID);
    assert.ok(allHaveCorrectWorkId, "Semua requirement dalam search result harus memiliki workId yang sesuai (CORE-001 filter)");
    console.log(`[PROD-001-02 TEST] ✅ Search by workId berhasil: ${searchResults.length} requirements ditemukan`);
  });

  it("should reject graph retrieval with invalid session (authentication boundary)", async () => {
    // Harus throw error karena session invalid
    await assert.rejects(
      () => capabilityRegistry.invoke("knowledge-graph", "get-graph-by-work-id", {
        workId: TEST_WORK_ID,
        sessionId: "session.invalid"
      }),
      "Should reject invalid session (authentication boundary enforcement)"
    );
    console.log(`[PROD-001-02 TEST] ✅ Authentication boundary terverifikasi: invalid session ditolak`);
  });
});