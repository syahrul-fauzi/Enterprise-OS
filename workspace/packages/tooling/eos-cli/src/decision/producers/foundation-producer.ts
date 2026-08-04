import type { EvidenceProducer } from "../../evidence-producer-spi.js";
import {
  materializeDecisionQualityReport,
  type DecisionQualityKnowledgeRegistryEntry,
  type DecisionQualityReport,
} from "../runtime/quality-runtime.js";
import type { DecisionImpactGraph } from "../../runtime-contracts/models/impact.js";
import type { DecisionLedgerEntry } from "../../runtime-contracts/models/ledger.js";
import type {
  DecisionLearningRecord,
  DecisionOutcomeRecord,
} from "../../runtime-contracts/models/outcome.js";

export type DecisionFoundationProducerContext = Readonly<{
  ledgerEntries: readonly DecisionLedgerEntry[];
  outcomeRecords?: readonly DecisionOutcomeRecord[];
  learningRecords?: readonly DecisionLearningRecord[];
  impactGraphs?: readonly DecisionImpactGraph[];
  knowledgeRegistryEntries?: readonly DecisionQualityKnowledgeRegistryEntry[];
  generatedAtUtc?: string;
  reportRef?: string | null;
}>;

export type DecisionFoundationProducerProjection = Readonly<{
  status: string;
  decision_count: number;
  decision_traceability_coverage: number;
  decision_outcome_coverage: number;
  decision_learning_closure: number;
  decision_reproducibility: number;
  decision_reversibility: number;
  decision_impact_graph_completeness: number;
  engineering_leverage_measurement_coverage: number;
  decision_effectiveness: number;
  decision_success_rate: number;
  false_decision_rate: number;
  decision_reversal_rate: number;
  evidence_utilization_rate: number;
  knowledge_reuse_rate: number;
  evidence_strength_index: number;
  outcome_improvement_rate: number;
  mean_time_to_outcome_ms: number | null;
  learning_velocity_ms: number | null;
  decision_confidence_index: number;
  decision_confidence_growth: number | null;
  knowledge_weighted_quality_index: number;
  report_ref: string | null;
}>;

export const DECISION_FOUNDATION_PRODUCER: EvidenceProducer<
  DecisionFoundationProducerContext,
  {
    readonly ledgerEntries: readonly DecisionLedgerEntry[];
    readonly outcomeRecords: readonly DecisionOutcomeRecord[];
    readonly learningRecords: readonly DecisionLearningRecord[];
    readonly impactGraphs: readonly DecisionImpactGraph[];
  },
  DecisionQualityReport,
  DecisionFoundationProducerProjection,
  {
    readonly report: DecisionQualityReport;
  }
> = {
  id() {
    return "decision-producer";
  },
  subject(context) {
    return {
      subject_ref:
        context.reportRef ??
        "workspace/foundation/evidence/verification/decision-quality-report.json",
      subject_type: "decision-ledger",
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
    return materializeDecisionQualityReport({
      ledgerEntries: collected.ledgerEntries,
      outcomeRecords: collected.outcomeRecords,
      learningRecords: collected.learningRecords,
      impactGraphs: collected.impactGraphs,
      knowledgeRegistryEntries: context.knowledgeRegistryEntries,
      generatedAtUtc: context.generatedAtUtc,
    });
  },
  project({ context, evaluation }) {
    return {
      status: evaluation.status,
      decision_count: evaluation.summary.decision_count,
      decision_traceability_coverage:
        evaluation.summary.decision_traceability_coverage.ratio,
      decision_outcome_coverage:
        evaluation.summary.decision_outcome_coverage.ratio,
      decision_learning_closure:
        evaluation.summary.decision_learning_closure.ratio,
      decision_reproducibility:
        evaluation.summary.decision_reproducibility.ratio,
      decision_reversibility:
        evaluation.summary.decision_reversibility.ratio,
      decision_impact_graph_completeness:
        evaluation.summary.decision_impact_graph_completeness.ratio,
      engineering_leverage_measurement_coverage:
        evaluation.summary.engineering_leverage_measurement_coverage.ratio,
      decision_effectiveness: evaluation.summary.decision_effectiveness.score,
      decision_success_rate: evaluation.summary.decision_success_rate.ratio,
      false_decision_rate: evaluation.summary.false_decision_rate.ratio,
      decision_reversal_rate: evaluation.summary.decision_reversal_rate.ratio,
      evidence_utilization_rate:
        evaluation.summary.evidence_utilization_rate.ratio,
      knowledge_reuse_rate: evaluation.summary.knowledge_reuse_rate.ratio,
      evidence_strength_index: evaluation.summary.evidence_strength_index,
      outcome_improvement_rate:
        evaluation.summary.outcome_improvement_rate.ratio,
      mean_time_to_outcome_ms: evaluation.summary.mean_time_to_outcome_ms,
      learning_velocity_ms: evaluation.summary.learning_velocity_ms,
      decision_confidence_index:
        evaluation.summary.decision_confidence_index,
      decision_confidence_growth:
        evaluation.summary.decision_confidence_growth,
      knowledge_weighted_quality_index:
        evaluation.summary.knowledge_weighted_quality_index,
      report_ref:
        context.reportRef ??
        "workspace/foundation/evidence/verification/decision-quality-report.json",
    };
  },
  materialize({ evaluation }) {
    return {
      report: evaluation,
    };
  },
};
