import type { GateCGovernancePlatformSnapshot } from "../read-models/status-snapshot.js";

export type GateCDecisionBundle = Readonly<{
  quality: Readonly<{
    hash: string | null;
    status: string;
    decisionCount: number | null;
    traceabilityCoverage: number | null;
    outcomeCoverage: number | null;
    learningClosure: number | null;
    reproducibility: number | null;
    reversibility: number | null;
    impactGraphCompleteness: number | null;
    engineeringLeverageMeasurementCoverage: number | null;
    effectiveness: number | null;
    successRate: number | null;
    falseDecisionRate: number | null;
    reversalRate: number | null;
    evidenceUtilizationRate: number | null;
    knowledgeReuseRate: number | null;
    evidenceStrengthIndex: number | null;
    outcomeImprovementRate: number | null;
    decisionConfidenceIndex: number | null;
    knowledgeWeightedQualityIndex: number | null;
    meanTimeToOutcomeMs: number | null;
    learningVelocityMs: number | null;
    confidenceGrowth: number | null;
  }>;
}>;

export function materializeGateCDecisionBundle(
  snapshot: GateCGovernancePlatformSnapshot,
): GateCDecisionBundle {
  return {
    quality: {
      hash: snapshot.decision_quality_hash,
      status: snapshot.decision_quality_status,
      decisionCount: snapshot.decision_quality_decision_count,
      traceabilityCoverage: snapshot.decision_quality_traceability_coverage,
      outcomeCoverage: snapshot.decision_quality_outcome_coverage,
      learningClosure: snapshot.decision_quality_learning_closure,
      reproducibility: snapshot.decision_quality_reproducibility,
      reversibility: snapshot.decision_quality_reversibility,
      impactGraphCompleteness:
        snapshot.decision_quality_impact_graph_completeness,
      engineeringLeverageMeasurementCoverage:
        snapshot.decision_quality_engineering_leverage_measurement_coverage,
      effectiveness: snapshot.decision_quality_effectiveness,
      successRate: snapshot.decision_quality_success_rate,
      falseDecisionRate: snapshot.decision_quality_false_decision_rate,
      reversalRate: snapshot.decision_quality_reversal_rate,
      evidenceUtilizationRate:
        snapshot.decision_quality_evidence_utilization_rate,
      knowledgeReuseRate: snapshot.decision_quality_knowledge_reuse_rate,
      evidenceStrengthIndex:
        snapshot.decision_quality_evidence_strength_index,
      outcomeImprovementRate:
        snapshot.decision_quality_outcome_improvement_rate,
      decisionConfidenceIndex:
        snapshot.decision_quality_decision_confidence_index,
      knowledgeWeightedQualityIndex:
        snapshot.decision_quality_knowledge_weighted_quality_index,
      meanTimeToOutcomeMs: snapshot.decision_quality_mean_time_to_outcome_ms,
      learningVelocityMs: snapshot.decision_quality_learning_velocity_ms,
      confidenceGrowth: snapshot.decision_quality_confidence_growth,
    },
  };
}
