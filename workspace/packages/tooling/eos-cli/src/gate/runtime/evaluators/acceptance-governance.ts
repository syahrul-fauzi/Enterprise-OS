import type { GateCGovernancePlatformReadModel } from "../readers/governance-platform-reader.js";
import type { GateCGovernanceBundle } from "../../bundles/governance.js";

export type GateCAcceptanceGovernancePlatformSnapshot = Readonly<{
  constitution_status: string;
  constitution_law_profile: string | null;
  capability_dependency_constitution_status: string;
  dependency_cycles: number | null;
  boundary_violations: number | null;
  dependency_policy_violations: number | null;
  contract_version_registry_status: string;
  contract_version_evolution_status: string;
  contract_version_ready_contracts: number | null;
  ambiguous_provider_bindings: number | null;
  unbounded_consumer_requirements: number | null;
  governance_session_status: string;
  governance_session_verification_status: string;
  governance_session_id: string | null;
  governance_session_scope: string | null;
  governance_session_read_model_count: number | null;
  verification_run_status: string;
  verification_run_id: string | null;
  verification_run_readiness_status: string | null;
  governance_catalog_status: string;
  governance_catalog_report_type_count: number | null;
  capability_governance_status: string;
  capability_governance_compatibility_status: string;
  capability_governance_compatibility_score: number | null;
  capability_governance_unknown_dependency_class_count: number | null;
  capability_governance_contract_drift_count: number | null;
  capability_governance_migration_required_count: number | null;
  architecture_fitness_status: string;
  architecture_fitness_violated_metric_count: number | null;
  governance_incremental_materialization_status: string;
  governance_incremental_reusable_node_count: number | null;
  governance_incremental_delta_mode: string | null;
  governance_incremental_delta_scope_status: string | null;
  governance_incremental_full_rebuild_required: boolean | null;
  trust_framework_status: string;
  trust_framework_count: number | null;
  attestation_lifecycle_status: string;
  attestation_lifecycle_materialization_status: string;
  attestation_lifecycle_terminal_event_readiness_status: string | null;
  attestation_lifecycle_terminal_event_count: number | null;
  attestation_lifecycle_materialized_sample_count: number | null;
  trust_signature_provider_spi: string | null;
  trust_signature_provider_status: string;
  trust_signature_materialization_status: string;
}>;

export type GateCAcceptanceGovernanceEvidenceRefs = Readonly<{
  constitution: string;
  dependencyGraph: string;
  contractGovernance: string;
  contractGovernanceEvolution: string;
  provenance: string;
  provenanceVerification: string;
  verificationRun: string;
  verificationRunVerification: string;
  governanceCatalog: string;
  governanceCatalogVerification: string;
  capabilityGovernance: string;
  capabilityGovernanceVerification: string;
  architectureFitness: string;
  incrementalMaterialization: string;
  incrementalMaterializationVerification: string;
  trustFramework: string;
  attestationLifecycleVerification: string;
  attestationLifecycleMaterialization: string;
}>;

