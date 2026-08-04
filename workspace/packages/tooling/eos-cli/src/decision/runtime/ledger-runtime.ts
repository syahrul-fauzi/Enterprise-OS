import { DigestEngine } from "@repo/core-kernel";

import { captureExecutionTimestampUtc } from "../../governance-runtime.js";
import type { DecisionSynthesis } from "../../runtime-contracts/models/decision.js";
import {
  DecisionLedgerEntrySchema,
  type DecisionLedgerEntry,
  type DecisionLedgerReference,
} from "../../runtime-contracts/models/ledger.js";
import type { LedgerReader } from "../../runtime-contracts/spi/ledger-reader.js";
import type { DecisionWriter } from "../../runtime-contracts/spi/decision-writer.js";

export function materializeDecisionLedgerEntry(input: {
  readonly decision: DecisionSynthesis;
  readonly ecgSnapshotDigest?: string;
  readonly evaluatorResultDigests?: readonly string[];
  readonly decisionTime?: string;
  readonly createdAt?: string;
  readonly supersedesDecisionEntryId?: string;
  readonly outcomeRef?: string;
  readonly learningRef?: string;
  readonly decisionEntryPrefix?: string;
}): DecisionLedgerEntry {
  const decisionDigest = DigestEngine.digest(input.decision);
  const decisionTime = input.decisionTime ?? input.decision.created_at;
  const createdAt = input.createdAt ?? captureExecutionTimestampUtc();
  const entryIdentityDigest = DigestEngine.digest({
    decision_id: input.decision.decision_id,
    decision_digest: decisionDigest,
    decision_time: decisionTime,
    ecg_snapshot_digest: input.ecgSnapshotDigest ?? input.decision.graph_digest,
    evaluator_result_digests:
      input.evaluatorResultDigests ?? input.decision.source_evaluation_ids,
    supersedes_decision_entry_id: input.supersedesDecisionEntryId ?? null,
  });

  return DecisionLedgerEntrySchema.parse({
    decision_entry_id: `${input.decisionEntryPrefix ?? "decision-entry"}:${entryIdentityDigest.slice(0, 16)}`,
    decision_id: input.decision.decision_id,
    decision_time: decisionTime,
    decision_type: input.decision.decision_type,
    inputs: {
      ecg_snapshot_digest: input.ecgSnapshotDigest ?? input.decision.graph_digest,
      evaluator_result_digests:
        input.evaluatorResultDigests ?? input.decision.source_evaluation_ids,
    },
    decision_snapshot: input.decision,
    decision_digest: decisionDigest,
    confidence: input.decision.confidence,
    created_at: createdAt,
    outcome_ref: input.outcomeRef ?? input.decision.outcome_tracking_ref,
    learning_ref: input.learningRef ?? input.decision.learning_ref,
    supersedes_decision_entry_id: input.supersedesDecisionEntryId,
  });
}

export function createDecisionLedgerReference(
  entry: DecisionLedgerEntry,
): DecisionLedgerReference {
  return {
    decision_entry_id: entry.decision_entry_id,
    decision_id: entry.decision_id,
  };
}

export class InMemoryDecisionLedger implements DecisionWriter, LedgerReader {
  readonly #entriesById = new Map<string, DecisionLedgerEntry>();
  readonly #entriesByDecisionId = new Map<string, DecisionLedgerEntry[]>();

  async append(input: DecisionSynthesis): Promise<DecisionLedgerEntry> {
    const latestEntry = this.#entriesByDecisionId.get(input.decision_id)?.at(-1) ?? null;
    const entry = materializeDecisionLedgerEntry({
      decision: input,
      supersedesDecisionEntryId: latestEntry?.decision_entry_id,
    });
    this.#entriesById.set(entry.decision_entry_id, entry);
    const currentEntries = this.#entriesByDecisionId.get(entry.decision_id) ?? [];
    this.#entriesByDecisionId.set(entry.decision_id, [...currentEntries, entry]);
    return entry;
  }

  async getEntry(
    reference: DecisionLedgerReference,
  ): Promise<DecisionLedgerEntry | null> {
    const entry = this.#entriesById.get(reference.decision_entry_id) ?? null;
    if (entry === null) {
      return null;
    }
    return entry.decision_id === reference.decision_id ? entry : null;
  }

  async getLatest(input: {
    readonly decision_id: string;
  }): Promise<DecisionLedgerEntry | null> {
    return this.#entriesByDecisionId.get(input.decision_id)?.at(-1) ?? null;
  }

  async replay(input: {
    readonly reference: DecisionLedgerReference;
    readonly policy_version?: string;
  }): Promise<DecisionLedgerEntry> {
    const entry = await this.getEntry(input.reference);
    if (entry === null) {
      throw new Error(
        `Decision ledger entry not found for ${input.reference.decision_entry_id}.`,
      );
    }
    if (
      typeof input.policy_version === "string" &&
      entry.decision_snapshot.policy_version !== input.policy_version
    ) {
      throw new Error(
        `Decision replay policy version mismatch for ${entry.decision_entry_id}.`,
      );
    }
    return entry;
  }
}
