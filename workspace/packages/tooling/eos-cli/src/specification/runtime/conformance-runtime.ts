import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { EOS_ROOT } from "../../state.js";
import {
  captureExecutionTimestampUtc,
  readYamlArtifact,
  uniqueStrings,
  writeJsonArtifact,
} from "../../governance-runtime.js";
import {
  assertKnownSpecificationMaturityStatus,
  loadSpecificationMaturityModel,
  meetsSpecificationMaturityFloor,
  type SpecificationMaturityStatus,
} from "./maturity-runtime.js";

const SPECIFICATIONS_DIR = resolve(EOS_ROOT, "enterprise/specifications");
const SPECIFICATION_REGISTRY_PATH = resolve(
  SPECIFICATIONS_DIR,
  "specification-registry.yaml",
);
export const SPECIFICATION_CONFORMANCE_REPORT_PATH = resolve(
  EOS_ROOT,
  "workspace/foundation/evidence/verification/specification-conformance-report.json",
);
export const SPECIFICATION_ARTIFACT_GRAPH_PATH = resolve(
  EOS_ROOT,
  "workspace/foundation/evidence/verification/specification-artifact-graph.json",
);
const SPECIFICATION_MATURITY_MODEL = loadSpecificationMaturityModel();

type RfcRegistryEntry = {
  readonly rfc_id: string;
  readonly title: string;
  readonly status: SpecificationMaturityStatus;
  readonly owner: string;
  readonly source_ref: string;
  readonly conformance_ref: string;
  readonly depends_on: readonly string[];
  readonly required_by: readonly string[];
  readonly implemented_by: readonly string[];
  readonly verified_by: readonly string[];
};

type ConfRegistryEntry = {
  readonly conf_id: string;
  readonly title: string;
  readonly status: SpecificationMaturityStatus;
  readonly owner: string;
  readonly source_ref: string;
  readonly proves: readonly string[];
  readonly tests: readonly string[];
  readonly evidence: readonly string[];
};

type SpecRegistryEntry = {
  readonly spec_id: string;
  readonly title: string;
  readonly status: SpecificationMaturityStatus;
  readonly owner: string;
  readonly source_ref: string;
  readonly governed_by: readonly string[];
  readonly implemented_by: readonly string[];
  readonly verified_by: readonly string[];
};

type ArtifactRegistryEntry = {
  readonly artifact_id: string;
  readonly artifact_type:
    | "ADR"
    | "RFC"
    | "CONF"
    | "SPEC"
    | "PROJ"
    | "CONTRACT_SURFACE"
    | "TEST_SURFACE"
    | "EVIDENCE_ARTIFACT";
  readonly title: string;
  readonly status?: SpecificationMaturityStatus;
  readonly owner?: string;
  readonly source_ref: string;
};

type ArtifactGraphEdge = {
  readonly from: string;
  readonly to: string;
  readonly graph_class: "knowledge_graph";
  readonly edge_kind: "depends_on" | "implements" | "references" | "supersedes";
};

type SpecificationRegistry = {
  readonly registry_version: "2.2.0";
  readonly registry_id: string;
  readonly scope: string;
  readonly artifact_entries: readonly ArtifactRegistryEntry[];
  readonly artifact_edges: readonly ArtifactGraphEdge[];
  readonly rfc_entries: readonly RfcRegistryEntry[];
  readonly conf_entries: readonly ConfRegistryEntry[];
  readonly spec_entries: readonly SpecRegistryEntry[];
};

type RawSpecificationRegistry = {
  readonly registry_version: "2.2.0";
  readonly registry_id: string;
  readonly scope: string;
  readonly artifact_entries: readonly ArtifactRegistryEntry[];
  readonly artifact_edges: readonly ArtifactGraphEdge[];
};

type ConformanceSurfaceSummary = {
  readonly declared_count: number;
  readonly existing_count: number;
  readonly missing_paths: readonly string[];
  readonly status: "PASS" | "WARN" | "FAIL";
};

type ConformanceClauseResult = {
  readonly clause_id: string;
  readonly statement: string;
  readonly status: "PASS" | "WARN" | "FAIL";
  readonly evaluation_mode: "structural_projection";
  readonly reason: string;
  readonly evidence_refs: readonly string[];
};

type ConformanceClauseSummary = {
  readonly clause_count: number;
  readonly pass_count: number;
  readonly warn_count: number;
  readonly fail_count: number;
};

type RfcSpecificationConformanceEntry = {
  readonly rfc_id: string;
  readonly title: string;
  readonly maturity_status: SpecificationMaturityStatus;
  readonly conformance_status: "PASS" | "WARN" | "FAIL";
  readonly coverage_percent: number;
  readonly source_ref: string;
  readonly conformance_ref: string;
  readonly linked_conf_ids: readonly string[];
  readonly constitutional_dependencies: readonly string[];
  readonly downstream_dependencies: readonly string[];
  readonly required_sections: ConformanceSurfaceSummary;
  readonly conformance_surfaces: ConformanceSurfaceSummary;
  readonly implemented_surfaces: ConformanceSurfaceSummary;
  readonly verification_surfaces: ConformanceSurfaceSummary;
  readonly findings: readonly string[];
};

