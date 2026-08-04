export type LearningRecordedEvent = Readonly<{
  learning_id: string;
  decision_id: string;
  decision_entry_id: string;
  outcome_tracking_id: string;
  decision_type: string;
  learning_status: string;
  created_at_utc: string;
  lessons: readonly string[];
  follow_up_actions: readonly string[];
  hypotheses_validated: readonly string[];
  hypotheses_invalidated: readonly string[];
  recommendation_accepted: boolean | null;
  behavior_changed: boolean | null;
  reused_by_decision_entry_id: string | null;
  future_decision_improved: boolean | null;
  evidence_ref_count: number;
  capability_ref_count: number;
}>;

export type KnowledgeInputEvent = LearningRecordedEvent;
