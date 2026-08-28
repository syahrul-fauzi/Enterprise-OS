// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine.js";
import type {
  ConstitutionClaims,
  ConstitutionEvidencePackage,
  ConstitutionLawCertificate,
  ConstitutionProofBundle,
  ConstitutionSummary,
} from "./certificate-runtime.js";
import type { ConstitutionAttestationPolicy, ConstitutionLawAttestation } from "./attestation-runtime.js";
import type {
  GovernanceClaimsView,
  GovernanceDashboardView,
  GovernanceHealthView,
  GovernanceReadModelMetrics,
  GovernanceSummaryView,
} from "./governance-read-model-runtime.js";
import type {
  GovernanceSession,
  GovernanceSessionProvenance,
} from "./governance-session-runtime.js";
import type { ConstitutionLawResult } from "./law-result-runtime.js";
import type { TrustFrameworkCatalog } from "./trust-framework-runtime.js";

export type GovernanceMaterializationNodeId =
  | "trust_framework_catalog"
  | "attestation_policy"
  | "law_results"
  | "evidence_packages"
  | "law_certificates"
  | "law_attestations"
  | "claims"
  | "summary"
  | "proof_bundle"
  | "session_provenance"
  | "summary_view"
  | "claims_view"
  | "health_view"
  | "dashboard_view"
  | "read_model_metrics"
  | "governance_session";

export type GovernanceMaterializationNode = {
  readonly node_id: GovernanceMaterializationNodeId;
  readonly artifact_kind:
    | "trust"
    | "policy"
    | "evidence"
    | "trust_event_stream"
    | "report"
    | "session"
    | "read_model"
    | "metrics";
  readonly output_digest: string;
  readonly invalidation_digest: string;
  readonly source_digests: readonly {
    readonly source_id: string;
    readonly digest: string;
  }[];
  readonly directly_invalidates: readonly GovernanceMaterializationNodeId[];
  readonly changed_since_previous: boolean;
  readonly impacted_by_changes: boolean;
  readonly incremental_eligible: boolean;
  readonly rematerialization_reason: string;
};

export type GovernanceMaterializationEdge = {
  readonly from: GovernanceMaterializationNodeId;
  readonly to: GovernanceMaterializationNodeId;
  readonly propagation_reason: string;
};

export type GovernanceIncrementalMaterializationReport = {
  readonly report_version: "1.0.0";
  readonly report_digest: string;
  readonly execution_scope: "verify-constitution" | "verify-foundation";
  readonly session_id: string;
  readonly session_digest: string;
  readonly session_projection_digest: string;
  readonly previous_report_digest: string | null;
  readonly invalidation_lineage_status: "EXPLICIT";
  readonly selective_execution_status: "UNIMPLEMENTED" | "APPLIED";
  readonly delta_basis: {
    readonly basis_version: "1.0.0";
    readonly previous_session_digest: string | null;
    readonly previous_session_projection_digest: string | null;
    readonly session_digest_changed: boolean;
    readonly session_projection_digest_changed: boolean;
    readonly delta_mode:
      | "NO_PREVIOUS_BASELINE"
      | "SESSION_DELTA"
      | "PROJECTION_DELTA"
      | "NO_CHANGE";
    readonly delta_scope_status:
      | "NO_CHANGE"
      | "METADATA_ONLY"
      | "MATERIALIZATION_REQUIRED";
    readonly full_rebuild_required: boolean;
  };
  readonly summary: {
    readonly node_count: number;
    readonly edge_count: number;
    readonly changed_node_count: number;
    readonly impacted_node_count: number;
    readonly reusable_node_count: number;
    readonly session_digest_changed: boolean;
    readonly session_projection_digest_changed: boolean;
    readonly delta_mode:
      | "NO_PREVIOUS_BASELINE"
      | "SESSION_DELTA"
      | "PROJECTION_DELTA"
      | "NO_CHANGE";
    readonly delta_scope_status:
      | "NO_CHANGE"
      | "METADATA_ONLY"
      | "MATERIALIZATION_REQUIRED";
    readonly directly_changed_nodes: readonly GovernanceMaterializationNodeId[];
    readonly impacted_nodes: readonly GovernanceMaterializationNodeId[];
    readonly incremental_readiness_status: "PARTIAL";
  };
  readonly edges: readonly GovernanceMaterializationEdge[];
  readonly nodes: readonly GovernanceMaterializationNode[];
  readonly claim_boundary: string;
};

