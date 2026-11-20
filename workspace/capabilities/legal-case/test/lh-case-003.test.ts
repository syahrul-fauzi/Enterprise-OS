import { describe, it, before, beforeEach } from "node:test";
import assert from "node:assert";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import { CaseRepositoryInMemory } from "../implementation/repository/case.repository.js";
import { registerLegalCaseCapability } from "../implementation/commands/case.commands.js";
import { createDevAuthenticatedSession } from "../../../packages/core/kernel/src/session/workspace-session.js";
import { SessionRepositoryInMemory } from "../../identity/implementation/repositories/session.inmemory.js";

describe("LH-CASE-003: User updates case status through workflow stages", () => {
  let testSession: any;
  let testExecutionContext: any;
  const caseRepository = CaseRepositoryInMemory;

  before(() => {
    registerLegalCaseCapability();
    caseRepository.clear();
    console.log("[LH-CASE-003] Capability registry initialized and repository cleared");
  });

  beforeEach(async () => {
    caseRepository.clear();
    await SessionRepositoryInMemory.reset();
    testSession = createDevAuthenticatedSession({
      actorId: "test-lawyer-001",
      tenantId: "tenant-lawyershub-001",
      workspaceId: "ws-lawyershub-001",
    });
    
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
    
    testExecutionContext = {
      actor_id: testSession.actorId,
      tenant_id: testSession.tenantId,
      session_id: testSession.sessionId,
      workspace_id: testSession.workspaceId,
      context_trace_id: "test-trace-1795178284213"
    };
  });

  async function createTestCase(initialStatus: string = "draft") {
    const input = {
      title: "Test Workflow Case",
      description: "Case for workflow transition testing",
      sessionId: testSession.sessionId,
      linkedIntentId: "intent.test.1795178284213",
      initialActorMetadata: {
        actorId: testSession.actorId,
        actorType: "human",
        role: "client",
        displayName: "Test Client",
        trustLevel: "verified"
      },
      initialCapabilities: ["legal-case.create-case"],
      initialAuthorization: {
        allowedActions: ["legal-case.create-case", "legal-case.view-case", "legal-case.search"]
      },
      caseContext: {
        tenantId: testSession.tenantId,
        workspaceId: testSession.workspaceId,
        jurisdiction: "ID-JABODETABEK",
        requestCategory: "legal-litigation",
        sensitivityLevel: "internal",
        relatedWorkIds: []
      },
      initialRiskAssessment: {
        level: "low",
        factors: [],
        rationale: "Initial case submission",
        assessedBy: testSession.actorId,
        assessedAt: new Date()
      }
    };

    const createResult = await capabilityRegistry.invoke("legal-case", "create-case", input, testExecutionContext);
    console.log("[TEST] Created case with ID:", createResult.id);
    
    return createResult.id;
  }

  it("should transition case from draft to submitted (legal-case.submit)", async () => {
    const caseId = await createTestCase("draft");
    console.log("[TEST] Running test: draft → submitted");
    
    await capabilityRegistry.invoke("legal-case", "submit", {
      caseId,
      sessionId: testSession.sessionId,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId,
      actorId: testSession.actorId,
      requiredSigners: ["admin@lawyershub.id"]
    }, testExecutionContext);

    const submittedCase = await caseRepository.byId(caseId);
    console.log("[TEST] Case status after submit:", submittedCase.status);
    assert.equal(submittedCase.status, "submitted", "Case status should be submitted");
    console.log("[TEST] Case transitioned to submitted successfully");
  });

  it("should transition case from submitted to under_review (legal-case.mark-under-review)", async () => {
    const caseId = await createTestCase("draft");
    
    await capabilityRegistry.invoke("legal-case", "submit", {
      caseId,
      sessionId: testSession.sessionId,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId,
      actorId: testSession.actorId,
      requiredSigners: ["admin@lawyershub.id"]
    }, testExecutionContext);
    
    console.log("[TEST] Running test: submitted → under_review");
    
    await capabilityRegistry.invoke("legal-case", "mark-under-review", {
      caseId,
      sessionId: testSession.sessionId,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId,
      actorId: testSession.actorId,
      paymentAmount: 1500000,
      reviewNotes: "Case needs review"
    }, testExecutionContext);

    const reviewCase = await caseRepository.byId(caseId);
    console.log("[TEST] Case status after mark-under-review:", reviewCase.status);
    assert.equal(reviewCase.status, "under_review", "Case status should be under_review");
    console.log("[TEST] Case transitioned to under_review successfully");
  });

  it("should transition case from under_review to reviewed (legal-case.review)", async () => {
    const caseId = await createTestCase("draft");
    
    await capabilityRegistry.invoke("legal-case", "submit", {
      caseId,
      sessionId: testSession.sessionId,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId,
      actorId: testSession.actorId,
      requiredSigners: ["admin@lawyershub.id"]
    }, testExecutionContext);
    
    await capabilityRegistry.invoke("legal-case", "mark-under-review", {
      caseId,
      sessionId: testSession.sessionId,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId,
      actorId: testSession.actorId,
      paymentAmount: 1500000,
      reviewNotes: "Case needs review"
    }, testExecutionContext);
    
    console.log("[TEST] Running test: under_review → reviewed");
    
    await capabilityRegistry.invoke("legal-case", "review", {
      caseId,
      sessionId: testSession.sessionId,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId,
      actorId: testSession.actorId,
      reviewOutcome: "approved",
      reviewNotes: "Case reviewed and ready for approval"
    }, testExecutionContext);

    const reviewedCase = await caseRepository.byId(caseId);
    console.log("[TEST] Case status after review:", reviewedCase.status);
    assert.equal(reviewedCase.status, "reviewed", "Case status should be reviewed");
    console.log("[TEST] Case transitioned to reviewed successfully");
  });

  it("should transition case from reviewed to approved (legal-case.approve)", async () => {
    const caseId = await createTestCase("draft");
    
    await capabilityRegistry.invoke("legal-case", "submit", {
      caseId,
      sessionId: testSession.sessionId,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId,
      actorId: testSession.actorId,
      requiredSigners: ["admin@lawyershub.id"]
    }, testExecutionContext);
    
    await capabilityRegistry.invoke("legal-case", "mark-under-review", {
      caseId,
      sessionId: testSession.sessionId,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId,
      actorId: testSession.actorId,
      paymentAmount: 1500000,
      reviewNotes: "Case needs review"
    }, testExecutionContext);
    
    await capabilityRegistry.invoke("legal-case", "review", {
      caseId,
      sessionId: testSession.sessionId,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId,
      actorId: testSession.actorId,
      reviewOutcome: "approved",
      reviewNotes: "Case reviewed and ready for approval"
    }, testExecutionContext);
    
    console.log("[TEST] Running test: reviewed → approved");
    
    await capabilityRegistry.invoke("legal-case", "approve", {
      caseId,
      sessionId: testSession.sessionId,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId,
      actorId: testSession.actorId,
      approvalNotes: "Case approved for processing"
    }, testExecutionContext);

    const approvedCase = await caseRepository.byId(caseId);
    console.log("[TEST] Case status after approve:", approvedCase.status);
    assert.equal(approvedCase.status, "approved", "Case status should be approved");
    console.log("[TEST] Case transitioned to approved successfully");
  });

  it("should transition case from approved to closed (legal-case.close)", async () => {
    const caseId = await createTestCase("draft");
    
    await capabilityRegistry.invoke("legal-case", "submit", {
      caseId,
      sessionId: testSession.sessionId,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId,
      actorId: testSession.actorId,
      requiredSigners: ["admin@lawyershub.id"]
    }, testExecutionContext);
    
    await capabilityRegistry.invoke("legal-case", "mark-under-review", {
      caseId,
      sessionId: testSession.sessionId,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId,
      actorId: testSession.actorId,
      paymentAmount: 1500000,
      reviewNotes: "Case needs review"
    }, testExecutionContext);
    
    await capabilityRegistry.invoke("legal-case", "review", {
      caseId,
      sessionId: testSession.sessionId,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId,
      actorId: testSession.actorId,
      reviewOutcome: "approved",
      reviewNotes: "Case reviewed and ready for approval"
    }, testExecutionContext);
    
    await capabilityRegistry.invoke("legal-case", "approve", {
      caseId,
      sessionId: testSession.sessionId,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId,
      actorId: testSession.actorId,
      approvalNotes: "Case approved for processing"
    }, testExecutionContext);
    
    console.log("[TEST] Running test: approved → closed");
    
    await capabilityRegistry.invoke("legal-case", "close", {
      caseId,
      sessionId: testSession.sessionId,
      tenantId: testSession.tenantId,
      workspaceId: testSession.workspaceId,
      actorId: testSession.actorId,
      closureReason: "Case completed successfully",
      closureNotes: "All work items delivered"
    }, testExecutionContext);

    const closedCase = await caseRepository.byId(caseId);
    console.log("[TEST] Case status after close:", closedCase.status);
    assert.equal(closedCase.status, "settled", "Case status should be settled");
    console.log("[TEST] Case transitioned to closed successfully");
  });
});