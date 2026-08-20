import type {
  CreateProjectionInput,
  Projection,
  ProjectionGeneratedFrom,
  ProjectionType,
} from "../models/domain.js";
import { createProjection } from "../models/domain.js";

export type ProjectionMaterializationInput<T extends Record<string, unknown>> = {
  readonly projectionType: ProjectionType;
  readonly generatedFrom: readonly ProjectionGeneratedFrom[];
  readonly payload: T;
  readonly projectionDigest?: string;
  readonly generatedAtUtc?: string;
};

export type ProjectionMaterializer<T extends Record<string, unknown>> = {
  readonly projectionType: ProjectionType;
  readonly schemaVersion: string;
  materialize(
    input: Omit<CreateProjectionInput<T>, "projectionType" | "schemaVersion">,
  ): Projection<T>;
};

function defineProjectionMaterializer<T extends Record<string, unknown>>(
  projectionType: ProjectionType,
  schemaVersion = "1.0.0",
): ProjectionMaterializer<T> {
  return {
    projectionType,
    schemaVersion,
    materialize(input) {
      return createProjection({
        projectionType,
        schemaVersion,
        ...input,
      });
    },
  };
}

export const projectionMaterializers = {
  ExecutionPlanProjection: defineProjectionMaterializer<Record<string, unknown>>("ExecutionPlanProjection"),
  ExecutionChainProjection: defineProjectionMaterializer<Record<string, unknown>>("ExecutionChainProjection"),
  ExecutionTimelineProjection: defineProjectionMaterializer<Record<string, unknown>>(
    "ExecutionTimelineProjection",
  ),
  ExecutionGraphProjection: defineProjectionMaterializer<Record<string, unknown>>("ExecutionGraphProjection"),
  FoundationReportProjection: defineProjectionMaterializer<Record<string, unknown>>("FoundationReportProjection"),
  GateCStatusProjection: defineProjectionMaterializer<Record<string, unknown>>("GateCStatusProjection"),
  GateFStatusProjection: defineProjectionMaterializer<Record<string, unknown>>("GateFStatusProjection"),
  ProductVerificationProjection: defineProjectionMaterializer<Record<string, unknown>>("ProductVerificationProjection"),
  SpecificationArtifactGraphProjection: defineProjectionMaterializer<Record<string, unknown>>(
    "SpecificationArtifactGraphProjection",
  ),
  SpecificationConformanceProjection: defineProjectionMaterializer<Record<string, unknown>>(
    "SpecificationConformanceProjection",
  ),
  SpecificationVocabularyAuditProjection: defineProjectionMaterializer<Record<string, unknown>>(
    "SpecificationVocabularyAuditProjection",
  ),
  DecisionOutcomeProjection: defineProjectionMaterializer<Record<string, unknown>>(
    "DecisionOutcomeProjection",
  ),
  DecisionImpactProjection: defineProjectionMaterializer<Record<string, unknown>>(
    "DecisionImpactProjection",
  ),
  TopologyDriftProjection: defineProjectionMaterializer<Record<string, unknown>>("TopologyDriftProjection"),
  TrendProjection: defineProjectionMaterializer<Record<string, unknown>>("TrendProjection"),
} as const;

export function getProjectionMaterializer<T extends keyof typeof projectionMaterializers>(
  projectionType: T,
): (typeof projectionMaterializers)[T] {
  return projectionMaterializers[projectionType];
}

export function materializeProjection<T extends Record<string, unknown>>(
  input: ProjectionMaterializationInput<T>,
): Projection<T> {
  return getProjectionMaterializer(input.projectionType).materialize({
    generatedFrom: input.generatedFrom,
    payload: input.payload,
    projectionDigest: input.projectionDigest,
    generatedAtUtc: input.generatedAtUtc,
  }) as Projection<T>;
}