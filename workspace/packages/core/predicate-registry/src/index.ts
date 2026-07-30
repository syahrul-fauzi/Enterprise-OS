import type { PredicateDeclaration } from "./interfaces.js";

import { T001_PREDICATES } from "./registry/predicates/t001.js";

export * from "./types.js";
export type * from "./interfaces.js";
export * from "./schema.js";
export type {
  PredicateDeclaration,
  PredicateEvaluationResult,
  PredicateRegistryDocument,
} from "./interfaces.js";

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
