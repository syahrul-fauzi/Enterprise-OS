export type ExecutionId = string & { readonly __brand: "ExecutionId" };
export type CanonicalSubjectKey = string & { readonly __brand: "CanonicalSubjectKey" };

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

export interface ListAttributionRecordsInput {
  readonly procedure: string;
  readonly canonicalSubject: string;
}

export interface GetLatestAttributionRecordInput {
  readonly procedure: string;
  readonly canonicalSubject: string;
}

export interface VerifyExecutionIdInvariantInput {
  readonly executionId: string;
  readonly procedure: string;
  readonly canonicalSubject: string;
}

export interface VerifyExecutionIdInvariantOutput {
  readonly valid: boolean;
  readonly reason?: string;
}

export function toProcedureName(name: string): ProcedureName {
  return name as ProcedureName;
}