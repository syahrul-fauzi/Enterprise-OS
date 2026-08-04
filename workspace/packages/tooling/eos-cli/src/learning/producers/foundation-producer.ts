import type { EvidenceProducer } from "../../evidence-producer-spi.js";
import {
  type KnowledgeLineagePreviewEntry,
  materializeLearningIntelligenceArtifacts,
  type KnowledgeRegistryArtifact,
  type LearningRegistryArtifact,
  type LearningIntelligenceReport,
} from "../runtime/intelligence-runtime.js";
import type { DecisionImpactGraph } from "../../runtime-contracts/models/impact.js";
import type { DecisionLedgerEntry } from "../../runtime-contracts/models/ledger.js";
import type {
  DecisionLearningRecord,
  DecisionOutcomeRecord,
} from "../../runtime-contracts/models/outcome.js";

export type LearningFoundationProducerContext = Readonly<{
  ledgerEntries: readonly DecisionLedgerEntry[];
  outcomeRecords?: readonly DecisionOutcomeRecord[];
  learningRecords?: readonly DecisionLearningRecord[];
  impactGraphs?: readonly DecisionImpactGraph[];
  generatedAtUtc?: string;
  reportRef?: string | null;
  learningRegistryRef?: string | null;
  knowledgeRegistryRef?: string | null;
}>;

export type LearningFoundationProducerProjection = Readonly<{
  status: string;
  decision_count: number;
  outcome_count: number;
  outcome_registry_coverage: number;
  decision_quality_index: number;
  learning_velocity_ms: number | null;
  knowledge_gain_units: number;
  knowledge_gain: number;
  knowledge_object_count: number;
  operationalized_knowledge_count: number;
  knowledge_availability_rate: number | null;
  knowledge_reuse_rate: number | null;
  reused_knowledge_object_count: number;
  improved_knowledge_object_count: number;
  knowledge_lineage_count: number;
  knowledge_lineage_preview: readonly KnowledgeLineagePreviewEntry[];
  knowledge_used_rate: number;
  evidence_strength_index: number;
  outcome_improvement_rate: number;
  decision_confidence_index: number;
  recommendation_effectiveness_rate: number | null;
  decision_pattern_change_rate: number | null;
  recommendation_acceptance_rate: number | null;
  behavior_change_rate: number | null;
  engineering_leverage_ratio: number | null;
  repeated_mistake_count: number;
  future_decision_improvement_rate: number | null;
  report_ref: string | null;
  learning_registry_ref: string | null;
  knowledge_registry_ref: string | null;
}>;

export const LEARNING_FOUNDATION_PRODUCER: EvidenceProducer<
  LearningFoundationProducerContext,
  {
    readonly ledgerEntries: readonly DecisionLedgerEntry[];
    readonly outcomeRecords: readonly DecisionOutcomeRecord[];
    readonly learningRecords: readonly DecisionLearningRecord[];
    readonly impactGraphs: readonly DecisionImpactGraph[];
  },
  LearningIntelligenceReport,
  LearningFoundationProducerProjection,
  {
    readonly report: LearningIntelligenceReport;
    readonly learningRegistry: LearningRegistryArtifact;
    readonly knowledgeRegistry: KnowledgeRegistryArtifact;
  }
> = {
  id() {
    return "learning-producer";
  },
  subject(context) {
    return {
      subject_ref:
        context.reportRef ??
        "workspace/foundation/evidence/verification/learning-intelligence-report.json",
      subject_type: "decision-outcome-registry",
    };
  },
  collect(context) {
    return {
      ledgerEntries: context.ledgerEntries,
      outcomeRecords: context.outcomeRecords ?? [],
      learningRecords: context.learningRecords ?? [],
      impactGraphs: context.impactGraphs ?? [],
    };
  },
  evaluate({ context, collected }) {
    return materializeLearningIntelligenceArtifacts({
      ledgerEntries: collected.ledgerEntries,
      outcomeRecords: collected.outcomeRecords,
      learningRecords: collected.learningRecords,
      impactGraphs: collected.impactGraphs,
      generatedAtUtc: context.generatedAtUtc,
    }).report;
  },
  project({ context, evaluation }) {
    return {
      status: evaluation.status,
      decision_count: evaluation.summary.decision_count,
      outcome_count: evaluation.summary.outcome_count,
      outcome_registry_coverage: evaluation.summary.outcome_registry_coverage,
      decision_quality_index: evaluation.summary.decision_quality_index,
      learning_velocity_ms: evaluation.summary.learning_velocity_ms,
      knowledge_gain_units: evaluation.summary.knowledge_gain_units,
      knowledge_gain: evaluation.summary.knowledge_gain,
      knowledge_object_count: evaluation.summary.knowledge_object_count,
      operationalized_knowledge_count:
        evaluation.summary.operationalized_knowledge_count,
      knowledge_availability_rate:
        evaluation.summary.knowledge_availability_rate,
      knowledge_reuse_rate: evaluation.summary.knowledge_reuse_rate,
      reused_knowledge_object_count:
        evaluation.summary.reused_knowledge_object_count,
      improved_knowledge_object_count:
        evaluation.summary.improved_knowledge_object_count,
      knowledge_lineage_count:
        evaluation.summary.knowledge_lineage_count,
      knowledge_lineage_preview: evaluation.knowledge_lineage_preview,
      knowledge_used_rate: evaluation.summary.knowledge_used_rate,
      evidence_strength_index: evaluation.summary.evidence_strength_index,
      outcome_improvement_rate: evaluation.summary.outcome_improvement_rate,
      decision_confidence_index: evaluation.summary.decision_confidence_index,
      recommendation_effectiveness_rate:
        evaluation.summary.recommendation_effectiveness_rate,
      decision_pattern_change_rate:
        evaluation.summary.decision_pattern_change_rate,
      recommendation_acceptance_rate:
        evaluation.summary.recommendation_acceptance_rate,
      behavior_change_rate: evaluation.summary.behavior_change_rate,
      engineering_leverage_ratio:
        evaluation.summary.engineering_leverage_ratio,
      repeated_mistake_count: evaluation.summary.repeated_mistake_count,
      future_decision_improvement_rate:
        evaluation.summary.future_decision_improvement_rate,
      report_ref:
        context.reportRef ??
        "workspace/foundation/evidence/verification/learning-intelligence-report.json",
      learning_registry_ref:
        context.learningRegistryRef ??
        "workspace/foundation/evidence/verification/learning-registry.json",
      knowledge_registry_ref:
        context.knowledgeRegistryRef ??
        "workspace/foundation/evidence/verification/knowledge-registry.json",
    };
  },
  materialize({ context, collected }) {
    return materializeLearningIntelligenceArtifacts({
      ledgerEntries: collected.ledgerEntries,
      outcomeRecords: collected.outcomeRecords,
      learningRecords: collected.learningRecords,
      impactGraphs: collected.impactGraphs,
      generatedAtUtc: context.generatedAtUtc,
    });
  },
};
