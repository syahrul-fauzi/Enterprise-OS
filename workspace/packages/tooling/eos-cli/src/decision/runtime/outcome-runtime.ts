// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine";

import {
  defineCanonicalEvidenceProducer,
  produceCanonicalEvidenceFromProducer,
} from "../../canonical-evidence-producer-runtime.js";
import {
  createProjection,
  type Projection,
} from "../../projection/models/domain.js";
import type { DecisionLedgerEntry } from "../../runtime-contracts/models/ledger.js";
import {
  DecisionLearningRecordSchema,
  DecisionOutcomeRecordSchema,
  type DecisionLearningRecord,
  type DecisionObservedMetric,
  type DecisionOutcomeRecord,
} from "../../runtime-contracts/models/outcome.js";

type DecisionOutcomeProjectionPayload = {
  readonly decision_id: string;
  readonly decision_entry_id: string;
  readonly decision_type: string;
  readonly selected_option: string;
  readonly outcome_status: DecisionOutcomeRecord["status"];
  readonly expected_outcome: DecisionOutcomeRecord["expected_outcome"];
  readonly observed_metrics: readonly DecisionObservedMetric[];
  readonly leverage_delta: DecisionOutcomeRecord["leverage_delta"];
  readonly learning_status: DecisionLearningRecord["status"];
  readonly lessons: readonly string[];
};

export const DECISION_OUTCOME_EVIDENCE_PRODUCER =
  defineCanonicalEvidenceProducer({
    producer_id: "decision-outcome-producer",
    artifact_type: "decision-outcome-evidence",
    subject_type: "decision_ledger_entry",
    schema_version: "1.0.0",
    description:
      "Materializes decision outcome tracking and learning into canonical evidence.",
    default_projection_ref:
      "workspace/foundation/evidence/verification/decision-outcome-projection.json",
    claim_boundary:
      "Decision outcome evidence claims only the observed metrics, classified outcome status, and captured learning linked to the referenced decision ledger entry.",
  });

export function materializeDecisionOutcomeRecord(input: {
  readonly decisionEntry: DecisionLedgerEntry;
  readonly observedMetrics: readonly DecisionObservedMetric[];
  readonly summary?: string;
  readonly evidenceRefs?: DecisionOutcomeRecord["evidence_refs"];
  readonly capabilityRefs?: DecisionOutcomeRecord["capability_refs"];
  readonly leverageDelta?: DecisionOutcomeRecord["leverage_delta"];
  readonly observedAt?: string;
  readonly outcomeTrackingPrefix?: string;
}): DecisionOutcomeRecord {
  const observedAt =
    input.observedAt ??
    input.observedMetrics.at(-1)?.observed_at ??
    input.decisionEntry.created_at;
  const status = classifyDecisionOutcomeStatus(input.observedMetrics);
  const outcomeIdentityDigest = DigestEngine.digest({
    decision_entry_id: input.decisionEntry.decision_entry_id,
    observed_metrics: input.observedMetrics,
    leverage_delta: input.leverageDelta ?? null,
    status,
  });

  return DecisionOutcomeRecordSchema.parse({
    outcome_tracking_id: `${input.outcomeTrackingPrefix ?? "decision-outcome"}:${outcomeIdentityDigest.slice(0, 16)}`,
    decision_reference: {
      decision_entry_id: input.decisionEntry.decision_entry_id,
      decision_id: input.decisionEntry.decision_id,
    },
    decision_id: input.decisionEntry.decision_id,
    expected_outcome: input.decisionEntry.decision_snapshot.expected_outcome,
    status,
    summary:
      input.summary ??
      summarizeDecisionOutcome({
        decisionType: input.decisionEntry.decision_type,
        status,
      }),
    observed_metrics: input.observedMetrics,
    evidence_refs: input.evidenceRefs ?? [],
    capability_refs: input.capabilityRefs ?? [],
    leverage_delta: input.leverageDelta,
    observed_at: observedAt,
  });
}

export function materializeDecisionLearningRecord(input: {
  readonly decisionEntry: DecisionLedgerEntry;
  readonly outcomeRecord: DecisionOutcomeRecord;
  readonly lessons: readonly string[];
  readonly followUpActions?: readonly string[];
  readonly createdAt?: string;
  readonly learningPrefix?: string;
}): DecisionLearningRecord {
  const createdAt = input.createdAt ?? input.outcomeRecord.observed_at;
  const learningIdentityDigest = DigestEngine.digest({
    outcome_tracking_id: input.outcomeRecord.outcome_tracking_id,
    lessons: input.lessons,
    follow_up_actions: input.followUpActions ?? [],
  });
  const expectedHypothesis =
    input.decisionEntry.decision_snapshot.expected_outcome.hypothesis;
  const validated =
    input.outcomeRecord.status === "ACHIEVED" ? [expectedHypothesis] : [];
  const invalidated =
    input.outcomeRecord.status === "MISSED" ? [expectedHypothesis] : [];

  return DecisionLearningRecordSchema.parse({
    learning_id: `${input.learningPrefix ?? "decision-learning"}:${learningIdentityDigest.slice(0, 16)}`,
    decision_reference: {
      decision_entry_id: input.decisionEntry.decision_entry_id,
      decision_id: input.decisionEntry.decision_id,
    },
    outcome_tracking_id: input.outcomeRecord.outcome_tracking_id,
    status: input.outcomeRecord.status === "PENDING" ? "OPEN" : "CAPTURED",
    hypotheses_validated: validated,
    hypotheses_invalidated: invalidated,
    lessons: [...input.lessons],
    follow_up_actions: [...(input.followUpActions ?? [])],
    created_at: createdAt,
  });
}

