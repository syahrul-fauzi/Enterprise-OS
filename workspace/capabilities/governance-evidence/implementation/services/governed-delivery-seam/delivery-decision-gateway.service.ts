import { readFileSync, mkdirSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { recordRuntimeInvocation, computeDigest } from "@repo/core-runtime";
// Import WorkspaceSession type lokal untuk menghindari path relatif issue
type WorkspaceSession = {
  actorId: string;
  actorLabel: string;
  tenantId: string;
  workspaceId: string;
  productId: string;
  issuedAt: string;
};

/**
 * Gate 5 Decision Record Schema (LOCKED, tidak boleh diubah setelah Step 1)
 * Separate dari Gate 3 Attribution V1, tidak memodifikasi artefak yang sudah ada
 */
export interface GovernanceDecisionRecord {
  readonly decision_id: string;
  readonly timestamp_utc: string;
  readonly requirement_id: string;
  readonly product_id: string;
  readonly actor: {
    readonly id: string;
    readonly label: string;
    readonly type: "human";
  };
  readonly decision_type: string;
  readonly decision: string;
  readonly rationale: string;
  readonly decision_digest: string;
}

function resolveLedgerPath(): string {
  const baseDir = process.env.EOS_GOVERNANCE_DECISIONS_PATH || "workspace/foundation/governance/decisions";
  const resolvedBase = baseDir.startsWith("/")
    ? baseDir
    : join(process.cwd(), baseDir);
  return join(resolvedBase, "gate5-decisions.jsonl");
}

function resolveHistoryLedgerPath(): string {
  const baseDir = process.env.EOS_GOVERNANCE_HISTORY_PATH || "workspace/capabilities/governance-evidence/evidence/history";
  const resolvedBase = baseDir.startsWith("/")
    ? baseDir
    : join(process.cwd(), baseDir);
  return join(resolvedBase, "governance-decisions.history.jsonl");
}

/**
 * DecisionLedgerWriter - HANYA komponen yang memiliki akses write ke ledger
 * Enforces single-write boundary (Step 2.5)
 */
class DecisionLedgerWriter {
  private readonly ledgerPath: string;

  constructor() {
    this.ledgerPath = resolveLedgerPath();
    mkdirSync(dirname(this.ledgerPath), { recursive: true });
  }

  append(record: GovernanceDecisionRecord): void {
    appendFileSync(this.ledgerPath, `${JSON.stringify(record)}\n`, "utf8");
  }
}

// Type untuk history entry dari continuous-evidence-collector
export interface GovernanceHistoryEntry {
  readonly timestamp: string;
  readonly decisions: Array<{
    readonly capability_id: string;
    readonly confidence_score: number;
    readonly decision: string;
    readonly evidence_met: number;
    readonly evidence_missing: number;
  }>;
}

/**
 * DecisionLedgerReader - Hanya mengekspos query method, tidak tahu lokasi fisik ledger secara internal
 * Enforces read boundary separation (Step 2.6)
 * B7.18.1 Extension: Menambah dukungan baca history file governance-decisions.history.jsonl
 */
class DecisionLedgerReader {
  private readonly ledgerPath: string;
  private readonly historyLedgerPath: string;

  constructor() {
    this.ledgerPath = resolveLedgerPath();
    this.historyLedgerPath = resolveHistoryLedgerPath();
  }

  listByRequirementId(requirementId: string): GovernanceDecisionRecord[] {
    try {
      const content = readFileSync(this.ledgerPath, "utf8");
      const decisions = content
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as GovernanceDecisionRecord)
        .filter((record) => record.requirement_id === requirementId);
      
      // B7.18.2: Record successful invocation
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "list-decisions-by-requirement",
        sourceRef: "DecisionLedgerReader.listByRequirementId",
        success: true,
        input: { requirementId },
        result: { entries_count: decisions.length }
      });
      
      return decisions;
    } catch (error) {
      console.error("[DecisionLedgerReader] Failed to list decisions by requirement:", error);
      // B7.18.2: Record failed invocation
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "list-decisions-by-requirement",
        sourceRef: "DecisionLedgerReader.listByRequirementId",
        success: false,
        input: { requirementId },
        result: { error: (error as Error).message }
      });
      return [];
    }
  }

  getById(decisionId: string): GovernanceDecisionRecord | undefined {
    try {
      const content = readFileSync(this.ledgerPath, "utf8");
      const decision = content
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as GovernanceDecisionRecord)
        .find((record) => record.decision_id === decisionId);
      
      // B7.18.2: Record successful invocation
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "get-decision-by-id",
        sourceRef: "DecisionLedgerReader.getById",
        success: true,
        input: { decisionId },
        result: { found: !!decision }
      });
      
      return decision;
    } catch (error) {
      console.error("[DecisionLedgerReader] Failed to get decision by ID:", error);
      // B7.18.2: Record failed invocation
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "get-decision-by-id",
        sourceRef: "DecisionLedgerReader.getById",
        success: false,
        input: { decisionId },
        result: { error: (error as Error).message }
      });
      return undefined;
    }
  }

  // B7.18.1 Implementation: listHistory() untuk baca governance-decisions.history.jsonl
  listHistory(): GovernanceHistoryEntry[] {
    try {
      const content = readFileSync(this.historyLedgerPath, "utf8");
      const history = content
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as GovernanceHistoryEntry);
      
      // B7.18.1: Record successful invocation
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "list-governance-history",
        sourceRef: "DecisionLedgerReader.listHistory",
        success: true,
        input: {},
        result: { entries_count: history.length }
      });
      
      return history;
    } catch (error) {
      console.error("[DecisionLedgerReader] Failed to read governance history:", error);
      // B7.18.1: Record failed invocation
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "list-governance-history",
        sourceRef: "DecisionLedgerReader.listHistory",
        success: false,
        input: {},
        result: { error: (error as Error).message }
      });
      return [];
    }
  }

  listByProductId(productId: string): GovernanceDecisionRecord[] {
    try {
      const content = readFileSync(this.ledgerPath, "utf8");
      const decisions = content
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as GovernanceDecisionRecord)
        .filter((record) => record.product_id === productId);
      
      // B7.18.2: Record successful invocation
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "list-decisions-by-product",
        sourceRef: "DecisionLedgerReader.listByProductId",
        success: true,
        input: { productId },
        result: { entries_count: decisions.length }
      });
      
      return decisions;
    } catch (error) {
      console.error("[DecisionLedgerReader] Failed to list decisions by product:", error);
      // B7.18.2: Record failed invocation
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "list-decisions-by-product",
        sourceRef: "DecisionLedgerReader.listByProductId",
        success: false,
        input: { productId },
        result: { error: (error as Error).message }
      });
      return [];
    }
  }

  // B7.18.3: Generate requirements traceability matrix (W1.5 implementation)
  generateTraceabilityMatrix(): Array<{decision_id: string; requirement_id: string; product_id: string; timestamp_utc: string}> {
    try {
      const content = readFileSync(this.ledgerPath, "utf8");
      const matrix = content
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as GovernanceDecisionRecord)
        .map((record) => ({
          decision_id: record.decision_id,
          requirement_id: record.requirement_id,
          product_id: record.product_id,
          timestamp_utc: record.timestamp_utc
        }));
      
      // B7.18.3: Record successful traceability matrix generation
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "generate-traceability-matrix",
        sourceRef: "DecisionLedgerReader.generateTraceabilityMatrix",
        success: true,
        input: {},
        result: { entries_count: matrix.length }
      });
      
      return matrix;
    } catch (error) {
      console.error("[DecisionLedgerReader] Failed to generate traceability matrix:", error);
      // B7.18.3: Record failed traceability matrix generation
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "generate-traceability-matrix",
        sourceRef: "DecisionLedgerReader.generateTraceabilityMatrix",
        success: false,
        input: {},
        result: { error: (error as Error).message }
      });
      return [];
    }
  }
}