function buildEdges(): readonly GovernanceMaterializationEdge[] {
  return [
    {
      from: "trust_framework_catalog",
      to: "attestation_policy",
      propagation_reason:
        "Trust framework catalog selection determines the available attestation policy boundary.",
    },
    {
      from: "attestation_policy",
      to: "law_attestations",
      propagation_reason:
        "Attestation policy changes invalidate emitted trust events for certificates.",
    },
    {
      from: "law_results",
      to: "evidence_packages",
      propagation_reason:
        "Evidence packages are frozen aggregates of law-result identity and proof fragments.",
    },
    {
      from: "law_results",
      to: "claims",
      propagation_reason:
        "Claims materialization summarizes law-result outcomes.",
    },
    {
      from: "evidence_packages",
      to: "law_certificates",
      propagation_reason:
        "Certificates are issued from immutable evidence package digests.",
    },
    {
      from: "law_certificates",
      to: "law_attestations",
      propagation_reason:
        "Attestation events are emitted for certificate identities.",
    },
    {
      from: "claims",
      to: "summary",
      propagation_reason:
        "Constitution summary is derived from claims aggregate status.",
    },
    {
      from: "law_results",
      to: "proof_bundle",
      propagation_reason:
        "Proof bundle snapshots law-result outputs.",
    },
    {
      from: "evidence_packages",
      to: "proof_bundle",
      propagation_reason:
        "Proof bundle snapshots evidence package outputs.",
    },
    {
      from: "law_certificates",
      to: "proof_bundle",
      propagation_reason:
        "Proof bundle snapshots certificate outputs.",
    },
    {
      from: "law_attestations",
      to: "proof_bundle",
      propagation_reason:
        "Proof bundle snapshots attestation event outputs.",
    },
    {
      from: "claims",
      to: "proof_bundle",
      propagation_reason:
        "Proof bundle snapshots claims output.",
    },
    {
      from: "summary",
      to: "proof_bundle",
      propagation_reason:
        "Proof bundle snapshots constitution summary output.",
    },
    {
      from: "trust_framework_catalog",
      to: "session_provenance",
      propagation_reason:
        "Session provenance binds the active trust framework context.",
    },
    {
      from: "attestation_policy",
      to: "session_provenance",
      propagation_reason:
        "Session provenance binds attestation policy identity and digest.",
    },
    {
      from: "law_results",
      to: "session_provenance",
      propagation_reason:
        "Session provenance records law-result digest.",
    },
    {
      from: "evidence_packages",
      to: "session_provenance",
      propagation_reason:
        "Session provenance records evidence package digest.",
    },
    {
      from: "law_certificates",
      to: "session_provenance",
      propagation_reason:
        "Session provenance records certificate digest.",
    },
    {
      from: "law_attestations",
      to: "session_provenance",
      propagation_reason:
        "Session provenance records attestation event digest.",
    },
    {
      from: "claims",
      to: "session_provenance",
      propagation_reason:
        "Session provenance records claims digest.",
    },
    {
      from: "summary",
      to: "session_provenance",
      propagation_reason:
        "Session provenance records summary digest.",
    },
    {
      from: "proof_bundle",
      to: "session_provenance",
      propagation_reason:
        "Session provenance records proof bundle identity.",
    },
    {
      from: "session_provenance",
      to: "summary_view",
      propagation_reason:
        "Summary view is projected from stable session provenance.",
    },
    {
      from: "claims",
      to: "summary_view",
      propagation_reason:
        "Summary view carries claims digest lineage.",
    },
    {
      from: "summary",
      to: "summary_view",
      propagation_reason:
        "Summary view carries summary digest lineage.",
    },
    {
      from: "session_provenance",
      to: "claims_view",
      propagation_reason:
        "Claims view is projected from stable session provenance.",
    },
    {
      from: "claims",
      to: "claims_view",
      propagation_reason:
        "Claims view carries claims digest lineage.",
    },
    {
      from: "session_provenance",
      to: "health_view",
      propagation_reason:
        "Health view is projected from stable session provenance.",
    },
    {
      from: "summary",
      to: "health_view",
      propagation_reason:
        "Health view carries summary digest lineage.",
    },
    {
      from: "session_provenance",
      to: "dashboard_view",
      propagation_reason:
        "Dashboard view is projected from stable session provenance.",
    },
    {
      from: "claims",
      to: "dashboard_view",
      propagation_reason:
        "Dashboard view carries claims digest lineage.",
    },
    {
      from: "summary",
      to: "dashboard_view",
      propagation_reason:
        "Dashboard view carries summary digest lineage.",
    },
    {
      from: "summary_view",
      to: "read_model_metrics",
      propagation_reason:
        "Read-model metrics capture the summary view generation digest.",
    },
    {
      from: "claims_view",
      to: "read_model_metrics",
      propagation_reason:
        "Read-model metrics capture the claims view generation digest.",
    },
    {
      from: "health_view",
      to: "read_model_metrics",
      propagation_reason:
        "Read-model metrics capture the health view generation digest.",
    },
    {
      from: "dashboard_view",
      to: "read_model_metrics",
      propagation_reason:
        "Read-model metrics capture the dashboard view generation digest.",
    },
    {
      from: "session_provenance",
      to: "governance_session",
      propagation_reason:
        "Governance session final artifact attaches read-model outputs to provenance.",
    },
    {
      from: "summary_view",
      to: "governance_session",
      propagation_reason:
        "Governance session records summary view identity.",
    },
    {
      from: "claims_view",
      to: "governance_session",
      propagation_reason:
        "Governance session records claims view identity.",
    },
    {
      from: "health_view",
      to: "governance_session",
      propagation_reason:
        "Governance session records health view identity.",
    },
    {
      from: "dashboard_view",
      to: "governance_session",
      propagation_reason:
        "Governance session records dashboard view identity.",
    },
    {
      from: "read_model_metrics",
      to: "governance_session",
      propagation_reason:
        "Governance session records read-model metrics identity.",
    },
  ] as const;
}

