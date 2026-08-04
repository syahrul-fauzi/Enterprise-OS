import { DigestEngine } from "@repo/core-kernel";

import {
  defineCanonicalEvidenceProducer,
  produceCanonicalEvidenceFromProducer,
} from "../../canonical-evidence-producer-runtime.js";
import {
  createProjection,
  type Projection,
} from "../../projection/models/domain.js";
import type { DecisionLedgerEntry } from "../../runtime-contracts/models/ledger.js";
import type {
  DecisionLearningRecord,
  DecisionOutcomeRecord,
} from "../../runtime-contracts/models/outcome.js";
import {
  DecisionImpactGraphSchema,
  type DecisionImpactEdge,
  type DecisionImpactGraph,
  type DecisionImpactNode,
  type EngineeringLeverageStatus,
} from "../../runtime-contracts/models/impact.js";

type DecisionImpactProjectionPayload = DecisionImpactGraph;

export const DECISION_IMPACT_EVIDENCE_PRODUCER =
  defineCanonicalEvidenceProducer({
    producer_id: "decision-impact-producer",
    artifact_type: "decision-impact-evidence",
    subject_type: "decision_ledger_entry",
    schema_version: "1.0.0",
    description:
      "Materializes decision impact graphs into canonical evidence.",
    default_projection_ref:
      "workspace/foundation/evidence/verification/decision-impact-projection.json",
    claim_boundary:
      "Decision impact evidence claims only graph-level traceability from one decision to impacted capabilities, referenced evidence, observed outcome, and leverage status.",
  });

export function materializeDecisionImpactGraph(input: {
  readonly decisionEntry: DecisionLedgerEntry;
  readonly outcomeRecord: DecisionOutcomeRecord;
  readonly learningRecord: DecisionLearningRecord;
}): DecisionImpactGraph {
  const decisionNode = createNode({
    node_id: input.decisionEntry.decision_id,
    node_kind: "decision",
    display_name: input.decisionEntry.decision_type,
    digest: input.decisionEntry.decision_digest,
    status: input.decisionEntry.decision_snapshot.status,
    attributes: {
      selected_option: input.decisionEntry.decision_snapshot.selected_option,
      confidence: input.decisionEntry.decision_snapshot.confidence,
    },
  });
  const capabilityNodes = input.outcomeRecord.capability_refs.map((capabilityId) =>
    createNode({
      node_id: capabilityId,
      node_kind: "capability",
      display_name: capabilityId,
      digest: DigestEngine.digest(capabilityId),
      status: input.outcomeRecord.status,
      attributes: {
        source: "decision_outcome",
      },
    }),
  );
  const evidenceNodes = uniqueById(
    [
      ...input.decisionEntry.decision_snapshot.evidence_refs,
      ...input.outcomeRecord.evidence_refs,
    ].map((evidenceRef) =>
      createNode({
        node_id: evidenceRef.ref_id,
        node_kind: "evidence",
        display_name: evidenceRef.ref_id,
        digest: evidenceRef.digest ?? DigestEngine.digest(evidenceRef.ref_id),
        status: "REFERENCED",
        attributes: {
          ref_kind: evidenceRef.ref_kind,
        },
      }),
    ),
  );
  const outcomeNode = createNode({
    node_id: input.outcomeRecord.outcome_tracking_id,
    node_kind: "outcome",
    display_name: input.outcomeRecord.expected_outcome.outcome_id,
    digest: DigestEngine.digest(input.outcomeRecord),
    status: input.outcomeRecord.status,
    attributes: {
      observed_metric_count: input.outcomeRecord.observed_metrics.length,
      success_metric: input.outcomeRecord.expected_outcome.success_metric,
    },
  });
  const learningNode = createNode({
    node_id: input.learningRecord.learning_id,
    node_kind: "learning",
    display_name: input.learningRecord.learning_id,
    digest: DigestEngine.digest(input.learningRecord),
    status: input.learningRecord.status,
    attributes: {
      lesson_count: input.learningRecord.lessons.length,
      follow_up_action_count: input.learningRecord.follow_up_actions.length,
    },
  });
  const leverageNode =
    input.outcomeRecord.leverage_delta === undefined
      ? null
      : createNode({
          node_id: `leverage:${input.outcomeRecord.leverage_delta.metric_id}`,
          node_kind: "leverage_metric",
          display_name: input.outcomeRecord.leverage_delta.metric_id,
          digest: DigestEngine.digest(input.outcomeRecord.leverage_delta),
          status: classifyLeverageStatus(input.outcomeRecord.leverage_delta.delta_value),
          attributes: {
            baseline_value: input.outcomeRecord.leverage_delta.baseline_value,
            current_value: input.outcomeRecord.leverage_delta.current_value,
            delta_value: input.outcomeRecord.leverage_delta.delta_value,
            interpretation: input.outcomeRecord.leverage_delta.interpretation,
          },
        });

  const nodes = sortNodes(
    [
      decisionNode,
      ...capabilityNodes,
      ...evidenceNodes,
      outcomeNode,
      learningNode,
      ...(leverageNode === null ? [] : [leverageNode]),
    ],
  );
  const edges = sortEdges([
    ...evidenceNodes.map((node) =>
      createEdge({
        edge_kind: "USES_EVIDENCE",
        from_node_id: decisionNode.node_id,
        to_node_id: node.node_id,
        rationale: "Decision was synthesized using referenced evidence.",
      }),
    ),
    ...capabilityNodes.map((node) =>
      createEdge({
        edge_kind: "IMPACTS_CAPABILITY",
        from_node_id: decisionNode.node_id,
        to_node_id: node.node_id,
        rationale: "Decision changes or constrains capability behavior.",
      }),
    ),
    createEdge({
      edge_kind: "REALIZES_OUTCOME",
      from_node_id: decisionNode.node_id,
      to_node_id: outcomeNode.node_id,
      rationale: "Decision is evaluated through observed outcome tracking.",
    }),
    createEdge({
      edge_kind: "CAPTURES_LEARNING",
      from_node_id: outcomeNode.node_id,
      to_node_id: learningNode.node_id,
      rationale: "Outcome observations produce learning for future decisions.",
    }),
    ...(leverageNode === null
      ? []
      : [
          createEdge({
            edge_kind: "MEASURES_LEVERAGE",
            from_node_id: outcomeNode.node_id,
            to_node_id: leverageNode.node_id,
            rationale: "Outcome records engineering leverage movement.",
          }),
        ]),
  ]);

  const graphPayload = {
    decision_reference: {
      decision_entry_id: input.decisionEntry.decision_entry_id,
      decision_id: input.decisionEntry.decision_id,
    },
    nodes,
    edges,
  };
  const graphDigest = DigestEngine.digest(graphPayload);

  return DecisionImpactGraphSchema.parse({
    graph_id: `decision-impact-graph:${graphDigest.slice(0, 16)}`,
    graph_digest: graphDigest,
    decision_reference: graphPayload.decision_reference,
    summary: {
      node_count: nodes.length,
      edge_count: edges.length,
      capability_count: capabilityNodes.length,
      evidence_count: evidenceNodes.length,
      learning_count: 1,
      leverage_measurement_status:
        leverageNode?.status ?? "NOT_MATERIALIZED",
      leverage_delta_value:
        input.outcomeRecord.leverage_delta?.delta_value ?? null,
    },
    nodes,
    edges,
    claim_boundary:
      "Decision impact graph claims only the traced relationship from one decision ledger entry to its impacted capabilities, referenced evidence, observed outcome, learning, and leverage movement.",
  });
}

