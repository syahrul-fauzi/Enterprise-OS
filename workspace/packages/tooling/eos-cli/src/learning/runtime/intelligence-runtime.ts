import { captureExecutionTimestampUtc } from "../../governance-runtime.js";
import {
  buildKnowledgeKey,
} from "../../knowledge/aggregate/object.js";
import {
  materializeKnowledgeProjectionArtifacts,
  type KnowledgeEvolutionEntry as KnowledgeContextEvolutionEntry,
  type KnowledgeLineagePreviewEntry as KnowledgeContextLineagePreviewEntry,
  type KnowledgeRegistryArtifact as KnowledgeContextRegistryArtifact,
  type KnowledgeRegistryEntry as KnowledgeContextRegistryEntry,
} from "../../knowledge/registry/index.js";
import type { LearningRecordedEvent } from "../../knowledge/events/learning-recorded.js";
import {
  materializeDecisionQualityReport,
  type DecisionQualityReport,
} from "../../decision/runtime/quality-runtime.js";
import type { DecisionImpactGraph } from "../../runtime-contracts/models/impact.js";
import type { DecisionLedgerEntry } from "../../runtime-contracts/models/ledger.js";
import type {
  DecisionLearningRecord,
  DecisionOutcomeRecord,
} from "../../runtime-contracts/models/outcome.js";

export type LearningIntelligenceStatus = "HEALTHY" | "PARTIAL" | "BLOCKED";

export type LearningOutcomeRegistryEntry = Readonly<{
  decision_id: string;
  decision_entry_id: string;
  next_decision_entry_id: string | null;
  outcome_tracking_id: string | null;
  learning_id: string | null;
  outcome_status: DecisionOutcomeRecord["status"] | null;
  learning_status: DecisionLearningRecord["status"] | null;
  outcome_observed: boolean;
  knowledge_updated: boolean;
  reused_prior_learning: boolean;
  recommendation_accepted: boolean | null;
  behavior_changed: boolean | null;
  repeated_mistake: boolean;
  future_decision_improved: boolean | null;
  evidence_ref_count: number;
  capability_ref_count: number;
  lessons_captured: number;
  validated_hypotheses: number;
  invalidated_hypotheses: number;
  knowledge_gain_units: number;
  leverage_measurement_status:
    | DecisionImpactGraph["summary"]["leverage_measurement_status"]
    | "NOT_MATERIALIZED";
  leverage_delta_value: number | null;
  time_to_outcome_ms: number | null;
  time_to_learn_ms: number | null;
  time_to_behavior_change_ms: number | null;
  decision_confidence_growth: number | null;
}>;

export type LearningRecordedEventEntry = LearningRecordedEvent;

export type LearningRegistryEntry = Readonly<
  LearningRecordedEventEntry & {
    knowledge_key: string;
    reused_by_next_decision: boolean;
    decision_pattern_changed: boolean | null;
    future_decision_improved: boolean | null;
  }
>;

export type KnowledgeRegistryEntry = KnowledgeContextRegistryEntry;

export type KnowledgeEvolutionEntry = KnowledgeContextEvolutionEntry;

export type KnowledgeLineagePreviewEntry = KnowledgeContextLineagePreviewEntry;

export type LearningRegistryArtifact = Readonly<{
  registry_version: string;
  generated_at_utc: string;
  summary: {
    readonly learning_record_count: number;
    readonly captured_learning_count: number;
    readonly applied_learning_count: number;
    readonly knowledge_candidate_count: number;
    readonly reused_learning_count: number;
    readonly decision_pattern_change_count: number;
  };
  entries: readonly LearningRegistryEntry[];
  claim_boundary: string;
}>;

export type KnowledgeRegistryArtifact = KnowledgeContextRegistryArtifact;

