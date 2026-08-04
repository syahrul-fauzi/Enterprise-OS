import type { GateCAcceptanceGovernanceEvidenceRefs } from "../runtime/evaluators/acceptance-governance.js";
import type { GateCGovernancePlatformSnapshot } from "../read-models/status-snapshot.js";

export type GateCGovernanceBundle = Readonly<{
  acceptance: Readonly<{
    platform: GateCGovernancePlatformSnapshot;
    evidenceRefs: GateCAcceptanceGovernanceEvidenceRefs;
  }>;
  constitution: Readonly<{
    summaryHash: string | null;
    status: string;
    lawProfile: string | null;
  }>;
  dependencyGraph: Readonly<{
    constitutionHash: string | null;
    status: string;
    dependencyCycles: number | null;
    boundaryViolations: number | null;
    dependencyPolicyViolations: number | null;
  }>;
  contracts: Readonly<{
    registryHash: string | null;
    registryStatus: string;
    evolutionHash: string | null;
    evolutionStatus: string;
    readyContractCount: number | null;
    ambiguousProviderBindings: number | null;
    unboundedConsumerRequirements: number | null;
  }>;
  provenance: Readonly<{
    sessionHash: string | null;
    sessionVerificationHash: string | null;
    sessionStatus: string;
    sessionVerificationStatus: string;
    sessionId: string | null;
    sessionScope: string | null;
    sessionReadModelCount: number | null;
  }>;
  verificationRun: Readonly<{
    hash: string | null;
    verificationHash: string | null;
    status: string;
    runId: string | null;
    readinessStatus: string | null;
  }>;
  verification: Readonly<{
    incrementalMaterializationHash: string | null;
    incrementalMaterializationVerificationHash: string | null;
    incrementalMaterializationStatus: string;
    reusableNodeCount: number | null;
    deltaMode: string | null;
    deltaScopeStatus: string | null;
    fullRebuildRequired: boolean | null;
  }>;
  selectiveExecution: Readonly<{
    hash: string | null;
    status: string;
    mode: string | null;
    deltaScopeStatus: string | null;
    reusedNodeCount: number | null;
    rematerializedNodeCount: number | null;
  }>;
  enterpriseControlGraph: Readonly<{
    hash: string | null;
    verificationHash: string | null;
    status: string;
    nodeCount: number | null;
    edgeCount: number | null;
    disconnectedNodeCount: number | null;
  }>;
  catalog: Readonly<{
    status: string;
    reportTypeCount: number | null;
  }>;
  architecture: Readonly<{
    fitnessHash: string | null;
    fitnessStatus: string;
    violatedMetricCount: number | null;
  }>;
}>;

export function materializeGateCGovernanceBundle(input: {
  readonly platform: GateCGovernancePlatformSnapshot;
  readonly evidenceRefs: GateCAcceptanceGovernanceEvidenceRefs;
}): GateCGovernanceBundle {
  const { platform, evidenceRefs } = input;
  return {
    acceptance: {
      platform,
      evidenceRefs,
    },
    constitution: {
      summaryHash: platform.constitution_summary_hash,
      status: platform.constitution_status,
      lawProfile: platform.constitution_law_profile,
    },
    dependencyGraph: {
      constitutionHash: platform.capability_dependency_constitution_hash,
      status: platform.capability_dependency_constitution_status,
      dependencyCycles: platform.dependency_cycles,
      boundaryViolations: platform.boundary_violations,
      dependencyPolicyViolations: platform.dependency_policy_violations,
    },
    contracts: {
      registryHash: platform.contract_version_registry_hash,
      registryStatus: platform.contract_version_registry_status,
      evolutionHash: platform.contract_version_evolution_hash,
      evolutionStatus: platform.contract_version_evolution_status,
      readyContractCount: platform.contract_version_ready_contracts,
      ambiguousProviderBindings: platform.ambiguous_provider_bindings,
      unboundedConsumerRequirements: platform.unbounded_consumer_requirements,
    },
    provenance: {
      sessionHash: platform.governance_session_hash,
      sessionVerificationHash: platform.governance_session_verification_hash,
      sessionStatus: platform.governance_session_status,
      sessionVerificationStatus: platform.governance_session_verification_status,
      sessionId: platform.governance_session_id,
      sessionScope: platform.governance_session_scope,
      sessionReadModelCount: platform.governance_session_read_model_count,
    },
    verificationRun: {
      hash: platform.verification_run_hash,
      verificationHash: platform.verification_run_verification_hash,
      status: platform.verification_run_status,
      runId: platform.verification_run_id,
      readinessStatus: platform.verification_run_readiness_status,
    },
    verification: {
      incrementalMaterializationHash:
        platform.governance_incremental_materialization_hash,
      incrementalMaterializationVerificationHash:
        platform.governance_incremental_materialization_verification_hash,
      incrementalMaterializationStatus:
        platform.governance_incremental_materialization_status,
      reusableNodeCount: platform.governance_incremental_reusable_node_count,
      deltaMode: platform.governance_incremental_delta_mode,
      deltaScopeStatus: platform.governance_incremental_delta_scope_status,
      fullRebuildRequired:
        platform.governance_incremental_full_rebuild_required,
    },
    selectiveExecution: {
      hash: platform.governance_read_model_selective_execution_hash,
      status: platform.governance_read_model_selective_execution_status,
      mode: platform.governance_read_model_selective_execution_mode,
      deltaScopeStatus:
        platform.governance_read_model_selective_execution_delta_scope_status,
      reusedNodeCount:
        platform.governance_read_model_selective_execution_reused_node_count,
      rematerializedNodeCount:
        platform.governance_read_model_selective_execution_rematerialized_node_count,
    },
    enterpriseControlGraph: {
      hash: platform.enterprise_control_graph_hash,
      verificationHash: platform.enterprise_control_graph_verification_hash,
      status: platform.enterprise_control_graph_status,
      nodeCount: platform.enterprise_control_graph_node_count,
      edgeCount: platform.enterprise_control_graph_edge_count,
      disconnectedNodeCount:
        platform.enterprise_control_graph_disconnected_node_count,
    },
    catalog: {
      status: platform.governance_catalog_status,
      reportTypeCount: platform.governance_catalog_report_type_count,
    },
    architecture: {
      fitnessHash: platform.architecture_fitness_hash,
      fitnessStatus: platform.architecture_fitness_status,
      violatedMetricCount: platform.architecture_fitness_violated_metric_count,
    },
  };
}
