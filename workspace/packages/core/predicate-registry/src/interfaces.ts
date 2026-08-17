import type { PredicateIdentity, PredicatePhase, PredicateStatus } from "./types.js";

export interface PredicateDeclaration {
  readonly predicate_id: string;
  readonly name: string;
  readonly description: string;
  readonly phase: PredicatePhase;
  readonly transformation_id?: string;
  readonly applies_to: "ALL" | "SPECIFIC_TRANSFORMATIONS";
  readonly failure_mode: string;
  readonly severity: "BLOCKER" | "WARNING";
  readonly schema_ref?: string;
  readonly order: number;
}

export interface PredicateEvaluationResult {
  readonly predicate_id: string;
  readonly phase: PredicatePhase;
  readonly status: PredicateStatus;
  readonly observed_at: string;
  readonly evidence?: Readonly<Record<string, unknown>>;
  readonly violations?: readonly string[];
  readonly predicate_ref: PredicateIdentity;
}

export interface PredicateRegistryDocument {
  readonly registry_id: string;
  readonly version: string;
  readonly status: string;
  readonly predicates: readonly PredicateDeclaration[];
  readonly count: number;
}
