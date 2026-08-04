import { resolve } from "node:path";
import type { ProjectionType } from "./projection-domain.js";

export type StorageScope = "product_verification" | "foundation_verification";

export type StorageCatalogEntry = {
  readonly projection_type: ProjectionType;
  readonly serializer: "json";
  readonly storage_kind: "filesystem";
  readonly relative_location: string;
};

const PRODUCT_STORAGE_CATALOG = {
  ExecutionPlanProjection: {
    projection_type: "ExecutionPlanProjection",
    serializer: "json",
    storage_kind: "filesystem",
    relative_location: "execution-plan.json",
  },
  ExecutionChainProjection: {
    projection_type: "ExecutionChainProjection",
    serializer: "json",
    storage_kind: "filesystem",
    relative_location: "execution-chain.json",
  },
  ExecutionTimelineProjection: {
    projection_type: "ExecutionTimelineProjection",
    serializer: "json",
    storage_kind: "filesystem",
    relative_location: "execution-timeline.json",
  },
  ProductVerificationProjection: {
    projection_type: "ProductVerificationProjection",
    serializer: "json",
    storage_kind: "filesystem",
    relative_location: "product-verification-projection.json",
  },
} as const satisfies Record<
  Extract<
    ProjectionType,
    | "ExecutionPlanProjection"
    | "ExecutionChainProjection"
    | "ExecutionTimelineProjection"
    | "ProductVerificationProjection"
  >,
  StorageCatalogEntry
>;

const FOUNDATION_STORAGE_CATALOG = {
  ExecutionGraphProjection: {
    projection_type: "ExecutionGraphProjection",
    serializer: "json",
    storage_kind: "filesystem",
    relative_location: "execution-graph.json",
  },
  SpecificationArtifactGraphProjection: {
    projection_type: "SpecificationArtifactGraphProjection",
    serializer: "json",
    storage_kind: "filesystem",
    relative_location: "specification-artifact-graph-projection.json",
  },
  SpecificationConformanceProjection: {
    projection_type: "SpecificationConformanceProjection",
    serializer: "json",
    storage_kind: "filesystem",
    relative_location: "specification-conformance-projection.json",
  },
  SpecificationVocabularyAuditProjection: {
    projection_type: "SpecificationVocabularyAuditProjection",
    serializer: "json",
    storage_kind: "filesystem",
    relative_location: "specification-vocabulary-audit-projection.json",
  },
  TopologyDriftProjection: {
    projection_type: "TopologyDriftProjection",
    serializer: "json",
    storage_kind: "filesystem",
    relative_location: "topology-drift.json",
  },
  TrendProjection: {
    projection_type: "TrendProjection",
    serializer: "json",
    storage_kind: "filesystem",
    relative_location: "architecture-trend.json",
  },
} as const satisfies Record<
  Extract<
    ProjectionType,
    | "ExecutionGraphProjection"
    | "SpecificationArtifactGraphProjection"
    | "SpecificationConformanceProjection"
    | "SpecificationVocabularyAuditProjection"
    | "TopologyDriftProjection"
    | "TrendProjection"
  >,
  StorageCatalogEntry
>;

function getScopeCatalog(scope: StorageScope): Record<string, StorageCatalogEntry> {
  return scope === "product_verification" ? PRODUCT_STORAGE_CATALOG : FOUNDATION_STORAGE_CATALOG;
}

export function listStorageCatalogEntries(scope: StorageScope): readonly StorageCatalogEntry[] {
  return Object.values(getScopeCatalog(scope));
}

export function getStorageCatalogEntry(
  scope: StorageScope,
  projectionType: ProjectionType,
): StorageCatalogEntry {
  const entry = getScopeCatalog(scope)[projectionType];
  if (!entry) {
    throw new Error(`STORAGE_CATALOG_ENTRY_NOT_FOUND:${scope}:${projectionType}`);
  }
  return entry;
}

export function resolveProjectionStorageLocation(input: {
  readonly baseDir: string;
  readonly scope: StorageScope;
  readonly projectionType: ProjectionType;
}): string {
  const entry = getStorageCatalogEntry(input.scope, input.projectionType);
  return resolve(input.baseDir, entry.relative_location);
}

export function listRequiredProductProjectionFiles(): readonly string[] {
  return listStorageCatalogEntries("product_verification").map((entry) => entry.relative_location);
}
