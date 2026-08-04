import type {
  CreateProjectionInput,
  Projection,
  ProjectionType,
} from "../models/domain.js";
import { createProjection } from "../models/domain.js";
import {
  TrendBuilder,
  TopologyDriftBuilder,
} from "../../foundation-projection-materializers.js";
import {
  ExecutionChainBuilder,
  ExecutionTimelineBuilder,
} from "../../product-projection-materializers.js";
import {
  getProjectionMaterializer,
  projectionMaterializers,
  type ProjectionMaterializer,
} from "../materializers/index.js";
import { materializeExecutionPlanProjection } from "../runtime/index.js";

export type ProjectionBuilder<T extends Record<string, unknown>> = {
  readonly projectionType: ProjectionType;
  readonly schemaVersion: string;
  build(input: Omit<CreateProjectionInput<T>, "projectionType" | "schemaVersion">): Projection<T>;
};

export type LegacyProjectionBuilder<T extends Record<string, unknown>> = ProjectionBuilder<T>;

export type SpecializedProjectionBuilder<
  TProjectionType extends ProjectionType,
  TInput,
  TProjection extends Projection<Record<string, unknown>> = Projection<Record<string, unknown>>,
> = {
  readonly projectionType: TProjectionType;
  build(input: TInput): TProjection;
};

function defineLegacyProjectionBuilder<T extends Record<string, unknown>>(
  projectionType: ProjectionType,
  schemaVersion = "1.0.0",
): ProjectionBuilder<T> {
  return {
    projectionType,
    schemaVersion,
    build(input) {
      return createProjection({
        projectionType,
        schemaVersion,
        ...input,
      });
    },
  };
}

export const projectionBuilders = Object.fromEntries(
  Object.entries(projectionMaterializers).map(([projectionType, materializer]) => [
    projectionType,
    {
      projectionType: materializer.projectionType,
      schemaVersion: materializer.schemaVersion,
      build(input: Omit<CreateProjectionInput<Record<string, unknown>>, "projectionType" | "schemaVersion">) {
        return materializer.materialize(input);
      },
    },
  ]),
) as {
  readonly [K in keyof typeof projectionMaterializers]: ProjectionBuilder<Record<string, unknown>>;
};

export function getProjectionBuilder<T extends keyof typeof projectionBuilders>(
  projectionType: T,
): (typeof projectionBuilders)[T] {
  return projectionBuilders[projectionType];
}

export function defineProjectionBuilder<T extends Record<string, unknown>>(
  projectionType: ProjectionType,
  schemaVersion = "1.0.0",
): ProjectionBuilder<T> {
  return defineLegacyProjectionBuilder(projectionType, schemaVersion);
}

export const ExecutionPlanBuilder = {
  projectionType: "ExecutionPlanProjection",
  build: materializeExecutionPlanProjection,
} as const;

export const ProjectionBuilders = {
  executionPlan: ExecutionPlanBuilder,
  executionChain: ExecutionChainBuilder,
  executionTimeline: ExecutionTimelineBuilder,
  topologyDrift: TopologyDriftBuilder,
  trend: TrendBuilder,
} as const;

export type { ProjectionMaterializer };
export { getProjectionMaterializer, projectionMaterializers };