export type LearningIntelligenceReport = Readonly<{
  report_version: string;
  generated_at_utc: string;
  status: LearningIntelligenceStatus;
  summary: {
    readonly decision_count: number;
    readonly outcome_count: number;
    readonly validated_outcome_count: number;
    readonly false_decision_count: number;
    readonly reverted_decision_count: number;
    readonly repeated_mistake_count: number;
    readonly closed_learning_count: number;
    readonly applied_learning_count: number;
    readonly outcome_registry_coverage: number;
    readonly decision_quality_index: number;
    readonly learning_velocity_ms: number | null;
    readonly knowledge_gain_units: number;
    readonly knowledge_gain: number;
    readonly knowledge_object_count: number;
    readonly operationalized_knowledge_count: number;
    readonly knowledge_availability_rate: number | null;
    readonly knowledge_reuse_rate: number | null;
    readonly reused_knowledge_object_count: number;
    readonly improved_knowledge_object_count: number;
    readonly knowledge_lineage_count: number;
    readonly knowledge_used_rate: number;
    readonly evidence_strength_index: number;
    readonly outcome_improvement_rate: number;
    readonly decision_confidence_index: number;
    readonly recommendation_effectiveness_rate: number | null;
    readonly decision_pattern_change_rate: number | null;
    readonly recommendation_acceptance_rate: number | null;
    readonly behavior_change_rate: number | null;
    readonly engineering_leverage_ratio: number | null;
    readonly future_decision_improvement_rate: number | null;
    readonly formula: {
      readonly decision_quality_index: string;
      readonly knowledge_gain: string;
      readonly knowledge_reuse_rate: string;
      readonly knowledge_availability_rate: string;
      readonly knowledge_used_rate: string;
      readonly evidence_strength_index: string;
      readonly outcome_improvement_rate: string;
      readonly decision_confidence_index: string;
      readonly recommendation_effectiveness_rate: string;
      readonly decision_pattern_change_rate: string;
      readonly recommendation_acceptance_rate: string;
      readonly behavior_change_rate: string;
      readonly engineering_leverage_ratio: string;
      readonly future_decision_improvement_rate: string;
      readonly knowledge_lineage_count: string;
    };
  };
  outcome_registry: readonly LearningOutcomeRegistryEntry[];
  knowledge_lineage_preview: readonly KnowledgeLineagePreviewEntry[];
  decision_quality: Pick<DecisionQualityReport, "status" | "summary">;
  claim_boundary: string;
}>;

export type LearningIntelligenceArtifacts = Readonly<{
  report: LearningIntelligenceReport;
  learningRegistry: LearningRegistryArtifact;
  knowledgeRegistry: KnowledgeRegistryArtifact;
}>;

export function materializeLearningRecordedEvents(input: {
  readonly ledgerEntries: readonly DecisionLedgerEntry[];
  readonly outcomeRecords?: readonly DecisionOutcomeRecord[];
  readonly learningRecords?: readonly DecisionLearningRecord[];
}): readonly LearningRecordedEvent[] {
  const outcomesByEntryId = new Map(
    (input.outcomeRecords ?? []).map((outcome) => [
      outcome.decision_reference.decision_entry_id,
      outcome,
    ]),
  );
  const learningByEntryId = new Map(
    (input.learningRecords ?? []).map((learning) => [
      learning.decision_reference.decision_entry_id,
      learning,
    ]),
  );
  const directSuccessorByEntryId = new Map<string, DecisionLedgerEntry>();
  for (const entry of input.ledgerEntries) {
    if (typeof entry.supersedes_decision_entry_id === "string") {
      directSuccessorByEntryId.set(entry.supersedes_decision_entry_id, entry);
    }
  }

  return input.ledgerEntries.flatMap((entry) => {
    const learning = learningByEntryId.get(entry.decision_entry_id) ?? null;
    if (learning === null) {
      return [];
    }
    const outcome = outcomesByEntryId.get(entry.decision_entry_id) ?? null;
    const nextEntry =
      directSuccessorByEntryId.get(entry.decision_entry_id) ?? null;
    const nextOutcome =
      nextEntry === null
        ? null
        : outcomesByEntryId.get(nextEntry.decision_entry_id) ?? null;
    const recommendationAccepted = evaluateRecommendationAcceptance({
      priorLearning: learning,
      nextEntry,
    });
    const behaviorChanged = evaluateBehaviorChange({
      currentEntry: entry,
      nextEntry,
      priorLearning: learning,
    });
    const futureDecisionImproved = evaluateFutureDecisionImprovement({
      currentOutcome: outcome,
      nextOutcome,
      behaviorChanged,
    });
    const knowledgeUsedByNextDecision =
      recommendationAccepted === true || behaviorChanged === true;

    return [
      {
        learning_id: learning.learning_id,
        decision_id: entry.decision_id,
        decision_entry_id: entry.decision_entry_id,
        outcome_tracking_id: learning.outcome_tracking_id,
        decision_type: entry.decision_type,
        learning_status: learning.status,
        created_at_utc: learning.created_at,
        lessons: learning.lessons,
        follow_up_actions: learning.follow_up_actions,
        hypotheses_validated: learning.hypotheses_validated,
        hypotheses_invalidated: learning.hypotheses_invalidated,
        recommendation_accepted: recommendationAccepted,
        behavior_changed: behaviorChanged,
        reused_by_decision_entry_id:
          knowledgeUsedByNextDecision === true
            ? nextEntry?.decision_entry_id ?? null
            : null,
        future_decision_improved: futureDecisionImproved,
        evidence_ref_count: outcome?.evidence_refs.length ?? 0,
        capability_ref_count: outcome?.capability_refs.length ?? 0,
      },
    ];
  });
}

