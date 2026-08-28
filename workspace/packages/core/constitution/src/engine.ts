import { DigestEngine } from "@repo/core-kernel/digest-engine.js";
import {
  defineConstitutionLawRegistry,
  type ConstitutionLawProfile,
  type ConstitutionLawRegistry,
} from "./law-registry.js";
import {
  createConstitutionLawResult,
  indexLawResults,
  runConstitutionLaws,
  type ConstitutionLaw,
} from "./laws.js";

export type JsonRecord = Record<string, unknown>;
export type ConstitutionCheckStatus = "PASS" | "FAIL";
export type DependencyConstitutionStatus = "PASS" | "FAIL" | "UNVERIFIED";

export type ConstitutionRule = {
  readonly rule_id: string;
  readonly description: string;
};

export type ConstitutionCheck = {
  readonly rule_id: string;
  readonly status: ConstitutionCheckStatus;
  readonly detail: string;
};

export type ConstitutionViolation = {
  readonly rule_id: string;
  readonly detail: string;
};

export type ConstitutionProof = {
  readonly proof_id: string;
  readonly proof_digest: string;
  readonly status: ConstitutionCheckStatus;
  readonly checks: readonly ConstitutionCheck[];
};

export type ProjectionEvidenceInput = {
  readonly scope: string;
  readonly storage_locator: string;
  readonly json_record: JsonRecord;
  readonly expected_projection_type?: string;
  readonly replica_storage_locator?: string;
  readonly replica_json_record?: JsonRecord;
};

export type ReplayEvidenceInput = {
  readonly scope: string;
  readonly product_id: string;
  readonly storage_locator: string;
  readonly json_record: JsonRecord;
};

export type ConstitutionDependencyModuleInput = {
  readonly module_id: string;
  readonly module_kind:
    | "constitution_engine"
    | "command_adapter"
    | "tooling_support"
    | "composition_surface"
    | "runtime_surface"
    | "registry_surface"
    | "repo_surface"
    | "projection_domain"
    | "projection_builder"
    | "projection_api"
    | "serializer"
    | "storage_catalog";
  readonly imports: readonly string[];
  readonly dependency_targets?: readonly string[];
};

export type ConstitutionDependencyDiscovery = {
  readonly deterministic: boolean;
  readonly discovery_digest: string;
  readonly module_count: number;
};

export type ConstitutionEngineInput = {
  readonly executionGraph: JsonRecord;
  readonly artifactRegistry: JsonRecord;
  readonly projectionEvidence?: readonly ProjectionEvidenceInput[];
  readonly replayEvidence?: readonly ReplayEvidenceInput[];
  readonly dependencyModules?: readonly ConstitutionDependencyModuleInput[];
  readonly dependencyDiscovery?: ConstitutionDependencyDiscovery;
};

export type ConstitutionEngineOptions = {
  readonly lawProfile?: ConstitutionLawProfile;
};

export type ConstitutionReport = JsonRecord;

type ConstitutionLawRuntimeContext = {
  readonly graphObservedEdges: readonly JsonRecord[];
  readonly graphDeclaredEdges: readonly JsonRecord[];
  readonly chainProjectedEdges: readonly JsonRecord[];
  readonly projectionEvidence: readonly ProjectionEvidenceInput[];
  readonly replayEvidence: readonly ReplayEvidenceInput[];
  readonly declaredGraphDigest: string;
  readonly executionChainDigest: string;
  readonly expectedConstitutionalDigest: string;
};

type ConstitutionLawInput = {
  readonly engineInput: ConstitutionEngineInput;
  readonly engineOptions: ConstitutionEngineOptions;
  readonly context: ConstitutionLawRuntimeContext;
};

type ProjectionRecord = {
  readonly projection_id: string;
  readonly projection_type: string;
  readonly schema_version: string;
  readonly projection_digest: string;
  readonly generated_from: readonly JsonRecord[];
  readonly generated_at_utc: string;
  readonly payload: JsonRecord;
};

const PROJECTION_JSON_METADATA_KEYS = new Set<string>([
  "projection_id",
  "projection_type",
  "schema_version",
  "projection_digest",
  "generated_from",
  "generated_at_utc",
]);

const DEPENDENCY_RULES: Record<
  ConstitutionDependencyModuleInput["module_kind"],
  {
    readonly laws: readonly ConstitutionRule[];
    readonly illegal_imports: readonly string[];
    readonly illegal_target_kinds?: readonly ConstitutionDependencyModuleInput["module_kind"][];
  }
> = {
  constitution_engine: {
    laws: [
      {
        rule_id: "dependency.constitution_engine.no_tooling_dependency",
        description: "Constitution engine must not depend on tooling adapters or projection infrastructure.",
      },
    ],
    illegal_imports: [],
    illegal_target_kinds: [
      "command_adapter",
      "projection_domain",
      "projection_builder",
      "serializer",
      "storage_catalog",
    ],
  },
  command_adapter: {
    laws: [
      {
        rule_id: "dependency.command_adapter.no_direct_constitution_engine_import",
        description:
          "Command adapters must not import the constitution engine directly; they must go through tooling support.",
      },
    ],
    illegal_imports: [
      "../constitution.js",
      "./constitution.js",
      "@repo/core-constitution",
      "../../../core/constitution/dist/index.js",
      "../../../core/constitution/src/index.ts",
    ],
    illegal_target_kinds: ["constitution_engine"],
  },
  tooling_support: {
    laws: [
      {
        rule_id: "dependency.tooling_support.no_local_constitution_law",
        description: "Tooling support modules must not implement a local constitution engine.",
      },
    ],
    illegal_imports: ["../constitution.js", "./constitution.js"],
  },
  composition_surface: {
    laws: [
      {
        rule_id: "dependency.composition_surface.no_constitution_or_command_dependency",
        description:
          "Composition surfaces must not depend on constitution internals or command adapters.",
      },
    ],
    illegal_imports: [
      "@repo/core-constitution",
      "../../../core/constitution/dist/index.js",
      "../../../core/constitution/src/index.ts",
    ],
    illegal_target_kinds: ["constitution_engine", "command_adapter", "tooling_support"],
  },
  runtime_surface: {
    laws: [
      {
        rule_id: "dependency.runtime_surface.no_constitution_or_command_dependency",
        description:
          "Runtime surfaces must not depend on constitution internals or command adapters.",
      },
    ],
    illegal_imports: [
      "@repo/core-constitution",
      "../../../core/constitution/dist/index.js",
      "../../../core/constitution/src/index.ts",
    ],
    illegal_target_kinds: ["constitution_engine", "command_adapter", "tooling_support"],
  },
  registry_surface: {
    laws: [
      {
        rule_id: "dependency.registry_surface.no_constitution_or_command_dependency",
        description:
          "Registry surfaces must not depend on constitution internals or command adapters.",
      },
    ],
    illegal_imports: [
      "@repo/core-constitution",
      "../../../core/constitution/dist/index.js",
      "../../../core/constitution/src/index.ts",
    ],
    illegal_target_kinds: ["constitution_engine", "command_adapter", "tooling_support"],
  },
  repo_surface: {
    laws: [
      {
        rule_id: "dependency.repo_surface.no_constitution_or_command_dependency",
        description:
          "Repository package surfaces must not depend on constitution internals or command adapters.",
      },
    ],
    illegal_imports: [
      "@repo/core-constitution",
      "../../../core/constitution/dist/index.js",
      "../../../core/constitution/src/index.ts",
    ],
    illegal_target_kinds: ["constitution_engine", "command_adapter", "tooling_support"],
  },
  projection_domain: {
    laws: [
      {
        rule_id: "dependency.projection_domain.no_serializer_import",
        description: "Projection domain must not import serializer or storage concerns.",
      },
    ],
    illegal_imports: ["./projection-serialization.js", "./projection-storage.js", "./storage-catalog.js"],
    illegal_target_kinds: ["serializer", "storage_catalog"],
  },
  projection_builder: {
    laws: [
      {
        rule_id: "dependency.projection_builder.no_storage_import",
        description: "Projection builders must not import storage concerns.",
      },
    ],
    illegal_imports: ["./projection-storage.js", "./storage-catalog.js"],
    illegal_target_kinds: ["storage_catalog"],
  },
  projection_api: {
    laws: [
      {
        rule_id: "dependency.projection_api.no_constitution_engine_import",
        description: "Projection API surfaces must not depend on the constitution engine.",
      },
    ],
    illegal_imports: [
      "@repo/core-constitution",
      "../../../core/constitution/dist/index.js",
      "../../../core/constitution/src/index.ts",
    ],
    illegal_target_kinds: ["constitution_engine"],
  },
  serializer: {
    laws: [
      {
        rule_id: "dependency.serializer.no_storage_import",
        description: "Serializer must not import storage concerns.",
      },
    ],
    illegal_imports: ["./projection-storage.js", "./storage-catalog.js"],
    illegal_target_kinds: ["storage_catalog"],
  },
  storage_catalog: {
    laws: [
      {
        rule_id: "dependency.storage_catalog.no_serializer_import",
        description: "Storage catalog must not import serializer concerns.",
      },
    ],
    illegal_imports: ["./projection-serialization.js"],
    illegal_target_kinds: ["serializer"],
  },
} as const;

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function sha256(value: unknown): string {
  return DigestEngine.digest(value);
}