export function materializeDecisionImpactProjection(input: {
  readonly graph: DecisionImpactGraph;
  readonly decisionEntry: DecisionLedgerEntry;
  readonly outcomeRecord: DecisionOutcomeRecord;
  readonly learningRecord: DecisionLearningRecord;
  readonly generatedAtUtc?: string;
}): Projection<DecisionImpactProjectionPayload> {
  return createProjection({
    projectionType: "DecisionImpactProjection",
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
    payload: input.graph,
  });
}

export function materializeDecisionImpactEvidence(input: {
  readonly graph: DecisionImpactGraph;
  readonly projection: Projection<DecisionImpactProjectionPayload>;
  readonly decisionEntry: DecisionLedgerEntry;
  readonly outcomeRecord: DecisionOutcomeRecord;
  readonly learningRecord: DecisionLearningRecord;
  readonly projectionRef?: string;
  readonly generatedAtUtc?: string;
}) {
  return produceCanonicalEvidenceFromProducer({
    producer: DECISION_IMPACT_EVIDENCE_PRODUCER,
    generated_at_utc: input.generatedAtUtc ?? input.projection.generated_at_utc,
    subject: {
      subject_ref: input.decisionEntry.decision_entry_id,
    },
    projection: input.projection,
    projection_ref: input.projectionRef,
    summary: {
      decision_id: input.decisionEntry.decision_id,
      capability_count: input.graph.summary.capability_count,
      evidence_count: input.graph.summary.evidence_count,
      leverage_measurement_status: input.graph.summary.leverage_measurement_status,
      leverage_delta_value: input.graph.summary.leverage_delta_value,
    },
    findings: buildDecisionImpactFindings(input.graph),
    evidence: {
      graph_summary: input.graph.summary,
      outcome_status: input.outcomeRecord.status,
      learning_status: input.learningRecord.status,
      impacted_capabilities: input.outcomeRecord.capability_refs,
      referenced_evidence: input.outcomeRecord.evidence_refs,
      projection_payload_ref: input.projectionRef ?? null,
    },
  });
}

function createNode(input: DecisionImpactNode): DecisionImpactNode {
  return input;
}

function createEdge(input: Omit<DecisionImpactEdge, "edge_id">): DecisionImpactEdge {
  return {
    edge_id: `decision-impact-edge:${DigestEngine.digest(input).slice(0, 16)}`,
    ...input,
  };
}

function uniqueById(nodes: readonly DecisionImpactNode[]): readonly DecisionImpactNode[] {
  return Array.from(new Map(nodes.map((node) => [node.node_id, node])).values());
}

function sortNodes(nodes: readonly DecisionImpactNode[]): readonly DecisionImpactNode[] {
  return [...nodes].sort((left, right) => left.node_id.localeCompare(right.node_id));
}

function sortEdges(edges: readonly DecisionImpactEdge[]): readonly DecisionImpactEdge[] {
  return [...edges].sort((left, right) => left.edge_id.localeCompare(right.edge_id));
}

function classifyLeverageStatus(deltaValue: number): EngineeringLeverageStatus {
  if (deltaValue > 0) {
    return "IMPROVED";
  }
  if (deltaValue < 0) {
    return "REGRESSED";
  }
  return "UNCHANGED";
}

function buildDecisionImpactFindings(
  graph: DecisionImpactGraph,
): readonly string[] {
  const findings: string[] = [];
  if (graph.summary.capability_count === 0) {
    findings.push("Decision impact graph has no impacted capability references.");
  }
  if (graph.summary.evidence_count === 0) {
    findings.push("Decision impact graph has no referenced evidence nodes.");
  }
  if (graph.summary.leverage_measurement_status !== "IMPROVED") {
    findings.push(
      `Engineering leverage status is ${graph.summary.leverage_measurement_status}.`,
    );
  }
  return findings;
}