type ConfSpecificationConformanceEntry = {
  readonly conf_id: string;
  readonly title: string;
  readonly maturity_status: SpecificationMaturityStatus;
  readonly conformance_status: "PASS" | "WARN" | "FAIL";
  readonly coverage_percent: number;
  readonly source_ref: string;
  readonly proves: readonly string[];
  readonly required_sections: ConformanceSurfaceSummary;
  readonly proven_specifications: ConformanceSurfaceSummary;
  readonly test_surfaces: ConformanceSurfaceSummary;
  readonly evidence_surfaces: ConformanceSurfaceSummary;
  readonly clause_summary: ConformanceClauseSummary;
  readonly clauses: readonly ConformanceClauseResult[];
  readonly findings: readonly string[];
};

export type SpecificationConformanceReport = {
  readonly report_id: "specification-conformance-report";
  readonly generated_at: string;
  readonly registry_ref: string;
  readonly summary: {
    readonly rfc_count: number;
    readonly conf_count: number;
    readonly clause_count: number;
    readonly clause_pass_count: number;
    readonly clause_warn_count: number;
    readonly clause_fail_count: number;
    readonly pass_count: number;
    readonly warn_count: number;
    readonly fail_count: number;
    readonly average_coverage_percent: number;
  };
  readonly rfc_entries: readonly RfcSpecificationConformanceEntry[];
  readonly conf_entries: readonly ConfSpecificationConformanceEntry[];
};

export type SpecificationArtifactGraphEntry = {
  readonly artifact_id: string;
  readonly artifact_type: ArtifactRegistryEntry["artifact_type"];
  readonly title: string;
  readonly status: SpecificationMaturityStatus | null;
  readonly owner: string | null;
  readonly source_ref: string;
  readonly depends_on: readonly string[];
  readonly implements: readonly string[];
  readonly implemented_by: readonly string[];
  readonly verified_by: readonly string[];
  readonly evidence: readonly string[];
  readonly supersedes: readonly string[];
};

export type SpecificationArtifactGraph = {
  readonly graph_id: "enterprise-specification-artifact-graph";
  readonly generated_at: string;
  readonly registry_ref: string;
  readonly summary: {
    readonly artifact_count: number;
    readonly edge_count: number;
  };
  readonly artifacts: readonly SpecificationArtifactGraphEntry[];
};

const REQUIRED_RFC_SECTIONS = [
  "## Status",
  "## Type",
  "## Owner",
  "## Purpose",
  "## Specification Metadata",
  "## Constitutional Traceability",
  "## Scope",
  "## Normative Requirements",
  "## Conformance Requirements",
  "## Contracts",
  "## Validation",
  "## Acceptance Criteria",
  "## Implementation Evidence",
  "## Verification Evidence",
  "## Reference Tests",
  "## Migration Notes",
  "## Traceability",
] as const;

const REQUIRED_CONF_SECTIONS = [
  "## Status",
  "## Type",
  "## Owner",
  "## Purpose",
  "## Specification Traceability",
  "## Scope",
  "## Conformance Clauses",
  "## Evidence Surfaces",
  "## Verification Procedure",
  "## Exit Criteria",
  "## Reference Tests",
  "## Implementation Notes",
] as const;

export function loadSpecificationRegistry(): SpecificationRegistry {
  return normalizeSpecificationRegistry(
    readYamlArtifact<RawSpecificationRegistry>(SPECIFICATION_REGISTRY_PATH),
  );
}

export function materializeSpecificationConformanceReport(): SpecificationConformanceReport {
  const registry = loadSpecificationRegistry();
  const confEntries = registry.conf_entries.map((entry) =>
    buildConfConformanceEntry(entry, registry.rfc_entries),
  );
  const confEntriesByRfc = buildConfEntriesByRfc(confEntries, registry.conf_entries);
  const rfcEntries = registry.rfc_entries.map((entry) =>
    buildRfcConformanceEntry(entry, confEntriesByRfc.get(entry.rfc_id) ?? []),
  );
  const allEntries = [...rfcEntries, ...confEntries];

  const passCount = allEntries.filter(
    (entry) => entry.conformance_status === "PASS",
  ).length;
  const warnCount = allEntries.filter(
    (entry) => entry.conformance_status === "WARN",
  ).length;
  const failCount = allEntries.filter(
    (entry) => entry.conformance_status === "FAIL",
  ).length;
  const allClauses = confEntries.flatMap((entry) => entry.clauses);
  const clausePassCount = allClauses.filter((clause) => clause.status === "PASS").length;
  const clauseWarnCount = allClauses.filter((clause) => clause.status === "WARN").length;
  const clauseFailCount = allClauses.filter((clause) => clause.status === "FAIL").length;
  const averageCoveragePercent =
    allEntries.length === 0
      ? 0
      : Math.round(
          allEntries.reduce((sum, entry) => sum + entry.coverage_percent, 0) /
            allEntries.length,
        );

  return {
    report_id: "specification-conformance-report",
    generated_at: captureExecutionTimestampUtc(),
    registry_ref: "enterprise/specifications/specification-registry.yaml",
    summary: {
      rfc_count: rfcEntries.length,
      conf_count: confEntries.length,
      clause_count: allClauses.length,
      clause_pass_count: clausePassCount,
      clause_warn_count: clauseWarnCount,
      clause_fail_count: clauseFailCount,
      pass_count: passCount,
      warn_count: warnCount,
      fail_count: failCount,
      average_coverage_percent: averageCoveragePercent,
    },
    rfc_entries: rfcEntries,
    conf_entries: confEntries,
  };
}