export function materializeLearningIntelligenceArtifacts(input: {
  readonly ledgerEntries: readonly DecisionLedgerEntry[];
  readonly outcomeRecords?: readonly DecisionOutcomeRecord[];
  readonly learningRecords?: readonly DecisionLearningRecord[];
  readonly impactGraphs?: readonly DecisionImpactGraph[];
  readonly generatedAtUtc?: string;
}): LearningIntelligenceArtifacts {
  const generatedAtUtc = input.generatedAtUtc ?? captureExecutionTimestampUtc();
  const outcomesByEntryId = new Map(
    (input.outcomeRecords ?? []).map((outcome) => [
      outcome.decision_reference.decision_entry_id,
      outcome,
    ]),
  );
  const learningByEntryId = new Map(
    (input.learningRecords ?? []).map((learning) => [
      learning.decision_reference.decision_entry_id,
      learning,
    ]),
  );
  const impactByEntryId = new Map(
    (input.impactGraphs ?? []).map((impact) => [
      impact.decision_reference.decision_entry_id,
      impact,
    ]),
  );
  const directSuccessorByEntryId = new Map<string, DecisionLedgerEntry>();
  for (const entry of input.ledgerEntries) {
    if (typeof entry.supersedes_decision_entry_id === "string") {
      directSuccessorByEntryId.set(entry.supersedes_decision_entry_id, entry);
    }
  }
  const learningSignalsByEntryId = new Map(
    input.ledgerEntries.map((entry) => {
      const outcome = outcomesByEntryId.get(entry.decision_entry_id) ?? null;
      const learning = learningByEntryId.get(entry.decision_entry_id) ?? null;
      const nextEntry =
        directSuccessorByEntryId.get(entry.decision_entry_id) ?? null;
      const nextOutcome =
        nextEntry === null
          ? null
          : outcomesByEntryId.get(nextEntry.decision_entry_id) ?? null;
      const recommendationAccepted = evaluateRecommendationAcceptance({
        priorLearning: learning,
        nextEntry,
      });
      const decisionPatternChanged = evaluateBehaviorChange({
        currentEntry: entry,
        nextEntry,
        priorLearning: learning,
      });
      const futureDecisionImproved = evaluateFutureDecisionImprovement({
        currentOutcome: outcome,
        nextOutcome,
        behaviorChanged: decisionPatternChanged,
      });
      const knowledgeUsedByNextDecision =
        recommendationAccepted === true || decisionPatternChanged === true;
      return [
        entry.decision_entry_id,
        {
          nextDecisionEntryId: nextEntry?.decision_entry_id ?? null,
          recommendationAccepted,
          decisionPatternChanged,
          futureDecisionImproved,
          knowledgeUsedByNextDecision,
        },
      ] as const;
    }),
  );
  const learningEvents = materializeLearningRecordedEvents({
    ledgerEntries: input.ledgerEntries,
    outcomeRecords: input.outcomeRecords,
    learningRecords: input.learningRecords,
  });
  const knowledgeProjection = materializeKnowledgeProjectionArtifacts({
    generatedAtUtc,
    learningEvents,
  });
  const learningRegistry = learningEvents.map((event) => ({
    ...event,
    knowledge_key: buildKnowledgeKey({
      decisionType: event.decision_type,
      lessons: event.lessons,
      followUpActions: event.follow_up_actions,
    }),
    reused_by_next_decision: event.reused_by_decision_entry_id !== null,
    decision_pattern_changed: event.behavior_changed,
    future_decision_improved: event.future_decision_improved,
  }));
  const knowledgeRegistry = knowledgeProjection.registry.entries;
  const knowledgeEvolution = knowledgeProjection.registry.evolution.entries;
  const knowledgeLineagePreview = knowledgeProjection.lineagePreview;
  const decisionQuality = materializeDecisionQualityReport({
    ledgerEntries: input.ledgerEntries,
    outcomeRecords: input.outcomeRecords,
    learningRecords: input.learningRecords,
    impactGraphs: input.impactGraphs,
    knowledgeRegistryEntries: knowledgeRegistry,
    generatedAtUtc,
  });
  const decisionAuditByEntryId = new Map(
    decisionQuality.decisions.map((decision) => [
      decision.decision_entry_id,
      decision,
    ]),
  );
  const outcomeRegistry = input.ledgerEntries.map((entry) => {
    const audit = decisionAuditByEntryId.get(entry.decision_entry_id);
    const outcome = outcomesByEntryId.get(entry.decision_entry_id) ?? null;
    const learning = learningByEntryId.get(entry.decision_entry_id) ?? null;
    const impact = impactByEntryId.get(entry.decision_entry_id) ?? null;
    const signal = learningSignalsByEntryId.get(entry.decision_entry_id);
    const nextEntry =
      directSuccessorByEntryId.get(entry.decision_entry_id) ?? null;
    const knowledgeGainUnits =
      (learning?.lessons.length ?? 0) +
      (learning?.hypotheses_validated.length ?? 0) +
      (learning?.hypotheses_invalidated.length ?? 0);
    const confidenceGrowth =
      nextEntry === null
        ? null
        : Number((nextEntry.confidence - entry.confidence).toFixed(4));
    const timeToLearnMs =
      outcome === null ||
      learning === null ||
      outcome.status === "PENDING" ||
      learning.status === "OPEN"
        ? null
        : Math.max(0, Date.parse(learning.created_at) - Date.parse(outcome.observed_at));
    const learningVelocityMs =
      outcome === null ||
      nextEntry === null ||
      signal?.decisionPatternChanged !== true
        ? null
        : Math.max(0, Date.parse(nextEntry.decision_time) - Date.parse(outcome.observed_at));

    return {
      decision_id: entry.decision_id,
      decision_entry_id: entry.decision_entry_id,
      next_decision_entry_id: nextEntry?.decision_entry_id ?? null,
      outcome_tracking_id: outcome?.outcome_tracking_id ?? null,
      learning_id: learning?.learning_id ?? null,
      outcome_status: outcome?.status ?? null,
      learning_status: learning?.status ?? null,
      outcome_observed:
        outcome !== null &&
        outcome.status !== "PENDING" &&
        outcome.status !== "SUPERSEDED",
      knowledge_updated:
        learning?.status === "CAPTURED" || learning?.status === "APPLIED",
      reused_prior_learning: audit?.knowledge_reused ?? false,
      recommendation_accepted: signal?.recommendationAccepted ?? null,
      behavior_changed: signal?.decisionPatternChanged ?? null,
      repeated_mistake:
        audit?.reversed === true && (audit.knowledge_reused ?? false) === false,
      future_decision_improved: signal?.futureDecisionImproved ?? null,
      evidence_ref_count: outcome?.evidence_refs.length ?? 0,
      capability_ref_count: outcome?.capability_refs.length ?? 0,
      lessons_captured: learning?.lessons.length ?? 0,
      validated_hypotheses: learning?.hypotheses_validated.length ?? 0,
      invalidated_hypotheses: learning?.hypotheses_invalidated.length ?? 0,
      knowledge_gain_units: knowledgeGainUnits,
      leverage_measurement_status:
        impact?.summary.leverage_measurement_status ??
        classifyLeverageMeasurementStatus(outcome?.leverage_delta?.delta_value),
      leverage_delta_value:
        impact?.summary.leverage_delta_value ??
        outcome?.leverage_delta?.delta_value ??
        null,
      time_to_outcome_ms: audit?.time_to_outcome_ms ?? null,
      time_to_learn_ms: timeToLearnMs,
      time_to_behavior_change_ms: learningVelocityMs,
      decision_confidence_growth: confidenceGrowth,
    };
  });

  const decisionCount = outcomeRegistry.length;
  const outcomeCount = outcomeRegistry.filter(
    (entry) => entry.outcome_tracking_id !== null,
  ).length;
  const validatedOutcomeCount = outcomeRegistry.filter(
    (entry) => entry.outcome_status === "ACHIEVED",
  ).length;
  const falseDecisionCount = outcomeRegistry.filter(
    (entry) => entry.outcome_status === "MISSED",
  ).length;
  const revertedDecisionCount = outcomeRegistry.filter(
    (entry) => typeof entry.future_decision_improved === "boolean",
  ).length;
  const repeatedMistakeCount = outcomeRegistry.filter(
    (entry) => entry.repeated_mistake,
  ).length;
  const closedLearningCount = outcomeRegistry.filter(
    (entry) => entry.knowledge_updated,
  ).length;
  const appliedLearningCount = outcomeRegistry.filter(
    (entry) => entry.learning_status === "APPLIED",
  ).length;
  const knowledgeGainUnits = outcomeRegistry.reduce(
    (sum, entry) => sum + entry.knowledge_gain_units,
    0,
  );
  const knowledgeGain =
    decisionCount === 0
      ? 0
      : Number((knowledgeGainUnits / decisionCount).toFixed(4));
  const knowledgeObjectCount =
    knowledgeProjection.registry.summary.knowledge_object_count;
  const operationalizedKnowledgeCount =
    knowledgeProjection.registry.summary.operationalized_knowledge_count;
  const knowledgeAvailabilityRate =
    knowledgeProjection.registry.summary.knowledge_availability_rate;
  const reusedKnowledgeObjectCount =
    knowledgeProjection.registry.summary.reused_knowledge_object_count;
  const improvedKnowledgeObjectCount =
    knowledgeProjection.registry.summary.improved_knowledge_object_count;
  const knowledgeReuseRate =
    learningRegistry.length === 0
      ? null
      : Number(
          (
            learningRegistry.filter((entry) => entry.reused_by_next_decision)
              .length / learningRegistry.length
          ).toFixed(4),
        );
  const recommendationAcceptanceCandidates = outcomeRegistry.filter(
    (entry) => entry.recommendation_accepted !== null,
  );
  const recommendationAcceptanceRate =
    recommendationAcceptanceCandidates.length === 0
      ? null
      : Number(
          (
            recommendationAcceptanceCandidates.filter(
              (entry) => entry.recommendation_accepted === true,
            ).length / recommendationAcceptanceCandidates.length
          ).toFixed(4),
        );
  const recommendationEffectivenessCandidates = outcomeRegistry.filter(
    (entry) =>
      entry.recommendation_accepted === true &&
      entry.future_decision_improved !== null,
  );
  const recommendationEffectivenessRate =
    recommendationEffectivenessCandidates.length === 0
      ? null
      : Number(
          (
            recommendationEffectivenessCandidates.filter(
              (entry) => entry.future_decision_improved === true,
            ).length / recommendationEffectivenessCandidates.length
          ).toFixed(4),
        );
  const behaviorChangeCandidates = outcomeRegistry.filter(
    (entry) => entry.behavior_changed !== null,
  );
  const behaviorChangeRate =
    behaviorChangeCandidates.length === 0
      ? null
      : Number(
          (
            behaviorChangeCandidates.filter(
              (entry) => entry.behavior_changed === true,
            ).length / behaviorChangeCandidates.length
          ).toFixed(4),
        );
  const decisionPatternChangeRate = behaviorChangeRate;
  const measuredLeverageEntries = outcomeRegistry.filter(
    (entry) => entry.leverage_measurement_status !== "NOT_MATERIALIZED",
  );
  const improvedLeverageCount = measuredLeverageEntries.filter(
    (entry) => entry.leverage_measurement_status === "IMPROVED",
  ).length;
  const engineeringLeverageRatio =
    measuredLeverageEntries.length === 0
      ? null
      : Number(
          (improvedLeverageCount / measuredLeverageEntries.length).toFixed(4),
        );
  const futureDecisionImprovementCandidates = outcomeRegistry.filter(
    (entry) => entry.future_decision_improved !== null,
  );
  const futureDecisionImprovementRate =
    futureDecisionImprovementCandidates.length === 0
      ? null
      : Number(
          (
            futureDecisionImprovementCandidates.filter(
              (entry) => entry.future_decision_improved === true,
            ).length / futureDecisionImprovementCandidates.length
          ).toFixed(4),
        );
  const decisionQualityIndex =
    decisionQuality.summary.knowledge_weighted_quality_index;
  const learningVelocityMs = meanNumber(
    outcomeRegistry.map((entry) => entry.time_to_behavior_change_ms),
  );
  const status = summarizeLearningIntelligenceStatus({
    decisionCount,
    outcomeCount,
    decisionQualityStatus: decisionQuality.status,
    decisionQualityIndex,
    knowledgeGainUnits,
    learningVelocityMs,
    behaviorChangeRate,
    futureDecisionImprovementRate,
  });

  return {
    report: {
      report_version: "1.0.0",
      generated_at_utc: generatedAtUtc,
      status,
      summary: {
        decision_count: decisionCount,
        outcome_count: outcomeCount,
        validated_outcome_count: validatedOutcomeCount,
        false_decision_count: falseDecisionCount,
        reverted_decision_count: revertedDecisionCount,
        repeated_mistake_count: repeatedMistakeCount,
        closed_learning_count: closedLearningCount,
        applied_learning_count: appliedLearningCount,
        outcome_registry_coverage:
          decisionQuality.summary.decision_outcome_coverage.ratio,
        decision_quality_index: decisionQualityIndex,
        learning_velocity_ms: learningVelocityMs,
        knowledge_gain_units: knowledgeGainUnits,
        knowledge_gain: knowledgeGain,
        knowledge_object_count: knowledgeObjectCount,
        operationalized_knowledge_count: operationalizedKnowledgeCount,
        knowledge_availability_rate: knowledgeAvailabilityRate,
        knowledge_reuse_rate: knowledgeReuseRate,
        reused_knowledge_object_count: reusedKnowledgeObjectCount,
        improved_knowledge_object_count: improvedKnowledgeObjectCount,
        knowledge_lineage_count: knowledgeEvolution.length,
        knowledge_used_rate: decisionQuality.summary.knowledge_reuse_rate.ratio,
        evidence_strength_index:
          decisionQuality.summary.evidence_strength_index,
        outcome_improvement_rate:
          decisionQuality.summary.outcome_improvement_rate.ratio,
        decision_confidence_index:
          decisionQuality.summary.decision_confidence_index,
        recommendation_effectiveness_rate: recommendationEffectivenessRate,
        decision_pattern_change_rate: decisionPatternChangeRate,
        recommendation_acceptance_rate: recommendationAcceptanceRate,
        behavior_change_rate: behaviorChangeRate,
        engineering_leverage_ratio: engineeringLeverageRatio,
        future_decision_improvement_rate: futureDecisionImprovementRate,
        formula: {
          decision_quality_index:
            "knowledge_used_rate * evidence_strength_index * outcome_improvement_rate * decision_confidence_index",
          knowledge_gain:
            "(validated_hypotheses + invalidated_hypotheses + lessons) / decision_count",
          knowledge_reuse_rate:
            "learning_records_reused_by_next_decision / learning_record_count",
          knowledge_availability_rate:
            "operationalized_knowledge_object_count / knowledge_object_count",
          knowledge_used_rate:
            "knowledge_consuming_decisions / superseding_decisions",
          evidence_strength_index:
            "average(decision evidence anchor coverage across trigger refs, evaluation refs, and evidence or finding refs)",
          outcome_improvement_rate:
            "improved_outcomes_after_knowledge_reuse / total_knowledge_reuse_events",
          decision_confidence_index:
            "average(decision confidence)",
          recommendation_effectiveness_rate:
            "recommendations_adopted_with_improved_follow_on_outcome / recommendations_adopted_with_observed_follow_on_outcome",
          decision_pattern_change_rate:
            "superseding_decisions_with_changed_decision_pattern_after_learning / superseding_decisions_after_learning",
          recommendation_acceptance_rate:
            "superseding_decisions_adopting_prior_learning_follow_up_actions / superseding_decisions_with_follow_up_actions",
          behavior_change_rate:
            "legacy alias of decision_pattern_change_rate",
          engineering_leverage_ratio:
            "decisions_with_improved_leverage / decisions_with_measured_leverage",
          future_decision_improvement_rate:
            "superseding_decisions_with_improved_outcome_after_behavior_change / superseding_decisions_with_observed_follow_up_outcome",
          knowledge_lineage_count:
            "knowledge_evolution_entries materialized from grouped knowledge objects",
        },
      },
      outcome_registry: outcomeRegistry,
      knowledge_lineage_preview: knowledgeLineagePreview,
      decision_quality: {
        status: decisionQuality.status,
        summary: decisionQuality.summary,
      },
      claim_boundary:
          "Learning intelligence evaluates only materialized decision, outcome, learning, and impact artifacts available to the runtime. The outcome registry links each decision entry to observed outcome, captured learning, and direct superseding decisions when such artifacts exist. Recommendation effectiveness is limited to adopted follow-up actions from prior learning that are followed by observed improved outcomes, and decision pattern change is limited to observed changes in selected option or required actions in the next decision of the same chain.",
    },
    learningRegistry: {
      registry_version: "1.0.0",
      generated_at_utc: generatedAtUtc,
      summary: {
        learning_record_count: learningRegistry.length,
        captured_learning_count: learningRegistry.filter(
          (entry) => entry.learning_status === "CAPTURED",
        ).length,
        applied_learning_count: learningRegistry.filter(
          (entry) => entry.learning_status === "APPLIED",
        ).length,
        knowledge_candidate_count: uniqueStrings(
          learningRegistry.map((entry) => entry.knowledge_key),
        ).length,
        reused_learning_count: learningRegistry.filter(
          (entry) => entry.reused_by_next_decision,
        ).length,
        decision_pattern_change_count: learningRegistry.filter(
          (entry) => entry.decision_pattern_changed === true,
        ).length,
      },
      entries: learningRegistry,
      claim_boundary:
        "Learning registry materializes captured learning records exactly as observed from decision-linked outcome and learning artifacts. It does not claim generalized knowledge beyond the grouped lessons, actions, and hypotheses captured in the underlying learning records.",
    },
    knowledgeRegistry: knowledgeProjection.registry,
  };
}

