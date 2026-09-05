// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine";
import type { ConstitutionLawAttestation } from "./attestation-runtime.js";
import type {
  ConstitutionEvidencePackage,
  ConstitutionLawCertificate,
} from "./certificate-runtime.js";
import type {
  CapabilityGovernanceProjection,
} from "./capability-governance-runtime.js";
import type {
  CapabilityGraphProjection,
} from "./capability-graph-runtime.js";
import type {
  GovernanceReadModelArtifacts,
} from "./governance-read-model-runtime.js";
import type { GovernanceSession } from "./governance-session-runtime.js";
import type { ConstitutionLawResult } from "./law-result-runtime.js";
import type { VerificationRun } from "./verification-run-runtime.js";

type EnterpriseControlGraphNodeKind =
  | "capability"
  | "runtime_dependency"
  | "control_surface"
  | "verification_run"
  | "governance_session"
  | "law_result"
  | "evidence_package"
  | "certificate"
  | "attestation"
  | "read_model";

type EnterpriseControlGraphEdgeKind =
  | "DEPENDS_ON"
  | "CATALOGED_IN"
  | "PROJECTS_TO"
  | "VERIFIED_IN"
  | "BINDS_SESSION"
  | "ASSESSES"
  | "PACKAGED_IN"
  | "CERTIFIED_AS"
  | "ATTESTED_BY"
  | "MATERIALIZES";

type EnterpriseControlGraphNode = {
  readonly node_id: string;
  readonly node_kind: EnterpriseControlGraphNodeKind;
  readonly display_name: string;
  readonly digest: string | null;
  readonly status: string | null;
  readonly attributes: Record<string, unknown>;
};

type EnterpriseControlGraphEdge = {
  readonly edge_id: string;
  readonly edge_kind: EnterpriseControlGraphEdgeKind;
  readonly from_node_id: string;
  readonly to_node_id: string;
  readonly rationale: string;
};

export type EnterpriseControlGraph = {
  readonly graph_version: "1.0.0";
  readonly graph_id: string;
  readonly graph_digest: string;
  readonly summary: {
    readonly node_count: number;
    readonly edge_count: number;
    readonly capability_count: number;
    readonly evidence_node_count: number;
    readonly read_model_count: number;
    readonly dependency_edge_count: number;
    readonly disconnected_node_count: number;
    readonly traversal_ready_status: "PASS" | "FAIL";
  };
  readonly nodes: readonly EnterpriseControlGraphNode[];
  readonly edges: readonly EnterpriseControlGraphEdge[];
  readonly claim_boundary: string;
};

export type EnterpriseControlGraphVerificationReport = {
  readonly report_version: "1.0.0";
  readonly report_digest: string;
  readonly summary: {
    readonly node_projection_status: "PASS" | "FAIL";
    readonly dependency_binding_status: "PASS" | "FAIL";
    readonly evidence_chain_status: "PASS" | "FAIL";
    readonly session_projection_status: "PASS" | "FAIL";
    readonly disconnected_node_status: "PASS" | "FAIL";
    readonly overall_status: "PASS" | "FAIL";
  };
  readonly metrics: {
    readonly node_count: number;
    readonly edge_count: number;
    readonly disconnected_node_count: number;
    readonly capability_count: number;
    readonly evidence_node_count: number;
    readonly read_model_count: number;
    readonly dependency_edge_count: number;
  };
  readonly claim_boundary: string;
};

function createNode(input: Omit<EnterpriseControlGraphNode, "node_id"> & {
  readonly node_id?: string;
}): EnterpriseControlGraphNode {
  return {
    node_id:
      input.node_id ??
      `${input.node_kind}:${DigestEngine.digest({
        display_name: input.display_name,
        digest: input.digest,
      }).slice(0, 16)}`,
    node_kind: input.node_kind,
    display_name: input.display_name,
    digest: input.digest,
    status: input.status,
    attributes: input.attributes,
  };
}