export function persistSpecificationConformanceReport(input: {
  readonly path?: string;
  readonly report?: SpecificationConformanceReport;
} = {}): SpecificationConformanceReport {
  const report = input.report ?? materializeSpecificationConformanceReport();
  writeJsonArtifact(
    input.path ?? SPECIFICATION_CONFORMANCE_REPORT_PATH,
    report,
  );
  return report;
}

export function materializeSpecificationArtifactGraph(): SpecificationArtifactGraph {
  const registry = loadSpecificationRegistry();
  const entriesById = new Map(
    registry.artifact_entries.map((entry) => [entry.artifact_id, entry] as const),
  );
  const outgoingEdgesByArtifact = groupEdgesBy(registry.artifact_edges, "from");
  const incomingEdgesByArtifact = groupEdgesBy(registry.artifact_edges, "to");

  const artifacts = registry.artifact_entries.map((artifact) =>
    buildSpecificationArtifactGraphEntry({
      artifact,
      entriesById,
      outgoingEdgesByArtifact,
      incomingEdgesByArtifact,
    }),
  );

  return {
    graph_id: "enterprise-specification-artifact-graph",
    generated_at: captureExecutionTimestampUtc(),
    registry_ref: "enterprise/specifications/specification-registry.yaml",
    summary: {
      artifact_count: registry.artifact_entries.length,
      edge_count: registry.artifact_edges.length,
    },
    artifacts,
  };
}

export function persistSpecificationArtifactGraph(input: {
  readonly path?: string;
  readonly graph?: SpecificationArtifactGraph;
} = {}): SpecificationArtifactGraph {
  const graph = input.graph ?? materializeSpecificationArtifactGraph();
  writeJsonArtifact(input.path ?? SPECIFICATION_ARTIFACT_GRAPH_PATH, graph);
  return graph;
}

function normalizeSpecificationRegistry(
  raw: RawSpecificationRegistry,
): SpecificationRegistry {
  const artifactEntries = raw.artifact_entries;
  const artifactEdges = raw.artifact_edges;
  const entriesById = new Map(
    artifactEntries.map((entry) => [entry.artifact_id, entry] as const),
  );
  const outgoingEdgesByArtifact = groupEdgesBy(artifactEdges, "from");
  const incomingEdgesByArtifact = groupEdgesBy(artifactEdges, "to");

  const rfcEntries = artifactEntries
    .filter((entry) => entry.artifact_type === "RFC")
    .map((entry) =>
      buildRfcRegistryEntry({
        artifact: entry,
        entriesById,
        outgoingEdgesByArtifact,
        incomingEdgesByArtifact,
      }),
    );
  const confEntries = artifactEntries
    .filter((entry) => entry.artifact_type === "CONF")
    .map((entry) =>
      buildConfRegistryEntry({
        artifact: entry,
        entriesById,
        outgoingEdgesByArtifact,
        incomingEdgesByArtifact,
      }),
    );
  const specEntries = artifactEntries
    .filter((entry) => entry.artifact_type === "SPEC")
    .map((entry) =>
      buildSpecRegistryEntry({
        artifact: entry,
        entriesById,
        outgoingEdgesByArtifact,
        incomingEdgesByArtifact,
      }),
    );

  return {
    registry_version: raw.registry_version,
    registry_id: raw.registry_id,
    scope: raw.scope,
    artifact_entries: artifactEntries,
    artifact_edges: artifactEdges,
    rfc_entries: rfcEntries,
    conf_entries: confEntries,
    spec_entries: specEntries,
  };
}

function buildRfcRegistryEntry(input: {
  readonly artifact: ArtifactRegistryEntry;
  readonly entriesById: ReadonlyMap<string, ArtifactRegistryEntry>;
  readonly outgoingEdgesByArtifact: ReadonlyMap<string, readonly ArtifactGraphEdge[]>;
  readonly incomingEdgesByArtifact: ReadonlyMap<string, readonly ArtifactGraphEdge[]>;
}): RfcRegistryEntry {
  const { artifact, entriesById, outgoingEdgesByArtifact, incomingEdgesByArtifact } = input;
  const outgoingEdges = outgoingEdgesByArtifact.get(artifact.artifact_id) ?? [];
  const incomingEdges = incomingEdgesByArtifact.get(artifact.artifact_id) ?? [];

  const dependsOn = uniqueStrings(
    outgoingEdges
      .filter(
        (edge) =>
          edge.edge_kind === "depends_on" &&
          matchesArtifactType(entriesById, edge.to, ["ADR", "RFC"]),
      )
      .map((edge) => edge.to),
  );
  const requiredBy = uniqueStrings(
    incomingEdges
      .filter(
        (edge) =>
          edge.edge_kind === "depends_on" &&
          matchesArtifactType(entriesById, edge.from, ["RFC"]),
      )
      .map((edge) => edge.from),
  );
  const implementedBy = uniqueStrings(
    [
      ...incomingEdges
        .filter(
          (edge) =>
            edge.edge_kind === "implements" &&
            matchesArtifactType(entriesById, edge.from, ["CONTRACT_SURFACE"]),
        )
        .map((edge) => requireArtifact(entriesById, edge.from).source_ref),
      ...incomingEdges
        .filter(
          (edge) =>
            edge.edge_kind === "depends_on" &&
            matchesArtifactType(entriesById, edge.from, ["SPEC"]),
        )
        .flatMap((edge) =>
          (incomingEdgesByArtifact.get(edge.from) ?? [])
            .filter(
              (specEdge) =>
                specEdge.edge_kind === "implements" &&
                matchesArtifactType(entriesById, specEdge.from, [
                  "CONTRACT_SURFACE",
                ]),
            )
            .map((specEdge) => requireArtifact(entriesById, specEdge.from).source_ref),
        ),
    ],
  );

  const conformanceArtifacts = uniqueStrings(
    incomingEdges
      .filter(
        (edge) =>
          edge.edge_kind === "depends_on" &&
          matchesArtifactType(entriesById, edge.from, ["CONF"]),
      )
      .map((edge) => edge.from),
  );
  const conformanceRef = resolveSingleConformanceRef(
    artifact.artifact_id,
    conformanceArtifacts,
    entriesById,
  );
  const verifiedBy = uniqueStrings(
    conformanceArtifacts.flatMap((confId) =>
      (incomingEdgesByArtifact.get(confId) ?? [])
        .filter(
          (edge) =>
            edge.edge_kind === "implements" &&
            matchesArtifactType(entriesById, edge.from, ["TEST_SURFACE"]),
        )
        .map((edge) => requireArtifact(entriesById, edge.from).source_ref),
    ),
  );

  return {
    rfc_id: artifact.artifact_id,
    title: artifact.title,
    status: requireArtifactStatus(artifact),
    owner: requireArtifactOwner(artifact),
    source_ref: artifact.source_ref,
    conformance_ref: conformanceRef,
    depends_on: dependsOn,
    required_by: requiredBy,
    implemented_by: implementedBy,
    verified_by: verifiedBy,
  };
}

