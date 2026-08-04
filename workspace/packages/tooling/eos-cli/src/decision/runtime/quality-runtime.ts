import { captureExecutionTimestampUtc } from "../../governance-runtime.js";
import { materializeDecisionLedgerEntry } from "./ledger-runtime.js";
import type { DecisionImpactGraph } from "../../runtime-contracts/models/impact.js";
import type { DecisionLedgerEntry } from "../../runtime-contracts/models/ledger.js";
import type {
  DecisionLearningRecord,
  DecisionOutcomeRecord,
} from "../../runtime-contracts/models/outcome.js";

export type DecisionQualityStatus = "HEALTHY" | "PARTIAL" | "BLOCKED";

export type DecisionQualityCoverageMetric = Readonly<{
  covered: number;
  total: number;
  ratio: number;
  target_ratio: number;
  status: DecisionQualityStatus;
}>;

export type DecisionQualityRateMetric = Readonly<{
  numerator: number;
  denominator: number;
  ratio: number;
}>;

export type DecisionQualityKnowledgeRegistryEntry = Readonly<{
  knowledge_id: string;
  source_decision_entry_ids: readonly string[];
  reused_by_decision_entry_ids?: readonly string[];
  reuse_count?: number;
  improved_outcome_count?: number;
}>;

export type DecisionQualityEffectivenessMetric = Readonly<{
  achieved_count: number;
  partially_achieved_count: number;
  evaluated_outcome_count: number;
  score: number;
  formula: string;
}>;

export type DecisionQualityDecisionAudit = Readonly<{
  decision_id: string;
  decision_entry_id: string;
  traceable: boolean;
  outcome_tracked: boolean;
  outcome_status: DecisionOutcomeRecord["status"] | null;
  learning_closed: boolean;
  reproducible: boolean;
  reversible: boolean;
  reversed: boolean;
  impact_graph_complete: boolean;
  leverage_measured: boolean;
  evidence_utilized: boolean;
  knowledge_reused: boolean;
  time_to_outcome_ms: number | null;
  learning_velocity_ms: number | null;
  confidence_growth: number | null;
  blocking_conditions: readonly string[];
  observations: readonly string[];
}>;

export type DecisionQualityReport = Readonly<{
  report_version: string;
  generated_at_utc: string;
  status: DecisionQualityStatus;
  summary: {
    readonly decision_count: number;
    readonly decision_traceability_coverage: DecisionQualityCoverageMetric;
    readonly decision_outcome_coverage: DecisionQualityCoverageMetric;
    readonly decision_learning_closure: DecisionQualityCoverageMetric;
    readonly decision_reproducibility: DecisionQualityCoverageMetric;
    readonly decision_reversibility: DecisionQualityCoverageMetric;
    readonly decision_impact_graph_completeness: DecisionQualityCoverageMetric;
    readonly engineering_leverage_measurement_coverage: DecisionQualityCoverageMetric;
    readonly decision_effectiveness: DecisionQualityEffectivenessMetric;
    readonly decision_success_rate: DecisionQualityRateMetric;
    readonly false_decision_rate: DecisionQualityRateMetric;
    readonly decision_reversal_rate: DecisionQualityRateMetric;
    readonly evidence_utilization_rate: DecisionQualityRateMetric;
    readonly knowledge_reuse_rate: DecisionQualityRateMetric;
    readonly evidence_strength_index: number;
    readonly outcome_improvement_rate: DecisionQualityRateMetric;
    readonly mean_time_to_outcome_ms: number | null;
    readonly learning_velocity_ms: number | null;
    readonly decision_confidence_index: number;
    readonly decision_confidence_growth: number | null;
    readonly knowledge_weighted_quality_index: number;
  };
  decisions: readonly DecisionQualityDecisionAudit[];
  claim_boundary: string;
}>;

