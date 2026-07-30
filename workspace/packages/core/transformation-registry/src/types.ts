export type TransformationId =
  | "T001"
  | "T002"
  | "T003"
  | "T004"
  | "T005";

export type TransformationStatus =
  | "DRAFT"
  | "REVIEWED"
  | "VERIFIED"
  | "FROZEN"
  | "DEPRECATED";

export type TransformationPrecedence =
  | "ROOT"
  | "AFTER_T001_PASS"
  | "AFTER_T002_PASS"
  | "AFTER_T003_PASS"
  | "AFTER_T004_PASS";

export interface TransformationPredicateRef {
  readonly predicate_id: string;
  readonly phase: "PRE_EXECUTION" | "POST_EXECUTION" | "POST_EXECUTION_VERIFICATION";
}