function buildConfRegistryEntry(input: {
  readonly artifact: ArtifactRegistryEntry;
  readonly entriesById: ReadonlyMap<string, ArtifactRegistryEntry>;
  readonly outgoingEdgesByArtifact: ReadonlyMap<string, readonly ArtifactGraphEdge[]>;
  readonly incomingEdgesByArtifact: ReadonlyMap<string, readonly ArtifactGraphEdge[]>;
}): ConfRegistryEntry {
  const { artifact, entriesById, outgoingEdgesByArtifact, incomingEdgesByArtifact } = input;
  const outgoingEdges = outgoingEdgesByArtifact.get(artifact.artifact_id) ?? [];
  const incomingEdges = incomingEdgesByArtifact.get(artifact.artifact_id) ?? [];

  const proves = uniqueStrings(
    outgoingEdges
      .filter(
        (edge) =>
          edge.edge_kind === "depends_on" &&
          matchesArtifactType(entriesById, edge.to, ["RFC"]),
      )
      .map((edge) => edge.to),
  );
  const tests = uniqueStrings(
    incomingEdges
      .filter(
        (edge) =>
          edge.edge_kind === "implements" &&
          matchesArtifactType(entriesById, edge.from, ["TEST_SURFACE"]),
      )
      .map((edge) => requireArtifact(entriesById, edge.from).source_ref),
  );
  const projectionArtifacts = uniqueStrings(
    incomingEdges
      .filter(
        (edge) =>
          edge.edge_kind === "references" &&
          matchesArtifactType(entriesById, edge.from, ["PROJ"]),
      )
      .map((edge) => edge.from),
  );
  const evidence = uniqueStrings(
    [
      ...incomingEdges
        .filter(
          (edge) =>
            edge.edge_kind === "references" &&
            matchesArtifactType(entriesById, edge.from, ["EVIDENCE_ARTIFACT"]),
        )
        .map((edge) => requireArtifact(entriesById, edge.from).source_ref),
      ...projectionArtifacts.map(
        (projectionId) => requireArtifact(entriesById, projectionId).source_ref,
      ),
      ...projectionArtifacts.flatMap((projectionId) =>
        (incomingEdgesByArtifact.get(projectionId) ?? [])
          .filter(
            (edge) =>
              edge.edge_kind === "references" &&
              matchesArtifactType(entriesById, edge.from, ["EVIDENCE_ARTIFACT"]),
          )
          .map((edge) => requireArtifact(entriesById, edge.from).source_ref),
      ),
    ],
  );

  return {
    conf_id: artifact.artifact_id,
    title: artifact.title,
    status: requireArtifactStatus(artifact),
    owner: requireArtifactOwner(artifact),
    source_ref: artifact.source_ref,
    proves,
    tests,
    evidence,
  };
}

function buildSpecRegistryEntry(input: {
  readonly artifact: ArtifactRegistryEntry;
  readonly entriesById: ReadonlyMap<string, ArtifactRegistryEntry>;
  readonly outgoingEdgesByArtifact: ReadonlyMap<string, readonly ArtifactGraphEdge[]>;
  readonly incomingEdgesByArtifact: ReadonlyMap<string, readonly ArtifactGraphEdge[]>;
}): SpecRegistryEntry {
  const { artifact, entriesById, outgoingEdgesByArtifact, incomingEdgesByArtifact } = input;
  const outgoingEdges = outgoingEdgesByArtifact.get(artifact.artifact_id) ?? [];
  const incomingEdges = incomingEdgesByArtifact.get(artifact.artifact_id) ?? [];

  return {
    spec_id: artifact.artifact_id,
    title: artifact.title,
    status: requireArtifactStatus(artifact),
    owner: requireArtifactOwner(artifact),
    source_ref: artifact.source_ref,
    governed_by: uniqueStrings(
      outgoingEdges
        .filter(
          (edge) =>
            edge.edge_kind === "depends_on" &&
            matchesArtifactType(entriesById, edge.to, ["RFC"]),
        )
        .map((edge) => edge.to),
    ),
    implemented_by: uniqueStrings(
      incomingEdges
        .filter(
          (edge) =>
            edge.edge_kind === "implements" &&
            matchesArtifactType(entriesById, edge.from, ["CONTRACT_SURFACE"]),
        )
        .map((edge) => requireArtifact(entriesById, edge.from).source_ref),
    ),
    verified_by: uniqueStrings(
      incomingEdges
        .filter(
          (edge) =>
            edge.edge_kind === "depends_on" &&
            matchesArtifactType(entriesById, edge.from, ["CONF"]),
        )
        .map((edge) => edge.from),
    ),
  };
}

