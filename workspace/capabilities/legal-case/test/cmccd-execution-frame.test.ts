/**
 * LH-CMBCD-001: CMBCD Framework & Execution Frame Calculation Test
 * Verifikasi bahwa calculateExecutionFrame berfungsi di seluruh actor type dan risk level
 * Sesuai user mandate: Actor + Capability + Authority + Context + Risk + Evidence ↓ Capability Boundary ↓ Connection Medium ↓ Execution
 */
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { calculateExecutionFrame } from "../contracts/case.contracts";
import type { ActorMetadata, AuthorizationScope, CaseContextMetadata, RiskAssessment } from "../contracts/case.contracts";

describe("LH-CMBCD-001: CMBCD Execution Frame Calculation", () => {
  // Base test data yang dapat di-reuse untuk semua skenario
  const baseAuthorization: AuthorizationScope = {
    allowedActions: ["case:read", "case:update"],
    expiryTimestamp: "2026-12-31T23:59:59Z",
    delegatedBy: "actor.admin.001" as any,
    restrictedFields: ["paymentDetails"]
  };

  const baseContext: CaseContextMetadata = {
    tenantId: "tenant.lawyershub" as any,
    workspaceId: "workspace.legal-team" as any,
    jurisdiction: "ID-JAKARTA",
    caseCategory: "corporate-law",
    sensitivityLevel: "internal",
    relatedWorkIds: []
  };

  // Test suite untuk Human actors (actorType: human)
  describe("Human Actor Scenarios", () => {
    it("should return 'direct' for verified human with low risk", () => {
      const actor: ActorMetadata = {
        actorId: "actor.human.001" as any,
        actorType: "human",
        role: "senior-lawyer",
        displayName: "John Doe",
        trustLevel: "verified"
      };

      const risk: RiskAssessment = {
        level: "low",
        rationale: "Routine corporate case, minimal risk",
        assessedBy: "actor.risk.001" as any,
        assessedAt: new Date()
      };

      const result = calculateExecutionFrame(actor, baseAuthorization, baseContext, risk);
      assert.strictEqual(result, "direct", "Verified human with low risk should get direct execution");
    });

    it("should return 'constrained-gui' for unverified human", () => {
      const actor: ActorMetadata = {
        actorId: "actor.human.002" as any,
        actorType: "human",
        role: "intern-lawyer",
        displayName: "Jane Smith",
        trustLevel: "unverified"
      };

      const risk: RiskAssessment = {
        level: "low",
        rationale: "Routine case, but actor is new",
        assessedBy: "actor.risk.001" as any,
        assessedAt: new Date()
      };

      const result = calculateExecutionFrame(actor, baseAuthorization, baseContext, risk);
      assert.strictEqual(result, "constrained-gui", "Unverified human should get constrained GUI only");
    });

    it("should return 'constrained-gui' for verified human with critical risk/restricted data", () => {
      const actor: ActorMetadata = {
        actorId: "actor.human.001" as any,
        actorType: "human",
        role: "managing-partner",
        displayName: "Senior Partner",
        trustLevel: "verified"
      };

      const restrictedContext = { ...baseContext, sensitivityLevel: "restricted" as const };
      const criticalRisk: RiskAssessment = {
        level: "critical",
        rationale: "High-stakes merger case, sensitive data",
        assessedBy: "actor.risk.001" as any,
        assessedAt: new Date()
      };

      const result = calculateExecutionFrame(actor, baseAuthorization, restrictedContext, criticalRisk);
      assert.strictEqual(result, "constrained-gui", "Even verified human gets constrained GUI for critical risk");
    });
  });

  // Test suite untuk AI agents (actorType: ai-agent)
  describe("AI Agent Scenarios", () => {
    it("should return 'proxy' for certified AI agent with low risk", () => {
      const actor: ActorMetadata = {
        actorId: "actor.ai.legal-assistant" as any,
        actorType: "ai-agent",
        role: "document-reviewer",
        displayName: "Legal AI Assistant",
        trustLevel: "certified"
      };

      const risk: RiskAssessment = {
        level: "low",
        rationale: "AI has been certified for document review",
        assessedBy: "actor.risk.001" as any,
        assessedAt: new Date()
      };

      const result = calculateExecutionFrame(actor, baseAuthorization, baseContext, risk);
      assert.strictEqual(result, "proxy", "Certified AI with low risk should get proxy execution");
    });

    it("should return 'constrained-gui' for uncertified AI agent", () => {
      const actor: ActorMetadata = {
        actorId: "actor.ai.experimental" as any,
        actorType: "ai-agent",
        role: "experimental-assistant",
        displayName: "New AI Model",
        trustLevel: "unverified"
      };

      const risk: RiskAssessment = {
        level: "low",
        rationale: "AI not yet certified for production use",
        assessedBy: "actor.risk.001" as any,
        assessedAt: new Date()
      };

      const result = calculateExecutionFrame(actor, baseAuthorization, baseContext, risk);
      assert.strictEqual(result, "constrained-gui", "Unverified AI should get constrained GUI only");
    });

    it("should return 'constrained-gui' for certified AI with medium/high risk", () => {
      const actor: ActorMetadata = {
        actorId: "actor.ai.legal-assistant" as any,
        actorType: "ai-agent",
        role: "document-reviewer",
        displayName: "Legal AI Assistant",
        trustLevel: "certified"
      };

      const mediumRisk: RiskAssessment = {
        level: "medium",
        rationale: "Case involves sensitive client data",
        assessedBy: "actor.risk.001" as any,
        assessedAt: new Date()
      };

      const result = calculateExecutionFrame(actor, baseAuthorization, baseContext, mediumRisk);
      assert.strictEqual(result, "constrained-gui", "Certified AI with medium risk should get constrained GUI");
    });
  });

  // Test suite untuk External Services/Machines (actorType: external-service/machine)
  describe("External Service & Machine Scenarios", () => {
    it("should return 'mcp' for certified external service with limited permissions", () => {
      const actor: ActorMetadata = {
        actorId: "actor.service.document-storage" as any,
        actorType: "external-service",
        role: "cloud-storage",
        displayName: "AWS S3 Document Storage",
        trustLevel: "certified"
      };

      const limitedAuthorization = { ...baseAuthorization, allowedActions: ["document:read"] }; // Hanya 1 action
      const risk: RiskAssessment = {
        level: "low",
        rationale: "Certified storage service with minimal permissions",
        assessedBy: "actor.risk.001" as any,
        assessedAt: new Date()
      };

      const result = calculateExecutionFrame(actor, limitedAuthorization, baseContext, risk);
      assert.strictEqual(result, "mcp", "Certified external service with limited permissions should get MCP execution");
    });

    it("should return 'constrained-gui' for uncertified external service", () => {
      const actor: ActorMetadata = {
        actorId: "actor.service.unknown-api" as any,
        actorType: "external-service",
        role: "third-party-api",
        displayName: "Unverified Third Party API",
        trustLevel: "unverified"
      };

      const risk: RiskAssessment = {
        level: "low",
        rationale: "Service not yet vetted for production",
        assessedBy: "actor.risk.001" as any,
        assessedAt: new Date()
      };

      const result = calculateExecutionFrame(actor, baseAuthorization, baseContext, risk);
      assert.strictEqual(result, "constrained-gui", "Unverified external service should get constrained GUI only");
    });

    it("should return 'constrained-gui' for certified service with excessive permissions", () => {
      const actor: ActorMetadata = {
        actorId: "actor.service.automation" as any,
        actorType: "machine",
        role: "rpa-automation",
        displayName: "RPA Automation Bot",
        trustLevel: "certified"
      };

      const excessiveAuthorization = { 
        ...baseAuthorization, 
        allowedActions: ["case:read", "case:update", "case:delete", "user:read", "payment:process"] 
      }; // Banyak actions

      const risk: RiskAssessment = {
        level: "low",
        rationale: "Automation bot but has excessive permissions",
        assessedBy: "actor.risk.001" as any,
        assessedAt: new Date()
      };

      const result = calculateExecutionFrame(actor, excessiveAuthorization, baseContext, risk);
      assert.strictEqual(result, "constrained-gui", "Certified service with excessive permissions should be constrained");
    });
  });

  // Test suite untuk edge cases dan fallback
  describe("Edge Case & Fallback Scenarios", () => {
    it("should return 'constrained-gui' for unknown actor type (fallback)", () => {
      // @ts-expect-error - Testing invalid actor type yang tidak terdefinisi
      const actor: ActorMetadata = {
        actorId: "actor.unknown.001" as any,
        actorType: "unknown-type",
        role: "unknown",
        displayName: "Unknown Actor",
        trustLevel: "verified"
      };

      const risk: RiskAssessment = {
        level: "low",
        rationale: "Unknown actor type",
        assessedBy: "actor.risk.001" as any,
        assessedAt: new Date()
      };

      const result = calculateExecutionFrame(actor, baseAuthorization, baseContext, risk);
      assert.strictEqual(result, "constrained-gui", "Unknown actor type should always fall back to constrained GUI");
    });

    it("should prioritize context sensitivity over actor trust level", () => {
      const actor: ActorMetadata = {
        actorId: "actor.human.ceo" as any,
        actorType: "human",
        role: "chief-executive",
        displayName: "CEO",
        trustLevel: "certified"
      };

      const topSecretContext = { ...baseContext, sensitivityLevel: "restricted" as const };
      const risk: RiskAssessment = {
        level: "medium",
        rationale: "Ultra-sensitive board case",
        assessedBy: "actor.risk.001" as any,
        assessedAt: new Date()
      };

      const result = calculateExecutionFrame(actor, baseAuthorization, topSecretContext, risk);
      assert.strictEqual(result, "constrained-gui", "Restricted data sensitivity overrides actor trust level");
    });
  });
});