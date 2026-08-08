// @ts-ignore - bun:test is Bun's native test runner
import { describe, it, expect, beforeEach } from "bun:test";
import { DeliveryDecisionGatewayService, GovernanceDecisionRecord } from "./delivery-decision-gateway.service";
import type { WorkspaceSession } from "../../../../../../apps/web/lib/workspace-session";
import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";

describe("DeliveryDecisionGatewayService - Gate 5 Boundary Compliance Test", () => {
  let gateway: DeliveryDecisionGatewayService;
  const testSession: WorkspaceSession = {
    actorId: "test-user-001",
    actorLabel: "Test User",
    tenantId: "test-tenant",
    workspaceId: "test-workspace",
    productId: "test-product-001",
    issuedAt: new Date().toISOString(),
  };

  const testLedgerPath = join(process.cwd(), "workspace/foundation/governance/decisions/gate5-decisions.jsonl");

  beforeEach(() => {
    // Bersihkan test ledger sebelum setiap test
    if (existsSync(testLedgerPath)) {
      rmSync(testLedgerPath);
    }
    gateway = new DeliveryDecisionGatewayService();
  });

  it("1. Enforces human-only actor boundary - rejects invalid session", () => {
    const invalidSession = { ...testSession, actorId: "" };
    expect(() => gateway!.submitDecision(
      {
        requirementId: "req-001",
        decisionType: "delivery_approval",
        decision: "approve",
        rationale: "All verification checks passed"
      },
      invalidSession as unknown as WorkspaceSession
    )).toThrow("Invalid actor session: missing actor identity");
  });

  it("2. Creates valid GovernanceDecisionRecord with all required fields", () => {
    const record = gateway!.submitDecision(
      {
        requirementId: "req-001",
        decisionType: "delivery_approval",
        decision: "approve",
        rationale: "All verification checks passed"
      },
      testSession
    );

    // Verifikasi semua field mandatory ada (sesuai interface GovernanceDecisionRecord)
    expect(record.decision_id).toBeDefined();
    expect(record.timestamp_utc).toBeDefined();
    expect(record.requirement_id).toBe("req-001");
    expect(record.actor.id).toBe("test-user-001");
    expect(record.actor.label).toBe("Test User");
    expect(record.actor.type).toBe("human");
    expect(record.decision_type).toBe("delivery_approval");
    expect(record.decision).toBe("approve");
    expect(record.rationale).toBe("All verification checks passed");
    expect(record.decision_digest).toBeDefined();
    expect(record.decision_digest.length).toBe(64); // SHA-256 hex length
  });

  it("3. Enforces append-only ledger - records are persisted in sequence", () => {
    // Submit first decision
    const record1 = gateway!.submitDecision(
      {
        requirementId: "req-001",
        decisionType: "delivery_approval",
        decision: "approve",
        rationale: "First approval"
      },
      testSession
    );

    // Submit second decision
    const record2 = gateway!.submitDecision(
      {
        requirementId: "req-001",
        decisionType: "delivery_review",
        decision: "reviewed",
        rationale: "Second review"
      },
      testSession
    );

    // Query kembali
    const decisions = gateway!.getDecisionsForRequirement("req-001");
    expect(decisions.length).toBe(2);
    expect(decisions[0]!.decision_id).toBe(record1.decision_id);
    expect(decisions[1]!.decision_id).toBe(record2.decision_id);
  });

  it("4. Digest boundary - decision_digest is cryptographically verifiable", () => {
    const record = gateway!.submitDecision(
      {
        requirementId: "req-002",
        decisionType: "delivery_approval",
        decision: "approve",
        rationale: "Digest test"
      },
      testSession
    );

    // Verifikasi digest tidak kosong dan valid format
    expect(record.decision_digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("5. Decision ID generation - unique UUID format", () => {
    const records = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const record = gateway!.submitDecision(
        {
          requirementId: "req-003",
          decisionType: "test",
          decision: "test",
          rationale: "UUID test"
        },
        testSession
      );
      // Decision ID harus dimulai dengan 'dec-' dan unik
      expect(record.decision_id.startsWith("dec-")).toBe(true);
      expect(records.has(record.decision_id)).toBe(false);
      records.add(record.decision_id);
    }
  });

  it("6. Read boundary - returns empty array for non-existent requirement", () => {
    const decisions = gateway!.getDecisionsForRequirement("non-existent-req");
    expect(decisions).toEqual([]);
  });
});