type DecisionQualityTargets = Readonly<{
  decision_traceability_coverage: number;
  decision_outcome_coverage: number;
  decision_learning_closure: number;
  decision_reproducibility: number;
  decision_reversibility: number;
  decision_impact_graph_completeness: number;
  engineering_leverage_measurement_coverage: number;
}>;

const DEFAULT_TARGETS: DecisionQualityTargets = {
  decision_traceability_coverage: 1,
  decision_outcome_coverage: 1,
  decision_learning_closure: 0.95,
  decision_reproducibility: 1,
  decision_reversibility: 1,
  decision_impact_graph_completeness: 0.99,
  engineering_leverage_measurement_coverage: 1,
};

export function materializeDecisionQualityReport(input: {
  readonly ledgerEntries: readonly DecisionLedgerEntry[];
  readonly outcomeRecords?: readonly DecisionOutcomeRecord[];
  readonly learningRecords?: readonly DecisionLearningRecord[];
  readonly impactGraphs?: readonly DecisionImpactGraph[];
  readonly knowledgeRegistryEntries?: readonly DecisionQualityKnowledgeRegistryEntry[];
  readonly generatedAtUtc?: string;
  readonly targets?: Partial<DecisionQualityTargets>;
}): DecisionQualityReport {
  const targets = {
    ...DEFAULT_TARGETS,
    ...(input.targets ?? {}),
  };
  const outcomesByDecisionEntryId = new Map(
    (input.outcomeRecords ?? []).map((outcome) => [
      outcome.decision_reference.decision_entry_id,
      outcome,
    ]),
  );
  const learningByOutcomeId = new Map(
    (input.learningRecords ?? []).map((learning) => [
      learning.outcome_tracking_id,
      learning,
    ]),
  );
  const learningByDecisionEntryId = new Map(
    (input.learningRecords ?? []).map((learning) => [
      learning.decision_reference.decision_entry_id,
      learning,
    ]),
  );
  const impactByDecisionEntryId = new Map(
    (input.impactGraphs ?? []).map((graph) => [
      graph.decision_reference.decision_entry_id,
      graph,
    ]),
  );
  const entriesByDecisionId = new Map<string, readonly DecisionLedgerEntry[]>();
  for (const entry of input.ledgerEntries) {
    const current = entriesByDecisionId.get(entry.decision_id) ?? [];
    entriesByDecisionId.set(entry.decision_id, [...current, entry]);
  }
  const confidenceGrowthByEntryId = new Map<string, number | null>();
  for (const entries of entriesByDecisionId.values()) {
    const orderedEntries = [...entries].sort(
      (left, right) =>
        Date.parse(left.created_at) - Date.parse(right.created_at),
    );
    for (let index = 0; index < orderedEntries.length; index += 1) {
      const entry = orderedEntries[index];
      if (entry === undefined) {
        continue;
      }
      const previous = orderedEntries[index - 1] ?? null;
      confidenceGrowthByEntryId.set(
        entry.decision_entry_id,
        previous === null
          ? null
          : Number((entry.confidence - previous.confidence).toFixed(4)),
      );
    }
  }
  const priorLearningAvailabilityByEntryId = new Map<string, boolean>();
  for (const entries of entriesByDecisionId.values()) {
    const orderedEntries = [...entries].sort(
      (left, right) =>
        Date.parse(left.created_at) - Date.parse(right.created_at),
    );
    let latestReusableLearningTimestamp = Number.NEGATIVE_INFINITY;
    for (const entry of orderedEntries) {
      const knowledgeReused =
        typeof entry.supersedes_decision_entry_id === "string" &&
        Number.isFinite(latestReusableLearningTimestamp) &&
        latestReusableLearningTimestamp <= Date.parse(entry.decision_time);
      priorLearningAvailabilityByEntryId.set(
        entry.decision_entry_id,
        knowledgeReused,
      );
      const entryLearning = learningByDecisionEntryId.get(entry.decision_entry_id);
      if (
        entryLearning !== undefined &&
        (entryLearning.status === "CAPTURED" || entryLearning.status === "APPLIED")
      ) {
        latestReusableLearningTimestamp = Math.max(
          latestReusableLearningTimestamp,
          Date.parse(entryLearning.created_at),
        );
      }
    }
  }
  const knowledgeConsumerEntryIds = new Set(
    (input.knowledgeRegistryEntries ?? []).flatMap(
      (entry) => entry.reused_by_decision_entry_ids ?? [],
    ),
  );
  const totalKnowledgeReuseCount = (input.knowledgeRegistryEntries ?? []).reduce(
    (sum, entry) => sum + (entry.reuse_count ?? 0),
    0,
  );
  const totalImprovedOutcomeCount = (
    input.knowledgeRegistryEntries ?? []
  ).reduce((sum, entry) => sum + (entry.improved_outcome_count ?? 0), 0);

  const decisions = input.ledgerEntries.map((entry) => {
    const outcome = outcomesByDecisionEntryId.get(entry.decision_entry_id) ?? null;
    const learning =
      outcome === null
        ? null
        : (learningByOutcomeId.get(outcome.outcome_tracking_id) ?? null);
    const impact = impactByDecisionEntryId.get(entry.decision_entry_id) ?? null;
    const traceable = isTraceableDecision(entry);
    const reproducible = isReproducibleDecision(entry);
    const reversible = isReversibleDecision(entry);
    const outcomeTracked = outcome !== null;
    const learningClosed =
      outcome === null
        ? false
        : outcome.status === "PENDING"
          ? true
          : learning?.status === "CAPTURED";
    const impactGraphComplete =
      impact !== null &&
      isCompleteImpactGraph({
        entry,
        outcome,
        learning,
        impact,
      });
    const leverageMeasured =
      outcome !== null &&
      ((outcome.leverage_delta !== undefined &&
        outcome.leverage_delta !== null) ||
        impact?.summary.leverage_measurement_status !== "NOT_MATERIALIZED");
    const timeToOutcomeMs =
      outcome === null ||
      outcome.status === "PENDING" ||
      outcome.status === "SUPERSEDED"
        ? null
        : Math.max(
            0,
            Date.parse(outcome.observed_at) - Date.parse(entry.decision_time),
          );
    const learningVelocityMs =
      outcome === null ||
      learning === null ||
      outcome.status === "PENDING" ||
      learning.status === "OPEN"
        ? null
        : Math.max(
            0,
            Date.parse(learning.created_at) - Date.parse(outcome.observed_at),
          );
    const evidenceUtilized =
      outcome !== null && outcome.evidence_refs.length > 0;
    const knowledgeReused =
      input.knowledgeRegistryEntries !== undefined
        ? knowledgeConsumerEntryIds.has(entry.decision_entry_id)
        : (priorLearningAvailabilityByEntryId.get(entry.decision_entry_id) ?? false);

    const observations: string[] = [];
    const blockingConditions: string[] = [];
    if (!traceable) {
      blockingConditions.push("decision_traceability_incomplete");
      observations.push(
        "Decision is missing at least one traceability anchor: evidence or finding reference, source evaluation, owner, trigger, or graph digest.",
      );
    }
    if (!outcomeTracked) {
      blockingConditions.push("decision_outcome_missing");
      observations.push("Decision has no materialized outcome tracking record.");
    }
    if (outcome !== null && outcome.status !== "PENDING" && !learningClosed) {
      blockingConditions.push("decision_learning_not_closed");
      observations.push(
        "Decision reached observed outcome but learning closure is not captured.",
      );
    }
    if (!reproducible) {
      blockingConditions.push("decision_replay_not_reproducible");
      observations.push(
        "Decision ledger entry cannot be deterministically reproduced from its governed snapshot.",
      );
    }
    if (!reversible) {
      blockingConditions.push("decision_reversibility_incomplete");
      observations.push(
        "Decision does not preserve an explicit alternative set tied to the selected option.",
      );
    }
    if (!impactGraphComplete) {
      blockingConditions.push("decision_impact_graph_incomplete");
      observations.push(
        "Decision impact graph is missing required nodes or edges linking decision, outcome, and learning.",
      );
    }
    if (outcome !== null && !leverageMeasured) {
      blockingConditions.push("engineering_leverage_not_measured");
      observations.push(
        "Decision outcome exists but engineering leverage movement was not measured.",
      );
    }

    return {
      decision_id: entry.decision_id,
      decision_entry_id: entry.decision_entry_id,
      traceable,
      outcome_tracked: outcomeTracked,
      outcome_status: outcome?.status ?? null,
      learning_closed: learningClosed,
      reproducible,
      reversible,
      reversed: typeof entry.supersedes_decision_entry_id === "string",
      impact_graph_complete: impactGraphComplete,
      leverage_measured: leverageMeasured,
      evidence_utilized: evidenceUtilized,
      knowledge_reused: knowledgeReused,
      time_to_outcome_ms: Number.isFinite(timeToOutcomeMs) ? timeToOutcomeMs : null,
      learning_velocity_ms: Number.isFinite(learningVelocityMs)
        ? learningVelocityMs
        : null,
      confidence_growth:
        confidenceGrowthByEntryId.get(entry.decision_entry_id) ?? null,
      blocking_conditions: blockingConditions,
      observations,
    };
  });

  const decisionCount = decisions.length;
  const nonPendingOutcomeAudits = input.ledgerEntries.filter((entry) => {
    const outcome = outcomesByDecisionEntryId.get(entry.decision_entry_id) ?? null;
    return outcome !== null && outcome.status !== "PENDING";
  }).length;
  const decisionsWithOutcome = input.ledgerEntries.filter((entry) =>
    outcomesByDecisionEntryId.has(entry.decision_entry_id),
  ).length;
  const evaluatedOutcomeAudits = decisions.filter(
    (decision) =>
      decision.outcome_status === "ACHIEVED" ||
      decision.outcome_status === "PARTIALLY_ACHIEVED" ||
      decision.outcome_status === "MISSED",
  );
  const achievedOutcomeCount = evaluatedOutcomeAudits.filter(
    (decision) => decision.outcome_status === "ACHIEVED",
  ).length;
  const partiallyAchievedOutcomeCount = evaluatedOutcomeAudits.filter(
    (decision) => decision.outcome_status === "PARTIALLY_ACHIEVED",
  ).length;
  const missedOutcomeCount = evaluatedOutcomeAudits.filter(
    (decision) => decision.outcome_status === "MISSED",
  ).length;
  const reversedDecisionCount = decisions.filter((decision) => decision.reversed).length;
  const supersedingDecisionCount = decisions.filter(
    (decision) => decision.reversed,
  ).length;
  const timedOutcomes = decisions
    .map((decision) => decision.time_to_outcome_ms)
    .filter((value): value is number => typeof value === "number");
  const meanTimeToOutcomeMs =
    timedOutcomes.length === 0
      ? null
      : Math.round(
          timedOutcomes.reduce((sum, value) => sum + value, 0) /
            timedOutcomes.length,
        );
  const learningVelocities = decisions
    .map((decision) => decision.learning_velocity_ms)
    .filter((value): value is number => typeof value === "number");
  const meanLearningVelocityMs =
    learningVelocities.length === 0
      ? null
      : Math.round(
          learningVelocities.reduce((sum, value) => sum + value, 0) /
            learningVelocities.length,
        );
  const confidenceGrowths = decisions
    .map((decision) => decision.confidence_growth)
    .filter((value): value is number => typeof value === "number");
  const meanConfidenceGrowth =
    confidenceGrowths.length === 0
      ? null
      : Number(
          (
            confidenceGrowths.reduce((sum, value) => sum + value, 0) /
            confidenceGrowths.length
          ).toFixed(4),
        );
  const evidenceUtilizedCount = decisions.filter(
    (decision) => decision.evidence_utilized,
  ).length;
  const knowledgeReusedCount = decisions.filter(
    (decision) => decision.knowledge_reused,
  ).length;
  const evidenceStrengthIndex =
    decisionCount === 0
      ? 0
      : Number(
          (
            input.ledgerEntries.reduce(
              (sum, entry) => sum + computeDecisionEvidenceStrength(entry),
              0,
            ) / decisionCount
          ).toFixed(4),
        );
  const outcomeImprovementRate = buildRateMetric({
    numerator: totalImprovedOutcomeCount,
    denominator: totalKnowledgeReuseCount,
  });
  const decisionConfidenceIndex =
    decisionCount === 0
      ? 0
      : Number(
          (
            input.ledgerEntries.reduce((sum, entry) => sum + entry.confidence, 0) /
            decisionCount
          ).toFixed(4),
        );
  const knowledgeWeightedQualityIndex = Number(
    (
      buildRateMetric({
        numerator: knowledgeReusedCount,
        denominator: supersedingDecisionCount,
      }).ratio *
      evidenceStrengthIndex *
      outcomeImprovementRate.ratio *
      decisionConfidenceIndex
    ).toFixed(4),
  );

  const summary = {
    decision_count: decisionCount,
    decision_traceability_coverage: buildCoverageMetric({
      covered: countTrue(decisions, "traceable"),
      total: decisionCount,
      targetRatio: targets.decision_traceability_coverage,
    }),
    decision_outcome_coverage: buildCoverageMetric({
      covered: countTrue(decisions, "outcome_tracked"),
      total: decisionCount,
      targetRatio: targets.decision_outcome_coverage,
    }),
    decision_learning_closure: buildCoverageMetric({
      covered: decisions.filter((decision) => decision.learning_closed).length,
      total: nonPendingOutcomeAudits,
      targetRatio: targets.decision_learning_closure,
    }),
    decision_reproducibility: buildCoverageMetric({
      covered: countTrue(decisions, "reproducible"),
      total: decisionCount,
      targetRatio: targets.decision_reproducibility,
    }),
    decision_reversibility: buildCoverageMetric({
      covered: countTrue(decisions, "reversible"),
      total: decisionCount,
      targetRatio: targets.decision_reversibility,
    }),
    decision_impact_graph_completeness: buildCoverageMetric({
      covered: countTrue(decisions, "impact_graph_complete"),
      total: decisionCount,
      targetRatio: targets.decision_impact_graph_completeness,
    }),
    engineering_leverage_measurement_coverage: buildCoverageMetric({
      covered: decisions.filter((decision) => decision.leverage_measured).length,
      total: decisionsWithOutcome,
      targetRatio: targets.engineering_leverage_measurement_coverage,
    }),
    decision_effectiveness: {
      achieved_count: achievedOutcomeCount,
      partially_achieved_count: partiallyAchievedOutcomeCount,
      evaluated_outcome_count: evaluatedOutcomeAudits.length,
      score:
        evaluatedOutcomeAudits.length === 0
          ? 0
          : Number(
              (
                (achievedOutcomeCount + partiallyAchievedOutcomeCount * 0.5) /
                evaluatedOutcomeAudits.length
              ).toFixed(4),
            ),
      formula:
        "(achieved_outcomes + 0.5 * partially_achieved_outcomes) / evaluated_outcomes",
    },
    decision_success_rate: buildRateMetric({
      numerator: achievedOutcomeCount,
      denominator: evaluatedOutcomeAudits.length,
    }),
    false_decision_rate: buildRateMetric({
      numerator: missedOutcomeCount,
      denominator: evaluatedOutcomeAudits.length,
    }),
    decision_reversal_rate: buildRateMetric({
      numerator: reversedDecisionCount,
      denominator: decisionCount,
    }),
    evidence_utilization_rate: buildRateMetric({
      numerator: evidenceUtilizedCount,
      denominator: decisionsWithOutcome,
    }),
    knowledge_reuse_rate: buildRateMetric({
      numerator: knowledgeReusedCount,
      denominator: supersedingDecisionCount,
    }),
    evidence_strength_index: evidenceStrengthIndex,
    outcome_improvement_rate: outcomeImprovementRate,
    mean_time_to_outcome_ms: meanTimeToOutcomeMs,
    learning_velocity_ms: meanLearningVelocityMs,
    decision_confidence_index: decisionConfidenceIndex,
    decision_confidence_growth: meanConfidenceGrowth,
    knowledge_weighted_quality_index: knowledgeWeightedQualityIndex,
  };

  return {
    report_version: "1.3.0",
    generated_at_utc: input.generatedAtUtc ?? captureExecutionTimestampUtc(),
    status: summarizeDecisionQualityStatus({
      decisionCount,
      traceability: summary.decision_traceability_coverage,
      outcome: summary.decision_outcome_coverage,
      learning: summary.decision_learning_closure,
      reproducibility: summary.decision_reproducibility,
      reversibility: summary.decision_reversibility,
      impact: summary.decision_impact_graph_completeness,
      leverage: summary.engineering_leverage_measurement_coverage,
    }),
    summary,
    decisions,
    claim_boundary:
      "Decision quality report evaluates only materialized decision artifacts available to the runtime: ledger entries, outcome tracking, learning closure, impact graphs, and optionally knowledge registry entries. Evidence strength is derived from explicit decision evidence anchors, and knowledge reuse is limited to consumer decision entries explicitly linked by the supplied knowledge registry or, when unavailable, to superseding decisions made after prior captured learning became available in the same decision chain. It does not infer missing decisions or business outcomes beyond the supplied evidence set.",
  };
}

