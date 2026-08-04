import type { GateCGovernancePlatformSnapshot } from "../read-models/status-snapshot.js";

type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type GateCLearningBundle = Readonly<{
  intelligence: Readonly<{
    hash: string | null;
    status: string;
    decisionCount: number | null;
    outcomeCount: number | null;
    outcomeRegistryCoverage: number | null;
    decisionQualityIndex: number | null;
    learningVelocityMs: number | null;
    knowledgeGainUnits: number | null;
    knowledgeGain: number | null;
    knowledgeObjectCount: number | null;
    operationalizedKnowledgeCount: number | null;
    knowledgeAvailabilityRate: number | null;
    knowledgeReuseRate: number | null;
    reusedKnowledgeObjectCount: number | null;
    improvedKnowledgeObjectCount: number | null;
    knowledgeLineageCount: number | null;
    knowledgeLineagePreview: readonly JsonValue[] | null;
    recommendationEffectivenessRate: number | null;
    decisionPatternChangeRate: number | null;
    recommendationAcceptanceRate: number | null;
    behaviorChangeRate: number | null;
    engineeringLeverageRatio: number | null;
    repeatedMistakeCount: number | null;
    futureDecisionImprovementRate: number | null;
  }>;
}>;

export function materializeGateCLearningBundle(
  snapshot: GateCGovernancePlatformSnapshot,
): GateCLearningBundle {
  return {
    intelligence: {
      hash: snapshot.learning_intelligence_hash,
      status: snapshot.learning_intelligence_status,
      decisionCount: snapshot.learning_intelligence_decision_count,
      outcomeCount: snapshot.learning_intelligence_outcome_count,
      outcomeRegistryCoverage:
        snapshot.learning_intelligence_outcome_registry_coverage,
      decisionQualityIndex:
        snapshot.learning_intelligence_decision_quality_index,
      learningVelocityMs: snapshot.learning_intelligence_learning_velocity_ms,
      knowledgeGainUnits: snapshot.learning_intelligence_knowledge_gain_units,
      knowledgeGain: snapshot.learning_intelligence_knowledge_gain,
      knowledgeObjectCount:
        snapshot.learning_intelligence_knowledge_object_count,
      operationalizedKnowledgeCount:
        snapshot.learning_intelligence_operationalized_knowledge_count,
      knowledgeAvailabilityRate:
        snapshot.learning_intelligence_knowledge_availability_rate,
      knowledgeReuseRate: snapshot.learning_intelligence_knowledge_reuse_rate,
      reusedKnowledgeObjectCount:
        snapshot.learning_intelligence_reused_knowledge_object_count,
      improvedKnowledgeObjectCount:
        snapshot.learning_intelligence_improved_knowledge_object_count,
      knowledgeLineageCount:
        snapshot.learning_intelligence_knowledge_lineage_count,
      knowledgeLineagePreview:
        snapshot.learning_intelligence_knowledge_lineage_preview,
      recommendationEffectivenessRate:
        snapshot.learning_intelligence_recommendation_effectiveness_rate,
      decisionPatternChangeRate:
        snapshot.learning_intelligence_decision_pattern_change_rate,
      recommendationAcceptanceRate:
        snapshot.learning_intelligence_recommendation_acceptance_rate,
      behaviorChangeRate: snapshot.learning_intelligence_behavior_change_rate,
      engineeringLeverageRatio:
        snapshot.learning_intelligence_engineering_leverage_ratio,
      repeatedMistakeCount:
        snapshot.learning_intelligence_repeated_mistake_count,
      futureDecisionImprovementRate:
        snapshot.learning_intelligence_future_decision_improvement_rate,
    },
  };
}