function buildSpecificationArtifactGraphEntry(input: {
  readonly artifact: ArtifactRegistryEntry;
  readonly entriesById: ReadonlyMap<string, ArtifactRegistryEntry>;
  readonly outgoingEdgesByArtifact: ReadonlyMap<string, readonly ArtifactGraphEdge[]>;
  readonly incomingEdgesByArtifact: ReadonlyMap<string, readonly ArtifactGraphEdge[]>;
}): SpecificationArtifactGraphEntry {
  const { artifact, entriesById, outgoingEdgesByArtifact, incomingEdgesByArtifact } = input;
  const outgoingEdges = outgoingEdgesByArtifact.get(artifact.artifact_id) ?? [];
  const incomingEdges = incomingEdgesByArtifact.get(artifact.artifact_id) ?? [];

  const directEvidence = uniqueStrings(
    incomingEdges
      .filter(
        (edge) =>
          edge.edge_kind === "references" &&
          matchesArtifactType(entriesById, edge.from, ["EVIDENCE_ARTIFACT"]),
      )
      .map((edge) => requireArtifact(entriesById, edge.from).source_ref),
  );

  const directProjectionRefs = uniqueStrings(
    incomingEdges
      .filter(
        (edge) =>
          edge.edge_kind === "references" &&
          matchesArtifactType(entriesById, edge.from, ["PROJ"]),
      )
      .map((edge) => edge.from),
  );

  const verifyingArtifacts = uniqueStrings(
    incomingEdges
      .filter(
        (edge) =>
          edge.edge_kind === "depends_on" &&
          matchesArtifactType(entriesById, edge.from, ["CONF"]),
      )
      .map((edge) => edge.from),
  );

  const transitiveProjectionRefs = uniqueStrings(
    verifyingArtifacts.flatMap((confId) =>
      (incomingEdgesByArtifact.get(confId) ?? [])
        .filter(
          (edge) =>
            edge.edge_kind === "references" &&
            matchesArtifactType(entriesById, edge.from, ["PROJ"]),
        )
        .map((edge) => edge.from),
    ),
  );

  const allProjectionRefs = uniqueStrings([
    ...directProjectionRefs,
    ...transitiveProjectionRefs,
  ]);

  const transitiveEvidence = uniqueStrings(
    [
      ...verifyingArtifacts.flatMap((confId) =>
        (incomingEdgesByArtifact.get(confId) ?? [])
          .filter(
            (edge) =>
              edge.edge_kind === "references" &&
              matchesArtifactType(entriesById, edge.from, ["EVIDENCE_ARTIFACT"]),
          )
          .map((edge) => requireArtifact(entriesById, edge.from).source_ref),
      ),
      ...allProjectionRefs.map(
        (projectionId) => requireArtifact(entriesById, projectionId).source_ref,
      ),
      ...allProjectionRefs.flatMap((projectionId) =>
        (incomingEdgesByArtifact.get(projectionId) ?? [])
          .filter(
            (edge) =>
              edge.edge_kind === "references" &&
              matchesArtifactType(entriesById, edge.from, ["EVIDENCE_ARTIFACT"]),
          )
          .map((edge) => requireArtifact(entriesById, edge.from).source_ref),
      ),
    ],
  );

  return {
    artifact_id: artifact.artifact_id,
    artifact_type: artifact.artifact_type,
    title: artifact.title,
    status: artifact.status ?? null,
    owner: artifact.owner ?? null,
    source_ref: artifact.source_ref,
    depends_on: uniqueStrings(
      outgoingEdges
        .filter((edge) => edge.edge_kind === "depends_on")
        .map((edge) => edge.to),
    ),
    implements: uniqueStrings(
      outgoingEdges
        .filter((edge) => edge.edge_kind === "implements")
        .map((edge) => edge.to),
    ),
    implemented_by: uniqueStrings(
      incomingEdges
        .filter((edge) => edge.edge_kind === "implements")
        .map((edge) => edge.from),
    ),
    verified_by: verifyingArtifacts,
    evidence: uniqueStrings([...directEvidence, ...transitiveEvidence]),
    supersedes: uniqueStrings(
      outgoingEdges
        .filter((edge) => edge.edge_kind === "supersedes")
        .map((edge) => edge.to),
    ),
  };
}

function groupEdgesBy(
  edges: readonly ArtifactGraphEdge[],
  direction: "from" | "to",
): ReadonlyMap<string, readonly ArtifactGraphEdge[]> {
  const groupedEdges = new Map<string, ArtifactGraphEdge[]>();
  for (const edge of edges) {
    const artifactId = direction === "from" ? edge.from : edge.to;
    const currentEdges = groupedEdges.get(artifactId) ?? [];
    currentEdges.push(edge);
    groupedEdges.set(artifactId, currentEdges);
  }
  return groupedEdges;
}

