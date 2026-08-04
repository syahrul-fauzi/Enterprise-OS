import type { GateCGovernancePlatformSnapshot } from "../read-models/status-snapshot.js";

export type GateCSpecificationBundle = Readonly<{
  conformance: Readonly<{
    hash: string | null;
    status: string;
    warningCount: number | null;
    failureCount: number | null;
    rfcCount: number | null;
    confCount: number | null;
  }>;
  artifactGraph: Readonly<{
    hash: string | null;
    registryArtifactCount: number | null;
    registryEdgeCount: number | null;
    specCount: number | null;
  }>;
  vocabulary: Readonly<{
    auditHash: string | null;
    status: string;
    termCount: number | null;
    duplicateCount: number | null;
  }>;
}>;

export function materializeGateCSpecificationBundle(
  snapshot: GateCGovernancePlatformSnapshot,
): GateCSpecificationBundle {
  return {
    conformance: {
      hash: snapshot.specification_conformance_hash,
      status: snapshot.specification_conformance_status,
      warningCount: snapshot.specification_conformance_warning_count,
      failureCount: snapshot.specification_conformance_failure_count,
      rfcCount: snapshot.specification_rfc_count,
      confCount: snapshot.specification_conf_count,
    },
    artifactGraph: {
      hash: snapshot.specification_artifact_graph_hash,
      registryArtifactCount: snapshot.specification_registry_artifact_count,
      registryEdgeCount: snapshot.specification_registry_edge_count,
      specCount: snapshot.specification_spec_count,
    },
    vocabulary: {
      auditHash: snapshot.specification_vocabulary_audit_hash,
      status: snapshot.specification_vocabulary_status,
      termCount: snapshot.specification_vocabulary_term_count,
      duplicateCount: snapshot.specification_vocabulary_duplicate_count,
    },
  };
}