export function evaluateGateCAcceptanceGovernanceGateRuntime(input: {
  readonly governancePlatform: GateCAcceptanceGovernancePlatformSnapshot;
  readonly refs: GateCAcceptanceGovernanceEvidenceRefs;
}): {
  readonly snapshot: Record<string, unknown>;
  readonly blockingConditions: readonly string[];
  readonly overallStatus: "PASS" | "FAIL";
} {
  const governancePlatform = input.governancePlatform;
  const blockingConditions: string[] = [];

  if (governancePlatform.constitution_status !== "PASS") {
    blockingConditions.push("governance_constitution_not_pass");
  }
  if (governancePlatform.capability_dependency_constitution_status !== "PASS") {
    blockingConditions.push("dependency_constitution_not_pass");
  }
  if (governancePlatform.contract_version_registry_status !== "PASS") {
    blockingConditions.push("contract_registry_not_pass");
  }
  if (governancePlatform.contract_version_evolution_status !== "PASS") {
    blockingConditions.push("contract_version_evolution_not_verified");
  }
  if (governancePlatform.governance_session_status !== "COMPLETED") {
    blockingConditions.push("governance_session_not_completed");
  }
  if (governancePlatform.governance_session_verification_status !== "PASS") {
    blockingConditions.push("governance_session_not_verified");
  }
  if (governancePlatform.verification_run_status !== "PASS") {
    blockingConditions.push("verification_run_not_verified");
  }
  if (governancePlatform.governance_catalog_status !== "PASS") {
    blockingConditions.push("governance_catalog_not_verified");
  }
  if (governancePlatform.capability_governance_status !== "PASS") {
    blockingConditions.push("capability_governance_not_verified");
  }
  if (governancePlatform.architecture_fitness_status !== "PASS") {
    blockingConditions.push("architecture_fitness_not_verified");
  }
  if (
    governancePlatform.governance_incremental_materialization_status !== "PASS"
  ) {
    blockingConditions.push("governance_incremental_materialization_not_verified");
  }
  if (governancePlatform.trust_framework_status !== "PASS") {
    blockingConditions.push("trust_framework_not_verified");
  }
  if (governancePlatform.attestation_lifecycle_status !== "PASS") {
    blockingConditions.push("attestation_lifecycle_not_verified");
  }
  if (
    governancePlatform.attestation_lifecycle_materialization_status !== "PASS"
  ) {
    blockingConditions.push("attestation_lifecycle_materialization_not_verified");
  }
  if (governancePlatform.trust_signature_provider_status !== "PASS") {
    blockingConditions.push("trust_signature_provider_not_verified");
  }
  if (governancePlatform.trust_signature_materialization_status !== "PASS") {
    blockingConditions.push("trust_signature_materialization_not_verified");
  }

  return {
    snapshot: {
      constitution: {
        status: governancePlatform.constitution_status,
        law_profile: governancePlatform.constitution_law_profile,
        evidence_ref: input.refs.constitution,
      },
      dependency_graph: {
        status: governancePlatform.capability_dependency_constitution_status,
        dependency_cycles: governancePlatform.dependency_cycles,
        boundary_violations: governancePlatform.boundary_violations,
        dependency_policy_violations:
          governancePlatform.dependency_policy_violations,
        evidence_ref: input.refs.dependencyGraph,
      },
      contract_governance: {
        status: governancePlatform.contract_version_registry_status,
        evolution_status: governancePlatform.contract_version_evolution_status,
        ready_contracts: governancePlatform.contract_version_ready_contracts,
        ambiguous_provider_bindings:
          governancePlatform.ambiguous_provider_bindings,
        unbounded_consumer_requirements:
          governancePlatform.unbounded_consumer_requirements,
        evidence_ref: input.refs.contractGovernance,
        evolution_ref: input.refs.contractGovernanceEvolution,
      },
      provenance: {
        status: governancePlatform.governance_session_status,
        verification_status:
          governancePlatform.governance_session_verification_status,
        session_id: governancePlatform.governance_session_id,
        execution_scope: governancePlatform.governance_session_scope,
        read_model_count: governancePlatform.governance_session_read_model_count,
        evidence_ref: input.refs.provenance,
        verification_ref: input.refs.provenanceVerification,
      },
      verification_run: {
        status: governancePlatform.verification_run_status,
        run_id: governancePlatform.verification_run_id,
        readiness_status: governancePlatform.verification_run_readiness_status,
        evidence_ref: input.refs.verificationRun,
        verification_ref: input.refs.verificationRunVerification,
      },
      governance_catalog: {
        status: governancePlatform.governance_catalog_status,
        report_type_count: governancePlatform.governance_catalog_report_type_count,
        evidence_ref: input.refs.governanceCatalog,
        verification_ref: input.refs.governanceCatalogVerification,
      },
      capability_governance: {
        status: governancePlatform.capability_governance_status,
        compatibility_status:
          governancePlatform.capability_governance_compatibility_status,
        compatibility_score:
          governancePlatform.capability_governance_compatibility_score,
        unknown_dependency_class_count:
          governancePlatform.capability_governance_unknown_dependency_class_count,
        contract_drift_count:
          governancePlatform.capability_governance_contract_drift_count,
        migration_required_count:
          governancePlatform.capability_governance_migration_required_count,
        evidence_ref: input.refs.capabilityGovernance,
        verification_ref: input.refs.capabilityGovernanceVerification,
      },
      architecture_fitness: {
        status: governancePlatform.architecture_fitness_status,
        violated_metric_count:
          governancePlatform.architecture_fitness_violated_metric_count,
        evidence_ref: input.refs.architectureFitness,
      },
      incremental_materialization: {
        status: governancePlatform.governance_incremental_materialization_status,
        reusable_node_count:
          governancePlatform.governance_incremental_reusable_node_count,
        delta_mode: governancePlatform.governance_incremental_delta_mode,
        delta_scope_status:
          governancePlatform.governance_incremental_delta_scope_status,
        full_rebuild_required:
          governancePlatform.governance_incremental_full_rebuild_required,
        evidence_ref: input.refs.incrementalMaterialization,
        verification_ref: input.refs.incrementalMaterializationVerification,
      },
      trust_framework: {
        status: governancePlatform.trust_framework_status,
        framework_count: governancePlatform.trust_framework_count,
        attestation_lifecycle_status:
          governancePlatform.attestation_lifecycle_status,
        attestation_terminal_materialization_status:
          governancePlatform.attestation_lifecycle_materialization_status,
        attestation_terminal_event_readiness_status:
          governancePlatform.attestation_lifecycle_terminal_event_readiness_status,
        attestation_terminal_event_count:
          governancePlatform.attestation_lifecycle_terminal_event_count,
        attestation_terminal_materialized_sample_count:
          governancePlatform.attestation_lifecycle_materialized_sample_count,
        signature_provider_spi: governancePlatform.trust_signature_provider_spi,
        evidence_ref: input.refs.trustFramework,
        attestation_lifecycle_ref: input.refs.attestationLifecycleVerification,
        attestation_lifecycle_materialization_ref:
          input.refs.attestationLifecycleMaterialization,
      },
    },
    blockingConditions,
    overallStatus: blockingConditions.length === 0 ? "PASS" : "FAIL",
  };
}

export function evaluateGateCAcceptanceGovernance(
  bundle: GateCGovernanceBundle,
): {
  readonly snapshot: Record<string, unknown>;
  readonly blockingConditions: readonly string[];
  readonly overallStatus: "PASS" | "FAIL";
} {
  return evaluateGateCAcceptanceGovernanceGateRuntime({
    governancePlatform: bundle.acceptance.platform,
    refs: bundle.acceptance.evidenceRefs,
  });
}

export function evaluateGateCAcceptanceGovernanceGateReadModel(
  input: GateCGovernancePlatformReadModel | GateCGovernanceBundle,
): {
  readonly snapshot: Record<string, unknown>;
  readonly blockingConditions: readonly string[];
  readonly overallStatus: "PASS" | "FAIL";
} {
  if (isGateCGovernanceBundle(input)) {
    return evaluateGateCAcceptanceGovernance(input);
  }
  return evaluateGateCAcceptanceGovernanceGateRuntime({
    governancePlatform: input.snapshot,
    refs: input.refs,
  });
}

function isGateCGovernanceBundle(
  input: GateCGovernancePlatformReadModel | GateCGovernanceBundle,
): input is GateCGovernanceBundle {
  return "acceptance" in input && "platform" in input.acceptance;
}