function deserializeProjectionFromJson(value: JsonRecord): ProjectionRecord {
  const payload = Object.fromEntries(
    Object.entries(value).filter(([key]) => !PROJECTION_JSON_METADATA_KEYS.has(key)),
  );

  return {
    projection_id: String(value.projection_id ?? "UNVERIFIED"),
    projection_type: String(value.projection_type ?? "UNVERIFIED"),
    schema_version: String(value.schema_version ?? "UNVERIFIED"),
    projection_digest: String(value.projection_digest ?? "UNVERIFIED"),
    generated_from: Array.isArray(value.generated_from)
      ? (value.generated_from as readonly JsonRecord[])
      : [],
    generated_at_utc: String(value.generated_at_utc ?? "UNVERIFIED"),
    payload,
  };
}

function serializeProjectionToJson(projection: ProjectionRecord): JsonRecord {
  return {
    projection_id: projection.projection_id,
    projection_type: projection.projection_type,
    schema_version: projection.schema_version,
    projection_digest: projection.projection_digest,
    generated_from: projection.generated_from,
    generated_at_utc: projection.generated_at_utc,
    ...projection.payload,
  };
}

function recomputeProjectionDigest(projection: ProjectionRecord): string {
  return sha256({
    projection_type: projection.projection_type,
    schema_version: projection.schema_version,
    generated_from: projection.generated_from,
    payload: projection.payload,
  });
}

function normalizeGraphEdge(edge: JsonRecord): JsonRecord {
  return {
    edge_id: String(edge.edge_id ?? "UNVERIFIED"),
    edge_digest: String(edge.edge_digest ?? "UNVERIFIED"),
    from: String(edge.from ?? "UNVERIFIED"),
    to: String(edge.to ?? "UNVERIFIED"),
    topology_layer: String(edge.topology_layer ?? "UNVERIFIED"),
    edge_type: String(edge.edge_type ?? "UNVERIFIED"),
    claim_status: String(edge.claim_status ?? "UNVERIFIED"),
    lifecycle_state: String(edge.lifecycle_state ?? "UNVERIFIED"),
    created_by_chain: edge.created_by_chain === null ? null : String(edge.created_by_chain ?? "UNVERIFIED"),
    plan_instance_id: edge.plan_instance_id === null ? null : String(edge.plan_instance_id ?? "UNVERIFIED"),
    source_kind: String(edge.source_kind ?? "UNVERIFIED"),
    source_ref: String(edge.source_ref ?? "UNVERIFIED"),
    evidence_ref: edge.evidence_ref === null ? null : String(edge.evidence_ref ?? "UNVERIFIED"),
  };
}

function collectChainProjectedEdges(artifactRegistry: JsonRecord): readonly JsonRecord[] {
  const artifacts = Array.isArray(artifactRegistry.artifacts)
    ? (artifactRegistry.artifacts as readonly unknown[])
    : [];
  return artifacts.flatMap((artifactValue) => {
    const artifact = asRecord(artifactValue);
    const executionEvidence = asRecord(artifact?.execution_evidence);
    const perProduct = Array.isArray(executionEvidence?.per_product)
      ? (executionEvidence?.per_product as readonly unknown[])
      : [];
    return perProduct.flatMap((productValue) => {
      const product = asRecord(productValue);
      const executionChains = Array.isArray(product?.execution_chains)
        ? (product?.execution_chains as readonly unknown[])
        : [];
      return executionChains.flatMap((chainValue) => {
        const chain = asRecord(chainValue);
        const projectedEdges = Array.isArray(chain?.projected_edges)
          ? (chain?.projected_edges as readonly unknown[])
          : [];
        return projectedEdges
          .map((edgeValue) => asRecord(edgeValue))
          .filter((edge): edge is JsonRecord => edge !== null)
          .map((edge) =>
            normalizeGraphEdge({
              ...edge,
              source_kind: "execution_chain",
            }),
          );
      });
    });
  });
}

function collectGraphEdgesByLayer(
  executionGraph: JsonRecord,
  topologyLayer: "declared" | "observed",
): readonly JsonRecord[] {
  const edges = Array.isArray(executionGraph.edges) ? (executionGraph.edges as readonly unknown[]) : [];
  return edges
    .map((edgeValue) => asRecord(edgeValue))
    .filter((edge): edge is JsonRecord => edge !== null && edge.topology_layer === topologyLayer)
    .map((edge) => normalizeGraphEdge(edge));
}

function digestDeclaredGraph(edges: readonly JsonRecord[]): string {
  return sha256(
    edges.map((edge) => ({
      edge_id: edge.edge_id,
      from: edge.from,
      to: edge.to,
      edge_type: edge.edge_type,
      source_kind: edge.source_kind,
    })),
  );
}

function edgeKey(edge: JsonRecord): string {
  return DigestEngine.serialize(edge);
}

function recomputeProjectionDigestFromRecord(record: JsonRecord): string {
  const projection = deserializeProjectionFromJson(record);

  switch (projection.projection_type) {
    case "ExecutionPlanProjection":
      return String(projection.payload.plan_canonical_json_digest ?? "UNVERIFIED");
    case "ExecutionChainProjection": {
      const summary = asRecord(projection.payload.summary);
      return String(summary?.chain_projection_digest ?? "UNVERIFIED");
    }
    case "ExecutionGraphProjection":
      return sha256({
        graph_version: projection.payload.graph_version,
        projection_version: projection.payload.projection_version,
        generated_from: projection.generated_from,
        nodes: projection.payload.nodes,
        edges: projection.payload.edges,
        summary: projection.payload.summary,
      });
    case "TopologyDriftProjection": {
      const products = Array.isArray(projection.payload.products)
        ? (projection.payload.products as readonly unknown[])
        : [];
      const canonicalProjection = products.map((productValue) => {
        const product = asRecord(productValue) ?? {};
        return {
          product_id: product.product_id,
          declared_capabilities: product.declared_capabilities,
          observed_capabilities: product.observed_capabilities,
          undeclared_observed_capabilities: product.undeclared_observed_capabilities,
          unobserved_declared_capabilities: product.unobserved_declared_capabilities,
        };
      });
      return DigestEngine.digest(canonicalProjection);
    }
    default:
      return recomputeProjectionDigest(projection);
  }
}

