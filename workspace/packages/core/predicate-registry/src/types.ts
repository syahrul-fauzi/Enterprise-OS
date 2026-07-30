export type PredicateStatus = "PASS" | "FAIL" | "INCONCLUSIVE" | "UNRESOLVED";

export type PredicatePhase =
  | "PRE_EXECUTION"
  | "POST_EXECUTION"
  | "POST_EXECUTION_VERIFICATION"
  | "LEDGER_APPEND_VERIFICATION";

export interface PredicateIdentity {
  readonly predicate_id: string;
  readonly transformation_id?: string;
  readonly order: number;
}