function isTraceableDecision(entry: DecisionLedgerEntry): boolean {
  return (
    entry.decision_snapshot.trigger.trigger_id.length > 0 &&
    entry.decision_snapshot.owner.owner_id.length > 0 &&
    entry.decision_snapshot.graph_digest.length > 0 &&
    entry.decision_snapshot.source_evaluation_ids.length > 0 &&
    (entry.decision_snapshot.evidence_refs.length > 0 ||
      entry.decision_snapshot.finding_refs.length > 0)
  );
}

function isReproducibleDecision(entry: DecisionLedgerEntry): boolean {
  const prefix =
    entry.decision_entry_id.includes(":")
      ? entry.decision_entry_id.slice(0, entry.decision_entry_id.indexOf(":"))
      : "decision-entry";
  const replayed = materializeDecisionLedgerEntry({
    decision: entry.decision_snapshot,
    ecgSnapshotDigest: entry.inputs.ecg_snapshot_digest,
    evaluatorResultDigests: entry.inputs.evaluator_result_digests,
    decisionTime: entry.decision_time,
    createdAt: entry.created_at,
    supersedesDecisionEntryId: entry.supersedes_decision_entry_id,
    outcomeRef: entry.outcome_ref,
    learningRef: entry.learning_ref,
    decisionEntryPrefix: prefix,
  });

  return (
    replayed.decision_entry_id === entry.decision_entry_id &&
    replayed.decision_digest === entry.decision_digest
  );
}

