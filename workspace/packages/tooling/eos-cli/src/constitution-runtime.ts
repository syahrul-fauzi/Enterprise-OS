import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import * as constitution from "@repo/core-constitution";
import {
  getStorageCatalogEntry,
  resolveProjectionStorageLocation,
} from "./projections.js";
import {
  readProjectionArtifact,
  serializeProjectionArtifact,
} from "./projection-runtime.js";

type JsonRecord = Record<string, unknown>;

type ProjectionEvidenceInput = {
  readonly scope: string;
  readonly storage_path: string;
  readonly storage_locator: string;
  readonly expected_projection_type: string;
};

type ReplayEvidenceInput = {
  readonly scope: string;
  readonly product_id: string;
  readonly storage_path: string;
  readonly storage_locator: string;
};

export function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function discoverConstitutionDependencyModules(workspaceRoot: string) {
  return constitution.discoverConstitutionDependencyModules(workspaceRoot);
}

export function collectProjectionEvidenceInputs(input: {
  readonly foundationEvidenceDir: string;
  readonly productsRoot: string;
}): readonly ProjectionEvidenceInput[] {
  const foundationInputs: ProjectionEvidenceInput[] = [
    {
      scope: "foundation.execution_graph",
      storage_path: resolveProjectionStorageLocation({
        baseDir: input.foundationEvidenceDir,
        scope: "foundation_verification",
        projectionType: "ExecutionGraphProjection",
      }),
      storage_locator: `foundation.execution_graph:${getStorageCatalogEntry(
        "foundation_verification",
        "ExecutionGraphProjection",
      ).relative_location}`,
      expected_projection_type: "ExecutionGraphProjection",
    },
    {
      scope: "foundation.topology_drift",
      storage_path: resolveProjectionStorageLocation({
        baseDir: input.foundationEvidenceDir,
        scope: "foundation_verification",
        projectionType: "TopologyDriftProjection",
      }),
      storage_locator: `foundation.topology_drift:${getStorageCatalogEntry(
        "foundation_verification",
        "TopologyDriftProjection",
      ).relative_location}`,
      expected_projection_type: "TopologyDriftProjection",
    },
    {
      scope: "foundation.architecture_trend",
      storage_path: resolveProjectionStorageLocation({
        baseDir: input.foundationEvidenceDir,
        scope: "foundation_verification",
        projectionType: "TrendProjection",
      }),
      storage_locator: `foundation.architecture_trend:${getStorageCatalogEntry(
        "foundation_verification",
        "TrendProjection",
      ).relative_location}`,
      expected_projection_type: "TrendProjection",
    },
  ];

  const productInputs =
    existsSync(input.productsRoot)
      ? readdirSync(input.productsRoot, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .sort((left, right) => left.name.localeCompare(right.name))
          .flatMap((entry) => {
            const evidenceDir = resolve(input.productsRoot, entry.name, "evidence/verification");
            return [
              {
                scope: `product.${entry.name}.execution_plan`,
                storage_path: resolveProjectionStorageLocation({
                  baseDir: evidenceDir,
                  scope: "product_verification",
                  projectionType: "ExecutionPlanProjection",
                }),
                storage_locator: `product.${entry.name}.execution_plan:${getStorageCatalogEntry(
                  "product_verification",
                  "ExecutionPlanProjection",
                ).relative_location}`,
                expected_projection_type: "ExecutionPlanProjection",
              },
              {
                scope: `product.${entry.name}.execution_chain`,
                storage_path: resolveProjectionStorageLocation({
                  baseDir: evidenceDir,
                  scope: "product_verification",
                  projectionType: "ExecutionChainProjection",
                }),
                storage_locator: `product.${entry.name}.execution_chain:${getStorageCatalogEntry(
                  "product_verification",
                  "ExecutionChainProjection",
                ).relative_location}`,
                expected_projection_type: "ExecutionChainProjection",
              },
              {
                scope: `product.${entry.name}.execution_timeline`,
                storage_path: resolveProjectionStorageLocation({
                  baseDir: evidenceDir,
                  scope: "product_verification",
                  projectionType: "ExecutionTimelineProjection",
                }),
                storage_locator: `product.${entry.name}.execution_timeline:${getStorageCatalogEntry(
                  "product_verification",
                  "ExecutionTimelineProjection",
                ).relative_location}`,
                expected_projection_type: "ExecutionTimelineProjection",
              },
            ] satisfies ProjectionEvidenceInput[];
          })
          .filter((entry) => existsSync(entry.storage_path))
      : [];

  return [...foundationInputs, ...productInputs].filter((entry) => existsSync(entry.storage_path));
}

export function loadConstitutionEngineInput(input: {
  readonly foundationEvidenceDir: string;
  readonly productsRoot: string;
  readonly workspaceRoot: string;
}): {
  readonly executionGraph: JsonRecord;
  readonly artifactRegistry: JsonRecord;
  readonly projectionEvidence: readonly {
    readonly scope: string;
    readonly storage_locator: string;
    readonly expected_projection_type: string;
    readonly json_record: JsonRecord;
    readonly replica_storage_locator: string;
    readonly replica_json_record: JsonRecord;
  }[];
  readonly replayEvidence: readonly {
    readonly scope: string;
    readonly product_id: string;
    readonly storage_locator: string;
    readonly json_record: JsonRecord;
  }[];
  readonly dependencyModules: readonly ReturnType<typeof discoverConstitutionDependencyModules>[number][];
  readonly dependencyDiscovery: {
    readonly deterministic: boolean;
    readonly discovery_digest: string;
    readonly module_count: number;
  };
} {
  const executionGraphPath = resolveProjectionStorageLocation({
    baseDir: input.foundationEvidenceDir,
    scope: "foundation_verification",
    projectionType: "ExecutionGraphProjection",
  });
  const artifactRegistryPath = resolve(input.foundationEvidenceDir, "artifact-registry.json");
  const executionGraph = readJsonFile<JsonRecord>(executionGraphPath);
  const artifactRegistry = readJsonFile<JsonRecord>(artifactRegistryPath);
  const projectionEvidence = collectProjectionEvidenceInputs({
    foundationEvidenceDir: input.foundationEvidenceDir,
    productsRoot: input.productsRoot,
  }).map((entry) => {
    const projection = readProjectionArtifact<Record<string, unknown>>(entry.storage_path);
    const jsonRecord = serializeProjectionArtifact(projection) as JsonRecord;
    return {
      scope: entry.scope,
      storage_locator: entry.storage_locator,
      expected_projection_type: entry.expected_projection_type,
      json_record: jsonRecord,
      replica_storage_locator: `replica://${entry.storage_locator}`,
      replica_json_record: serializeProjectionArtifact(projection) as JsonRecord,
    };
  });
  const replayEvidence =
    existsSync(input.productsRoot)
      ? readdirSync(input.productsRoot, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .sort((left, right) => left.name.localeCompare(right.name))
          .map((entry) => ({
            scope: `product.${entry.name}.composition_replay`,
            product_id: entry.name,
            storage_path: resolve(input.productsRoot, entry.name, "evidence/verification/composition-replay.json"),
            storage_locator: `product.${entry.name}.composition_replay:composition-replay.json`,
          }) satisfies ReplayEvidenceInput)
          .filter((entry) => existsSync(entry.storage_path))
          .map((entry) => ({
            scope: entry.scope,
            product_id: entry.product_id,
            storage_locator: entry.storage_locator,
            json_record: readJsonFile<JsonRecord>(entry.storage_path),
          }))
      : [];

  const dependencyDiscovery = constitution.inspectConstitutionDependencyDiscovery(input.workspaceRoot);

  return {
    executionGraph,
    artifactRegistry,
    projectionEvidence,
    replayEvidence,
    dependencyModules: dependencyDiscovery.modules,
    dependencyDiscovery: dependencyDiscovery.discovery,
  };
}

export function canLoadConstitutionEngineInput(input: {
  readonly foundationEvidenceDir: string;
}): boolean {
  const executionGraphPath = resolveProjectionStorageLocation({
    baseDir: input.foundationEvidenceDir,
    scope: "foundation_verification",
    projectionType: "ExecutionGraphProjection",
  });
  const artifactRegistryPath = resolve(input.foundationEvidenceDir, "artifact-registry.json");
  return existsSync(executionGraphPath) && existsSync(artifactRegistryPath);
}

export function verifyConstitutionRuntime(input: {
  readonly foundationEvidenceDir: string;
  readonly productsRoot: string;
  readonly workspaceRoot: string;
  readonly lawProfile?: constitution.ConstitutionLawProfile;
}) {
  return constitution.verifyConstitution(loadConstitutionEngineInput(input), {
    lawProfile: input.lawProfile,
  });
}

export function verifyConstitutionRuntimeIfAvailable(input: {
  readonly foundationEvidenceDir: string;
  readonly productsRoot: string;
  readonly workspaceRoot: string;
  readonly lawProfile?: constitution.ConstitutionLawProfile;
}) {
  if (!canLoadConstitutionEngineInput({ foundationEvidenceDir: input.foundationEvidenceDir })) {
    return null;
  }

  return verifyConstitutionRuntime(input);
}