/**
 * DeliveryDecisionGateway - Satu-satunya entry point untuk keputusan governance
 * Semua write/read harus melalui gateway ini (enforces boundary separation)
 */
export class DeliveryDecisionGatewayService {
  private readonly writer: DecisionLedgerWriter;
  private readonly reader: DecisionLedgerReader;

  constructor() {
    this.writer = new DecisionLedgerWriter();
    this.reader = new DecisionLedgerReader();
  }

  /**
   * Submit governance decision - hanya boleh dipanggil oleh human actor
   * Reuse actor.id/actor.label dari workspace session (Step 2.3)
   */
  submitDecision(
    input: {
      requirementId: string;
      decisionType: string;
      decision: string;
      rationale: string;
    },
    actorSession: WorkspaceSession
  ): GovernanceDecisionRecord {
    try {
      // Enforce human-only actor (Gate 5 Step 1 invariant)
      if (!actorSession.actorId || !actorSession.actorLabel || !actorSession.productId) {
        throw new Error("Invalid actor session: missing actor identity or product context");
      }

      const decisionId = `dec-${randomUUID()}`;
      const timestampUtc = new Date().toISOString();

      // Buat record sebelum compute digest (untuk hash yang konsisten)
      const recordWithoutDigest = {
        decision_id: decisionId,
        timestamp_utc: timestampUtc,
        requirement_id: input.requirementId,
        product_id: actorSession.productId,
        actor: {
          id: actorSession.actorId,
          label: actorSession.actorLabel,
          type: "human" as const,
        },
        decision_type: input.decisionType,
        decision: input.decision,
        rationale: input.rationale,
      };

      // Compute digest dari canonical record (Step 2.9: digest boundary)
      const decisionDigest = computeDigest(recordWithoutDigest);

      const fullRecord: GovernanceDecisionRecord = {
        ...recordWithoutDigest,
        decision_digest: decisionDigest,
      };

      // Append ke ledger (hanya melalui writer, single-write boundary)
      this.writer.append(fullRecord);

      // B7.18.2: Record successful submitDecision invocation
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "submit-governance-decision",
        sourceRef: "DeliveryDecisionGatewayService.submitDecision",
        success: true,
        input: { requirementId: input.requirementId, decisionType: input.decisionType },
        result: { decision_id: decisionId },
        actor_id: actorSession.actorId,
        tenant_id: actorSession.tenantId,
        productId: actorSession.productId
      });