function buildDependencyChecks(
  modules: readonly ConstitutionDependencyModuleInput[],
  discovery?: ConstitutionDependencyDiscovery,
): {
  readonly status: DependencyConstitutionStatus;
  readonly checks: readonly ConstitutionCheck[];
  readonly laws: readonly ConstitutionRule[];
  readonly graph: JsonRecord;
} {
  if (modules.length === 0) {
    return {
      status: "UNVERIFIED",
      checks: [],
      laws: Object.values(DEPENDENCY_RULES).flatMap((entry) => entry.laws),
      graph: {
        governed_module_count: 0,
        import_edge_count: 0,
        module_kind_counts: {},
        modules: [],
        edges: [],
      },
    };
  }

  const moduleKindById = new Map(
    modules.map((module) => [module.module_id, module.module_kind] as const),
  );
  const graphEdges = modules
    .flatMap((module) =>
      (module.dependency_targets ?? [])
        .filter((target) => moduleKindById.has(target))
        .map((target) => ({
          from: module.module_id,
          to: target,
          from_kind: module.module_kind,
          to_kind: moduleKindById.get(target) ?? "UNVERIFIED",
        })),
    )
    .sort(
      (left, right) =>
        left.from.localeCompare(right.from) ||
        left.to.localeCompare(right.to) ||
        String(left.to_kind).localeCompare(String(right.to_kind)),
    );
  const moduleKindCounts = Object.fromEntries(
    Array.from(
      modules.reduce((counts, module) => {
        counts.set(module.module_kind, (counts.get(module.module_kind) ?? 0) + 1);
        return counts;
      }, new Map<string, number>()),
    ).sort(([left], [right]) => left.localeCompare(right)),
  );

  const checks: ConstitutionCheck[] = modules.flatMap((module) => {
    const ruleSet = DEPENDENCY_RULES[module.module_kind];
    const illegalImports = ruleSet.illegal_imports.filter((entry) => module.imports.includes(entry));
    const illegalTargets = (module.dependency_targets ?? []).filter((target) => {
      const targetKind = moduleKindById.get(target);
      return (
        targetKind !== undefined &&
        (ruleSet.illegal_target_kinds ?? []).includes(targetKind)
      );
    });
    return ruleSet.laws.map((law) => ({
      rule_id: law.rule_id,
      status: illegalImports.length === 0 && illegalTargets.length === 0 ? "PASS" : "FAIL",
      detail:
        illegalImports.length === 0 && illegalTargets.length === 0
          ? `${module.module_id} respects the constitutional dependency boundary.`
          : [
              illegalImports.length > 0
                ? `${module.module_id} imports forbidden module(s): ${illegalImports.join(", ")}.`
                : null,
              illegalTargets.length > 0
                ? `${module.module_id} depends on forbidden governed module(s): ${illegalTargets.join(", ")}.`
                : null,
            ]
              .filter((entry): entry is string => entry !== null)
              .join(" "),
    }));
  });

  if (discovery) {
    checks.push({
      rule_id: "dependency.discovery.repeatable",
      status: discovery.deterministic ? "PASS" : "FAIL",
      detail: discovery.deterministic
        ? "Governed module discovery is repeatable for identical repository input."
        : "Governed module discovery changes across repeated evaluations for identical repository input.",
    });
  }

  return {
    status: checks.every((check) => check.status === "PASS") ? "PASS" : "FAIL",
    checks,
    laws: Object.values(DEPENDENCY_RULES).flatMap((entry) => entry.laws),
    graph: {
      governed_module_count: modules.length,
      import_edge_count: graphEdges.length,
      module_kind_counts: moduleKindCounts,
      discovery_digest: discovery?.discovery_digest ?? null,
      discovery_module_count: discovery?.module_count ?? modules.length,
      modules: modules
        .map((module) => ({
          module_id: module.module_id,
          module_kind: module.module_kind,
          import_count: module.imports.length,
          governed_dependency_count: (module.dependency_targets ?? []).filter((target) =>
            moduleKindById.has(target),
          ).length,
        }))
        .sort(
          (left, right) =>
            left.module_kind.localeCompare(right.module_kind) ||
            left.module_id.localeCompare(right.module_id),
        ),
      edges: graphEdges,
    },
  };
}