export function materializeDecisionOutcomeTrackingProjection(input: {
  readonly decisionEntry: DecisionLedgerEntry;
  readonly outcomeRecord: DecisionOutcomeRecord;
  readonly learningRecord: DecisionLearningRecord;
  readonly generatedAtUtc?: string;
}): Projection<DecisionOutcomeProjectionPayload> {
  const payload: DecisionOutcomeProjectionPayload = {
    decision_id: input.decisionEntry.decision_id,
    decision_entry_id: input.decisionEntry.decision_entry_id,
    decision_type: input.decisionEntry.decision_type,
    selected_option: input.decisionEntry.decision_snapshot.selected_option,
    outcome_status: input.outcomeRecord.status,
    expected_outcome: input.outcomeRecord.expected_outcome,
    observed_metrics: input.outcomeRecord.observed_metrics,
    leverage_delta: input.outcomeRecord.leverage_delta,
    learning_status: input.learningRecord.status,
    lessons: input.learningRecord.lessons,
  };

  return createProjection({
    projectionType: "DecisionOutcomeProjection",
    schemaVersion: "1.0.0",
    generatedAtUtc: input.generatedAtUtc,
    generatedFrom: [
      {
        source_type: "decision_ledger_entry",
        source_ref: input.decisionEntry.decision_entry_id,
        source_digest: input.decisionEntry.decision_digest,
      },
      {
        source_type: "decision_outcome_record",
        source_ref: input.outcomeRecord.outcome_tracking_id,
        source_digest: DigestEngine.digest(input.outcomeRecord),
      },
      {
        source_type: "decision_learning_record",
        source_ref: input.learningRecord.learning_id,
        source_digest: DigestEngine.digest(input.learningRecord),
      },
    ],
    payload,
  });
}

export function materializeDecisionOutcomeEvidence(input: {
  readonly decisionEntry: DecisionLedgerEntry;
  readonly outcomeRecord: DecisionOutcomeRecord;
  readonly learningRecord: DecisionLearningRecord;
  readonly projection: Projection<DecisionOutcomeProjectionPayload>;
  readonly projectionRef?: string;
  readonly generatedAtUtc?: string;
}) {
  return produceCanonicalEvidenceFromProducer({
    producer: DECISION_OUTCOME_EVIDENCE_PRODUCER,
    generated_at_utc: input.generatedAtUtc ?? input.projection.generated_at_utc,
    subject: {
      subject_ref: input.decisionEntry.decision_entry_id,
    },
    projection: input.projection,
    projection_ref: input.projectionRef,
    summary: {
      decision_id: input.decisionEntry.decision_id,
      outcome_status: input.outcomeRecord.status,
      learning_status: input.learningRecord.status,
      observed_metric_count: input.outcomeRecord.observed_metrics.length,
    },
    findings: buildDecisionOutcomeFindings({
      outcome: input.outcomeRecord,
      learning: input.learningRecord,
    }),
    evidence: {
      decision_reference: input.outcomeRecord.decision_reference,
      expected_outcome: input.outcomeRecord.expected_outcome,
      observed_metrics: input.outcomeRecord.observed_metrics,
      leverage_delta: input.outcomeRecord.leverage_delta ?? null,
      learning: input.learningRecord,
      projection_payload_ref: input.projectionRef ?? null,
    },
  });
}

function classifyDecisionOutcomeStatus(
  metrics: readonly DecisionObservedMetric[],
): DecisionOutcomeRecord["status"] {
  if (metrics.every((metric) => metric.status === "MET")) {
    return "ACHIEVED";
  }
  if (metrics.every((metric) => metric.status === "NOT_APPLICABLE")) {
    return "PENDING";
  }
  if (metrics.some((metric) => metric.status === "MISSED")) {
    return metrics.some((metric) => metric.status === "MET")
      ? "PARTIALLY_ACHIEVED"
      : "MISSED";
  }
  if (metrics.some((metric) => metric.status === "PARTIAL")) {
    return "PARTIALLY_ACHIEVED";
  }
  return "PENDING";
}

function summarizeDecisionOutcome(input: {
  readonly decisionType: string;
  readonly status: DecisionOutcomeRecord["status"];
}): string {
  switch (input.status) {
    case "ACHIEVED":
      return `Decision ${input.decisionType} achieved its expected outcome.`;
    case "PARTIALLY_ACHIEVED":
      return `Decision ${input.decisionType} partially achieved its expected outcome.`;
    case "MISSED":
      return `Decision ${input.decisionType} missed its expected outcome.`;
    case "SUPERSEDED":
      return `Decision ${input.decisionType} has been superseded before outcome closure.`;
    case "PENDING":
    default:
      return `Decision ${input.decisionType} is still awaiting outcome closure.`;
  }
}

function buildDecisionOutcomeFindings(input: {
  readonly outcome: DecisionOutcomeRecord;
  readonly learning: DecisionLearningRecord;
}): readonly string[] {
  const findings: string[] = [];
  if (input.outcome.status !== "ACHIEVED") {
    findings.push(`Outcome status is ${input.outcome.status}.`);
  }
  if (input.learning.hypotheses_invalidated.length > 0) {
    findings.push("Expected hypothesis was invalidated by observed outcome.");
  }
  if (input.learning.lessons.length > 0) {
    findings.push(
      `Learning captured ${input.learning.lessons.length} lesson(s) for future decisions.`,
    );
  }
  return findings;
}