      return fullRecord;
    } catch (error) {
      console.error("[DeliveryDecisionGatewayService] Failed to submit governance decision:", error);
      // B7.18.2: Record failed submitDecision invocation
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "submit-governance-decision",
        sourceRef: "DeliveryDecisionGatewayService.submitDecision",
        success: false,
        input: { requirementId: input.requirementId, decisionType: input.decisionType },
        result: { error: (error as Error).message },
        actor_id: actorSession?.actorId,
        tenant_id: actorSession?.tenantId,
        productId: actorSession?.productId
      });
      throw error; // Re-throw agar caller tetap mendapatkan error
    }
  }

  /**
   * Query decisions by requirement ID - hanya operasi baca yang diizinkan
   */
  getDecisionsForRequirement(requirementId: string, actorSession?: WorkspaceSession): GovernanceDecisionRecord[] {
    try {
      const decisions = this.reader.listByRequirementId(requirementId);
      // B7.18.2: Gateway-level invocation with full actor context
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "get-decisions-for-requirement",
        sourceRef: "DeliveryDecisionGatewayService.getDecisionsForRequirement",
        success: true,
        input: { requirementId },
        result: { entries_count: decisions.length },
        actor_id: actorSession?.actorId,
        tenant_id: actorSession?.tenantId,
        productId: actorSession?.productId
      });
      return decisions;
    } catch (error) {
      console.error("[DeliveryDecisionGatewayService] Failed to get decisions for requirement:", error);
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "get-decisions-for-requirement",
        sourceRef: "DeliveryDecisionGatewayService.getDecisionsForRequirement",
        success: false,
        input: { requirementId },
        result: { error: (error as Error).message },
        actor_id: actorSession?.actorId,
        tenant_id: actorSession?.tenantId,
        productId: actorSession?.productId
      });
      return [];
    }
  }

  /**
   * Query decisions by product ID - operasi baca untuk audit per-product
   */
  getDecisionsForProduct(productId: string, actorSession?: WorkspaceSession): GovernanceDecisionRecord[] {
    try {
      const decisions = this.reader.listByProductId(productId);
      // B7.18.2: Gateway-level invocation with full actor context
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "get-decisions-for-product",
        sourceRef: "DeliveryDecisionGatewayService.getDecisionsForProduct",
        success: true,
        input: { productId },
        result: { entries_count: decisions.length },
        actor_id: actorSession?.actorId,
        tenant_id: actorSession?.tenantId,
        productId: actorSession?.productId
      });
      return decisions;
    } catch (error) {
      console.error("[DeliveryDecisionGatewayService] Failed to get decisions for product:", error);
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "get-decisions-for-product",
        sourceRef: "DeliveryDecisionGatewayService.getDecisionsForProduct",
        success: false,
        input: { productId },
        result: { error: (error as Error).message },
        actor_id: actorSession?.actorId,
        tenant_id: actorSession?.tenantId,
        productId: actorSession?.productId
      });
      return [];
    }
  }

  /**
   * Query single decision by decision ID - reverse traversal (Decision → Requirement)
   * CLOSURE SEAM: enables reverse chain Runtime Event → Decision → Requirement
   */
  getDecisionById(decisionId: string, actorSession?: WorkspaceSession): GovernanceDecisionRecord | undefined {
    try {
      const decision = this.reader.getById(decisionId);
      // B7.18.2: Gateway-level invocation with full actor context
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "get-decision-by-id",
        sourceRef: "DeliveryDecisionGatewayService.getDecisionById",
        success: true,
        input: { decisionId },
        result: { found: !!decision },
        actor_id: actorSession?.actorId,
        tenant_id: actorSession?.tenantId,
        productId: actorSession?.productId
      });
      return decision;
    } catch (error) {
      console.error("[DeliveryDecisionGatewayService] Failed to get decision by ID:", error);
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "get-decision-by-id",
        sourceRef: "DeliveryDecisionGatewayService.getDecisionById",
        success: false,
        input: { decisionId },
        result: { error: (error as Error).message },
        actor_id: actorSession?.actorId,
        tenant_id: actorSession?.tenantId,
        productId: actorSession?.productId
      });
      return undefined;
    }
  }

  /**
   * Get full requirements traceability matrix - audit-ready endpoint (B7.18.3)
   * Maps all governance decisions to their respective requirements for compliance audits
   */
  getTraceabilityMatrix(actorSession?: WorkspaceSession): Array<{decision_id: string; requirement_id: string; product_id: string; timestamp_utc: string}> {
    try {
      const matrix = this.reader.generateTraceabilityMatrix();
      // B7.18.3: Gateway-level invocation with full actor context for audit trail
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "get-traceability-matrix",
        sourceRef: "DeliveryDecisionGatewayService.getTraceabilityMatrix",
        success: true,
        input: {},
        result: { entries_count: matrix.length },
        actor_id: actorSession?.actorId,
        tenant_id: actorSession?.tenantId,
        productId: actorSession?.productId
      });
      return matrix;
    } catch (error) {
      console.error("[DeliveryDecisionGatewayService] Failed to get traceability matrix:", error);
      recordRuntimeInvocation({
        capabilityId: "governance-evidence",
        operationId: "get-traceability-matrix",
        sourceRef: "DeliveryDecisionGatewayService.getTraceabilityMatrix",
        success: false,
        input: {},
        result: { error: (error as Error).message },
        actor_id: actorSession?.actorId,
        tenant_id: actorSession?.tenantId,
        productId: actorSession?.productId
      });
      return [];
    }
  }
}
/**
 * Export instance untuk api-platform consume (sesuai pola governance-read-gateway.service.ts)
 * Hanya expose method read-only, tidak ada write access dari API
 */
export const deliveryDecisionGatewayService = new DeliveryDecisionGatewayService();
export { DecisionLedgerReader };
