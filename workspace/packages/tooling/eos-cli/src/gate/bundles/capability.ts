import type { GateCGovernancePlatformSnapshot } from "../read-models/status-snapshot.js";

export type GateCCapabilityBundle = Readonly<{
  governance: Readonly<{
    indexHash: string | null;
    verificationHash: string | null;
    status: string;
    compatibilityStatus: string;
    compatibilityScore: number | null;
    unknownDependencyClassCount: number | null;
    contractDriftCount: number | null;
    migrationRequiredCount: number | null;
  }>;
  graph: Readonly<{
    hash: string | null;
    verificationHash: string | null;
    status: string;
    governanceHealthStatus: string;
    structuralHealthStatus: string | null;
    architecturalHealthStatus: string | null;
    governanceDomainStatus: string | null;
    evolutionHealthStatus: string | null;
    evidenceHealthStatus: string | null;
    edgeCount: number | null;
    cycleCount: number | null;
    orphanCapabilityCount: number | null;
    forbiddenDependencyCount: number | null;
    layeringViolationCount: number | null;
    abstractionLeakCount: number | null;
    unknownDependencyCount: number | null;
    unstableDependencyCount: number | null;
    ownershipGapCount: number | null;
    migrationDebtCount: number | null;
    capabilityWithoutEvidenceCount: number | null;
    staleEvidenceCount: number | null;
    unverifiableCapabilityCount: number | null;
    orphanedEvidenceCount: number | null;
    inconsistentEvidenceCount: number | null;
    unsignedEvidenceCount: number | null;
    tamperedEvidenceCount: number | null;
    partialEvidenceCount: number | null;
    supersededEvidenceCount: number | null;
    expiredEvidenceCount: number | null;
    warnCapabilityCount: number | null;
    failCapabilityCount: number | null;
  }>;
}>;

export function materializeGateCCapabilityBundle(
  snapshot: GateCGovernancePlatformSnapshot,
): GateCCapabilityBundle {
  return {
    governance: {
      indexHash: snapshot.capability_governance_index_hash,
      verificationHash: snapshot.capability_governance_verification_hash,
      status: snapshot.capability_governance_status,
      compatibilityStatus:
        snapshot.capability_governance_compatibility_status,
      compatibilityScore: snapshot.capability_governance_compatibility_score,
      unknownDependencyClassCount:
        snapshot.capability_governance_unknown_dependency_class_count,
      contractDriftCount:
        snapshot.capability_governance_contract_drift_count,
      migrationRequiredCount:
        snapshot.capability_governance_migration_required_count,
    },
    graph: {
      hash: snapshot.capability_graph_hash,
      verificationHash: snapshot.capability_graph_verification_hash,
      status: snapshot.capability_graph_status,
      governanceHealthStatus:
        snapshot.capability_graph_governance_health_status,
      structuralHealthStatus:
        snapshot.capability_graph_structural_health_status,
      architecturalHealthStatus:
        snapshot.capability_graph_architectural_health_status,
      governanceDomainStatus:
        snapshot.capability_graph_governance_domain_status,
      evolutionHealthStatus:
        snapshot.capability_graph_evolution_health_status,
      evidenceHealthStatus: snapshot.capability_graph_evidence_health_status,
      edgeCount: snapshot.capability_graph_edge_count,
      cycleCount: snapshot.capability_graph_cycle_count,
      orphanCapabilityCount: snapshot.capability_graph_orphan_capability_count,
      forbiddenDependencyCount:
        snapshot.capability_graph_forbidden_dependency_count,
      layeringViolationCount:
        snapshot.capability_graph_layering_violation_count,
      abstractionLeakCount: snapshot.capability_graph_abstraction_leak_count,
      unknownDependencyCount: snapshot.capability_graph_unknown_dependency_count,
      unstableDependencyCount:
        snapshot.capability_graph_unstable_dependency_count,
      ownershipGapCount: snapshot.capability_graph_ownership_gap_count,
      migrationDebtCount: snapshot.capability_graph_migration_debt_count,
      capabilityWithoutEvidenceCount:
        snapshot.capability_graph_capability_without_evidence_count,
      staleEvidenceCount: snapshot.capability_graph_stale_evidence_count,
      unverifiableCapabilityCount:
        snapshot.capability_graph_unverifiable_capability_count,
      orphanedEvidenceCount:
        snapshot.capability_graph_orphaned_evidence_count,
      inconsistentEvidenceCount:
        snapshot.capability_graph_inconsistent_evidence_count,
      unsignedEvidenceCount:
        snapshot.capability_graph_unsigned_evidence_count,
      tamperedEvidenceCount:
        snapshot.capability_graph_tampered_evidence_count,
      partialEvidenceCount: snapshot.capability_graph_partial_evidence_count,
      supersededEvidenceCount:
        snapshot.capability_graph_superseded_evidence_count,
      expiredEvidenceCount: snapshot.capability_graph_expired_evidence_count,
      warnCapabilityCount: snapshot.capability_graph_warn_capability_count,
      failCapabilityCount: snapshot.capability_graph_fail_capability_count,
    },
  };
}