function buildDownstreamIndex(
  edges: readonly GovernanceMaterializationEdge[],
): ReadonlyMap<GovernanceMaterializationNodeId, readonly GovernanceMaterializationNodeId[]> {
  const index = new Map<GovernanceMaterializationNodeId, GovernanceMaterializationNodeId[]>();
  for (const edge of edges) {
    const existing = index.get(edge.from) ?? [];
    existing.push(edge.to);
    index.set(edge.from, existing);
  }
  return new Map(
    [...index.entries()].map(([nodeId, values]) => [
      nodeId,
      Array.from(new Set(values)).sort(),
    ]),
  );
}

function collectImpactedNodes(
  changedNodes: readonly GovernanceMaterializationNodeId[],
  downstreamIndex: ReadonlyMap<
    GovernanceMaterializationNodeId,
    readonly GovernanceMaterializationNodeId[]
  >,
): ReadonlySet<GovernanceMaterializationNodeId> {
  const impacted = new Set<GovernanceMaterializationNodeId>(changedNodes);
  const queue = [...changedNodes];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    for (const downstream of downstreamIndex.get(current) ?? []) {
      if (impacted.has(downstream)) {
        continue;
      }
      impacted.add(downstream);
      queue.push(downstream);
    }
  }

  return impacted;
}

