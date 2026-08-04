import type { KnowledgeEvolutionStage, KnowledgeObject } from "../aggregate/object.js";

export type KnowledgeRegistryEntry = Readonly<{
  knowledge_id: string;
  knowledge_key: string;
  decision_type: string;
  knowledge_status: "EMERGENT" | "OPERATIONALIZED";
  source_learning_ids: readonly string[];
  source_decision_entry_ids: readonly string[];
  supporting_outcome_tracking_ids: readonly string[];
  lessons: readonly string[];
  follow_up_actions: readonly string[];
  hypotheses_validated: readonly string[];
  hypotheses_invalidated: readonly string[];
  first_captured_at_utc: string;
  last_captured_at_utc: string;
  source_learning_count: number;
  reuse_count: number;
  reused_by_decision_entry_ids: readonly string[];
  decision_pattern_change_count: number;
  improved_outcome_count: number;
  evidence_ref_count: number;
  capability_ref_count: number;
}>;

export type KnowledgeEvolutionEntry = Readonly<{
  knowledge_id: string;
  knowledge_key: string;
  evolution_stage: KnowledgeEvolutionStage;
  source_learning_ids: readonly string[];
  source_decision_entry_ids: readonly string[];
  reused_by_decision_entry_ids: readonly string[];
  supporting_outcome_tracking_ids: readonly string[];
  first_captured_at_utc: string;
  last_captured_at_utc: string;
  source_learning_count: number;
  reuse_count: number;
  improved_outcome_count: number;
}>;

export type KnowledgeLineagePreviewEntry = Readonly<{
  knowledge_id: string;
  knowledge_key: string;
  evolution_stage: KnowledgeEvolutionStage;
  source_learning_count: number;
  reuse_count: number;
  improved_outcome_count: number;
  source_learning_ids: readonly string[];
  reused_by_decision_entry_ids: readonly string[];
}>;

export type KnowledgeRegistryArtifact = Readonly<{
  registry_version: string;
  generated_at_utc: string;
  summary: {
    readonly knowledge_object_count: number;
    readonly operationalized_knowledge_count: number;
    readonly knowledge_availability_rate: number | null;
    readonly reusable_knowledge_count: number;
    readonly reused_knowledge_object_count: number;
    readonly improved_knowledge_object_count: number;
    readonly total_source_learning_count: number;
    readonly total_reuse_count: number;
    readonly total_improved_outcome_count: number;
  };
  entries: readonly KnowledgeRegistryEntry[];
  evolution: {
    readonly lineage_entry_count: number;
    readonly reused_knowledge_object_count: number;
    readonly improved_knowledge_object_count: number;
    readonly entries: readonly KnowledgeEvolutionEntry[];
  };
  claim_boundary: string;
}>;

export type KnowledgeProjectionArtifacts = Readonly<{
  objects: readonly KnowledgeObject[];
  registry: KnowledgeRegistryArtifact;
  lineagePreview: readonly KnowledgeLineagePreviewEntry[];
}>;