function matchesArtifactType(
  entriesById: ReadonlyMap<string, ArtifactRegistryEntry>,
  artifactId: string,
  artifactTypes: readonly ArtifactRegistryEntry["artifact_type"][],
): boolean {
  const artifact = entriesById.get(artifactId);
  return artifact ? artifactTypes.includes(artifact.artifact_type) : false;
}

function requireArtifact(
  entriesById: ReadonlyMap<string, ArtifactRegistryEntry>,
  artifactId: string,
): ArtifactRegistryEntry {
  const artifact = entriesById.get(artifactId);
  if (!artifact) {
    throw new Error(
      `Specification registry references unknown artifact: ${artifactId}`,
    );
  }
  return artifact;
}

function requireArtifactStatus(
  artifact: ArtifactRegistryEntry,
): SpecificationMaturityStatus {
  if (!artifact.status) {
    throw new Error(
      `Specification registry artifact is missing status: ${artifact.artifact_id}`,
    );
  }
  return assertKnownSpecificationMaturityStatus(
    artifact.status,
    SPECIFICATION_MATURITY_MODEL,
  );
}

function requireArtifactOwner(artifact: ArtifactRegistryEntry): string {
  if (!artifact.owner) {
    throw new Error(
      `Specification registry artifact is missing owner: ${artifact.artifact_id}`,
    );
  }
  return artifact.owner;
}

function resolveSingleConformanceRef(
  rfcId: string,
  conformanceArtifacts: readonly string[],
  entriesById: ReadonlyMap<string, ArtifactRegistryEntry>,
): string {
  if (conformanceArtifacts.length !== 1) {
    throw new Error(
      `RFC ${rfcId} MUST map to exactly one CONF artifact, found ${conformanceArtifacts.length}.`,
    );
  }
  return requireArtifact(entriesById, conformanceArtifacts[0] ?? "").source_ref;
}

function buildRfcConformanceEntry(
  entry: RfcRegistryEntry,
  linkedConfEntries: readonly ConfSpecificationConformanceEntry[],
): RfcSpecificationConformanceEntry {
  const sourcePath = resolve(EOS_ROOT, entry.source_ref);
  const sourceText = readFileSync(sourcePath, "utf8");

  const requiredSections = summarizeSectionCoverage(sourceText);
  const conformanceSurfaces = summarizePathCoverage([entry.conformance_ref]);
  const implementedSurfaces = summarizePathCoverage(entry.implemented_by);
  const verificationSurfaces = summarizePathCoverage(entry.verified_by);

  const findings: string[] = [];
  if (requiredSections.status !== "PASS") {
    findings.push("Required RFC sections are incomplete.");
  }
  if (conformanceSurfaces.status !== "PASS") {
    findings.push("Linked conformance specification is missing.");
  }
  if (implementedSurfaces.status !== "PASS") {
    findings.push("Declared implementation surfaces are missing.");
  }
  if (verificationSurfaces.status !== "PASS") {
    findings.push("Declared verification surfaces are missing.");
  }
  if (!meetsConformanceBaseline(entry.status)) {
    findings.push(
      `RFC maturity status ${entry.status} is below the governed conformance baseline minimum.`,
    );
  }
  if (
    linkedConfEntries.length === 0 ||
    !linkedConfEntries.some((linkedEntry) => linkedEntry.conformance_status !== "FAIL")
  ) {
    findings.push(
      "RFC does not yet have a passing or warning conformance projection linked to it.",
    );
  }

  const coverageUnits = [
    requiredSections.declared_count === 0
      ? 0
      : requiredSections.existing_count / requiredSections.declared_count,
    conformanceSurfaces.declared_count === 0
      ? 1
      : conformanceSurfaces.existing_count / conformanceSurfaces.declared_count,
    implementedSurfaces.declared_count === 0
      ? 1
      : implementedSurfaces.existing_count / implementedSurfaces.declared_count,
    verificationSurfaces.declared_count === 0
      ? 1
      : verificationSurfaces.existing_count / verificationSurfaces.declared_count,
  ];
  const coveragePercent = Math.round(
    (coverageUnits.reduce((sum, value) => sum + value, 0) / coverageUnits.length) *
      100,
  );

  const conformanceStatus = classifyConformanceStatus({
    maturityStatus: entry.status,
    requiredSections,
    conformanceSurfaces,
    implementedSurfaces,
    verificationSurfaces,
    linkedStatuses:
      linkedConfEntries.length === 0
        ? ["FAIL"]
        : linkedConfEntries.map((linkedEntry) => linkedEntry.conformance_status),
  });

  return {
    rfc_id: entry.rfc_id,
    title: entry.title,
    maturity_status: entry.status,
    conformance_status: conformanceStatus,
    coverage_percent: coveragePercent,
    source_ref: entry.source_ref,
    conformance_ref: entry.conformance_ref,
    linked_conf_ids: linkedConfEntries.map((linkedEntry) => linkedEntry.conf_id),
    constitutional_dependencies: entry.depends_on.filter((dep) =>
      dep.startsWith("ADR-"),
    ),
    downstream_dependencies: entry.required_by,
    required_sections: requiredSections,
    conformance_surfaces: conformanceSurfaces,
    implemented_surfaces: implementedSurfaces,
    verification_surfaces: verificationSurfaces,
    findings,
  };
}