export function materializeGovernanceIncrementalMaterializationReport(input: {
  readonly executionScope: "verify-constitution" | "verify-foundation";
  readonly trustFrameworkCatalog: TrustFrameworkCatalog;
  readonly attestationPolicy: ConstitutionAttestationPolicy;
  readonly lawResults: readonly ConstitutionLawResult[];
  readonly evidencePackages: readonly ConstitutionEvidencePackage[];
  readonly lawCertificates: readonly ConstitutionLawCertificate[];
  readonly lawAttestations: readonly ConstitutionLawAttestation[];
  readonly claims: ConstitutionClaims;
  readonly constitutionSummary: ConstitutionSummary;
  readonly proofBundle: ConstitutionProofBundle;
  readonly sessionProvenance: GovernanceSessionProvenance;
  readonly summaryView: GovernanceSummaryView;
  readonly claimsView: GovernanceClaimsView;
  readonly healthView: GovernanceHealthView;
  readonly dashboardView: GovernanceDashboardView;
  readonly readModelMetrics: GovernanceReadModelMetrics;
  readonly governanceSession: GovernanceSession;
  readonly previousReport?: GovernanceIncrementalMaterializationReport | null;
  readonly selectiveExecutionStatus?: "UNIMPLEMENTED" | "APPLIED";
}): GovernanceIncrementalMaterializationReport {
  const edges = buildEdges();
  const downstreamIndex = buildDownstreamIndex(edges);
  const previousSessionDigest = input.previousReport?.session_digest ?? null;
  const previousSessionProjectionDigest =
    input.previousReport?.session_projection_digest ?? null;
  const sessionDigestChanged =
    previousSessionDigest === null
      ? true
      : previousSessionDigest !== input.sessionProvenance.session_digest;
  const sessionProjectionDigestChanged =
    previousSessionProjectionDigest === null
      ? true
      : previousSessionProjectionDigest !==
        input.governanceSession.session_projection_digest;
  const deltaMode =
    previousSessionDigest === null || previousSessionProjectionDigest === null
      ? ("NO_PREVIOUS_BASELINE" as const)
      : sessionDigestChanged
        ? ("SESSION_DELTA" as const)
        : sessionProjectionDigestChanged
          ? ("PROJECTION_DELTA" as const)
          : ("NO_CHANGE" as const);
  const previousNodeDigests = new Map(
    (input.previousReport?.nodes ?? []).map((node) => [
      node.node_id,
      node.invalidation_digest,
    ]),
  );
  const sessionProvenanceLineageDigest = DigestEngine.digest({
    trust_framework_catalog: input.trustFrameworkCatalog.catalog_digest,
    attestation_policy: input.attestationPolicy.policy_digest,
    law_results: input.sessionProvenance.law_results.digest,
    evidence_packages: input.sessionProvenance.evidence_packages.digest,
    law_certificates: input.sessionProvenance.certificates.digest,
    law_attestations: input.sessionProvenance.attestations.digest,
    claims: input.sessionProvenance.reports.claims_digest,
    summary: input.sessionProvenance.reports.summary_digest,
    proof_bundle: input.proofBundle.bundle_digest,
  });
  const summaryViewLineageDigest = DigestEngine.digest({
    session_provenance: sessionProvenanceLineageDigest,
    claims: input.sessionProvenance.reports.claims_digest,
    summary: input.sessionProvenance.reports.summary_digest,
  });
  const claimsViewLineageDigest = DigestEngine.digest({
    session_provenance: sessionProvenanceLineageDigest,
    claims: input.sessionProvenance.reports.claims_digest,
  });
  const healthViewLineageDigest = DigestEngine.digest({
    session_provenance: sessionProvenanceLineageDigest,
    summary: input.sessionProvenance.reports.summary_digest,
  });
  const dashboardViewLineageDigest = DigestEngine.digest({
    session_provenance: sessionProvenanceLineageDigest,
    claims: input.sessionProvenance.reports.claims_digest,
    summary: input.sessionProvenance.reports.summary_digest,
  });
  const readModelMetricsLineageDigest = DigestEngine.digest({
    summary_view: summaryViewLineageDigest,
    claims_view: claimsViewLineageDigest,
    health_view: healthViewLineageDigest,
    dashboard_view: dashboardViewLineageDigest,
  });

  const nodeDefinitions = [
    {
      node_id: "trust_framework_catalog" as const,
      artifact_kind: "trust" as const,
      output_digest: input.trustFrameworkCatalog.catalog_digest,
      source_digests: [],
      rematerialization_reason:
        "Trust framework changes invalidate downstream attestation policy, session provenance, and every trust-derived read model.",
    },
    {
      node_id: "attestation_policy" as const,
      artifact_kind: "policy" as const,
      output_digest: input.attestationPolicy.policy_digest,
      source_digests: [
        {
          source_id: "trust_framework_catalog",
          digest: input.trustFrameworkCatalog.catalog_digest,
        },
      ],
      rematerialization_reason:
        "Attestation policy must be regenerated when the selected trust framework boundary changes.",
    },
    {
      node_id: "law_results" as const,
      artifact_kind: "evidence" as const,
      output_digest: input.sessionProvenance.law_results.digest,
      source_digests: [
        {
          source_id: "constitution_report",
          digest: input.sessionProvenance.inputs.constitution_report_digest,
        },
      ],
      rematerialization_reason:
        "Law results change when constitutional evidence or law evaluation inputs change.",
    },
    {
      node_id: "evidence_packages" as const,
      artifact_kind: "evidence" as const,
      output_digest: input.sessionProvenance.evidence_packages.digest,
      source_digests: [
        {
          source_id: "law_results",
          digest: input.sessionProvenance.law_results.digest,
        },
        {
          source_id: "proof_fragments",
          digest: input.proofBundle.proof_fragments_digest,
        },
      ],
      rematerialization_reason:
        "Evidence packages are invalidated by law-result or proof-fragment changes.",
    },
    {
      node_id: "law_certificates" as const,
      artifact_kind: "evidence" as const,
      output_digest: input.sessionProvenance.certificates.digest,
      source_digests: [
        {
          source_id: "evidence_packages",
          digest: input.sessionProvenance.evidence_packages.digest,
        },
      ],
      rematerialization_reason:
        "Certificates are reissued only when immutable evidence package digests change.",
    },
    {
      node_id: "law_attestations" as const,
      artifact_kind: "trust_event_stream" as const,
      output_digest: input.sessionProvenance.attestations.digest,
      source_digests: [
        {
          source_id: "law_certificates",
          digest: input.sessionProvenance.certificates.digest,
        },
        {
          source_id: "attestation_policy",
          digest: input.attestationPolicy.policy_digest,
        },
      ],
      rematerialization_reason:
        "Attestation event stream is invalidated by certificate or trust-policy changes.",
    },
    {
      node_id: "claims" as const,
      artifact_kind: "report" as const,
      output_digest: input.sessionProvenance.reports.claims_digest,
      source_digests: [
        {
          source_id: "law_results",
          digest: input.sessionProvenance.law_results.digest,
        },
      ],
      rematerialization_reason:
        "Claims are recomputed when law-result outcomes change.",
    },
    {
      node_id: "summary" as const,
      artifact_kind: "report" as const,
      output_digest: input.sessionProvenance.reports.summary_digest,
      source_digests: [
        {
          source_id: "claims",
          digest: input.sessionProvenance.reports.claims_digest,
        },
      ],
      rematerialization_reason:
        "Summary is a downstream projection of claims status.",
    },
    {
      node_id: "proof_bundle" as const,
      artifact_kind: "report" as const,
      output_digest: input.proofBundle.bundle_digest,
      source_digests: [
        {
          source_id: "law_results",
          digest: input.sessionProvenance.law_results.digest,
        },
        {
          source_id: "evidence_packages",
          digest: input.sessionProvenance.evidence_packages.digest,
        },
        {
          source_id: "law_certificates",
          digest: input.sessionProvenance.certificates.digest,
        },
        {
          source_id: "law_attestations",
          digest: input.sessionProvenance.attestations.digest,
        },
        {
          source_id: "claims",
          digest: input.sessionProvenance.reports.claims_digest,
        },
        {
          source_id: "summary",
          digest: input.sessionProvenance.reports.summary_digest,
        },
      ],
      rematerialization_reason:
        "Proof bundle snapshots the full governance evidence chain and must move with any upstream digest change.",
    },
    {
      node_id: "session_provenance" as const,
      artifact_kind: "session" as const,
      output_digest: input.sessionProvenance.session_digest,
      source_digests: [
        {
          source_id: "trust_framework_catalog",
          digest: input.trustFrameworkCatalog.catalog_digest,
        },
        {
          source_id: "attestation_policy",
          digest: input.attestationPolicy.policy_digest,
        },
        {
          source_id: "law_results",
          digest: input.sessionProvenance.law_results.digest,
        },
        {
          source_id: "evidence_packages",
          digest: input.sessionProvenance.evidence_packages.digest,
        },
        {
          source_id: "law_certificates",
          digest: input.sessionProvenance.certificates.digest,
        },
        {
          source_id: "law_attestations",
          digest: input.sessionProvenance.attestations.digest,
        },
        {
          source_id: "claims",
          digest: input.sessionProvenance.reports.claims_digest,
        },
        {
          source_id: "summary",
          digest: input.sessionProvenance.reports.summary_digest,
        },
        {
          source_id: "proof_bundle",
          digest: input.proofBundle.bundle_digest,
        },
      ],
      rematerialization_reason:
        "Session provenance is the stable lifecycle aggregate that binds evidence, trust, and report digests.",
    },
    {
      node_id: "summary_view" as const,
      artifact_kind: "read_model" as const,
      output_digest: input.summaryView.view_digest,
      source_digests: [
        {
          source_id: "session_provenance_lineage",
          digest: sessionProvenanceLineageDigest,
        },
        {
          source_id: "claims",
          digest: input.sessionProvenance.reports.claims_digest,
        },
        {
          source_id: "summary",
          digest: input.sessionProvenance.reports.summary_digest,
        },
      ],
      rematerialization_reason:
        "Summary view is invalidated only by session provenance, claims, or summary digest changes.",
    },
    {
      node_id: "claims_view" as const,
      artifact_kind: "read_model" as const,
      output_digest: input.claimsView.view_digest,
      source_digests: [
        {
          source_id: "session_provenance_lineage",
          digest: sessionProvenanceLineageDigest,
        },
        {
          source_id: "claims",
          digest: input.sessionProvenance.reports.claims_digest,
        },
      ],
      rematerialization_reason:
        "Claims view is invalidated by session provenance or claims digest changes.",
    },
    {
      node_id: "health_view" as const,
      artifact_kind: "read_model" as const,
      output_digest: input.healthView.view_digest,
      source_digests: [
        {
          source_id: "session_provenance_lineage",
          digest: sessionProvenanceLineageDigest,
        },
        {
          source_id: "summary",
          digest: input.sessionProvenance.reports.summary_digest,
        },
      ],
      rematerialization_reason:
        "Health view is invalidated by session provenance or summary digest changes.",
    },
    {
      node_id: "dashboard_view" as const,
      artifact_kind: "read_model" as const,
      output_digest: input.dashboardView.view_digest,
      source_digests: [
        {
          source_id: "session_provenance_lineage",
          digest: sessionProvenanceLineageDigest,
        },
        {
          source_id: "claims",
          digest: input.sessionProvenance.reports.claims_digest,
        },
        {
          source_id: "summary",
          digest: input.sessionProvenance.reports.summary_digest,
        },
      ],
      rematerialization_reason:
        "Dashboard view is invalidated by session provenance, claims, or summary digest changes.",
    },
    {
      node_id: "read_model_metrics" as const,
      artifact_kind: "metrics" as const,
      output_digest: input.readModelMetrics.metrics_digest,
      source_digests: [
        {
          source_id: "summary_view_lineage",
          digest: summaryViewLineageDigest,
        },
        {
          source_id: "claims_view_lineage",
          digest: claimsViewLineageDigest,
        },
        {
          source_id: "health_view_lineage",
          digest: healthViewLineageDigest,
        },
        {
          source_id: "dashboard_view_lineage",
          digest: dashboardViewLineageDigest,
        },
      ],
      rematerialization_reason:
        "Read-model metrics move when any projected governance view changes.",
    },
    {
      node_id: "governance_session" as const,
      artifact_kind: "session" as const,
      output_digest: input.governanceSession.session_projection_digest,
      source_digests: [
        {
          source_id: "session_provenance_lineage",
          digest: sessionProvenanceLineageDigest,
        },
        {
          source_id: "summary_view_lineage",
          digest: summaryViewLineageDigest,
        },
        {
          source_id: "claims_view_lineage",
          digest: claimsViewLineageDigest,
        },
        {
          source_id: "health_view_lineage",
          digest: healthViewLineageDigest,
        },
        {
          source_id: "dashboard_view_lineage",
          digest: dashboardViewLineageDigest,
        },
        {
          source_id: "read_model_metrics_lineage",
          digest: readModelMetricsLineageDigest,
        },
      ],
      rematerialization_reason:
        "Governance session final projection changes only when provenance or attached read-model outputs change.",
    },
  ] as const;

  const nodes = nodeDefinitions.map((node) => {
    const invalidationDigest = DigestEngine.digest({
      node_id: node.node_id,
      source_digests: node.source_digests,
    });
    return {
      ...node,
      invalidation_digest: invalidationDigest,
      directly_invalidates: downstreamIndex.get(node.node_id) ?? [],
      changed_since_previous: false,
      impacted_by_changes: false,
      incremental_eligible: true,
    };
  });
  const changedNodeIds = nodes
    .filter(
      (node) => previousNodeDigests.get(node.node_id) !== node.invalidation_digest,
    )
    .map((node) => node.node_id)
    .sort();
  const impactedNodeIds = collectImpactedNodes(changedNodeIds, downstreamIndex);
  const finalizedNodes = nodes.map((node) => ({
    ...node,
    changed_since_previous: changedNodeIds.includes(node.node_id),
    impacted_by_changes: impactedNodeIds.has(node.node_id),
  }));
  const deltaScopeStatus =
    deltaMode === "NO_CHANGE"
      ? ("NO_CHANGE" as const)
      : changedNodeIds.length === 0
        ? ("METADATA_ONLY" as const)
        : ("MATERIALIZATION_REQUIRED" as const);
  const deltaBasis = {
    basis_version: "1.0.0" as const,
    previous_session_digest: previousSessionDigest,
    previous_session_projection_digest: previousSessionProjectionDigest,
    session_digest_changed: sessionDigestChanged,
    session_projection_digest_changed: sessionProjectionDigestChanged,
    delta_mode: deltaMode,
    delta_scope_status: deltaScopeStatus,
    full_rebuild_required:
      (deltaMode === "NO_PREVIOUS_BASELINE" || deltaMode === "SESSION_DELTA") &&
      changedNodeIds.length > 0,
  };

  const summary = {
    node_count: finalizedNodes.length,
    edge_count: edges.length,
    changed_node_count: changedNodeIds.length,
    impacted_node_count: impactedNodeIds.size,
    reusable_node_count: finalizedNodes.filter((node) => !node.impacted_by_changes).length,
    session_digest_changed: sessionDigestChanged,
    session_projection_digest_changed: sessionProjectionDigestChanged,
    delta_mode: deltaMode,
    delta_scope_status: deltaScopeStatus,
    directly_changed_nodes: changedNodeIds,
    impacted_nodes: [...impactedNodeIds].sort(),
    incremental_readiness_status: "PARTIAL" as const,
  };
  const payload = {
    execution_scope: input.executionScope,
    session_id: input.sessionProvenance.session_id,
    session_digest: input.sessionProvenance.session_digest,
    session_projection_digest: input.governanceSession.session_projection_digest,
    previous_report_digest: input.previousReport?.report_digest ?? null,
    invalidation_lineage_status: "EXPLICIT" as const,
    selective_execution_status:
      input.selectiveExecutionStatus ?? ("UNIMPLEMENTED" as const),
    delta_basis: deltaBasis,
    summary,
    edges,
    nodes: finalizedNodes,
  };
  const reportDigest = DigestEngine.digest(payload);

  return {
    report_version: "1.0.0",
    report_digest: reportDigest,
    ...payload,
    claim_boundary:
      "Incremental materialization evidence makes the governance invalidation graph explicit by binding artifact digests to downstream materialization stages. It proves whether the current run is a session-level delta, projection-level delta, or no-op relative to the previous baseline so selective execution can be governed by session and projection digests instead of full regeneration by default.",
  };
}