function isReversibleDecision(entry: DecisionLedgerEntry): boolean {
  return (
    entry.decision_snapshot.alternatives.length > 1 &&
    entry.decision_snapshot.alternatives.some(
      (alternative) =>
        alternative.option_id === entry.decision_snapshot.selected_option,
    )
  );
}

function isCompleteImpactGraph(input: {
  readonly entry: DecisionLedgerEntry;
  readonly outcome: DecisionOutcomeRecord | null;
  readonly learning: DecisionLearningRecord | null;
  readonly impact: DecisionImpactGraph;
}): boolean {
  if (input.outcome === null || input.learning === null) {
    return false;
  }

  const nodeIds = new Set(input.impact.nodes.map((node) => node.node_id));
  const edgeKinds = new Set(input.impact.edges.map((edge) => edge.edge_kind));

  return (
    input.impact.decision_reference.decision_entry_id ===
      input.entry.decision_entry_id &&
    nodeIds.has(input.entry.decision_id) &&
    nodeIds.has(input.outcome.outcome_tracking_id) &&
    nodeIds.has(input.learning.learning_id) &&
    edgeKinds.has("REALIZES_OUTCOME") &&
    edgeKinds.has("CAPTURES_LEARNING")
  );
}

function computeDecisionEvidenceStrength(entry: DecisionLedgerEntry): number {
  const anchors = [
    entry.decision_snapshot.trigger.source_refs.length > 0,
    entry.decision_snapshot.source_evaluation_ids.length > 0,
    entry.decision_snapshot.evidence_refs.length > 0 ||
      entry.decision_snapshot.finding_refs.length > 0,
  ];
  return Number(
    (
      anchors.filter((anchor) => anchor).length / anchors.length
    ).toFixed(4),
  );
}