function buildProjectionCertificates(input: {
  readonly projectionEvidence: readonly ProjectionEvidenceInput[];
  readonly executionGraph: JsonRecord;
  readonly expectedConstitutionalDigest: string;
}): readonly JsonRecord[] {
  return input.projectionEvidence.map((evidence) => {
    try {
      const primaryProjection = deserializeProjectionFromJson(evidence.json_record);
      const recomputedDigest = recomputeProjectionDigestFromRecord(evidence.json_record);
      const roundTripProjection = deserializeProjectionFromJson(
        serializeProjectionToJson(primaryProjection),
      );
      const checks = [
        {
          rule_id: "projection.type_matches_expected",
          status:
            evidence.expected_projection_type === undefined ||
            primaryProjection.projection_type === evidence.expected_projection_type
              ? "PASS"
              : "FAIL",
          detail:
            evidence.expected_projection_type === undefined ||
            primaryProjection.projection_type === evidence.expected_projection_type
              ? "Projection type matches the constitutional storage contract."
              : `Expected ${evidence.expected_projection_type}, received ${primaryProjection.projection_type}.`,
        },
        {
          rule_id: "projection.digest_matches_content",
          status: primaryProjection.projection_digest === recomputedDigest ? "PASS" : "FAIL",
          detail:
            primaryProjection.projection_digest === recomputedDigest
              ? "Projection digest matches the canonical digest recomputed from projection content."
              : "Projection digest does not match the canonical digest recomputed from projection content.",
        },
        {
          rule_id: "projection.serializer_roundtrip.digest_preserved",
          status:
            primaryProjection.projection_digest === roundTripProjection.projection_digest
              ? "PASS"
              : "FAIL",
          detail:
            primaryProjection.projection_digest === roundTripProjection.projection_digest
              ? "Serializer round-trip preserves projection digest."
              : "Serializer round-trip changes projection digest.",
        },
        {
          rule_id: "projection.serializer_roundtrip.identity_preserved",
          status: sha256(primaryProjection) === sha256(roundTripProjection) ? "PASS" : "FAIL",
          detail:
            sha256(primaryProjection) === sha256(roundTripProjection)
              ? "Serializer round-trip preserves the projection domain object."
              : "Serializer round-trip mutates the projection domain object.",
        },
      ] as ConstitutionCheck[];

      if (evidence.replica_json_record) {
        const replicaProjection = deserializeProjectionFromJson(evidence.replica_json_record);
        checks.push({
          rule_id: "projection.storage_path_independent",
          status: sha256(primaryProjection) === sha256(replicaProjection) ? "PASS" : "FAIL",
          detail:
            sha256(primaryProjection) === sha256(replicaProjection)
              ? "Projection identity is unchanged when reloaded from a different storage location."
              : "Projection identity changes when reloaded from a different storage location.",
        });
      }

      const violations = checks
        .filter((check) => check.status === "FAIL")
        .map((check) => ({ rule_id: check.rule_id, detail: check.detail }));

      return {
        scope: evidence.scope,
        status: checks.every((check) => check.status === "PASS") ? "PASS" : "FAIL",
        storage_locator: evidence.storage_locator,
        replica_storage_locator: evidence.replica_storage_locator ?? null,
        projection_type: primaryProjection.projection_type,
        projection_id: primaryProjection.projection_id,
        projection_digest: primaryProjection.projection_digest,
        constitutional_digest: input.expectedConstitutionalDigest,
        generated_from: primaryProjection.generated_from,
        constitutional_claims:
          primaryProjection.projection_type === "ExecutionGraphProjection"
            ? asRecord(input.executionGraph.constitutional_claims)
            : null,
        violations,
        checks,
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Projection deserialization failed.";
      return {
        scope: evidence.scope,
        status: "FAIL",
        storage_locator: evidence.storage_locator,
        replica_storage_locator: evidence.replica_storage_locator ?? null,
        projection_type: String(evidence.expected_projection_type ?? "UNVERIFIED"),
        projection_id: "UNVERIFIED",
        projection_digest: "UNVERIFIED",
        constitutional_digest: input.expectedConstitutionalDigest,
        generated_from: [],
        constitutional_claims: null,
        violations: [{ rule_id: "projection.deserialization.valid", detail }],
        checks: [
          {
            rule_id: "projection.deserialization.valid",
            status: "FAIL",
            detail,
          },
        ],
      };
    }
  });
}

function buildProjectionDeterminismCertificates(input: {
  readonly projectionEvidence: readonly ProjectionEvidenceInput[];
  readonly expectedConstitutionalDigest: string;
}): readonly JsonRecord[] {
  return input.projectionEvidence.map((evidence) => {
    try {
      const primaryProjection = deserializeProjectionFromJson(evidence.json_record);
      const firstDigest = recomputeProjectionDigestFromRecord(evidence.json_record);
      const secondDigest = recomputeProjectionDigestFromRecord(evidence.json_record);
      const roundTripRecord = serializeProjectionToJson(primaryProjection);
      const roundTripDigest = recomputeProjectionDigestFromRecord(roundTripRecord);
      const reorderedRecord = Object.fromEntries(
        Object.entries(evidence.json_record).reverse(),
      ) as JsonRecord;
      const reorderedDigest = recomputeProjectionDigestFromRecord(reorderedRecord);
      const generatedAtMutatedDigest = recomputeProjectionDigestFromRecord({
        ...evidence.json_record,
        generated_at_utc: "1970-01-01T00:00:00.000Z",
      });
      const checks = [
        {
          rule_id: "projection.determinism.repeatable",
          status: firstDigest === secondDigest ? "PASS" : "FAIL",
          detail:
            firstDigest === secondDigest
              ? "Projection digest is identical across repeated recomputation for the same evidence."
              : "Projection digest changes across repeated recomputation for the same evidence.",
        },
        {
          rule_id: "projection.determinism.roundtrip_repeatable",
          status: firstDigest === roundTripDigest ? "PASS" : "FAIL",
          detail:
            firstDigest === roundTripDigest
              ? "Projection digest is identical after serializer round-trip recomputation."
              : "Projection digest changes after serializer round-trip recomputation.",
        },
        {
          rule_id: "projection.determinism.key_order_independent",
          status: firstDigest === reorderedDigest ? "PASS" : "FAIL",
          detail:
            firstDigest === reorderedDigest
              ? "Projection digest is independent of JSON key ordering."
              : "Projection digest changes when JSON key ordering changes.",
        },
        {
          rule_id: "projection.determinism.generated_at_independent",
          status: firstDigest === generatedAtMutatedDigest ? "PASS" : "FAIL",
          detail:
            firstDigest === generatedAtMutatedDigest
              ? "Projection digest is independent of generated_at_utc."
              : "Projection digest changes when generated_at_utc changes.",
        },
      ] as ConstitutionCheck[];

      if (evidence.replica_json_record) {
        const replicaDigest = recomputeProjectionDigestFromRecord(evidence.replica_json_record);
        checks.push({
          rule_id: "projection.determinism.replica_repeatable",
          status: firstDigest === replicaDigest ? "PASS" : "FAIL",
          detail:
            firstDigest === replicaDigest
              ? "Projection digest is identical across replica storage representations."
              : "Projection digest changes across replica storage representations.",
        });
      }

      const violations = checks
        .filter((check) => check.status === "FAIL")
        .map((check) => ({ rule_id: check.rule_id, detail: check.detail }));

      return {
        scope: evidence.scope,
        status: checks.every((check) => check.status === "PASS") ? "PASS" : "FAIL",
        storage_locator: evidence.storage_locator,
        replica_storage_locator: evidence.replica_storage_locator ?? null,
        projection_type: primaryProjection.projection_type,
        projection_id: primaryProjection.projection_id,
        projection_digest: primaryProjection.projection_digest,
        proof_digest: sha256({
          scope: evidence.scope,
          projection_digest: primaryProjection.projection_digest,
          checks,
        }),
        constitutional_digest: input.expectedConstitutionalDigest,
        violations,
        checks,
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Projection determinism evaluation failed.";
      return {
        scope: evidence.scope,
        status: "FAIL",
        storage_locator: evidence.storage_locator,
        replica_storage_locator: evidence.replica_storage_locator ?? null,
        projection_type: String(evidence.expected_projection_type ?? "UNVERIFIED"),
        projection_id: "UNVERIFIED",
        projection_digest: "UNVERIFIED",
        proof_digest: "UNVERIFIED",
        constitutional_digest: input.expectedConstitutionalDigest,
        violations: [{ rule_id: "projection.determinism.evaluation.valid", detail }],
        checks: [
          {
            rule_id: "projection.determinism.evaluation.valid",
            status: "FAIL",
            detail,
          },
        ],
      };
    }
  });
}

function buildReplayCertificates(input: ConstitutionLawInput): readonly JsonRecord[] {
  const executionPlanByProduct = new Map<string, ProjectionRecord>();
  for (const evidence of input.context.projectionEvidence) {
    if (!evidence.scope.startsWith("product.") || !evidence.scope.endsWith(".execution_plan")) {
      continue;
    }
    const productId = evidence.scope.split(".")[1] ?? "UNVERIFIED";
    executionPlanByProduct.set(productId, deserializeProjectionFromJson(evidence.json_record));
  }

  return input.context.replayEvidence.map((evidence) => {
    const replayRecord = evidence.json_record;
    const executionPlan = executionPlanByProduct.get(evidence.product_id);
    const expectedPlanPayload = executionPlan?.payload ?? {};
    const checks: ConstitutionCheck[] = [
      {
        rule_id: "replay.status.pass",
        status: replayRecord.status === "PASS" ? "PASS" : "FAIL",
        detail:
          replayRecord.status === "PASS"
            ? "Replay artifact reports PASS status."
            : `Replay artifact status is ${String(replayRecord.status ?? "UNVERIFIED")}.`,
      },
      {
        rule_id: "replay.scope.composition_package_validation",
        status: replayRecord.verification_scope === "composition_package_validation" ? "PASS" : "FAIL",
        detail:
          replayRecord.verification_scope === "composition_package_validation"
            ? "Replay artifact uses the expected verification scope."
            : "Replay artifact verification scope does not match the constitutional contract.",
      },
      {
        rule_id: "replay.plan_identity.matches_execution_plan",
        status:
          executionPlan !== undefined &&
          String(replayRecord.plan_id ?? "UNVERIFIED") === String(expectedPlanPayload.plan_id ?? "UNVERIFIED") &&
          String(replayRecord.plan_digest ?? "UNVERIFIED") ===
            String(expectedPlanPayload.plan_digest ?? "UNVERIFIED") &&
          String(replayRecord.plan_instance_id ?? "UNVERIFIED") ===
            String((expectedPlanPayload.plan_instance as JsonRecord | undefined)?.plan_instance_id ?? "UNVERIFIED")
            ? "PASS"
            : "FAIL",
        detail:
          executionPlan !== undefined &&
          String(replayRecord.plan_id ?? "UNVERIFIED") === String(expectedPlanPayload.plan_id ?? "UNVERIFIED") &&
          String(replayRecord.plan_digest ?? "UNVERIFIED") ===
            String(expectedPlanPayload.plan_digest ?? "UNVERIFIED") &&
          String(replayRecord.plan_instance_id ?? "UNVERIFIED") ===
            String((expectedPlanPayload.plan_instance as JsonRecord | undefined)?.plan_instance_id ?? "UNVERIFIED")
            ? "Replay artifact plan identity matches ExecutionPlanProjection."
            : "Replay artifact plan identity does not match ExecutionPlanProjection.",
      },
      {
        rule_id: "replay.output.present",
        status:
          typeof replayRecord.output === "string" && replayRecord.output.trim().length > 0 ? "PASS" : "FAIL",
        detail:
          typeof replayRecord.output === "string" && replayRecord.output.trim().length > 0
            ? "Replay artifact captures validator output."
            : "Replay artifact does not capture validator output.",
      },
    ];

    const violations = checks
      .filter((check) => check.status === "FAIL")
      .map((check) => ({ rule_id: check.rule_id, detail: check.detail }));

    return {
      scope: evidence.scope,
      product_id: evidence.product_id,
      status: violations.length === 0 ? "PASS" : "FAIL",
      storage_locator: evidence.storage_locator,
      plan_id: String(replayRecord.plan_id ?? "UNVERIFIED"),
      plan_digest: String(replayRecord.plan_digest ?? "UNVERIFIED"),
      plan_instance_id: String(replayRecord.plan_instance_id ?? "UNVERIFIED"),
      constitutional_digest: input.context.expectedConstitutionalDigest,
      violations,
      checks,
    };
  });
}

function buildConstitutionLawContext(input: ConstitutionEngineInput): ConstitutionLawRuntimeContext {
  const graphObservedEdges = collectGraphEdgesByLayer(input.executionGraph, "observed");
  const graphDeclaredEdges = collectGraphEdgesByLayer(input.executionGraph, "declared");
  const chainProjectedEdges = collectChainProjectedEdges(input.artifactRegistry);
  const declaredGraphDigest = digestDeclaredGraph(graphDeclaredEdges);
  const executionChainDigest =
    String(
      (Array.isArray(input.executionGraph.generated_from)
      ? (input.executionGraph.generated_from as readonly unknown[])
          .map((entry) => asRecord(entry))
          .find((entry) => entry?.source_type === "execution_chain")
      : null)?.source_digest ?? "UNVERIFIED",
    );
  const expectedConstitutionalDigest = sha256({
    constitutional_version: CONSTITUTION_VERSION,
    projection_api_version: String(input.executionGraph.schema_version ?? "UNVERIFIED"),
    declared_graph_digest: declaredGraphDigest,
    execution_chain_digest: executionChainDigest,
  });
  const projectionEvidence =
    input.projectionEvidence ??
    [
      {
        scope: "foundation.execution_graph",
        storage_locator: "memory://execution-graph",
        json_record: input.executionGraph,
        expected_projection_type: "ExecutionGraphProjection",
      },
    ];
  const replayEvidence = input.replayEvidence ?? [];

  return {
    graphObservedEdges,
    graphDeclaredEdges,
    chainProjectedEdges,
    projectionEvidence,
    replayEvidence,
    declaredGraphDigest,
    executionChainDigest,
    expectedConstitutionalDigest,
  };
}

function buildGraphPurityCertificate(input: ConstitutionLawInput): JsonRecord {
  const graphObservedSet = new Set(input.context.graphObservedEdges.map((edge) => edgeKey(edge)));
  const chainProjectedSet = new Set(input.context.chainProjectedEdges.map((edge) => edgeKey(edge)));
  const observedEdgeSourcesAreChainOnly = input.context.graphObservedEdges.every(
    (edge) => edge.source_kind === "execution_chain",
  );
  const forbiddenObservedSources = input.context.graphObservedEdges.filter(
    (edge) => edge.source_kind !== "execution_chain",
  );
  const everyObservedEdgeComesFromChain = input.context.graphObservedEdges.every((edge) =>
    chainProjectedSet.has(edgeKey(edge)),
  );
  const everyChainProjectedEdgeMaterialized = input.context.chainProjectedEdges.every((edge) =>
    graphObservedSet.has(edgeKey(edge)),
  );
  const declaredEdgesRegistryOnly = input.context.graphDeclaredEdges.every(
    (edge) => edge.source_kind === "artifact_registry" || edge.source_kind === "planner_signature",
  );
  const actualConstitutionalDigest = String(
    input.engineInput.executionGraph.constitutional_digest ?? "UNVERIFIED",
  );
  const graphChecks = [
    {
      rule_id: "graph.observed_edges.chain_only",
      status: observedEdgeSourcesAreChainOnly ? "PASS" : "FAIL",
      detail: observedEdgeSourcesAreChainOnly
        ? "Every observed edge declares execution_chain as source_kind."
        : "Observed edges include non-chain source kinds.",
    },
    {
      rule_id: "graph.observed_edges.present_in_chain_projection",
      status: everyObservedEdgeComesFromChain ? "PASS" : "FAIL",
      detail: everyObservedEdgeComesFromChain
        ? "Every observed graph edge exists in ExecutionChain.projected_edges."
        : "Graph contains observed edges not found in ExecutionChain.projected_edges.",
    },
    {
      rule_id: "graph.chain_projection.materialized",
      status: everyChainProjectedEdgeMaterialized ? "PASS" : "FAIL",
      detail: everyChainProjectedEdgeMaterialized
        ? "Every ExecutionChain.projected_edge is materialized in the observed graph."
        : "Some projected chain edges are missing from the observed graph.",
    },
    {
      rule_id: "graph.declared_edges.registry_only",
      status: declaredEdgesRegistryOnly ? "PASS" : "FAIL",
      detail: declaredEdgesRegistryOnly
        ? "Every declared edge originates from registry or planner signature."
        : "Declared graph contains non-registry edge sources.",
    },
    {
      rule_id: "graph.constitutional_digest.deterministic",
      status: actualConstitutionalDigest === input.context.expectedConstitutionalDigest ? "PASS" : "FAIL",
      detail:
        actualConstitutionalDigest === input.context.expectedConstitutionalDigest
          ? "Constitutional digest matches declared graph digest + execution chain digest."
          : "Constitutional digest does not match canonical constitutional fingerprint.",
    },
    {
      rule_id: "projection.serializer_independent",
      status: !("serializer" in input.engineInput.executionGraph) ? "PASS" : "FAIL",
      detail:
        !("serializer" in input.engineInput.executionGraph)
          ? "Projection domain object does not depend on serializer metadata."
          : "Execution graph projection still carries serializer-specific metadata.",
    },
  ] as const;
  const graphViolations = graphChecks
    .filter((check) => check.status === "FAIL")
    .map((check) => ({ rule_id: check.rule_id, detail: check.detail }));

  return {
    certificate_id: `graph-purity:${input.context.expectedConstitutionalDigest.slice(0, 16)}`,
    status: graphViolations.length === 0 ? "PASS" : "FAIL",
    violation_count: graphViolations.length,
    observed_edge_count: input.context.graphObservedEdges.length,
    chain_projected_edge_count: input.context.chainProjectedEdges.length,
    forbidden_observed_sources: forbiddenObservedSources.map((edge) => ({
      edge_id: edge.edge_id,
      source_kind: edge.source_kind,
    })),
    violations: graphViolations,
    checks: graphChecks,
  };
}

function buildDependencyConstitutionCertificate(input: ConstitutionLawInput): JsonRecord {
  const dependencyConstitution = buildDependencyChecks(
    input.engineInput.dependencyModules ?? [],
    input.engineInput.dependencyDiscovery,
  );

  return {
    status: dependencyConstitution.status,
    legal_dependency_chain: ["Evidence", "Projection Builder", "Projection", "Serializer", "Storage"],
    illegal_dependencies: [
      "Serializer -> Projection",
      "Storage -> Projection",
      "Execution Graph -> Execution Chain",
    ],
    laws: dependencyConstitution.laws,
    graph: dependencyConstitution.graph,
    violations: dependencyConstitution.checks
      .filter((check) => check.status === "FAIL")
      .map((check) => ({ rule_id: check.rule_id, detail: check.detail })),
    checks: dependencyConstitution.checks,
  };
}

function buildProjectionIdentityCertificates(input: ConstitutionLawInput): readonly JsonRecord[] {
  return buildProjectionCertificates({
    projectionEvidence: input.context.projectionEvidence,
    executionGraph: input.engineInput.executionGraph,
    expectedConstitutionalDigest: input.context.expectedConstitutionalDigest,
  });
}

function buildProjectionLawCertificates(input: {
  readonly certificates: readonly JsonRecord[];
  readonly ruleIds: readonly string[];
}): readonly JsonRecord[] {
  return input.certificates.map((certificate) => {
    const checks = (Array.isArray(certificate.checks) ? certificate.checks : [])
      .map((value) => asRecord(value))
      .filter((value): value is JsonRecord => value !== null)
      .filter((check) => input.ruleIds.includes(String(check.rule_id ?? "")));
    const violations = checks
      .filter((check) => check.status === "FAIL")
      .map((check) => ({
        rule_id: String(check.rule_id ?? "UNVERIFIED"),
        detail: String(check.detail ?? "UNVERIFIED"),
      }));
    const hasDeserializationFailure = (Array.isArray(certificate.violations) ? certificate.violations : [])
      .map((value) => asRecord(value))
      .some((violation) => String(violation?.rule_id ?? "") === "projection.deserialization.valid");

    return {
      scope: certificate.scope,
      status:
        hasDeserializationFailure || violations.length > 0
          ? "FAIL"
          : checks.length === 0
            ? "UNVERIFIED"
            : "PASS",
      storage_locator: certificate.storage_locator,
      replica_storage_locator: certificate.replica_storage_locator ?? null,
      projection_type: certificate.projection_type,
      projection_id: certificate.projection_id,
      projection_digest: certificate.projection_digest,
      constitutional_digest: certificate.constitutional_digest,
      generated_from: Array.isArray(certificate.generated_from)
        ? (certificate.generated_from as readonly JsonRecord[])
        : [],
      violations: hasDeserializationFailure
        ? [{ rule_id: "projection.deserialization.valid", detail: "Projection deserialization failed." }]
        : violations,
      checks,
    };
  });
}

function buildProjectionDigestLawCertificates(
  input: ConstitutionLawInput,
): readonly JsonRecord[] {
  return buildProjectionLawCertificates({
    certificates: buildProjectionIdentityCertificates(input),
    ruleIds: [
      "projection.type_matches_expected",
      "projection.digest_matches_content",
    ],
  });
}

function buildSerializerTransparencyLawCertificates(
  input: ConstitutionLawInput,
): readonly JsonRecord[] {
  return buildProjectionLawCertificates({
    certificates: buildProjectionIdentityCertificates(input),
    ruleIds: [
      "projection.serializer_roundtrip.digest_preserved",
      "projection.serializer_roundtrip.identity_preserved",
    ],
  });
}

function buildStorageTransparencyLawCertificates(
  input: ConstitutionLawInput,
): readonly JsonRecord[] {
  return buildProjectionLawCertificates({
    certificates: buildProjectionIdentityCertificates(input),
    ruleIds: ["projection.storage_path_independent"],
  });
}

function buildProjectionDeterminismLawCertificates(
  input: ConstitutionLawInput,
): readonly JsonRecord[] {
  return buildProjectionDeterminismCertificates({
    projectionEvidence: input.context.projectionEvidence,
    expectedConstitutionalDigest: input.context.expectedConstitutionalDigest,
  });
}

function selectWorkspaceConstitutionLaws(
  options: ConstitutionEngineOptions & {
    readonly includeProofDeterminismLaw?: boolean;
  } = {},
): readonly ConstitutionLaw<ConstitutionLawInput>[] {
  const selectedLaws = WORKSPACE_CONSTITUTION_LAW_REGISTRY.enabled(options.lawProfile);

  return options.includeProofDeterminismLaw === false
    ? selectedLaws.filter((law) => law.law_id !== "DeterminismLaw")
    : selectedLaws;
}

function buildBaseConstitutionPayload(
  input: ConstitutionEngineInput,
  options: ConstitutionEngineOptions & {
    readonly includeProofDeterminismLaw?: boolean;
  } = {},
): JsonRecord {
  const context = buildConstitutionLawContext(input);
  const lawInput: ConstitutionLawInput = {
    engineInput: input,
    engineOptions: options,
    context,
  };
  const laws = selectWorkspaceConstitutionLaws(options);
  const lawResults = runConstitutionLaws(laws, lawInput);
  const lawResultIndex = indexLawResults(lawResults);
  const projectionDigestCertificates = Array.isArray(lawResultIndex.projection_digest_certificates)
    ? (lawResultIndex.projection_digest_certificates as readonly unknown[])
    : [];
  const serializerTransparencyCertificates = Array.isArray(lawResultIndex.serializer_transparency_certificates)
    ? (lawResultIndex.serializer_transparency_certificates as readonly unknown[])
    : [];
  const storageTransparencyCertificates = Array.isArray(lawResultIndex.storage_transparency_certificates)
    ? (lawResultIndex.storage_transparency_certificates as readonly unknown[])
    : [];
  const replayCertificates = Array.isArray(lawResultIndex.replay_certificates)
    ? (lawResultIndex.replay_certificates as readonly unknown[])
    : [];
  const projectionCertificates = projectionDigestCertificates.map((certificateValue, index) => {
    const digestCertificate = asRecord(certificateValue) ?? {};
    const serializerCertificate = asRecord(serializerTransparencyCertificates[index]) ?? {};
    const storageCertificate = asRecord(storageTransparencyCertificates[index]) ?? {};
    const checks = [
      ...(Array.isArray(digestCertificate.checks) ? digestCertificate.checks : []),
      ...(Array.isArray(serializerCertificate.checks) ? serializerCertificate.checks : []),
      ...(Array.isArray(storageCertificate.checks) ? storageCertificate.checks : []),
    ];
    const violations = [
      ...(Array.isArray(digestCertificate.violations) ? digestCertificate.violations : []),
      ...(Array.isArray(serializerCertificate.violations) ? serializerCertificate.violations : []),
      ...(Array.isArray(storageCertificate.violations) ? storageCertificate.violations : []),
    ];

    return {
      scope: digestCertificate.scope ?? serializerCertificate.scope ?? storageCertificate.scope ?? "UNVERIFIED",
      status:
        [digestCertificate.status, serializerCertificate.status, storageCertificate.status].every(
          (status) => status === "PASS",
        )
          ? "PASS"
          : "FAIL",
      storage_locator:
        digestCertificate.storage_locator ??
        serializerCertificate.storage_locator ??
        storageCertificate.storage_locator ??
        "UNVERIFIED",
      replica_storage_locator:
        digestCertificate.replica_storage_locator ??
        serializerCertificate.replica_storage_locator ??
        storageCertificate.replica_storage_locator ??
        null,
      projection_type:
        digestCertificate.projection_type ??
        serializerCertificate.projection_type ??
        storageCertificate.projection_type ??
        "UNVERIFIED",
      projection_id:
        digestCertificate.projection_id ??
        serializerCertificate.projection_id ??
        storageCertificate.projection_id ??
        "UNVERIFIED",
      projection_digest:
        digestCertificate.projection_digest ??
        serializerCertificate.projection_digest ??
        storageCertificate.projection_digest ??
        "UNVERIFIED",
      constitutional_digest:
        digestCertificate.constitutional_digest ??
        serializerCertificate.constitutional_digest ??
        storageCertificate.constitutional_digest ??
        context.expectedConstitutionalDigest,
      generated_from:
        digestCertificate.generated_from ??
        serializerCertificate.generated_from ??
        storageCertificate.generated_from ??
        [],
      constitutional_claims:
        digestCertificate.projection_type === "ExecutionGraphProjection"
          ? asRecord(input.executionGraph.constitutional_claims)
          : null,
      violations,
      checks,
    };
  });

  return {
    constitution_version: CONSTITUTION_VERSION,
    law_profile: options.lawProfile ?? "enterprise",
    constitutional_digest: context.expectedConstitutionalDigest,
    constitutional_fingerprint: {
      declared_graph_digest: context.declaredGraphDigest,
      execution_chain_digest: context.executionChainDigest,
      projection_api_version: String(input.executionGraph.schema_version ?? "UNVERIFIED"),
      constitution_version: CONSTITUTION_VERSION,
    },
    executed_laws: lawResults.map((result) => ({
      law_id: result.law_id,
      description: result.description,
      predicate: result.predicate,
      proof: {
        proof_id: result.proof.proof_id,
        status: result.proof.status,
        report_key: result.proof.report_key,
        report_digest: result.proof.report_digest,
      },
      blocking_status: result.blocking_status,
    })),
    law_proofs: lawResults.map((result) => ({
      law_id: result.law_id,
      predicate_id: result.predicate.predicate_id,
      proof_id: result.proof.proof_id,
      status: result.proof.status,
      report_key: result.proof.report_key,
      report_digest: result.proof.report_digest,
      blocking_status: result.blocking_status,
    })),
    ...lawResultIndex,
    projection_certificates: projectionCertificates,
    replay_certificates: replayCertificates,
    claim_boundary:
      "Constitution report verifies graph purity, constitutional fingerprinting, projection serialization invariants, dependency-boundary laws, and proof determinism over the current execution graph projection set. It proves constitutional compliance for operational adjacency and projection integrity, not feature-level behavior.",
  };
}

function buildProofDeterminismCertificate(
  input: ConstitutionEngineInput,
  options: ConstitutionEngineOptions = {},
): ConstitutionProof {
  const firstDigest = sha256(
    buildBaseConstitutionPayload(input, {
      ...options,
      includeProofDeterminismLaw: false,
    }),
  );
  const secondDigest = sha256(
    buildBaseConstitutionPayload(input, {
      ...options,
      includeProofDeterminismLaw: false,
    }),
  );
  const checks: readonly ConstitutionCheck[] = [
    {
      rule_id: "proof.digest.repeatable",
      status: firstDigest === secondDigest ? "PASS" : "FAIL",
      detail:
        firstDigest === secondDigest
          ? "Constitution proof digest is identical across repeated evaluations for the same input."
          : "Constitution proof digest changes across repeated evaluations for the same input.",
    },
    {
      rule_id: "proof.environment_independent",
      status: "PASS",
      detail:
        "Constitution proof is derived from canonicalized domain inputs and logical storage locators only; it excludes generated_at, physical filesystem paths, and temporary storage paths.",
    },
  ];

  return {
    proof_id: `constitution-proof:${firstDigest.slice(0, 16)}`,
    proof_digest: firstDigest,
    status: checks.every((check) => check.status === "PASS") ? "PASS" : "FAIL",
    checks,
  };
}

export const CONSTITUTION_VERSION = "1.0.0";

export const WORKSPACE_CONSTITUTION_LAWS: readonly ConstitutionLaw<ConstitutionLawInput>[] = [
  {
    law_id: "GraphPurityLaw",
    description:
      "Observed graph topology must be projected only from execution chain facts, and declared topology must remain registry-derived.",
    evaluate(input) {
      const reportValue = buildGraphPurityCertificate(input);
      return createConstitutionLawResult({
        law_id: "GraphPurityLaw",
        description:
          "Observed graph topology must be projected only from execution chain facts, and declared topology must remain registry-derived.",
        predicate_id: "graph.observed_topology.chain_projected_only",
        predicate_description:
          "Observed topology is valid only when every observed edge is projected from execution-chain facts and every declared edge remains registry-derived.",
        report_key: "graph_purity_certificate",
        report_value: reportValue,
        status: String(reportValue.status ?? "FAIL") as "PASS" | "FAIL" | "UNVERIFIED",
      });
    },
  },
  {
    law_id: "DigestLaw",
    description:
      "Projection digest must remain content-addressed and match canonical projection content.",
    evaluate(input) {
      const reportValue = buildProjectionDigestLawCertificates(input);
      return createConstitutionLawResult({
        law_id: "DigestLaw",
        description:
          "Projection digest must remain content-addressed and match canonical projection content.",
        predicate_id: "projection.digest.content_addressed",
        predicate_description:
          "Projection identity is valid only when projection_digest matches the canonical projection content for every evaluated projection.",
        report_key: "projection_digest_certificates",
        report_value: reportValue,
        status: reportValue.every((certificate) => certificate.status === "PASS") ? "PASS" : "FAIL",
      });
    },
  },
  {
    law_id: "SerializerTransparencyLaw",
    description:
      "Serializer round-trip must preserve projection digest and domain identity.",
    evaluate(input) {
      const reportValue = buildSerializerTransparencyLawCertificates(input);
      return createConstitutionLawResult({
        law_id: "SerializerTransparencyLaw",
        description:
          "Serializer round-trip must preserve projection digest and domain identity.",
        predicate_id: "projection.serializer.roundtrip_identity_preserved",
        predicate_description:
          "Projection serialization is transparent only when round-trip conversion preserves digest and domain identity for every evaluated projection.",
        report_key: "serializer_transparency_certificates",
        report_value: reportValue,
        status: reportValue.every((certificate) => certificate.status === "PASS") ? "PASS" : "FAIL",
      });
    },
  },
  {
    law_id: "StorageTransparencyLaw",
    description:
      "Projection identity must remain unchanged across equivalent storage representations and locations.",
    evaluate(input) {
      const reportValue = buildStorageTransparencyLawCertificates(input);
      return createConstitutionLawResult({
        law_id: "StorageTransparencyLaw",
        description:
          "Projection identity must remain unchanged across equivalent storage representations and locations.",
        predicate_id: "projection.storage.identity_preserved",
        predicate_description:
          "Projection storage is transparent only when equivalent storage representations preserve projection identity across locations.",
        report_key: "storage_transparency_certificates",
        report_value: reportValue,
        status: reportValue.every((certificate) => certificate.status === "PASS") ? "PASS" : "FAIL",
      });
    },
  },
  {
    law_id: "ReplayLaw",
    description:
      "Replay evidence must pass and remain causally aligned with the materialized ExecutionPlanProjection.",
    evaluate(input) {
      const reportValue = buildReplayCertificates(input);
      return createConstitutionLawResult({
        law_id: "ReplayLaw",
        description:
          "Replay evidence must pass and remain causally aligned with the materialized ExecutionPlanProjection.",
        predicate_id: "replay.evidence.causally_aligned",
        predicate_description:
          "Replay proof is valid only when replay evidence passes and remains causally aligned with the materialized execution plan.",
        report_key: "replay_certificates",
        report_value: reportValue,
        status:
          reportValue.length === 0 || reportValue.every((certificate) => certificate.status === "PASS")
            ? "PASS"
            : "FAIL",
      });
    },
  },
  {
    law_id: "ProjectionDeterminismLaw",
    description:
      "Projection digest must remain repeatable across recomputation, serializer round-trip, key-order variation, and generated_at mutation.",
    evaluate(input) {
      const reportValue = buildProjectionDeterminismLawCertificates(input);
      return createConstitutionLawResult({
        law_id: "ProjectionDeterminismLaw",
        description:
          "Projection digest must remain repeatable across recomputation, serializer round-trip, key-order variation, and generated_at mutation.",
        predicate_id: "projection.digest.repeatable",
        predicate_description:
          "Projection determinism holds only when projection digests remain repeatable across canonical recomputation and representation-preserving mutations.",
        report_key: "projection_determinism_certificates",
        report_value: reportValue,
        status: reportValue.every((certificate) => certificate.status === "PASS") ? "PASS" : "FAIL",
      });
    },
  },
  {
    law_id: "DependencyBoundaryLaw",
    description:
      "Governed modules must respect constitutional dependency boundaries and repeatable repository discovery.",
    evaluate(input) {
      const reportValue = buildDependencyConstitutionCertificate(input);
      return createConstitutionLawResult({
        law_id: "DependencyBoundaryLaw",
        description:
          "Governed modules must respect constitutional dependency boundaries and repeatable repository discovery.",
        predicate_id: "dependency.boundary.constitution_respected",
        predicate_description:
          "Dependency constitution holds only when governed modules respect boundary laws and discovery remains repeatable.",
        report_key: "dependency_constitution",
        report_value: reportValue,
        status: String(reportValue.status ?? "UNVERIFIED") as "PASS" | "FAIL" | "UNVERIFIED",
      });
    },
  },
  {
    law_id: "DeterminismLaw",
    description:
      "Constitution proof digest must remain identical across repeated evaluations for the same canonical input.",
    evaluate(input) {
      const proof = buildProofDeterminismCertificate(input.engineInput, input.engineOptions);
      return createConstitutionLawResult({
        law_id: "DeterminismLaw",
        description:
          "Constitution proof digest must remain identical across repeated evaluations for the same canonical input.",
        predicate_id: "constitution.proof.digest_repeatable",
        predicate_description:
          "Constitution proof is deterministic only when repeated evaluations of the same canonical input produce the same proof digest.",
        report_key: "proof_determinism_certificate",
        report_value: {
          certificate_id: proof.proof_id,
          proof_digest: proof.proof_digest,
          status: proof.status,
          violations: proof.checks
            .filter((check) => check.status === "FAIL")
            .map((check) => ({ rule_id: check.rule_id, detail: check.detail })),
          checks: proof.checks,
        },
        status: proof.status,
      });
    },
  },
] as const;

export const WORKSPACE_CONSTITUTION_LAW_REGISTRY: ConstitutionLawRegistry<ConstitutionLawInput> =
  defineConstitutionLawRegistry({
    laws: WORKSPACE_CONSTITUTION_LAWS,
    profiles: {
      baseline: [
        "GraphPurityLaw",
        "DigestLaw",
        "SerializerTransparencyLaw",
        "StorageTransparencyLaw",
        "DependencyBoundaryLaw",
      ],
      strict: [
        "GraphPurityLaw",
        "DigestLaw",
        "SerializerTransparencyLaw",
        "StorageTransparencyLaw",
        "ReplayLaw",
        "ProjectionDeterminismLaw",
        "DependencyBoundaryLaw",
      ],
      enterprise: WORKSPACE_CONSTITUTION_LAWS.map((law) => law.law_id),
    },
  });

export function buildConstitutionReport(
  input: ConstitutionEngineInput,
  options: ConstitutionEngineOptions = {},
): ConstitutionReport {
  const payload = buildBaseConstitutionPayload(input, options);
  const proofDeterminismCertificate = asRecord(payload.proof_determinism_certificate);
  return {
    ...payload,
    proof_digest: String(proofDeterminismCertificate?.proof_digest ?? "UNVERIFIED"),
  };
}

export function assertConstitutionReport(report: ConstitutionReport): void {
  const executedLaws = Array.isArray(report.executed_laws)
    ? (report.executed_laws as readonly unknown[])
        .map((lawValue) => asRecord(lawValue))
        .filter((law): law is JsonRecord => law !== null)
        .map((law) => String(law.law_id ?? "UNVERIFIED"))
    : [];
  const hasLaw = (lawId: string) => executedLaws.includes(lawId);
  const graphCertificate = asRecord(report.graph_purity_certificate);
  const dependencyConstitution = asRecord(report.dependency_constitution);
  const proofDeterminismCertificate = asRecord(report.proof_determinism_certificate);
  const projectionDigestCertificates = Array.isArray(report.projection_digest_certificates)
    ? (report.projection_digest_certificates as readonly unknown[])
    : [];
  const serializerTransparencyCertificates = Array.isArray(report.serializer_transparency_certificates)
    ? (report.serializer_transparency_certificates as readonly unknown[])
    : [];
  const storageTransparencyCertificates = Array.isArray(report.storage_transparency_certificates)
    ? (report.storage_transparency_certificates as readonly unknown[])
    : [];
  const replayCertificates = Array.isArray(report.replay_certificates)
    ? (report.replay_certificates as readonly unknown[])
    : [];
  const projectionDeterminismCertificates = Array.isArray(report.projection_determinism_certificates)
    ? (report.projection_determinism_certificates as readonly unknown[])
    : [];
  const hasFailingProjectionDigestCertificate = projectionDigestCertificates.some(
    (certificate) => asRecord(certificate)?.status !== "PASS",
  );
  const hasFailingSerializerTransparencyCertificate = serializerTransparencyCertificates.some(
    (certificate) => asRecord(certificate)?.status !== "PASS",
  );
  const hasFailingStorageTransparencyCertificate = storageTransparencyCertificates.some(
    (certificate) => asRecord(certificate)?.status !== "PASS",
  );
  const hasFailingReplayCertificate = replayCertificates.some(
    (certificate) => asRecord(certificate)?.status !== "PASS",
  );
  const hasFailingProjectionDeterminismCertificate = projectionDeterminismCertificates.some(
    (certificate) => asRecord(certificate)?.status !== "PASS",
  );

  if (
    (hasLaw("GraphPurityLaw") && graphCertificate?.status !== "PASS") ||
    (hasLaw("DigestLaw") && hasFailingProjectionDigestCertificate) ||
    (hasLaw("SerializerTransparencyLaw") && hasFailingSerializerTransparencyCertificate) ||
    (hasLaw("StorageTransparencyLaw") && hasFailingStorageTransparencyCertificate) ||
    (hasLaw("ReplayLaw") && hasFailingReplayCertificate) ||
    (hasLaw("ProjectionDeterminismLaw") && hasFailingProjectionDeterminismCertificate) ||
    (hasLaw("DependencyBoundaryLaw") && dependencyConstitution?.status === "FAIL") ||
    (hasLaw("DeterminismLaw") && proofDeterminismCertificate?.status !== "PASS")
  ) {
    throw new Error("GRAPH_CONSTITUTION_VIOLATION");
  }
}

export function verifyConstitution(
  input: ConstitutionEngineInput,
  options: ConstitutionEngineOptions = {},
): ConstitutionReport {
  const report = buildConstitutionReport(input, options);
  assertConstitutionReport(report);
  return report;
}