export function materializeLearningIntelligenceReport(input: {
  readonly ledgerEntries: readonly DecisionLedgerEntry[];
  readonly outcomeRecords?: readonly DecisionOutcomeRecord[];
  readonly learningRecords?: readonly DecisionLearningRecord[];
  readonly impactGraphs?: readonly DecisionImpactGraph[];
  readonly generatedAtUtc?: string;
}): LearningIntelligenceReport {
  return materializeLearningIntelligenceArtifacts(input).report;
}

function classifyLeverageMeasurementStatus(
  deltaValue: number | null | undefined,
): DecisionImpactGraph["summary"]["leverage_measurement_status"] | "NOT_MATERIALIZED" {
  if (typeof deltaValue !== "number") {
    return "NOT_MATERIALIZED";
  }
  if (deltaValue > 0) {
    return "IMPROVED";
  }
  if (deltaValue < 0) {
    return "REGRESSED";
  }
  return "UNCHANGED";
}

function summarizeLearningIntelligenceStatus(input: {
  readonly decisionCount: number;
  readonly outcomeCount: number;
  readonly decisionQualityStatus: DecisionQualityReport["status"];
  readonly decisionQualityIndex: number;
  readonly knowledgeGainUnits: number;
  readonly learningVelocityMs: number | null;
  readonly behaviorChangeRate: number | null;
  readonly futureDecisionImprovementRate: number | null;
}): LearningIntelligenceStatus {
  if (input.decisionCount === 0 || input.outcomeCount === 0) {
    return "BLOCKED";
  }
  if (
    input.decisionQualityStatus === "HEALTHY" &&
    input.decisionQualityIndex >= 0.8 &&
    input.knowledgeGainUnits > 0 &&
    input.learningVelocityMs !== null &&
    (input.behaviorChangeRate ?? 0) > 0 &&
    (input.futureDecisionImprovementRate ?? 0) > 0
  ) {
    return "HEALTHY";
  }
  return input.decisionQualityStatus === "BLOCKED" ? "BLOCKED" : "PARTIAL";
}