function buildConfConformanceEntry(
  entry: ConfRegistryEntry,
  rfcEntries: readonly RfcRegistryEntry[],
): ConfSpecificationConformanceEntry {
  const sourcePath = resolve(EOS_ROOT, entry.source_ref);
  const sourceText = readFileSync(sourcePath, "utf8");
  const rfcIds = new Set(rfcEntries.map((rfcEntry) => rfcEntry.rfc_id));

  const requiredSections = summarizeSectionCoverage(
    sourceText,
    REQUIRED_CONF_SECTIONS,
  );
  const provenSpecifications = summarizeDeclaredCoverage(
    entry.proves,
    (rfcId) => rfcIds.has(rfcId),
  );
  const testSurfaces = summarizePathCoverage(entry.tests);
  const evidenceSurfaces = summarizePathCoverage(entry.evidence, {
    virtualExistingPaths: [
      "workspace/foundation/evidence/verification/specification-conformance-report.json",
      "workspace/foundation/evidence/verification/specification-conformance-projection.json",
      "workspace/foundation/evidence/verification/specification-conformance-evidence.json",
      "workspace/foundation/evidence/verification/specification-vocabulary-audit.json",
    ],
  });
  const clauseStatus = classifyConformanceStatus({
    maturityStatus: entry.status,
    requiredSections,
    conformanceSurfaces: provenSpecifications,
    implementedSurfaces: testSurfaces,
    verificationSurfaces: evidenceSurfaces,
  });
  const clauses = materializeConformanceClauses({
    confId: entry.conf_id,
    markdown: sourceText,
    clauseStatus,
    tests: entry.tests,
    evidence: entry.evidence,
  });
  const clauseSummary = summarizeClauseResults(clauses);

  const findings: string[] = [];
  if (requiredSections.status !== "PASS") {
    findings.push("Required CONF sections are incomplete.");
  }
  if (provenSpecifications.status !== "PASS") {
    findings.push("CONF traceability points to unknown RFC specifications.");
  }
  if (testSurfaces.status !== "PASS") {
    findings.push("Declared conformance test surfaces are missing.");
  }
  if (evidenceSurfaces.status !== "PASS") {
    findings.push("Declared evidence surfaces are not fully materialized.");
  }
  if (!meetsConformanceBaseline(entry.status)) {
    findings.push(
      `CONF maturity status ${entry.status} is below the governed conformance baseline minimum.`,
    );
  }
  if (clauses.length === 0) {
    findings.push("CONF does not materialize any conformance clauses.");
  }

  const coverageUnits = [
    requiredSections.declared_count === 0
      ? 0
      : requiredSections.existing_count / requiredSections.declared_count,
    provenSpecifications.declared_count === 0
      ? 0
      : provenSpecifications.existing_count / provenSpecifications.declared_count,
    testSurfaces.declared_count === 0
      ? 1
      : testSurfaces.existing_count / testSurfaces.declared_count,
    evidenceSurfaces.declared_count === 0
      ? 1
      : evidenceSurfaces.existing_count / evidenceSurfaces.declared_count,
  ];
  const coveragePercent = Math.round(
    (coverageUnits.reduce((sum, value) => sum + value, 0) / coverageUnits.length) *
      100,
  );

  return {
    conf_id: entry.conf_id,
    title: entry.title,
    maturity_status: entry.status,
    conformance_status:
      clauses.length === 0
        ? "FAIL"
        : clauseSummary.fail_count > 0
          ? "FAIL"
          : clauseSummary.warn_count > 0
            ? "WARN"
            : clauseStatus,
    coverage_percent: coveragePercent,
    source_ref: entry.source_ref,
    proves: entry.proves,
    required_sections: requiredSections,
    proven_specifications: provenSpecifications,
    test_surfaces: testSurfaces,
    evidence_surfaces: evidenceSurfaces,
    clause_summary: clauseSummary,
    clauses,
    findings,
  };
}

function buildConfEntriesByRfc(
  confEntries: readonly ConfSpecificationConformanceEntry[],
  registryEntries: readonly ConfRegistryEntry[],
): Map<string, ConfSpecificationConformanceEntry[]> {
  const confEntryById = new Map(
    confEntries.map((entry) => [entry.conf_id, entry] as const),
  );
  const confEntriesByRfc = new Map<string, ConfSpecificationConformanceEntry[]>();

  for (const registryEntry of registryEntries) {
    const confEntry = confEntryById.get(registryEntry.conf_id);
    if (!confEntry) {
      continue;
    }
    for (const rfcId of registryEntry.proves) {
      const currentEntries = confEntriesByRfc.get(rfcId) ?? [];
      currentEntries.push(confEntry);
      confEntriesByRfc.set(rfcId, currentEntries);
    }
  }

  return confEntriesByRfc;
}

function summarizeSectionCoverage(
  markdown: string,
  requiredSections: readonly string[] = REQUIRED_RFC_SECTIONS,
): ConformanceSurfaceSummary {
  const missingSections = requiredSections.filter(
    (section) => !markdown.includes(section),
  );
  const existingCount = requiredSections.length - missingSections.length;
  return {
    declared_count: requiredSections.length,
    existing_count: existingCount,
    missing_paths: missingSections,
    status: missingSections.length === 0 ? "PASS" : "FAIL",
  };
}

function summarizeDeclaredCoverage(
  items: readonly string[],
  predicate: (item: string) => boolean,
): ConformanceSurfaceSummary {
  const missingItems = items.filter((item) => !predicate(item));
  const existingCount = items.length - missingItems.length;
  return {
    declared_count: items.length,
    existing_count: existingCount,
    missing_paths: missingItems,
    status:
      items.length === 0
        ? "WARN"
        : missingItems.length === 0
          ? "PASS"
          : existingCount === 0
            ? "FAIL"
            : "WARN",
  };
}

