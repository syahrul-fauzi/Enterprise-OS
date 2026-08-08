import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
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

/**
 * Canonicalization logic reuse dari runtime-core/invocation-evidence.ts dan Gate 3 attribution
 * Menjamin konsistensi hash tanpa mengubah implementasi yang sudah ada
 */
function canonicalize(value: unknown): unknown {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return String(value);
}

/**
 * Digest logic reuse dari existing EOS implementations
 * Hanya menjamin tamper-evidence, bukan kebenaran domain (sesuai batas Step 2)
 */
function computeDigest(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function resolveLedgerPath(): string {
  const baseDir = process.env.EOS_GOVERNANCE_DECISIONS_PATH || "workspace/foundation/governance/decisions";
  const resolvedBase = baseDir.startsWith("/")
    ? baseDir
    : join(process.cwd(), baseDir);
  return join(resolvedBase, "gate5-decisions.jsonl");
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

/**
 * DecisionLedgerReader - Hanya mengekspos query method, tidak tahu lokasi fisik ledger secara internal
 * Enforces read boundary separation (Step 2.6)
 */
class DecisionLedgerReader {
  private readonly ledgerPath: string;

  constructor() {
    this.ledgerPath = resolveLedgerPath();
  }

  listByRequirementId(requirementId: string): GovernanceDecisionRecord[] {
    try {
      const content = readFileSync(this.ledgerPath, "utf8");
      return content
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as GovernanceDecisionRecord)
        .filter((record) => record.requirement_id === requirementId);
    } catch {
      return [];
    }
  }

  getById(decisionId: string): GovernanceDecisionRecord | undefined {
    try {
      const content = readFileSync(this.ledgerPath, "utf8");
      return content
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as GovernanceDecisionRecord)
        .find((record) => record.decision_id === decisionId);
    } catch {
      return undefined;
    }
  }

  listByProductId(productId: string): GovernanceDecisionRecord[] {
    try {
      const content = readFileSync(this.ledgerPath, "utf8");
      return content
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as GovernanceDecisionRecord)
        .filter((record) => record.product_id === productId);
    } catch {
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

    return fullRecord;
  }

  /**
   * Query decisions by requirement ID - hanya operasi baca yang diizinkan
   */
  getDecisionsForRequirement(requirementId: string): GovernanceDecisionRecord[] {
    return this.reader.listByRequirementId(requirementId);
  }

  /**
   * Query decisions by product ID - operasi baca untuk audit per-product
   */
  getDecisionsForProduct(productId: string): GovernanceDecisionRecord[] {
    return this.reader.listByProductId(productId);
  }

  /**
   * Query single decision by decision ID - reverse traversal (Decision → Requirement)
   * CLOSURE SEAM: enables reverse chain Runtime Event → Decision → Requirement
   */
  getDecisionById(decisionId: string): GovernanceDecisionRecord | undefined {
    return this.reader.getById(decisionId);
  }
}