function evaluateRecommendationAcceptance(input: {
  readonly priorLearning: DecisionLearningRecord | null;
  readonly nextEntry: DecisionLedgerEntry | null;
}): boolean | null {
  if (
    input.priorLearning === null ||
    input.nextEntry === null ||
    input.priorLearning.follow_up_actions.length === 0
  ) {
    return null;
  }
  const nextActionIds = new Set(
    input.nextEntry.decision_snapshot.required_actions.map((action) => action.action_id),
  );
  return input.priorLearning.follow_up_actions.some((actionId) =>
    nextActionIds.has(actionId),
  );
}

function evaluateBehaviorChange(input: {
  readonly currentEntry: DecisionLedgerEntry;
  readonly nextEntry: DecisionLedgerEntry | null;
  readonly priorLearning: DecisionLearningRecord | null;
}): boolean | null {
  if (input.priorLearning === null || input.nextEntry === null) {
    return null;
  }
  if (
    input.priorLearning.status !== "CAPTURED" &&
    input.priorLearning.status !== "APPLIED"
  ) {
    return null;
  }
  if (
    input.currentEntry.decision_snapshot.selected_option !==
    input.nextEntry.decision_snapshot.selected_option
  ) {
    return true;
  }
  return !areRequiredActionSetsEqual(
    input.currentEntry.decision_snapshot.required_actions,
    input.nextEntry.decision_snapshot.required_actions,
  );
}

