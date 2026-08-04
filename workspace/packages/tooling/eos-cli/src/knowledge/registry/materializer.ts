import type { LearningRecordedEvent } from "../events/learning-recorded.js";
import { materializeKnowledgeObjects, type KnowledgeObject } from "../aggregate/object.js";
import type {
  KnowledgeEvolutionEntry,
  KnowledgeProjectionArtifacts,
  KnowledgeRegistryArtifact,
  KnowledgeRegistryEntry,
} from "./artifact.js";

const KNOWLEDGE_LINEAGE_PREVIEW_LIMIT = 5;

export function materializeKnowledgeProjectionArtifacts(input: {
  readonly learningEvents: readonly LearningRecordedEvent[];
  readonly generatedAtUtc: string;
}): KnowledgeProjectionArtifacts {
  const objects = materializeKnowledgeObjects(input.learningEvents);
  const registryEntries = objects.map(projectKnowledgeRegistryEntry);
  const evolutionEntries = objects.map(projectKnowledgeEvolutionEntry);
  const lineagePreview = [...evolutionEntries]
    .sort((left, right) => {
      if (right.improved_outcome_count !== left.improved_outcome_count) {
        return right.improved_outcome_count - left.improved_outcome_count;
      }
      if (right.reuse_count !== left.reuse_count) {
        return right.reuse_count - left.reuse_count;
      }
      if (right.source_learning_count !== left.source_learning_count) {
        return right.source_learning_count - left.source_learning_count;
      }
      return left.knowledge_key.localeCompare(right.knowledge_key);
    })
    .slice(0, KNOWLEDGE_LINEAGE_PREVIEW_LIMIT)
    .map((entry) => ({
      knowledge_id: entry.knowledge_id,
      knowledge_key: entry.knowledge_key,
      evolution_stage: entry.evolution_stage,
      source_learning_count: entry.source_learning_count,
      reuse_count: entry.reuse_count,
      improved_outcome_count: entry.improved_outcome_count,
      source_learning_ids: entry.source_learning_ids,
      reused_by_decision_entry_ids: entry.reused_by_decision_entry_ids,
    }));

  const registry = materializeKnowledgeRegistryArtifact({
    generatedAtUtc: input.generatedAtUtc,
    entries: registryEntries,
    evolutionEntries,
  });

  return {
    objects,
    registry,
    lineagePreview,
  };
}

export function materializeKnowledgeRegistryArtifact(input: {
  readonly generatedAtUtc: string;
  readonly entries: readonly KnowledgeRegistryEntry[];
  readonly evolutionEntries: readonly KnowledgeEvolutionEntry[];
}): KnowledgeRegistryArtifact {
  const knowledgeObjectCount = input.entries.length;
  const operationalizedKnowledgeCount = input.entries.filter(
    (entry) => entry.knowledge_status === "OPERATIONALIZED",
  ).length;
  const knowledgeAvailabilityRate =
    knowledgeObjectCount === 0
      ? null
      : Number((operationalizedKnowledgeCount / knowledgeObjectCount).toFixed(4));
  const reusedKnowledgeObjectCount = input.entries.filter(
    (entry) => entry.reuse_count > 0,
  ).length;
  const improvedKnowledgeObjectCount = input.entries.filter(
    (entry) => entry.improved_outcome_count > 0,
  ).length;

  return {
    registry_version: "1.0.0",
    generated_at_utc: input.generatedAtUtc,
    summary: {
      knowledge_object_count: knowledgeObjectCount,
      operationalized_knowledge_count: operationalizedKnowledgeCount,
      knowledge_availability_rate: knowledgeAvailabilityRate,
      reusable_knowledge_count: input.entries.filter(
        (entry) => entry.follow_up_actions.length > 0 || entry.lessons.length > 0,
      ).length,
      reused_knowledge_object_count: reusedKnowledgeObjectCount,
      improved_knowledge_object_count: improvedKnowledgeObjectCount,
      total_source_learning_count: input.entries.reduce(
        (sum, entry) => sum + entry.source_learning_count,
        0,
      ),
      total_reuse_count: input.entries.reduce(
        (sum, entry) => sum + entry.reuse_count,
        0,
      ),
      total_improved_outcome_count: input.entries.reduce(
        (sum, entry) => sum + entry.improved_outcome_count,
        0,
      ),
    },
    entries: input.entries,
    evolution: {
      lineage_entry_count: input.evolutionEntries.length,
      reused_knowledge_object_count: reusedKnowledgeObjectCount,
      improved_knowledge_object_count: improvedKnowledgeObjectCount,
      entries: input.evolutionEntries,
    },
    claim_boundary:
      "Knowledge registry groups compatible learning events into reusable knowledge objects using normalized decision type, lessons, and follow-up actions. It claims only generalized and deduplicated knowledge patterns demonstrably supported by the underlying learning events.",
  };
}

function projectKnowledgeRegistryEntry(
  object: KnowledgeObject,
): KnowledgeRegistryEntry {
  return {
    knowledge_id: object.knowledge_id,
    knowledge_key: object.knowledge_key,
    decision_type: object.decision_type,
    knowledge_status: object.knowledge_status,
    source_learning_ids: object.source_learning_ids,
    source_decision_entry_ids: object.source_decision_entry_ids,
    supporting_outcome_tracking_ids: object.supporting_outcome_tracking_ids,
    lessons: object.lessons,
    follow_up_actions: object.follow_up_actions,
    hypotheses_validated: object.hypotheses_validated,
    hypotheses_invalidated: object.hypotheses_invalidated,
    first_captured_at_utc: object.first_captured_at_utc,
    last_captured_at_utc: object.last_captured_at_utc,
    source_learning_count: object.source_learning_count,
    reuse_count: object.reuse_count,
    reused_by_decision_entry_ids: object.reused_by_decision_entry_ids,
    decision_pattern_change_count: object.decision_pattern_change_count,
    improved_outcome_count: object.improved_outcome_count,
    evidence_ref_count: object.evidence_ref_count,
    capability_ref_count: object.capability_ref_count,
  };
}

function projectKnowledgeEvolutionEntry(
  object: KnowledgeObject,
): KnowledgeEvolutionEntry {
  return {
    knowledge_id: object.knowledge_id,
    knowledge_key: object.knowledge_key,
    evolution_stage: object.current_stage,
    source_learning_ids: object.source_learning_ids,
    source_decision_entry_ids: object.source_decision_entry_ids,
    reused_by_decision_entry_ids: object.reused_by_decision_entry_ids,
    supporting_outcome_tracking_ids: object.supporting_outcome_tracking_ids,
    first_captured_at_utc: object.first_captured_at_utc,
    last_captured_at_utc: object.last_captured_at_utc,
    source_learning_count: object.source_learning_count,
    reuse_count: object.reuse_count,
    improved_outcome_count: object.improved_outcome_count,
  };
}
