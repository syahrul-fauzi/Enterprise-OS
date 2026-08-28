// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine.js";
import type { LearningRecordedEvent } from "../events/learning-recorded.js";

export type KnowledgeStatus = "EMERGENT" | "OPERATIONALIZED";

export type KnowledgeEvolutionStage =
  | "EMERGENT"
  | "AVAILABLE"
  | "REUSED"
  | "IMPROVED";

export type KnowledgeLearningEvent = LearningRecordedEvent;

export type KnowledgeObject = Readonly<{
  knowledge_id: string;
  knowledge_key: string;
  decision_type: string;
  current_stage: KnowledgeEvolutionStage;
  knowledge_status: KnowledgeStatus;
  deprecated: false;
  source_learning_ids: readonly string[];
  source_decision_entry_ids: readonly string[];
  supporting_outcome_tracking_ids: readonly string[];
  reused_by_decision_entry_ids: readonly string[];
  lessons: readonly string[];
  follow_up_actions: readonly string[];
  hypotheses_validated: readonly string[];
  hypotheses_invalidated: readonly string[];
  first_captured_at_utc: string;
  last_captured_at_utc: string;
  source_learning_count: number;
  reuse_count: number;
  decision_pattern_change_count: number;
  improved_outcome_count: number;
  evidence_ref_count: number;
  capability_ref_count: number;
}>;

export function buildKnowledgeKey(input: {
  readonly decisionType: string;
  readonly lessons: readonly string[];
  readonly followUpActions: readonly string[];
}): string {
  const normalized = {
    decision_type: normalizeKnowledgeText(input.decisionType),
    lessons: input.lessons.map(normalizeKnowledgeText).sort(),
    follow_up_actions: input.followUpActions.map(normalizeKnowledgeText).sort(),
  };
  return `knowledge-key:${DigestEngine.digest(normalized).slice(0, 16)}`;
}

export function materializeKnowledgeObjects(
  learningEvents: readonly KnowledgeLearningEvent[],
): readonly KnowledgeObject[] {
  const groups = new Map<string, KnowledgeLearningEvent[]>();
  for (const event of learningEvents) {
    const knowledgeKey = buildKnowledgeKey({
      decisionType: event.decision_type,
      lessons: event.lessons,
      followUpActions: event.follow_up_actions,
    });
    const existing = groups.get(knowledgeKey);
    if (existing === undefined) {
      groups.set(knowledgeKey, [event]);
      continue;
    }
    existing.push(event);
  }

  return [...groups.entries()]
    .map(([knowledgeKey, events]) => {
      const sortedEvents = [...events].sort((left, right) =>
        left.created_at_utc.localeCompare(right.created_at_utc),
      );
      const firstEvent = sortedEvents[0];
      const sourceLearningIds = sortedEvents.map((event) => event.learning_id);
      const sourceDecisionEntryIds = sortedEvents.map(
        (event) => event.decision_entry_id,
      );
      const supportingOutcomeTrackingIds = sortedEvents.map(
        (event) => event.outcome_tracking_id,
      );
      const reusedByDecisionEntryIds = uniqueStrings(
        sortedEvents
          .map((event) => event.reused_by_decision_entry_id)
          .filter((entryId): entryId is string => typeof entryId === "string"),
      );
      const reuseCount = reusedByDecisionEntryIds.length;
      const decisionPatternChangeCount = sortedEvents.filter(
        (event) => event.behavior_changed === true,
      ).length;
      const improvedOutcomeCount = sortedEvents.filter(
        (event) => event.future_decision_improved === true,
      ).length;
      const knowledgeStatus: KnowledgeStatus =
        sortedEvents.length > 1 ||
        reuseCount > 0 ||
        improvedOutcomeCount > 0
          ? "OPERATIONALIZED"
          : "EMERGENT";
      const currentStage: KnowledgeEvolutionStage =
        improvedOutcomeCount > 0
          ? "IMPROVED"
          : reuseCount > 0
            ? "REUSED"
            : knowledgeStatus === "OPERATIONALIZED"
              ? "AVAILABLE"
              : "EMERGENT";

      return {
        knowledge_id: `knowledge:${DigestEngine.digest({
          knowledge_key: knowledgeKey,
          decision_type: firstEvent?.decision_type ?? "unknown",
          source_learning_ids: sourceLearningIds,
        }).slice(0, 16)}`,
        knowledge_key: knowledgeKey,
        decision_type: firstEvent?.decision_type ?? "unknown",
        current_stage: currentStage,
        knowledge_status: knowledgeStatus,
        deprecated: false,
        source_learning_ids: sourceLearningIds,
        source_decision_entry_ids: sourceDecisionEntryIds,
        supporting_outcome_tracking_ids: supportingOutcomeTrackingIds,
        reused_by_decision_entry_ids: reusedByDecisionEntryIds,
        lessons: uniqueStrings(sortedEvents.flatMap((event) => event.lessons)),
        follow_up_actions: uniqueStrings(
          sortedEvents.flatMap((event) => event.follow_up_actions),
        ),
        hypotheses_validated: uniqueStrings(
          sortedEvents.flatMap((event) => event.hypotheses_validated),
        ),
        hypotheses_invalidated: uniqueStrings(
          sortedEvents.flatMap((event) => event.hypotheses_invalidated),
        ),
        first_captured_at_utc: firstEvent?.created_at_utc ?? "",
        last_captured_at_utc:
          sortedEvents.at(-1)?.created_at_utc ?? firstEvent?.created_at_utc ?? "",
        source_learning_count: sortedEvents.length,
        reuse_count: reuseCount,
        decision_pattern_change_count: decisionPatternChangeCount,
        improved_outcome_count: improvedOutcomeCount,
        evidence_ref_count: sortedEvents.reduce(
          (sum, event) => sum + event.evidence_ref_count,
          0,
        ),
        capability_ref_count: sortedEvents.reduce(
          (sum, event) => sum + event.capability_ref_count,
          0,
        ),
      } satisfies KnowledgeObject;
    })
    .sort((left, right) => left.knowledge_key.localeCompare(right.knowledge_key));
}

function normalizeKnowledgeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}