function evaluateFutureDecisionImprovement(input: {
  readonly currentOutcome: DecisionOutcomeRecord | null;
  readonly nextOutcome: DecisionOutcomeRecord | null;
  readonly behaviorChanged: boolean | null;
}): boolean | null {
  if (
    input.currentOutcome === null ||
    input.nextOutcome === null ||
    input.behaviorChanged !== true
  ) {
    return null;
  }
  return (
    scoreOutcomeStatus(input.nextOutcome.status) >
    scoreOutcomeStatus(input.currentOutcome.status)
  );
}

function areRequiredActionSetsEqual(
  left: DecisionLedgerEntry["decision_snapshot"]["required_actions"],
  right: DecisionLedgerEntry["decision_snapshot"]["required_actions"],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const leftIds = [...left].map((action) => action.action_id).sort();
  const rightIds = [...right].map((action) => action.action_id).sort();
  return leftIds.every((actionId, index) => actionId === rightIds[index]);
}

function scoreOutcomeStatus(status: DecisionOutcomeRecord["status"]): number {
  switch (status) {
    case "ACHIEVED":
      return 3;
    case "PARTIALLY_ACHIEVED":
      return 2;
    case "PENDING":
      return 1;
    case "MISSED":
      return 0;
    case "SUPERSEDED":
      return 0;
  }
}

function meanNumber(values: readonly (number | null)[]): number | null {
  const present = values.filter((value): value is number => typeof value === "number");
  if (present.length === 0) {
    return null;
  }
  return Number(
    (present.reduce((sum, value) => sum + value, 0) / present.length).toFixed(4),
  );
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}
