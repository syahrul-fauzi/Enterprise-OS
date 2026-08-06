import type { ExecutionId, CanonicalSubjectKey } from "./contracts";

export type AttributionVersion = "eos-attribution-v1" & { readonly __brand: "AttributionVersion" };

export const ATTRIBUTION_V1: AttributionVersion = "eos-attribution-v1" as AttributionVersion;

export type ProcedureName = string & { readonly __brand: "ProcedureName" };

export interface EvaluationAttributionRecordV1 {
  readonly version: AttributionVersion;
  readonly executionId: ExecutionId;
  readonly procedure: ProcedureName;
  readonly canonicalSubject: CanonicalSubjectKey;
  readonly evaluatedAt: string;
  readonly inputDigest: string;
  readonly resultDigest: string;
}

export function toProcedureName(name: string): ProcedureName {
  return name as ProcedureName;
}