function createEdge(input: Omit<EnterpriseControlGraphEdge, "edge_id">): EnterpriseControlGraphEdge {
  const payload = {
    edge_kind: input.edge_kind,
    from_node_id: input.from_node_id,
    to_node_id: input.to_node_id,
    rationale: input.rationale,
  };

  return {
    edge_id: `control-edge:${DigestEngine.digest(payload).slice(0, 16)}`,
    ...payload,
  };
}

function sortNodes(
  nodes: readonly EnterpriseControlGraphNode[],
): readonly EnterpriseControlGraphNode[] {
  return [...nodes].sort((left, right) => left.node_id.localeCompare(right.node_id));
}

function sortEdges(
  edges: readonly EnterpriseControlGraphEdge[],
): readonly EnterpriseControlGraphEdge[] {
  return [...edges].sort((left, right) => left.edge_id.localeCompare(right.edge_id));
}

function classifyControlSignalStatus(value: string | null): "PASS" | "WARN" | "FAIL" | "UNKNOWN" {
  const normalized = value?.trim().toUpperCase() ?? "";
  if (
    normalized === "FAIL" ||
    normalized === "ERROR" ||
    normalized === "BROKEN" ||
    normalized === "UNHEALTHY"
  ) {
    return "FAIL";
  }
  if (
    normalized === "WARN" ||
    normalized === "WARNING" ||
    normalized === "DEGRADED" ||
    normalized === "COMPATIBILITY_DRIFT"
  ) {
    return "WARN";
  }
  if (
    normalized === "PASS" ||
    normalized === "COMPLETED" ||
    normalized === "HEALTHY" ||
    normalized === "MATERIALIZED" ||
    normalized === "ISSUED" ||
    normalized === "VERIFIED" ||
    normalized === "APPLIED" ||
    normalized === "RATIFIABLE"
  ) {
    return "PASS";
  }
  return "UNKNOWN";
}