function buildCoverageMetric(input: {
  readonly covered: number;
  readonly total: number;
  readonly targetRatio: number;
}): DecisionQualityCoverageMetric {
  const ratio = input.total === 0 ? 0 : input.covered / input.total;
  return {
    covered: input.covered,
    total: input.total,
    ratio,
    target_ratio: input.targetRatio,
    status:
      input.total === 0
        ? "BLOCKED"
        : ratio >= input.targetRatio
          ? "HEALTHY"
          : ratio >= Math.max(0, input.targetRatio - 0.25)
            ? "PARTIAL"
            : "BLOCKED",
  };
}

function buildRateMetric(input: {
  readonly numerator: number;
  readonly denominator: number;
}): DecisionQualityRateMetric {
  return {
    numerator: input.numerator,
    denominator: input.denominator,
    ratio:
      input.denominator === 0 ? 0 : Number((input.numerator / input.denominator).toFixed(4)),
  };
}

function summarizeDecisionQualityStatus(input: {
  readonly decisionCount: number;
  readonly traceability: DecisionQualityCoverageMetric;
  readonly outcome: DecisionQualityCoverageMetric;
  readonly learning: DecisionQualityCoverageMetric;
  readonly reproducibility: DecisionQualityCoverageMetric;
  readonly reversibility: DecisionQualityCoverageMetric;
  readonly impact: DecisionQualityCoverageMetric;
  readonly leverage: DecisionQualityCoverageMetric;
}): DecisionQualityStatus {
  if (input.decisionCount === 0) {
    return "BLOCKED";
  }

  if (
    input.traceability.ratio < input.traceability.target_ratio ||
    input.reproducibility.ratio < input.reproducibility.target_ratio
  ) {
    return "BLOCKED";
  }

  if (
    input.outcome.ratio < input.outcome.target_ratio ||
    input.learning.ratio < input.learning.target_ratio ||
    input.reversibility.ratio < input.reversibility.target_ratio ||
    input.impact.ratio < input.impact.target_ratio ||
    input.leverage.ratio < input.leverage.target_ratio
  ) {
    return "PARTIAL";
  }

  return "HEALTHY";
}

function countTrue<T extends DecisionQualityDecisionAudit>(
  decisions: readonly T[],
  key: keyof Pick<
    DecisionQualityDecisionAudit,
    | "traceable"
    | "outcome_tracked"
    | "reproducible"
    | "reversible"
    | "impact_graph_complete"
  >,
): number {
  return decisions.filter((decision) => decision[key] === true).length;
}
