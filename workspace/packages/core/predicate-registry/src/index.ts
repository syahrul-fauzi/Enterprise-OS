import type { PredicateDeclaration } from "./interfaces";

import { T001_PREDICATES } from "./registry/predicates/t001";

export * from "./types";
export type * from "./interfaces";
export * from "./schema";
export type {
  PredicateDeclaration,
  PredicateEvaluationResult,
  PredicateRegistryDocument,
} from "./interfaces";

export { T001_PREDICATES };

export const PREDICATE_REGISTRY_ID = "PRED-REGISTRY-V1";
export const PREDICATE_REGISTRY_VERSION = "1.0.0";
export const PREDICATE_REGISTRY_STATUS = "VERIFIED";

export const ALL_PREDICATES: readonly PredicateDeclaration[] = [
  ...T001_PREDICATES,
];

export const PREDICATE_COUNT_T001_REQUIRED = 3;
export const getPredicateById = (id: string): PredicateDeclaration | undefined =>
  ALL_PREDICATES.find((p) => p.predicate_id === id);