function summarizePathCoverage(
  paths: readonly string[],
  options: {
    readonly virtualExistingPaths?: readonly string[];
  } = {},
): ConformanceSurfaceSummary {
  const virtualExistingPaths = new Set(options.virtualExistingPaths ?? []);
  const missingPaths = paths.filter((path) => {
    if (virtualExistingPaths.has(path)) {
      return false;
    }
    return !existsSync(resolve(EOS_ROOT, path));
  });
  const existingCount = paths.length - missingPaths.length;
  return {
    declared_count: paths.length,
    existing_count: existingCount,
    missing_paths: missingPaths,
    status:
      paths.length === 0
        ? "WARN"
        : missingPaths.length === 0
          ? "PASS"
          : existingCount === 0
            ? "FAIL"
            : "WARN",
  };
}

function materializeConformanceClauses(input: {
  readonly confId: string;
  readonly markdown: string;
  readonly clauseStatus: "PASS" | "WARN" | "FAIL";
  readonly tests: readonly string[];
  readonly evidence: readonly string[];
}): readonly ConformanceClauseResult[] {
  return extractNumberedClauses(input.markdown, "## Conformance Clauses").map(
    (clause) => ({
      clause_id: `${input.confId}-${clause.ordinal}`,
      statement: clause.statement,
      status: input.clauseStatus,
      evaluation_mode: "structural_projection",
      reason:
        "Clause result is derived from current CONF surface coverage, linked test surfaces, materialized evidence surfaces, and governed maturity floors. Clause-specific predicate evaluators are not materialized yet.",
      evidence_refs: uniqueStrings([...input.tests, ...input.evidence]),
    }),
  );
}

function summarizeClauseResults(
  clauses: readonly ConformanceClauseResult[],
): ConformanceClauseSummary {
  return {
    clause_count: clauses.length,
    pass_count: clauses.filter((clause) => clause.status === "PASS").length,
    warn_count: clauses.filter((clause) => clause.status === "WARN").length,
    fail_count: clauses.filter((clause) => clause.status === "FAIL").length,
  };
}

function extractNumberedClauses(
  markdown: string,
  heading: string,
): readonly {
  readonly ordinal: number;
  readonly statement: string;
}[] {
  const sectionText = extractMarkdownSection(markdown, heading);
  if (!sectionText) {
    return [];
  }

  const clauses: Array<{ ordinal: number; statement: string }> = [];
  let currentClause: { ordinal: number; lines: string[] } | null = null;

  for (const rawLine of sectionText.split(/\r?\n/)) {
    const numberedClause = rawLine.match(/^\s*(\d+)\.\s+(.*)$/);
    if (numberedClause) {
      if (currentClause) {
        clauses.push({
          ordinal: currentClause.ordinal,
          statement: currentClause.lines.join(" ").replace(/\s+/g, " ").trim(),
        });
      }
      currentClause = {
        ordinal: Number(numberedClause[1]),
        lines: [numberedClause[2] ?? ""],
      };
      continue;
    }

    if (!currentClause) {
      continue;
    }

    const trimmedLine = rawLine.trim();
    if (trimmedLine.length === 0) {
      continue;
    }
    currentClause.lines.push(trimmedLine);
  }

  if (currentClause) {
    clauses.push({
      ordinal: currentClause.ordinal,
      statement: currentClause.lines.join(" ").replace(/\s+/g, " ").trim(),
    });
  }

  return clauses;
}

function extractMarkdownSection(markdown: string, heading: string): string | null {
  const lines = markdown.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim() === heading);
  if (startIndex === -1) {
    return null;
  }

  const sectionLines: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (/^##\s+/.test(line)) {
      break;
    }
    sectionLines.push(line);
  }
  return sectionLines.join("\n");
}

function classifyConformanceStatus(input: {
  readonly maturityStatus: SpecificationMaturityStatus;
  readonly requiredSections: ConformanceSurfaceSummary;
  readonly conformanceSurfaces: ConformanceSurfaceSummary;
  readonly implementedSurfaces: ConformanceSurfaceSummary;
  readonly verificationSurfaces: ConformanceSurfaceSummary;
  readonly linkedStatuses?: readonly ("PASS" | "WARN" | "FAIL")[];
}): "PASS" | "WARN" | "FAIL" {
  if (
    input.requiredSections.status === "FAIL" ||
    input.conformanceSurfaces.status === "FAIL" ||
    input.implementedSurfaces.status === "FAIL" ||
    input.verificationSurfaces.status === "FAIL" ||
    input.linkedStatuses?.includes("FAIL")
  ) {
    return "FAIL";
  }
  if (
    !meetsConformanceBaseline(input.maturityStatus)
  ) {
    return "WARN";
  }
  if (
    input.conformanceSurfaces.status === "WARN" ||
    input.implementedSurfaces.status === "WARN" ||
    input.verificationSurfaces.status === "WARN" ||
    input.linkedStatuses?.includes("WARN")
  ) {
    return "WARN";
  }
  return "PASS";
}

function meetsConformanceBaseline(
  maturityStatus: SpecificationMaturityStatus,
): boolean {
  return meetsSpecificationMaturityFloor(
    maturityStatus,
    SPECIFICATION_MATURITY_MODEL.policy_floors.conformance_baseline_minimum,
    SPECIFICATION_MATURITY_MODEL,
  );
}
