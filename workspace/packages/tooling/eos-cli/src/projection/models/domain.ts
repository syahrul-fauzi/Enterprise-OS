// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine";

export type ProjectionGeneratedFrom = {
  readonly source_type: string;
  readonly source_ref: string;
  readonly source_digest: string;
};

export type ProjectionType =
  | "ExecutionPlanProjection"
  | "ExecutionChainProjection"
  | "ExecutionTimelineProjection"
  | "ExecutionGraphProjection"
  | "FoundationReportProjection"
  | "GateCStatusProjection"
  | "GateFStatusProjection"
  | "ProductVerificationProjection"
  | "SpecificationArtifactGraphProjection"
  | "SpecificationConformanceProjection"
  | "SpecificationVocabularyAuditProjection"
  | "DecisionOutcomeProjection"
  | "DecisionImpactProjection"
  | "TopologyDriftProjection"
  | "TrendProjection";

export type Projection<T extends Record<string, unknown>> = {
  readonly projection_id: string;
  readonly projection_type: ProjectionType;
  readonly schema_version: string;
  readonly projection_digest: string;
  readonly generated_from: readonly ProjectionGeneratedFrom[];
  readonly generated_at_utc: string;
  readonly payload: T;
};

export type CreateProjectionInput<T extends Record<string, unknown>> = {
  readonly projectionType: ProjectionType;
  readonly schemaVersion: string;
  readonly generatedFrom: readonly ProjectionGeneratedFrom[];
  readonly payload: T;
  readonly generatedAtUtc?: string;
  readonly projectionDigest?: string;
};

export function canonicalizeProjectionValue(value: unknown): unknown {
  return DigestEngine.canonicalize(value);
}

export function sha256ProjectionValue(value: unknown): string {
  return DigestEngine.digest(value);
}

export function buildProjectionDigest<T extends Record<string, unknown>>(input: {
  readonly projectionType: ProjectionType;
  readonly schemaVersion: string;
  readonly generatedFrom: readonly ProjectionGeneratedFrom[];
  readonly payload: T;
}): string {
  return sha256ProjectionValue({
    projection_type: input.projectionType,
    schema_version: input.schemaVersion,
    generated_from: input.generatedFrom,
    payload: input.payload,
  });
}

export function createProjection<T extends Record<string, unknown>>(
  input: CreateProjectionInput<T>,
): Projection<T> {
  const generatedAtUtc = input.generatedAtUtc ?? new Date().toISOString();
  const projectionDigest =
    input.projectionDigest ??
    buildProjectionDigest({
      projectionType: input.projectionType,
      schemaVersion: input.schemaVersion,
      generatedFrom: input.generatedFrom,
      payload: input.payload,
    });

  return {
    projection_id: `${input.projectionType}:${projectionDigest.slice(0, 16)}`,
    projection_type: input.projectionType,
    schema_version: input.schemaVersion,
    projection_digest: projectionDigest,
    generated_from: input.generatedFrom,
    generated_at_utc: generatedAtUtc,
    payload: input.payload,
  };
}