export function materializeEnterpriseControlGraph(input: {
  readonly capabilityGovernance: CapabilityGovernanceProjection;
  readonly capabilityGraph: CapabilityGraphProjection;
  readonly lawResults: readonly ConstitutionLawResult[];
  readonly evidencePackages: readonly ConstitutionEvidencePackage[];
  readonly lawCertificates: readonly ConstitutionLawCertificate[];
  readonly lawAttestations: readonly ConstitutionLawAttestation[];
  readonly governanceReadModels: GovernanceReadModelArtifacts;
  readonly governanceSession: GovernanceSession;
  readonly verificationRun: VerificationRun;
}): {
  readonly graph: EnterpriseControlGraph;
  readonly verification: EnterpriseControlGraphVerificationReport;
} {
  const capabilityGovernanceNode = createNode({
    node_id: `control-surface:capability-governance:${input.capabilityGovernance.index.projection_digest.slice(
      0,
      16,
    )}`,
    node_kind: "control_surface",
    display_name: "Capability Governance",
    digest: input.capabilityGovernance.index.projection_digest,
    status: input.capabilityGovernance.verification.summary.overall_status,
    attributes: {
      capability_count: input.capabilityGovernance.index.summary.capability_count,
      compatibility_status:
        input.capabilityGovernance.verification.summary.compatibility_governance_status,
    },
  });
  const capabilityGraphNode = createNode({
    node_id: `control-surface:capability-graph:${input.capabilityGraph.graph_digest.slice(
      0,
      16,
    )}`,
    node_kind: "control_surface",
    display_name: "Capability Graph",
    digest: input.capabilityGraph.graph_digest,
    status: input.capabilityGraph.summary.governance_health_status,
    attributes: {
      dependency_edge_count: input.capabilityGraph.summary.dependency_edge_count,
      warn_capability_count: input.capabilityGraph.summary.warn_capability_count,
      fail_capability_count: input.capabilityGraph.summary.fail_capability_count,
    },
  });
  const verificationRunNode = createNode({
    node_id: input.verificationRun.run_id,
    node_kind: "verification_run",
    display_name: "Verification Run",
    digest: input.verificationRun.run_digest,
    status: input.verificationRun.readiness.overall_status,
    attributes: {
      run_scope: input.verificationRun.run_scope,
      governance_session_id: input.verificationRun.governance_session.session_id,
    },
  });
  const governanceSessionNode = createNode({
    node_id: input.governanceSession.session_id,
    node_kind: "governance_session",
    display_name: "Governance Session",
    digest: input.governanceSession.session_digest,
    status: input.governanceSession.session_status,
    attributes: {
      execution_scope: input.governanceSession.execution_scope,
      session_projection_digest: input.governanceSession.session_projection_digest,
    },
  });
  const capabilityHealthById = new Map(
    input.capabilityGraph.capability_health.map((capability) => [
      capability.capability_id,
      capability,
    ]),
  );
  const capabilityNodes = input.capabilityGovernance.capabilities.map((capability) =>
    createNode({
      node_id: `capability:${capability.capability_id}`,
      node_kind: "capability",
      display_name: capability.capability_id,
      digest: DigestEngine.digest(capability.version),
      status: capability.manifest.governance_status,
      attributes: {
        version: capability.version.capability_version,
        stability: capability.version.stability,
        lifecycle_stage: capability.version.lifecycle_stage,
        dependency_health_status:
          capabilityHealthById.get(capability.capability_id)?.health_status ?? "UNVERIFIED",
        unresolved_dependency_count:
          capabilityHealthById.get(capability.capability_id)?.unknown_dependency_count ?? 0,
        unstable_dependency_count:
          capabilityHealthById.get(capability.capability_id)?.unstable_dependency_count ?? 0,
        circular_dependency_count:
          capabilityHealthById.get(capability.capability_id)?.circular_dependency_count ?? 0,
      },
    }),
  );
  const runtimeDependencyEntries: [string, EnterpriseControlGraphNode][] =
    input.capabilityGraph.capabilities
      .flatMap((capability) =>
        capability.depends_on
          .filter((dependency) => dependency.resolution_status !== "RESOLVED_CAPABILITY")
          .map(
            (dependency): [string, EnterpriseControlGraphNode] => [
              `runtime-dependency:${dependency.dependency_id}`,
              createNode({
                node_id: `runtime-dependency:${dependency.dependency_id}`,
                node_kind: "runtime_dependency",
                display_name: dependency.dependency_id,
                digest: null,
                status: dependency.dependency_health,
                attributes: {
                  dependency_class: dependency.dependency_class,
                  resolution_status: dependency.resolution_status,
                },
              }),
            ],
          ),
      )
      .sort(([left], [right]) => left.localeCompare(right));
  const runtimeDependencyNodes = sortNodes(
    Array.from(new Map<string, EnterpriseControlGraphNode>(runtimeDependencyEntries).values()),
  );
  const lawResultNodes = input.lawResults.map((result) =>
    createNode({
      node_id: result.result_id,
      node_kind: "law_result",
      display_name: result.law.law_id,
      digest: result.result_digest,
      status: result.evaluation.status,
      attributes: {
        predicate_id: result.predicate.predicate_id,
        proof_id: result.evaluation.proof_id,
      },
    }),
  );
  const evidencePackageNodes = input.evidencePackages.map((evidencePackage) =>
    createNode({
      node_id: evidencePackage.package_id,
      node_kind: "evidence_package",
      display_name: evidencePackage.package_id,
      digest: evidencePackage.package_digest,
      status: "MATERIALIZED",
      attributes: {
        package_scope: evidencePackage.package_scope,
        law_ids: evidencePackage.law_ids,
      },
    }),
  );
  const certificateNodes = input.lawCertificates.map((certificate) =>
    createNode({
      node_id: certificate.certificate_id,
      node_kind: "certificate",
      display_name: certificate.certificate_id,
      digest: certificate.certificate_digest,
      status: "ISSUED",
      attributes: {
        package_id: certificate.package_id,
      },
    }),
  );
  const attestationNodes = input.lawAttestations.map((attestation) =>
    createNode({
      node_id: attestation.event_id,
      node_kind: "attestation",
      display_name: attestation.event_type,
      digest: attestation.event_digest,
      status: attestation.attestation_status,
      attributes: {
        attestation_id: attestation.attestation_id,
        certificate_id: attestation.certificate_id,
        policy_id: attestation.policy_id,
      },
    }),
  );
  const readModelNodes = [
    createNode({
      node_id: input.governanceReadModels.summaryView.view_id,
      node_kind: "read_model",
      display_name: "GovernanceSummaryView",
      digest: input.governanceReadModels.summaryView.view_digest,
      status: input.governanceReadModels.summaryView.status,
      attributes: {
        view_kind: input.governanceReadModels.summaryView.view_kind,
      },
    }),
    createNode({
      node_id: input.governanceReadModels.claimsView.view_id,
      node_kind: "read_model",
      display_name: "GovernanceClaimsView",
      digest: input.governanceReadModels.claimsView.view_digest,
      status: input.governanceReadModels.claimsView.status,
      attributes: {
        view_kind: input.governanceReadModels.claimsView.view_kind,
      },
    }),
    createNode({
      node_id: input.governanceReadModels.healthView.view_id,
      node_kind: "read_model",
      display_name: "GovernanceHealthView",
      digest: input.governanceReadModels.healthView.view_digest,
      status: input.governanceReadModels.healthView.health_status,
      attributes: {
        view_kind: input.governanceReadModels.healthView.view_kind,
      },
    }),
    createNode({
      node_id: input.governanceReadModels.dashboardView.view_id,
      node_kind: "read_model",
      display_name: "GovernanceDashboardView",
      digest: input.governanceReadModels.dashboardView.view_digest,
      status: input.governanceReadModels.dashboardView.status,
      attributes: {
        view_kind: input.governanceReadModels.dashboardView.view_kind,
      },
    }),
    createNode({
      node_id: input.governanceReadModels.metrics.metrics_id,
      node_kind: "read_model",
      display_name: "GovernanceReadModelMetrics",
      digest: input.governanceReadModels.metrics.metrics_digest,
      status: "MATERIALIZED",
      attributes: {
        view_kind: "metrics",
      },
    }),
  ];
  const gateCContributors = [
    capabilityGovernanceNode,
    capabilityGraphNode,
    verificationRunNode,
    governanceSessionNode,
  ] as const;
  const gateCFailContributorCount = gateCContributors.filter(
    (node) => classifyControlSignalStatus(node.status) === "FAIL",
  ).length;
  const gateCWarnContributorCount = gateCContributors.filter(
    (node) => classifyControlSignalStatus(node.status) === "WARN",
  ).length;
  const gateCSnapshotNode = createNode({
    node_id: `control-surface:gate-c:${input.governanceSession.session_id}`,
    node_kind: "control_surface",
    display_name: "Gate C Snapshot",
    digest: DigestEngine.digest({
      contributors: gateCContributors.map((node) => ({
        node_id: node.node_id,
        status: node.status,
        digest: node.digest,
      })),
      read_model_digests: readModelNodes.map((node) => node.digest),
    }),
    status:
      gateCFailContributorCount > 0
        ? "FAIL"
        : gateCWarnContributorCount > 0
          ? "WARN"
          : "PASS",
    attributes: {
      contributor_count: gateCContributors.length,
      warn_contributor_count: gateCWarnContributorCount,
      fail_contributor_count: gateCFailContributorCount,
      governance_session_id: input.governanceSession.session_id,
      verification_run_id: input.verificationRun.run_id,
    },
  });

  const edges: EnterpriseControlGraphEdge[] = [
    createEdge({
      edge_kind: "PROJECTS_TO",
      from_node_id: capabilityGovernanceNode.node_id,
      to_node_id: capabilityGraphNode.node_id,
      rationale:
        "Capability governance is the audited source projection for the capability dependency graph.",
    }),
    createEdge({
      edge_kind: "VERIFIED_IN",
      from_node_id: capabilityGovernanceNode.node_id,
      to_node_id: verificationRunNode.node_id,
      rationale:
        "Capability governance is evaluated as part of the current verification run control plane.",
    }),
    createEdge({
      edge_kind: "BINDS_SESSION",
      from_node_id: verificationRunNode.node_id,
      to_node_id: governanceSessionNode.node_id,
      rationale:
        "Verification run binds orchestration identity to the governance session provenance root.",
    }),
    createEdge({
      edge_kind: "PROJECTS_TO",
      from_node_id: capabilityGovernanceNode.node_id,
      to_node_id: gateCSnapshotNode.node_id,
      rationale:
        "Gate C snapshot projects governed capability compliance signals into the enterprise control surface.",
    }),
    createEdge({
      edge_kind: "PROJECTS_TO",
      from_node_id: capabilityGraphNode.node_id,
      to_node_id: gateCSnapshotNode.node_id,
      rationale:
        "Gate C snapshot projects capability dependency health and drift signals into one auditable status surface.",
    }),
    createEdge({
      edge_kind: "PROJECTS_TO",
      from_node_id: verificationRunNode.node_id,
      to_node_id: gateCSnapshotNode.node_id,
      rationale:
        "Gate C snapshot reflects the active verification-run posture behind the governed control plane.",
    }),
    createEdge({
      edge_kind: "PROJECTS_TO",
      from_node_id: governanceSessionNode.node_id,
      to_node_id: gateCSnapshotNode.node_id,
      rationale:
        "Gate C snapshot stays bound to the provenance session that anchors enterprise governance lineage.",
    }),
  ];

  for (const capability of capabilityNodes) {
    edges.push(
      createEdge({
        edge_kind: "CATALOGED_IN",
        from_node_id: capability.node_id,
        to_node_id: capabilityGovernanceNode.node_id,
        rationale:
          "Capability is declared in the governed capability control-plane projection.",
      }),
    );
  }

  for (const capability of input.capabilityGraph.capabilities) {
    for (const dependency of capability.depends_on) {
      edges.push(
        createEdge({
          edge_kind: "DEPENDS_ON",
          from_node_id: `capability:${capability.capability_id}`,
          to_node_id:
            dependency.resolution_status === "RESOLVED_CAPABILITY"
              ? `capability:${dependency.dependency_id}`
              : `runtime-dependency:${dependency.dependency_id}`,
          rationale: dependency.rationale,
        }),
      );
    }
  }

  for (const lawResult of input.lawResults) {
    edges.push(
      createEdge({
        edge_kind: "ASSESSES",
        from_node_id: verificationRunNode.node_id,
        to_node_id: lawResult.result_id,
        rationale:
          "Verification run materializes law-result evidence as part of the governed constitutional evaluation chain.",
      }),
    );
  }

  for (const evidencePackage of input.evidencePackages) {
    for (const resultId of evidencePackage.result_ids) {
      edges.push(
        createEdge({
          edge_kind: "PACKAGED_IN",
          from_node_id: resultId,
          to_node_id: evidencePackage.package_id,
          rationale:
            "Evidence packages preserve immutable packaging lineage for law-result outputs.",
        }),
      );
    }
  }

  for (const certificate of input.lawCertificates) {
    edges.push(
      createEdge({
        edge_kind: "CERTIFIED_AS",
        from_node_id: certificate.package_id,
        to_node_id: certificate.certificate_id,
        rationale:
          "Certificates are issued from immutable evidence-package boundaries.",
      }),
    );
  }

  for (const attestation of input.lawAttestations) {
    edges.push(
      createEdge({
        edge_kind: "ATTESTED_BY",
        from_node_id: attestation.certificate_id,
        to_node_id: attestation.event_id,
        rationale:
          "Attestation events preserve append-only trust lifecycle records for certificate assertions.",
      }),
    );
  }

  for (const readModel of readModelNodes) {
    edges.push(
      createEdge({
        edge_kind: "PROJECTS_TO",
        from_node_id: governanceSessionNode.node_id,
        to_node_id: readModel.node_id,
        rationale:
          "Governance session is the stable provenance source for all governed read-model projections.",
      }),
    );
  }

  const evidenceCapabilityIds = new Set(["governance-evidence"]);
  const readModelCapabilityIds = new Set(["governance-read-model"]);
  const trustCapabilityIds = new Set(["trust-framework"]);
  for (const capability of capabilityNodes) {
    if (evidenceCapabilityIds.has(capability.display_name)) {
      for (const lawResultNode of lawResultNodes) {
        edges.push(
          createEdge({
            edge_kind: "MATERIALIZES",
            from_node_id: capability.node_id,
            to_node_id: lawResultNode.node_id,
            rationale:
              "Governance evidence capability owns law-result materialization in the frozen governance evidence chain.",
          }),
        );
      }
      for (const evidencePackageNode of evidencePackageNodes) {
        edges.push(
          createEdge({
            edge_kind: "MATERIALIZES",
            from_node_id: capability.node_id,
            to_node_id: evidencePackageNode.node_id,
            rationale:
              "Governance evidence capability owns immutable evidence-package materialization.",
          }),
        );
      }
      for (const certificateNode of certificateNodes) {
        edges.push(
          createEdge({
            edge_kind: "MATERIALIZES",
            from_node_id: capability.node_id,
            to_node_id: certificateNode.node_id,
            rationale:
              "Governance evidence capability owns certificate issuance outputs without mutating trust boundaries.",
          }),
        );
      }
    }
    if (readModelCapabilityIds.has(capability.display_name)) {
      for (const readModelNode of readModelNodes) {
        edges.push(
          createEdge({
            edge_kind: "MATERIALIZES",
            from_node_id: capability.node_id,
            to_node_id: readModelNode.node_id,
            rationale:
              "Governance read-model capability owns read-model projection materialization from session provenance.",
          }),
        );
      }
    }
    if (trustCapabilityIds.has(capability.display_name)) {
      for (const attestationNode of attestationNodes) {
        edges.push(
          createEdge({
            edge_kind: "MATERIALIZES",
            from_node_id: capability.node_id,
            to_node_id: attestationNode.node_id,
            rationale:
              "Trust framework capability owns attestation lifecycle materialization for certificate assertions.",
          }),
        );
      }
    }
  }

  const nodes = sortNodes([
    capabilityGovernanceNode,
    capabilityGraphNode,
    gateCSnapshotNode,
    verificationRunNode,
    governanceSessionNode,
    ...capabilityNodes,
    ...runtimeDependencyNodes,
    ...lawResultNodes,
    ...evidencePackageNodes,
    ...certificateNodes,
    ...attestationNodes,
    ...readModelNodes,
  ]);
  const sortedEdges = sortEdges(edges);
  const connectedNodeIds = new Set(
    sortedEdges.flatMap((edge) => [edge.from_node_id, edge.to_node_id]),
  );
  const disconnectedNodeCount = nodes.filter(
    (node) => !connectedNodeIds.has(node.node_id),
  ).length;
  const evidenceNodeCount =
    lawResultNodes.length +
    evidencePackageNodes.length +
    certificateNodes.length +
    attestationNodes.length;

  const graphSummary = {
    node_count: nodes.length,
    edge_count: sortedEdges.length,
    capability_count: capabilityNodes.length,
    evidence_node_count: evidenceNodeCount,
    read_model_count: readModelNodes.length,
    dependency_edge_count: sortedEdges.filter(
      (edge) => edge.edge_kind === "DEPENDS_ON",
    ).length,
    disconnected_node_count: disconnectedNodeCount,
    traversal_ready_status:
      disconnectedNodeCount === 0 ? ("PASS" as const) : ("FAIL" as const),
  };
  const graphPayload = {
    summary: graphSummary,
    nodes,
    edges: sortedEdges,
  };
  const graphDigest = DigestEngine.digest(graphPayload);
  const graph: EnterpriseControlGraph = {
    graph_version: "1.0.0",
    graph_id: `enterprise-control-graph:${graphDigest.slice(0, 16)}`,
    graph_digest: graphDigest,
    ...graphPayload,
    claim_boundary:
      "Enterprise control graph makes capability dependency, evidence-chain lineage, session projection, and verification orchestration relationships explicit so enterprise queries can traverse governed control-plane state deterministically without changing the frozen domain model.",
  };

  const resultToPackageEdges = sortedEdges.filter(
    (edge) => edge.edge_kind === "PACKAGED_IN",
  );
  const packageToCertificateEdges = sortedEdges.filter(
    (edge) => edge.edge_kind === "CERTIFIED_AS",
  );
  const certificateToAttestationEdges = sortedEdges.filter(
    (edge) => edge.edge_kind === "ATTESTED_BY",
  );
  const sessionToReadModelEdges = sortedEdges.filter(
    (edge) =>
      edge.edge_kind === "PROJECTS_TO" &&
      edge.from_node_id === governanceSessionNode.node_id &&
      readModelNodes.some((node) => node.node_id === edge.to_node_id),
  );
  const dependencyBindingStatus = sortedEdges
    .filter((edge) => edge.edge_kind === "DEPENDS_ON")
    .every((edge) => connectedNodeIds.has(edge.to_node_id))
    ? ("PASS" as const)
    : ("FAIL" as const);
  const evidenceChainStatus =
    lawResultNodes.every((node) =>
      resultToPackageEdges.some((edge) => edge.from_node_id === node.node_id),
    ) &&
    evidencePackageNodes.every((node) =>
      packageToCertificateEdges.some((edge) => edge.from_node_id === node.node_id),
    ) &&
    certificateNodes.every((node) =>
      certificateToAttestationEdges.some((edge) => edge.from_node_id === node.node_id),
    )
      ? ("PASS" as const)
      : ("FAIL" as const);
  const sessionProjectionStatus =
    sortedEdges.some(
      (edge) =>
        edge.edge_kind === "BINDS_SESSION" &&
        edge.to_node_id === governanceSessionNode.node_id,
    ) && sessionToReadModelEdges.length === readModelNodes.length
      ? ("PASS" as const)
      : ("FAIL" as const);
  const verificationSummary = {
    node_projection_status:
      new Set(nodes.map((node) => node.node_id)).size === nodes.length
        ? ("PASS" as const)
        : ("FAIL" as const),
    dependency_binding_status: dependencyBindingStatus,
    evidence_chain_status: evidenceChainStatus,
    session_projection_status: sessionProjectionStatus,
    disconnected_node_status:
      disconnectedNodeCount === 0 ? ("PASS" as const) : ("FAIL" as const),
    overall_status:
      dependencyBindingStatus === "PASS" &&
      evidenceChainStatus === "PASS" &&
      sessionProjectionStatus === "PASS" &&
      disconnectedNodeCount === 0
        ? ("PASS" as const)
        : ("FAIL" as const),
  };
  const verificationPayload = {
    summary: verificationSummary,
    metrics: {
      node_count: graphSummary.node_count,
      edge_count: graphSummary.edge_count,
      disconnected_node_count: graphSummary.disconnected_node_count,
      capability_count: graphSummary.capability_count,
      evidence_node_count: graphSummary.evidence_node_count,
      read_model_count: graphSummary.read_model_count,
      dependency_edge_count: graphSummary.dependency_edge_count,
    },
  };

  return {
    graph,
    verification: {
      report_version: "1.0.0",
      report_digest: DigestEngine.digest(verificationPayload),
      ...verificationPayload,
      claim_boundary:
        "Enterprise control graph verification checks that capability dependencies, evidence-chain lineage, session-projected read models, and Gate C control-plane status remain traversable as one explicit control graph.",
    },
  };
}
