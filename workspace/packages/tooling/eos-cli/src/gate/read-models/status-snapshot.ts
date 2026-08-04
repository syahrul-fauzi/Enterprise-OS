import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type GateCGovernancePlatformSnapshot = Readonly<{
  constitution_summary_hash: string | null;
  constitution_status: string;
  constitution_law_profile: string | null;
  capability_dependency_constitution_hash: string | null;
  capability_dependency_constitution_status: string;
  dependency_cycles: number | null;
  boundary_violations: number | null;
  dependency_policy_violations: number | null;
  contract_version_registry_hash: string | null;
  contract_version_registry_status: string;
  contract_version_evolution_hash: string | null;
  contract_version_evolution_status: string;
  contract_version_ready_contracts: number | null;
  ambiguous_provider_bindings: number | null;
  unbounded_consumer_requirements: number | null;
  governance_session_hash: string | null;
  governance_session_verification_hash: string | null;
  governance_session_status: string;
  governance_session_verification_status: string;
  governance_session_id: string | null;
  governance_session_scope: string | null;
  governance_session_read_model_count: number | null;
  verification_run_hash: string | null;
  verification_run_verification_hash: string | null;
  verification_run_status: string;
  verification_run_id: string | null;
  verification_run_readiness_status: string | null;
  governance_catalog_hash: string | null;
  governance_catalog_verification_hash: string | null;
  governance_catalog_status: string;
  governance_catalog_report_type_count: number | null;
  architecture_fitness_hash: string | null;
  architecture_fitness_status: string;
  architecture_fitness_violated_metric_count: number | null;
  capability_governance_index_hash: string | null;
  capability_governance_verification_hash: string | null;
  capability_governance_status: string;
  capability_governance_unknown_dependency_class_count: number | null;
  capability_governance_compatibility_status: string;
  capability_governance_compatibility_score: number | null;
  capability_governance_contract_drift_count: number | null;
  capability_governance_migration_required_count: number | null;
  capability_graph_hash: string | null;
  capability_graph_verification_hash: string | null;
  capability_graph_status: string;
  capability_graph_governance_health_status: string;
  capability_graph_structural_health_status: string | null;
  capability_graph_architectural_health_status: string | null;
  capability_graph_governance_domain_status: string | null;
  capability_graph_evolution_health_status: string | null;
  capability_graph_evidence_health_status: string | null;
  capability_graph_edge_count: number | null;
  capability_graph_cycle_count: number | null;
  capability_graph_orphan_capability_count: number | null;
  capability_graph_forbidden_dependency_count: number | null;
  capability_graph_layering_violation_count: number | null;
  capability_graph_abstraction_leak_count: number | null;
  capability_graph_unknown_dependency_count: number | null;
  capability_graph_unstable_dependency_count: number | null;
  capability_graph_ownership_gap_count: number | null;
  capability_graph_migration_debt_count: number | null;
  capability_graph_capability_without_evidence_count: number | null;
  capability_graph_stale_evidence_count: number | null;
  capability_graph_unverifiable_capability_count: number | null;
  capability_graph_orphaned_evidence_count: number | null;
  capability_graph_inconsistent_evidence_count: number | null;
  capability_graph_unsigned_evidence_count: number | null;
  capability_graph_tampered_evidence_count: number | null;
  capability_graph_partial_evidence_count: number | null;
  capability_graph_superseded_evidence_count: number | null;
  capability_graph_expired_evidence_count: number | null;
  capability_graph_warn_capability_count: number | null;
  capability_graph_fail_capability_count: number | null;
  enterprise_control_graph_hash: string | null;
  enterprise_control_graph_verification_hash: string | null;
  enterprise_control_graph_status: string;
  enterprise_control_graph_node_count: number | null;
  enterprise_control_graph_edge_count: number | null;
  enterprise_control_graph_disconnected_node_count: number | null;
  governance_incremental_materialization_hash: string | null;
  governance_incremental_materialization_verification_hash: string | null;
  governance_incremental_materialization_status: string;
  governance_incremental_reusable_node_count: number | null;
  governance_incremental_delta_mode: string | null;
  governance_incremental_delta_scope_status: string | null;
  governance_incremental_full_rebuild_required: boolean | null;
  governance_read_model_selective_execution_hash: string | null;
  governance_read_model_selective_execution_status: string;
  governance_read_model_selective_execution_mode: string | null;
  governance_read_model_selective_execution_delta_scope_status: string | null;
  governance_read_model_selective_execution_reused_node_count: number | null;
  governance_read_model_selective_execution_rematerialized_node_count:
    | number
    | null;
  trust_framework_hash: string | null;
  trust_framework_status: string;
  trust_framework_verification_hash: string | null;
  attestation_lifecycle_verification_hash: string | null;
  attestation_lifecycle_status: string;
  attestation_lifecycle_terminal_event_readiness_status: string;
  attestation_lifecycle_terminal_event_count: number | null;
  attestation_lifecycle_materialization_hash: string | null;
  attestation_lifecycle_materialization_status: string;
  attestation_lifecycle_materialized_sample_count: number | null;
  trust_signature_provider_registry_hash: string | null;
  trust_signature_provider_verification_hash: string | null;
  trust_signature_provider_status: string;
  trust_signature_provider_adapter_count: number | null;
  trust_signature_materialization_hash: string | null;
  trust_signature_materialization_status: string;
  trust_signature_materialized_attestation_count: number | null;
  trust_framework_count: number | null;
  trust_signature_provider_spi: string | null;
  trust_frameworks_with_full_spi_coverage: number | null;
  specification_conformance_hash: string | null;
  specification_conformance_status: string;
  specification_conformance_warning_count: number | null;
  specification_conformance_failure_count: number | null;
  specification_rfc_count: number | null;
  specification_conf_count: number | null;
  specification_artifact_graph_hash: string | null;
  specification_registry_artifact_count: number | null;
  specification_registry_edge_count: number | null;
  specification_spec_count: number | null;
  specification_vocabulary_audit_hash: string | null;
  specification_vocabulary_status: string;
  specification_vocabulary_term_count: number | null;
  specification_vocabulary_duplicate_count: number | null;
  decision_quality_hash: string | null;
  decision_quality_status: string;
  decision_quality_decision_count: number | null;
  decision_quality_traceability_coverage: number | null;
  decision_quality_outcome_coverage: number | null;
  decision_quality_learning_closure: number | null;
  decision_quality_reproducibility: number | null;
  decision_quality_reversibility: number | null;
  decision_quality_impact_graph_completeness: number | null;
  decision_quality_engineering_leverage_measurement_coverage: number | null;
  decision_quality_effectiveness: number | null;
  decision_quality_success_rate: number | null;
  decision_quality_false_decision_rate: number | null;
  decision_quality_reversal_rate: number | null;
  decision_quality_evidence_utilization_rate: number | null;
  decision_quality_knowledge_reuse_rate: number | null;
  decision_quality_evidence_strength_index: number | null;
  decision_quality_outcome_improvement_rate: number | null;
  decision_quality_decision_confidence_index: number | null;
  decision_quality_knowledge_weighted_quality_index: number | null;
  decision_quality_mean_time_to_outcome_ms: number | null;
  decision_quality_learning_velocity_ms: number | null;
  decision_quality_confidence_growth: number | null;
  learning_intelligence_hash: string | null;
  learning_intelligence_status: string;
  learning_intelligence_decision_count: number | null;
  learning_intelligence_outcome_count: number | null;
  learning_intelligence_outcome_registry_coverage: number | null;
  learning_intelligence_decision_quality_index: number | null;
  learning_intelligence_learning_velocity_ms: number | null;
  learning_intelligence_knowledge_gain_units: number | null;
  learning_intelligence_knowledge_gain: number | null;
  learning_intelligence_knowledge_object_count: number | null;
  learning_intelligence_operationalized_knowledge_count: number | null;
  learning_intelligence_knowledge_availability_rate: number | null;
  learning_intelligence_knowledge_reuse_rate: number | null;
  learning_intelligence_reused_knowledge_object_count: number | null;
  learning_intelligence_improved_knowledge_object_count: number | null;
  learning_intelligence_knowledge_lineage_count: number | null;
  learning_intelligence_knowledge_lineage_preview:
    | readonly JsonValue[]
    | null;
  learning_intelligence_recommendation_effectiveness_rate: number | null;
  learning_intelligence_decision_pattern_change_rate: number | null;
  learning_intelligence_recommendation_acceptance_rate: number | null;
  learning_intelligence_behavior_change_rate: number | null;
  learning_intelligence_engineering_leverage_ratio: number | null;
  learning_intelligence_repeated_mistake_count: number | null;
  learning_intelligence_future_decision_improvement_rate: number | null;
  evidence_producer_convergence_hash: string | null;
  evidence_producer_convergence_status: string;
  evidence_producer_count: number | null;
  evidence_producer_target_count: number | null;
  evidence_producer_registered_target_count: number | null;
  evidence_producer_target_coverage_ratio: number | null;
}>;

export type GateCProjectionSourceSnapshot = Readonly<{
  coverage_matrix_hash: string;
  proof_ledger_hash: string;
  acceptance_contract_hash: string;
  acceptance_decisions_hash: string | null;
  acceptance_evidence_file_count: number;
  acceptance_evidence_inventory_hash: string | null;
  constitution_summary_hash: string | null;
  capability_dependency_constitution_hash: string | null;
  contract_version_registry_hash: string | null;
  contract_version_evolution_hash: string | null;
  governance_session_hash: string | null;
  governance_session_verification_hash: string | null;
  governance_incremental_materialization_hash: string | null;
  governance_incremental_materialization_verification_hash: string | null;
  trust_framework_hash: string | null;
  trust_framework_verification_hash: string | null;
  trust_signature_provider_registry_hash: string | null;
  trust_signature_provider_verification_hash: string | null;
  trust_signature_materialization_hash: string | null;
  specification_conformance_hash: string | null;
  specification_artifact_graph_hash: string | null;
  specification_vocabulary_audit_hash: string | null;
  learning_intelligence_hash: string | null;
}>;

export type GateCGovernanceSnapshotPaths = Readonly<{
  constitutionSummaryPath: string;
  capabilityDependencyConstitutionPath: string;
  contractVersionRegistryPath: string;
  contractVersionEvolutionPath: string;
  governanceSessionPath: string;
  governanceSessionVerificationPath: string;
  verificationRunPath: string;
  verificationRunVerificationPath: string;
  governanceCatalogPath: string;
  governanceCatalogVerificationPath: string;
  architectureFitnessPath: string;
  capabilityGovernanceIndexPath: string;
  capabilityGovernanceVerificationPath: string;
  capabilityGraphPath: string;
  capabilityGraphVerificationPath: string;
  enterpriseControlGraphPath: string;
  enterpriseControlGraphVerificationPath: string;
  governanceIncrementalMaterializationPath: string;
  governanceIncrementalMaterializationVerificationPath: string;
  governanceReadModelSelectiveExecutionPath: string;
  trustFrameworkPath: string;
  trustFrameworkVerificationPath: string;
  attestationLifecycleVerificationPath: string;
  attestationLifecycleMaterializationPath: string;
  trustSignatureProviderRegistryPath: string;
  trustSignatureProviderVerificationPath: string;
  trustSignatureMaterializationPath: string;
  specificationConformancePath: string;
  specificationArtifactGraphPath: string;
  specificationVocabularyAuditPath: string;
  decisionQualityReportPath: string;
  learningIntelligenceReportPath: string;
  evidenceProducerConvergenceReportPath: string;
}>;

export type GateCProjectionSourceSnapshotPaths =
  GateCGovernanceSnapshotPaths &
    Readonly<{
      acceptanceDir: string;
      coverageMatrixPath: string;
      runProofLedgerPath: string;
      acceptanceContractPath: string;
      acceptanceDecisionsPath: string;
    }>;

export function buildProjectionSourceSnapshotRuntime(input: {
  readonly paths: GateCProjectionSourceSnapshotPaths;
}): GateCProjectionSourceSnapshot {
  const acceptanceEvidence = computeAcceptanceEvidenceInventory(
    input.paths.acceptanceDir,
  );
  const governancePlatform = buildGovernancePlatformSnapshotRuntime({
    paths: input.paths,
  });
  return {
    coverage_matrix_hash: hashFile(input.paths.coverageMatrixPath),
    proof_ledger_hash: hashFile(input.paths.runProofLedgerPath),
    acceptance_contract_hash: hashFile(input.paths.acceptanceContractPath),
    acceptance_decisions_hash: existsSync(input.paths.acceptanceDecisionsPath)
      ? hashFile(input.paths.acceptanceDecisionsPath)
      : null,
    acceptance_evidence_file_count: acceptanceEvidence.fileCount,
    acceptance_evidence_inventory_hash: acceptanceEvidence.inventoryHash,
    constitution_summary_hash: governancePlatform.constitution_summary_hash,
    capability_dependency_constitution_hash:
      governancePlatform.capability_dependency_constitution_hash,
    contract_version_registry_hash:
      governancePlatform.contract_version_registry_hash,
    contract_version_evolution_hash:
      governancePlatform.contract_version_evolution_hash,
    governance_session_hash: governancePlatform.governance_session_hash,
    governance_session_verification_hash:
      governancePlatform.governance_session_verification_hash,
    governance_incremental_materialization_hash:
      governancePlatform.governance_incremental_materialization_hash,
    governance_incremental_materialization_verification_hash:
      governancePlatform.governance_incremental_materialization_verification_hash,
    trust_framework_hash: governancePlatform.trust_framework_hash,
    trust_framework_verification_hash:
      governancePlatform.trust_framework_verification_hash,
    trust_signature_provider_registry_hash:
      governancePlatform.trust_signature_provider_registry_hash,
    trust_signature_provider_verification_hash:
      governancePlatform.trust_signature_provider_verification_hash,
    trust_signature_materialization_hash:
      governancePlatform.trust_signature_materialization_hash,
    specification_conformance_hash:
      governancePlatform.specification_conformance_hash,
    specification_artifact_graph_hash:
      governancePlatform.specification_artifact_graph_hash,
    specification_vocabulary_audit_hash:
      governancePlatform.specification_vocabulary_audit_hash,
    learning_intelligence_hash: governancePlatform.learning_intelligence_hash,
  };
}

export function buildGovernancePlatformSnapshotRuntime(input: {
  readonly paths: GateCGovernanceSnapshotPaths;
}): GateCGovernancePlatformSnapshot {
  const constitutionSummary = readJsonRecordIfExists(
    input.paths.constitutionSummaryPath,
  );
  const dependencyConstitution = readJsonRecordIfExists(
    input.paths.capabilityDependencyConstitutionPath,
  );
  const contractVersionRegistry = readJsonRecordIfExists(
    input.paths.contractVersionRegistryPath,
  );
  const contractVersionEvolution = readJsonRecordIfExists(
    input.paths.contractVersionEvolutionPath,
  );
  const governanceSession = readJsonRecordIfExists(
    input.paths.governanceSessionPath,
  );
  const governanceSessionVerification = readJsonRecordIfExists(
    input.paths.governanceSessionVerificationPath,
  );
  const verificationRun = readJsonRecordIfExists(input.paths.verificationRunPath);
  const verificationRunVerification = readJsonRecordIfExists(
    input.paths.verificationRunVerificationPath,
  );
  const governanceCatalog = readJsonRecordIfExists(
    input.paths.governanceCatalogPath,
  );
  const governanceCatalogVerification = readJsonRecordIfExists(
    input.paths.governanceCatalogVerificationPath,
  );
  const architectureFitness = readJsonRecordIfExists(
    input.paths.architectureFitnessPath,
  );
  const capabilityGovernanceIndex = readJsonRecordIfExists(
    input.paths.capabilityGovernanceIndexPath,
  );
  const capabilityGovernanceVerification = readJsonRecordIfExists(
    input.paths.capabilityGovernanceVerificationPath,
  );
  const capabilityGraph = readJsonRecordIfExists(input.paths.capabilityGraphPath);
  const capabilityGraphVerification = readJsonRecordIfExists(
    input.paths.capabilityGraphVerificationPath,
  );
  const enterpriseControlGraph = readJsonRecordIfExists(
    input.paths.enterpriseControlGraphPath,
  );
  const enterpriseControlGraphVerification = readJsonRecordIfExists(
    input.paths.enterpriseControlGraphVerificationPath,
  );
  const governanceIncrementalMaterialization = readJsonRecordIfExists(
    input.paths.governanceIncrementalMaterializationPath,
  );
  const governanceIncrementalMaterializationVerification = readJsonRecordIfExists(
    input.paths.governanceIncrementalMaterializationVerificationPath,
  );
  const governanceReadModelSelectiveExecution = readJsonRecordIfExists(
    input.paths.governanceReadModelSelectiveExecutionPath,
  );
  const trustFramework = readJsonRecordIfExists(input.paths.trustFrameworkPath);
  const trustFrameworkVerification = readJsonRecordIfExists(
    input.paths.trustFrameworkVerificationPath,
  );
  const attestationLifecycleVerification = readJsonRecordIfExists(
    input.paths.attestationLifecycleVerificationPath,
  );
  const attestationLifecycleMaterialization = readJsonRecordIfExists(
    input.paths.attestationLifecycleMaterializationPath,
  );
  const trustSignatureProviderRegistry = readJsonRecordIfExists(
    input.paths.trustSignatureProviderRegistryPath,
  );
  const trustSignatureProviderVerification = readJsonRecordIfExists(
    input.paths.trustSignatureProviderVerificationPath,
  );
  const trustSignatureMaterialization = readJsonRecordIfExists(
    input.paths.trustSignatureMaterializationPath,
  );
  const specificationConformance = readJsonRecordIfExists(
    input.paths.specificationConformancePath,
  );
  const specificationArtifactGraph = readJsonRecordIfExists(
    input.paths.specificationArtifactGraphPath,
  );
  const specificationVocabularyAudit = readJsonRecordIfExists(
    input.paths.specificationVocabularyAuditPath,
  );
  const decisionQualityReport = readJsonRecordIfExists(
    input.paths.decisionQualityReportPath,
  );
  const learningIntelligenceReport = readJsonRecordIfExists(
    input.paths.learningIntelligenceReportPath,
  );
  const evidenceProducerConvergenceReport = readJsonRecordIfExists(
    input.paths.evidenceProducerConvergenceReportPath,
  );
  const dependencySummary = dependencyConstitution
    ? readNestedRecord(
        dependencyConstitution,
        "summary",
        "capability_dependency_constitution",
      )
    : null;
  const contractSummary = contractVersionRegistry
    ? readNestedRecord(
        contractVersionRegistry,
        "summary",
        "contract_version_registry",
      )
    : null;
  const contractEvolutionSummary = contractVersionEvolution
    ? readNestedRecord(
        contractVersionEvolution,
        "summary",
        "contract_version_evolution",
      )
    : null;
  const governanceSessionVerificationSummary = governanceSessionVerification
    ? readNestedRecord(
        governanceSessionVerification,
        "summary",
        "governance_session_verification",
      )
    : null;
  const verificationRunVerificationSummary = verificationRunVerification
    ? readNestedRecord(
        verificationRunVerification,
        "summary",
        "verification_run_verification",
      )
    : null;
  const verificationRunReadiness = verificationRun
    ? readNestedRecord(verificationRun, "readiness", "verification_run")
    : null;
  const governanceCatalogVerificationSummary = governanceCatalogVerification
    ? readNestedRecord(
        governanceCatalogVerification,
        "summary",
        "governance_catalog_verification",
      )
    : null;
  const governanceCatalogVerificationCatalog = governanceCatalogVerification
    ? readNestedRecord(
        governanceCatalogVerification,
        "catalog",
        "governance_catalog_verification",
      )
    : null;
  const architectureFitnessSummary = architectureFitness
    ? readNestedRecord(architectureFitness, "summary", "architecture_fitness")
    : null;
  const capabilityGovernanceVerificationSummary =
    capabilityGovernanceVerification
      ? readNestedRecord(
          capabilityGovernanceVerification,
          "summary",
          "capability_governance_verification",
        )
      : null;
  const capabilityGraphSummary = capabilityGraph
    ? readNestedRecord(capabilityGraph, "summary", "capability_graph")
    : null;
  const capabilityGraphVerificationSummary = capabilityGraphVerification
    ? readNestedRecord(
        capabilityGraphVerification,
        "summary",
        "capability_graph_verification",
      )
    : null;
  const capabilityGraphVerificationMetrics = capabilityGraphVerification
    ? readNestedRecord(
        capabilityGraphVerification,
        "metrics",
        "capability_graph_verification",
      )
    : null;
  const capabilityGraphHealthDomains =
    capabilityGraphVerification &&
    capabilityGraphVerification.health_domains !== undefined
      ? readNestedRecord(
          capabilityGraphVerification,
          "health_domains",
          "capability_graph_verification",
        )
      : null;
  const capabilityGraphStructuralHealth = capabilityGraphHealthDomains
    ? readNestedRecord(
        capabilityGraphHealthDomains,
        "structural_health",
        "capability_graph_verification.health_domains",
      )
    : null;
  const capabilityGraphArchitecturalHealth = capabilityGraphHealthDomains
    ? readNestedRecord(
        capabilityGraphHealthDomains,
        "architectural_health",
        "capability_graph_verification.health_domains",
      )
    : null;
  const capabilityGraphGovernanceDomain = capabilityGraphHealthDomains
    ? readNestedRecord(
        capabilityGraphHealthDomains,
        "governance_health",
        "capability_graph_verification.health_domains",
      )
    : null;
  const capabilityGraphEvolutionHealth = capabilityGraphHealthDomains
    ? readNestedRecord(
        capabilityGraphHealthDomains,
        "evolution_health",
        "capability_graph_verification.health_domains",
      )
    : null;
  const capabilityGraphEvidenceHealth = capabilityGraphHealthDomains
    ? readNestedRecord(
        capabilityGraphHealthDomains,
        "evidence_health",
        "capability_graph_verification.health_domains",
      )
    : null;
  const enterpriseControlGraphSummary = enterpriseControlGraph
    ? readNestedRecord(
        enterpriseControlGraph,
        "summary",
        "enterprise_control_graph",
      )
    : null;
  const enterpriseControlGraphVerificationSummary =
    enterpriseControlGraphVerification
      ? readNestedRecord(
          enterpriseControlGraphVerification,
          "summary",
          "enterprise_control_graph_verification",
        )
      : null;
  const enterpriseControlGraphVerificationMetrics =
    enterpriseControlGraphVerification
      ? readNestedRecord(
          enterpriseControlGraphVerification,
          "metrics",
          "enterprise_control_graph_verification",
        )
      : null;
  const governanceIncrementalMaterializationVerificationSummary =
    governanceIncrementalMaterializationVerification
      ? readNestedRecord(
          governanceIncrementalMaterializationVerification,
          "summary",
          "governance_incremental_materialization_verification",
        )
      : null;
  const governanceIncrementalMaterializationSummary =
    governanceIncrementalMaterialization
      ? readNestedRecord(
          governanceIncrementalMaterialization,
          "summary",
          "governance_incremental_materialization",
        )
      : null;
  const governanceIncrementalMaterializationDeltaBasis =
    governanceIncrementalMaterialization
      ? readNestedRecord(
          governanceIncrementalMaterialization,
          "delta_basis",
          "governance_incremental_materialization",
        )
      : null;
  const governanceReadModelSelectiveExecutionSummary =
    governanceReadModelSelectiveExecution
      ? readNestedRecord(
          governanceReadModelSelectiveExecution,
          "summary",
          "governance_read_model_selective_execution",
        )
      : null;
  const governanceReadModelSelectiveExecutionDeltaBasis =
    governanceReadModelSelectiveExecution
      ? readNestedRecord(
          governanceReadModelSelectiveExecution,
          "delta_basis",
          "governance_read_model_selective_execution",
        )
      : null;
  const trustFrameworks = trustFramework?.frameworks;
  const trustFrameworkCount = Array.isArray(trustFrameworks)
    ? trustFrameworks.length
    : null;
  const firstTrustFramework =
    Array.isArray(trustFrameworks) && trustFrameworks.length > 0
      ? asMutableRecord(trustFrameworks[0], "trust_framework.frameworks[0]")
      : null;
  const firstSignatureProvider =
    firstTrustFramework &&
    Array.isArray(firstTrustFramework.signature_providers) &&
    firstTrustFramework.signature_providers.length > 0
      ? asMutableRecord(
          firstTrustFramework.signature_providers[0],
          "trust_framework.frameworks[0].signature_providers[0]",
        )
      : null;
  const trustFrameworkVerificationSummary = trustFrameworkVerification
    ? readNestedRecord(
        trustFrameworkVerification,
        "summary",
        "trust_framework_verification",
      )
    : null;
  const attestationLifecycleVerificationSummary =
    attestationLifecycleVerification
      ? readNestedRecord(
          attestationLifecycleVerification,
          "summary",
          "attestation_lifecycle_verification",
        )
      : null;
  const attestationLifecycleVerificationStream =
    attestationLifecycleVerification
      ? readNestedRecord(
          attestationLifecycleVerification,
          "stream",
          "attestation_lifecycle_verification",
        )
      : null;
  const attestationLifecycleMaterializationSummary =
    attestationLifecycleMaterialization
      ? readNestedRecord(
          attestationLifecycleMaterialization,
          "summary",
          "attestation_lifecycle_materialization",
        )
      : null;
  const trustSignatureProviderVerificationSummary =
    trustSignatureProviderVerification
      ? readNestedRecord(
          trustSignatureProviderVerification,
          "summary",
          "trust_signature_provider_verification",
        )
      : null;
  const trustSignatureMaterializationSummary = trustSignatureMaterialization
    ? readNestedRecord(
        trustSignatureMaterialization,
        "summary",
        "trust_signature_materialization",
      )
    : null;
  const specificationConformanceSummary = specificationConformance
    ? readNestedRecord(
        specificationConformance,
        "summary",
        "specification_conformance",
      )
    : null;
  const specificationArtifactGraphSummary = specificationArtifactGraph
    ? readNestedRecord(
        specificationArtifactGraph,
        "summary",
        "specification_artifact_graph",
      )
    : null;
  const specificationArtifactGraphArtifacts = specificationArtifactGraph
    ? asArray(
        specificationArtifactGraph.artifacts,
        "specification_artifact_graph.artifacts",
      )
    : null;
  const specificationVocabularyAuditSummary = specificationVocabularyAudit
    ? readNestedRecord(
        specificationVocabularyAudit,
        "summary",
        "specification_vocabulary_audit",
      )
    : null;
  const decisionQualitySummary = decisionQualityReport
    ? readNestedRecord(
        decisionQualityReport,
        "summary",
        "decision_quality_report",
      )
    : null;
  const learningIntelligenceSummary = learningIntelligenceReport
    ? readNestedRecord(
        learningIntelligenceReport,
        "summary",
        "learning_intelligence_report",
      )
    : null;
  const evidenceProducerConvergenceSummary = evidenceProducerConvergenceReport
    ? readNestedRecord(
        evidenceProducerConvergenceReport,
        "summary",
        "evidence_producer_convergence_report",
      )
    : null;
  const specificationSpecCount = specificationArtifactGraphArtifacts
    ? specificationArtifactGraphArtifacts.filter((artifact, index) => {
        const artifactRecord = asMutableRecord(
          artifact,
          `specification_artifact_graph.artifacts[${index}]`,
        ) as Record<string, JsonValue>;
        return readOptionalString(artifactRecord, "artifact_type") === "SPEC";
      }).length
    : null;

  return {
    constitution_summary_hash: constitutionSummary
      ? hashFile(input.paths.constitutionSummaryPath)
      : null,
    constitution_status: constitutionSummary
      ? asString(constitutionSummary.status, "constitution_summary.status")
      : "UNVERIFIED",
    constitution_law_profile: constitutionSummary
      ? readOptionalString(constitutionSummary, "law_profile")
      : null,
    capability_dependency_constitution_hash: dependencyConstitution
      ? hashFile(input.paths.capabilityDependencyConstitutionPath)
      : null,
    capability_dependency_constitution_status: dependencySummary
      ? asString(
          dependencySummary.overall_status,
          "capability_dependency_constitution.summary.overall_status",
        )
      : "UNVERIFIED",
    dependency_cycles: dependencySummary
      ? readOptionalNumber(dependencySummary, "dependency_cycles")
      : null,
    boundary_violations: dependencySummary
      ? readOptionalNumber(dependencySummary, "boundary_violations")
      : null,
    dependency_policy_violations: dependencySummary
      ? readOptionalNumber(dependencySummary, "dependency_policy_violations")
      : null,
    contract_version_registry_hash: contractVersionRegistry
      ? hashFile(input.paths.contractVersionRegistryPath)
      : null,
    contract_version_registry_status: contractSummary
      ? asString(
          contractSummary.overall_status,
          "contract_version_registry.summary.overall_status",
        )
      : "UNVERIFIED",
    contract_version_evolution_hash: contractVersionEvolution
      ? hashFile(input.paths.contractVersionEvolutionPath)
      : null,
    contract_version_evolution_status: contractEvolutionSummary
      ? asString(
          contractEvolutionSummary.overall_status,
          "contract_version_evolution.summary.overall_status",
        )
      : "UNVERIFIED",
    contract_version_ready_contracts: contractEvolutionSummary
      ? readOptionalNumber(contractEvolutionSummary, "ready_contracts")
      : null,
    ambiguous_provider_bindings: contractSummary
      ? readOptionalNumber(contractSummary, "ambiguous_provider_bindings")
      : null,
    unbounded_consumer_requirements: contractSummary
      ? readOptionalNumber(contractSummary, "unbounded_consumer_requirements")
      : null,
    governance_session_hash: governanceSession
      ? hashFile(input.paths.governanceSessionPath)
      : null,
    governance_session_verification_hash: governanceSessionVerification
      ? hashFile(input.paths.governanceSessionVerificationPath)
      : null,
    governance_session_status: governanceSession
      ? asString(governanceSession.session_status, "governance_session.session_status")
      : "UNVERIFIED",
    governance_session_verification_status:
      governanceSessionVerificationSummary
        ? asString(
            governanceSessionVerificationSummary.overall_status,
            "governance_session_verification.summary.overall_status",
          )
        : "UNVERIFIED",
    governance_session_id: governanceSession
      ? readOptionalString(governanceSession, "session_id")
      : null,
    governance_session_scope: governanceSession
      ? readOptionalString(governanceSession, "execution_scope")
      : null,
    governance_session_read_model_count: governanceSessionVerification
      ? readOptionalNumber(
          readNestedRecord(
            governanceSessionVerification,
            "session",
            "governance_session_verification",
          ),
          "read_model_count",
        )
      : null,
    verification_run_hash: verificationRun
      ? hashFile(input.paths.verificationRunPath)
      : null,
    verification_run_verification_hash: verificationRunVerification
      ? hashFile(input.paths.verificationRunVerificationPath)
      : null,
    verification_run_status: verificationRunVerificationSummary
      ? asString(
          verificationRunVerificationSummary.overall_status,
          "verification_run_verification.summary.overall_status",
        )
      : verificationRun
        ? "DECLARED"
        : "UNVERIFIED",
    verification_run_id: verificationRun
      ? readOptionalString(verificationRun, "run_id")
      : null,
    verification_run_readiness_status: verificationRunReadiness
      ? readOptionalString(verificationRunReadiness, "overall_status")
      : null,
    governance_catalog_hash: governanceCatalog
      ? hashFile(input.paths.governanceCatalogPath)
      : null,
    governance_catalog_verification_hash: governanceCatalogVerification
      ? hashFile(input.paths.governanceCatalogVerificationPath)
      : null,
    governance_catalog_status: governanceCatalogVerificationSummary
      ? asString(
          governanceCatalogVerificationSummary.overall_status,
          "governance_catalog_verification.summary.overall_status",
        )
      : governanceCatalog
        ? "DECLARED"
        : "UNVERIFIED",
    governance_catalog_report_type_count: governanceCatalogVerificationCatalog
      ? readOptionalNumber(governanceCatalogVerificationCatalog, "report_type_count")
      : null,
    architecture_fitness_hash: architectureFitness
      ? hashFile(input.paths.architectureFitnessPath)
      : null,
    architecture_fitness_status: architectureFitnessSummary
      ? asString(
          architectureFitnessSummary.fitness_status,
          "architecture_fitness.summary.fitness_status",
        )
      : "UNVERIFIED",
    architecture_fitness_violated_metric_count: architectureFitnessSummary
      ? readOptionalNumber(architectureFitnessSummary, "violated_metric_count")
      : null,
    capability_governance_index_hash: capabilityGovernanceIndex
      ? hashFile(input.paths.capabilityGovernanceIndexPath)
      : null,
    capability_governance_verification_hash: capabilityGovernanceVerification
      ? hashFile(input.paths.capabilityGovernanceVerificationPath)
      : null,
    capability_governance_status: capabilityGovernanceVerificationSummary
      ? asString(
          capabilityGovernanceVerificationSummary.overall_status,
          "capability_governance_verification.summary.overall_status",
        )
      : capabilityGovernanceIndex
        ? "DECLARED"
        : "UNVERIFIED",
    capability_governance_unknown_dependency_class_count:
      capabilityGovernanceVerificationSummary
        ? readOptionalNumber(
            capabilityGovernanceVerificationSummary,
            "unknown_dependency_class_count",
          )
        : null,
    capability_governance_compatibility_status:
      capabilityGovernanceVerificationSummary
        ? asString(
            capabilityGovernanceVerificationSummary.compatibility_governance_status,
            "capability_governance_verification.summary.compatibility_governance_status",
          )
        : capabilityGovernanceIndex
          ? "DECLARED"
          : "UNVERIFIED",
    capability_governance_compatibility_score:
      capabilityGovernanceVerificationSummary
        ? readOptionalNumber(
            capabilityGovernanceVerificationSummary,
            "compatibility_score",
          )
        : null,
    capability_governance_contract_drift_count:
      capabilityGovernanceVerificationSummary
        ? readOptionalNumber(
            capabilityGovernanceVerificationSummary,
            "contract_drift_count",
          )
        : null,
    capability_governance_migration_required_count:
      capabilityGovernanceVerificationSummary
        ? readOptionalNumber(
            capabilityGovernanceVerificationSummary,
            "migration_required_count",
          )
        : null,
    capability_graph_hash: capabilityGraph
      ? hashFile(input.paths.capabilityGraphPath)
      : null,
    capability_graph_verification_hash: capabilityGraphVerification
      ? hashFile(input.paths.capabilityGraphVerificationPath)
      : null,
    capability_graph_status: capabilityGraphVerificationSummary
      ? asString(
          capabilityGraphVerificationSummary.health_status,
          "capability_graph_verification.summary.health_status",
        )
      : capabilityGraph
        ? "DECLARED"
        : "UNVERIFIED",
    capability_graph_governance_health_status: capabilityGraphVerificationSummary
      ? asString(
          capabilityGraphVerificationSummary.governance_health_status,
          "capability_graph_verification.summary.governance_health_status",
        )
      : capabilityGraph
        ? "DECLARED"
        : "UNVERIFIED",
    capability_graph_structural_health_status: capabilityGraphStructuralHealth
      ? readOptionalString(capabilityGraphStructuralHealth, "status")
      : null,
    capability_graph_architectural_health_status:
      capabilityGraphArchitecturalHealth
        ? readOptionalString(capabilityGraphArchitecturalHealth, "status")
        : null,
    capability_graph_governance_domain_status: capabilityGraphGovernanceDomain
      ? readOptionalString(capabilityGraphGovernanceDomain, "status")
      : null,
    capability_graph_evolution_health_status: capabilityGraphEvolutionHealth
      ? readOptionalString(capabilityGraphEvolutionHealth, "status")
      : null,
    capability_graph_evidence_health_status: capabilityGraphEvidenceHealth
      ? readOptionalString(capabilityGraphEvidenceHealth, "status")
      : null,
    capability_graph_edge_count: capabilityGraphSummary
      ? readOptionalNumber(capabilityGraphSummary, "dependency_edge_count")
      : null,
    capability_graph_cycle_count: capabilityGraphVerificationMetrics
      ? readOptionalNumber(
          capabilityGraphVerificationMetrics,
          "circular_dependency_count",
        )
      : null,
    capability_graph_orphan_capability_count: capabilityGraphStructuralHealth
      ? readOptionalNumber(capabilityGraphStructuralHealth, "orphan_capability_count")
      : null,
    capability_graph_forbidden_dependency_count: capabilityGraphVerificationMetrics
      ? readOptionalNumber(
          capabilityGraphVerificationMetrics,
          "forbidden_dependency_count",
        )
      : null,
    capability_graph_layering_violation_count: capabilityGraphArchitecturalHealth
      ? readOptionalNumber(
          capabilityGraphArchitecturalHealth,
          "layering_violation_count",
        )
      : null,
    capability_graph_abstraction_leak_count: capabilityGraphArchitecturalHealth
      ? readOptionalNumber(
          capabilityGraphArchitecturalHealth,
          "abstraction_leak_count",
        )
      : null,
    capability_graph_unknown_dependency_count: capabilityGraphVerificationMetrics
      ? readOptionalNumber(
          capabilityGraphVerificationMetrics,
          "unknown_dependency_count",
        )
      : null,
    capability_graph_unstable_dependency_count: capabilityGraphVerificationMetrics
      ? readOptionalNumber(
          capabilityGraphVerificationMetrics,
          "unstable_dependency_count",
        )
      : null,
    capability_graph_ownership_gap_count: capabilityGraphGovernanceDomain
      ? readOptionalNumber(capabilityGraphGovernanceDomain, "ownership_gap_count")
      : null,
    capability_graph_migration_debt_count: capabilityGraphEvolutionHealth
      ? readOptionalNumber(capabilityGraphEvolutionHealth, "migration_debt_count")
      : null,
    capability_graph_capability_without_evidence_count:
      capabilityGraphEvidenceHealth
        ? readOptionalNumber(
            capabilityGraphEvidenceHealth,
            "capability_without_evidence_count",
          )
        : null,
    capability_graph_stale_evidence_count: capabilityGraphEvidenceHealth
      ? readOptionalNumber(capabilityGraphEvidenceHealth, "stale_evidence_count")
      : null,
    capability_graph_unverifiable_capability_count: capabilityGraphEvidenceHealth
      ? readOptionalNumber(
          capabilityGraphEvidenceHealth,
          "unverifiable_capability_count",
        )
      : null,
    capability_graph_orphaned_evidence_count: capabilityGraphEvidenceHealth
      ? readOptionalNumber(capabilityGraphEvidenceHealth, "orphaned_evidence_count")
      : null,
    capability_graph_inconsistent_evidence_count: capabilityGraphEvidenceHealth
      ? readOptionalNumber(
          capabilityGraphEvidenceHealth,
          "inconsistent_evidence_count",
        )
      : null,
    capability_graph_unsigned_evidence_count: capabilityGraphEvidenceHealth
      ? readOptionalNumber(capabilityGraphEvidenceHealth, "unsigned_evidence_count")
      : null,
    capability_graph_tampered_evidence_count: capabilityGraphEvidenceHealth
      ? readOptionalNumber(capabilityGraphEvidenceHealth, "tampered_evidence_count")
      : null,
    capability_graph_partial_evidence_count: capabilityGraphEvidenceHealth
      ? readOptionalNumber(capabilityGraphEvidenceHealth, "partial_evidence_count")
      : null,
    capability_graph_superseded_evidence_count: capabilityGraphEvidenceHealth
      ? readOptionalNumber(
          capabilityGraphEvidenceHealth,
          "superseded_evidence_count",
        )
      : null,
    capability_graph_expired_evidence_count: capabilityGraphEvidenceHealth
      ? readOptionalNumber(capabilityGraphEvidenceHealth, "expired_evidence_count")
      : null,
    capability_graph_warn_capability_count: capabilityGraphVerificationMetrics
      ? readOptionalNumber(capabilityGraphVerificationMetrics, "warn_capability_count")
      : null,
    capability_graph_fail_capability_count: capabilityGraphVerificationMetrics
      ? readOptionalNumber(capabilityGraphVerificationMetrics, "fail_capability_count")
      : null,
    enterprise_control_graph_hash: enterpriseControlGraph
      ? hashFile(input.paths.enterpriseControlGraphPath)
      : null,
    enterprise_control_graph_verification_hash: enterpriseControlGraphVerification
      ? hashFile(input.paths.enterpriseControlGraphVerificationPath)
      : null,
    enterprise_control_graph_status: enterpriseControlGraphVerificationSummary
      ? asString(
          enterpriseControlGraphVerificationSummary.overall_status,
          "enterprise_control_graph_verification.summary.overall_status",
        )
      : enterpriseControlGraph
        ? "DECLARED"
        : "UNVERIFIED",
    enterprise_control_graph_node_count: enterpriseControlGraphSummary
      ? readOptionalNumber(enterpriseControlGraphSummary, "node_count")
      : null,
    enterprise_control_graph_edge_count: enterpriseControlGraphSummary
      ? readOptionalNumber(enterpriseControlGraphSummary, "edge_count")
      : null,
    enterprise_control_graph_disconnected_node_count:
      enterpriseControlGraphVerificationMetrics
        ? readOptionalNumber(
            enterpriseControlGraphVerificationMetrics,
            "disconnected_node_count",
          )
        : null,
    governance_incremental_materialization_hash:
      governanceIncrementalMaterialization
        ? hashFile(input.paths.governanceIncrementalMaterializationPath)
        : null,
    governance_incremental_materialization_verification_hash:
      governanceIncrementalMaterializationVerification
        ? hashFile(input.paths.governanceIncrementalMaterializationVerificationPath)
        : null,
    governance_incremental_materialization_status:
      governanceIncrementalMaterializationVerificationSummary
        ? asString(
            governanceIncrementalMaterializationVerificationSummary.overall_status,
            "governance_incremental_materialization_verification.summary.overall_status",
          )
        : "UNVERIFIED",
    governance_incremental_reusable_node_count:
      governanceIncrementalMaterializationSummary
        ? readOptionalNumber(
            governanceIncrementalMaterializationSummary,
            "reusable_node_count",
          )
        : null,
    governance_incremental_delta_mode:
      governanceIncrementalMaterializationDeltaBasis
        ? readOptionalString(governanceIncrementalMaterializationDeltaBasis, "delta_mode")
        : null,
    governance_incremental_delta_scope_status:
      governanceIncrementalMaterializationDeltaBasis
        ? readOptionalString(
            governanceIncrementalMaterializationDeltaBasis,
            "delta_scope_status",
          )
        : null,
    governance_incremental_full_rebuild_required:
      governanceIncrementalMaterializationDeltaBasis
        ? readOptionalBoolean(
            governanceIncrementalMaterializationDeltaBasis,
            "full_rebuild_required",
          )
        : null,
    governance_read_model_selective_execution_hash:
      governanceReadModelSelectiveExecution
        ? hashFile(input.paths.governanceReadModelSelectiveExecutionPath)
        : null,
    governance_read_model_selective_execution_status:
      governanceReadModelSelectiveExecution
        ? asString(
            governanceReadModelSelectiveExecution.planner_status,
            "governance_read_model_selective_execution.planner_status",
          )
        : "UNVERIFIED",
    governance_read_model_selective_execution_mode:
      governanceReadModelSelectiveExecutionSummary
        ? readOptionalString(
            governanceReadModelSelectiveExecutionSummary,
            "execution_mode",
          )
        : null,
    governance_read_model_selective_execution_delta_scope_status:
      governanceReadModelSelectiveExecutionDeltaBasis
        ? readOptionalString(
            governanceReadModelSelectiveExecutionDeltaBasis,
            "delta_scope_status",
          )
        : null,
    governance_read_model_selective_execution_reused_node_count:
      governanceReadModelSelectiveExecutionSummary
        ? readOptionalNumber(
            governanceReadModelSelectiveExecutionSummary,
            "reused_node_count",
          )
        : null,
    governance_read_model_selective_execution_rematerialized_node_count:
      governanceReadModelSelectiveExecutionSummary
        ? readOptionalNumber(
            governanceReadModelSelectiveExecutionSummary,
            "rematerialized_node_count",
          )
        : null,
    trust_framework_hash: trustFramework
      ? hashFile(input.paths.trustFrameworkPath)
      : null,
    trust_framework_status: trustFrameworkVerificationSummary
      ? asString(
          trustFrameworkVerificationSummary.overall_status,
          "trust_framework_verification.summary.overall_status",
        )
      : trustFramework
        ? "DECLARED"
        : "UNVERIFIED",
    trust_framework_verification_hash: trustFrameworkVerification
      ? hashFile(input.paths.trustFrameworkVerificationPath)
      : null,
    attestation_lifecycle_verification_hash: attestationLifecycleVerification
      ? hashFile(input.paths.attestationLifecycleVerificationPath)
      : null,
    attestation_lifecycle_status: attestationLifecycleVerificationSummary
      ? asString(
          attestationLifecycleVerificationSummary.overall_status,
          "attestation_lifecycle_verification.summary.overall_status",
        )
      : "UNVERIFIED",
    attestation_lifecycle_terminal_event_readiness_status:
      attestationLifecycleVerificationSummary
        ? asString(
            attestationLifecycleVerificationSummary.terminal_event_readiness_status,
            "attestation_lifecycle_verification.summary.terminal_event_readiness_status",
          )
        : "UNVERIFIED",
    attestation_lifecycle_terminal_event_count:
      attestationLifecycleVerificationStream
        ? readOptionalNumber(
            attestationLifecycleVerificationStream,
            "attestation_with_terminal_event_count",
          )
        : null,
    attestation_lifecycle_materialization_hash:
      attestationLifecycleMaterialization
        ? hashFile(input.paths.attestationLifecycleMaterializationPath)
        : null,
    attestation_lifecycle_materialization_status:
      attestationLifecycleMaterializationSummary
        ? asString(
            attestationLifecycleMaterializationSummary.overall_status,
            "attestation_lifecycle_materialization.summary.overall_status",
          )
        : "UNVERIFIED",
    attestation_lifecycle_materialized_sample_count:
      attestationLifecycleMaterializationSummary
        ? readOptionalNumber(
            attestationLifecycleMaterializationSummary,
            "terminal_transition_sample_count",
          )
        : null,
    trust_signature_provider_registry_hash: trustSignatureProviderRegistry
      ? hashFile(input.paths.trustSignatureProviderRegistryPath)
      : null,
    trust_signature_provider_verification_hash: trustSignatureProviderVerification
      ? hashFile(input.paths.trustSignatureProviderVerificationPath)
      : null,
    trust_signature_provider_status: trustSignatureProviderVerificationSummary
      ? asString(
          trustSignatureProviderVerificationSummary.overall_status,
          "trust_signature_provider_verification.summary.overall_status",
        )
      : "UNVERIFIED",
    trust_signature_provider_adapter_count:
      trustSignatureProviderVerificationSummary
        ? readOptionalNumber(trustSignatureProviderVerificationSummary, "adapter_count")
        : null,
    trust_signature_materialization_hash: trustSignatureMaterialization
      ? hashFile(input.paths.trustSignatureMaterializationPath)
      : null,
    trust_signature_materialization_status: trustSignatureMaterializationSummary
      ? asString(
          trustSignatureMaterializationSummary.overall_status,
          "trust_signature_materialization.summary.overall_status",
        )
      : "UNVERIFIED",
    trust_signature_materialized_attestation_count:
      trustSignatureMaterializationSummary
        ? readOptionalNumber(
            trustSignatureMaterializationSummary,
            "signed_verified_attestation_count",
          )
        : null,
    trust_framework_count: trustFrameworkCount,
    trust_signature_provider_spi: firstSignatureProvider
      ? readOptionalString(
          firstSignatureProvider as Record<string, JsonValue>,
          "spi_contract",
        )
      : null,
    trust_frameworks_with_full_spi_coverage: trustFrameworkVerificationSummary
      ? readOptionalNumber(
          trustFrameworkVerificationSummary,
          "frameworks_with_full_spi_coverage",
        )
      : null,
    specification_conformance_hash: specificationConformance
      ? hashFile(input.paths.specificationConformancePath)
      : null,
    specification_conformance_status: specificationConformanceSummary
      ? readOptionalNumber(specificationConformanceSummary, "fail_count") === 0
        ? readOptionalNumber(specificationConformanceSummary, "warn_count") === 0
          ? "PASS"
          : "WARN"
        : "FAIL"
      : specificationConformance
        ? "DECLARED"
        : "UNVERIFIED",
    specification_conformance_warning_count: specificationConformanceSummary
      ? readOptionalNumber(specificationConformanceSummary, "warn_count")
      : null,
    specification_conformance_failure_count: specificationConformanceSummary
      ? readOptionalNumber(specificationConformanceSummary, "fail_count")
      : null,
    specification_rfc_count: specificationConformanceSummary
      ? readOptionalNumber(specificationConformanceSummary, "rfc_count")
      : null,
    specification_conf_count: specificationConformanceSummary
      ? readOptionalNumber(specificationConformanceSummary, "conf_count")
      : null,
    specification_artifact_graph_hash: specificationArtifactGraph
      ? hashFile(input.paths.specificationArtifactGraphPath)
      : null,
    specification_registry_artifact_count: specificationArtifactGraphSummary
      ? readOptionalNumber(specificationArtifactGraphSummary, "artifact_count")
      : null,
    specification_registry_edge_count: specificationArtifactGraphSummary
      ? readOptionalNumber(specificationArtifactGraphSummary, "edge_count")
      : null,
    specification_spec_count: specificationSpecCount,
    specification_vocabulary_audit_hash: specificationVocabularyAudit
      ? hashFile(input.paths.specificationVocabularyAuditPath)
      : null,
    specification_vocabulary_status: specificationVocabularyAuditSummary
      ? asString(
          specificationVocabularyAuditSummary.drift_status,
          "specification_vocabulary_audit.summary.drift_status",
        )
      : specificationVocabularyAudit
        ? "DECLARED"
        : "UNVERIFIED",
    specification_vocabulary_term_count: specificationVocabularyAuditSummary
      ? readOptionalNumber(specificationVocabularyAuditSummary, "term_count")
      : null,
    specification_vocabulary_duplicate_count: specificationVocabularyAuditSummary
      ? readOptionalNumber(
          specificationVocabularyAuditSummary,
          "duplicated_definition_count",
        )
      : null,
    decision_quality_hash: decisionQualityReport
      ? hashFile(input.paths.decisionQualityReportPath)
      : null,
    decision_quality_status: decisionQualityReport
      ? readOptionalString(decisionQualityReport, "status") ?? "DECLARED"
      : "UNVERIFIED",
    decision_quality_decision_count: decisionQualitySummary
      ? readOptionalNumber(decisionQualitySummary, "decision_count")
      : null,
    decision_quality_traceability_coverage: decisionQualitySummary
      ? readNestedNumberOrNull(
          decisionQualitySummary,
          "decision_traceability_coverage",
          "ratio",
          "decision_quality_report.summary.decision_traceability_coverage.ratio",
        )
      : null,
    decision_quality_outcome_coverage: decisionQualitySummary
      ? readNestedNumberOrNull(
          decisionQualitySummary,
          "decision_outcome_coverage",
          "ratio",
          "decision_quality_report.summary.decision_outcome_coverage.ratio",
        )
      : null,
    decision_quality_learning_closure: decisionQualitySummary
      ? readNestedNumberOrNull(
          decisionQualitySummary,
          "decision_learning_closure",
          "ratio",
          "decision_quality_report.summary.decision_learning_closure.ratio",
        )
      : null,
    decision_quality_reproducibility: decisionQualitySummary
      ? readNestedNumberOrNull(
          decisionQualitySummary,
          "decision_reproducibility",
          "ratio",
          "decision_quality_report.summary.decision_reproducibility.ratio",
        )
      : null,
    decision_quality_reversibility: decisionQualitySummary
      ? readNestedNumberOrNull(
          decisionQualitySummary,
          "decision_reversibility",
          "ratio",
          "decision_quality_report.summary.decision_reversibility.ratio",
        )
      : null,
    decision_quality_impact_graph_completeness: decisionQualitySummary
      ? readNestedNumberOrNull(
          decisionQualitySummary,
          "decision_impact_graph_completeness",
          "ratio",
          "decision_quality_report.summary.decision_impact_graph_completeness.ratio",
        )
      : null,
    decision_quality_engineering_leverage_measurement_coverage:
      decisionQualitySummary
        ? readNestedNumberOrNull(
            decisionQualitySummary,
            "engineering_leverage_measurement_coverage",
            "ratio",
            "decision_quality_report.summary.engineering_leverage_measurement_coverage.ratio",
          )
        : null,
    decision_quality_effectiveness: decisionQualitySummary
      ? readNestedNumberOrNull(
          decisionQualitySummary,
          "decision_effectiveness",
          "score",
          "decision_quality_report.summary.decision_effectiveness.score",
        )
      : null,
    decision_quality_success_rate: decisionQualitySummary
      ? readNestedNumberOrNull(
          decisionQualitySummary,
          "decision_success_rate",
          "ratio",
          "decision_quality_report.summary.decision_success_rate.ratio",
        )
      : null,
    decision_quality_false_decision_rate: decisionQualitySummary
      ? readNestedNumberOrNull(
          decisionQualitySummary,
          "false_decision_rate",
          "ratio",
          "decision_quality_report.summary.false_decision_rate.ratio",
        )
      : null,
    decision_quality_reversal_rate: decisionQualitySummary
      ? readNestedNumberOrNull(
          decisionQualitySummary,
          "decision_reversal_rate",
          "ratio",
          "decision_quality_report.summary.decision_reversal_rate.ratio",
        )
      : null,
    decision_quality_evidence_utilization_rate: decisionQualitySummary
      ? readNestedNumberOrNull(
          decisionQualitySummary,
          "evidence_utilization_rate",
          "ratio",
          "decision_quality_report.summary.evidence_utilization_rate.ratio",
        )
      : null,
    decision_quality_knowledge_reuse_rate: decisionQualitySummary
      ? readNestedNumberOrNull(
          decisionQualitySummary,
          "knowledge_reuse_rate",
          "ratio",
          "decision_quality_report.summary.knowledge_reuse_rate.ratio",
        )
      : null,
    decision_quality_evidence_strength_index: decisionQualitySummary
      ? readOptionalNumber(decisionQualitySummary, "evidence_strength_index")
      : null,
    decision_quality_outcome_improvement_rate: decisionQualitySummary
      ? readNestedNumberOrNull(
          decisionQualitySummary,
          "outcome_improvement_rate",
          "ratio",
          "decision_quality_report.summary.outcome_improvement_rate.ratio",
        )
      : null,
    decision_quality_decision_confidence_index: decisionQualitySummary
      ? readOptionalNumber(decisionQualitySummary, "decision_confidence_index")
      : null,
    decision_quality_knowledge_weighted_quality_index: decisionQualitySummary
      ? readOptionalNumber(
          decisionQualitySummary,
          "knowledge_weighted_quality_index",
        )
      : null,
    decision_quality_mean_time_to_outcome_ms: decisionQualitySummary
      ? readOptionalNumber(decisionQualitySummary, "mean_time_to_outcome_ms")
      : null,
    decision_quality_learning_velocity_ms: decisionQualitySummary
      ? readOptionalNumber(decisionQualitySummary, "learning_velocity_ms")
      : null,
    decision_quality_confidence_growth: decisionQualitySummary
      ? readOptionalNumber(decisionQualitySummary, "decision_confidence_growth")
      : null,
    learning_intelligence_hash: learningIntelligenceReport
      ? hashFile(input.paths.learningIntelligenceReportPath)
      : null,
    learning_intelligence_status: learningIntelligenceReport
      ? readOptionalString(learningIntelligenceReport, "status") ?? "DECLARED"
      : "UNVERIFIED",
    learning_intelligence_decision_count: learningIntelligenceSummary
      ? readOptionalNumber(learningIntelligenceSummary, "decision_count")
      : null,
    learning_intelligence_outcome_count: learningIntelligenceSummary
      ? readOptionalNumber(learningIntelligenceSummary, "outcome_count")
      : null,
    learning_intelligence_outcome_registry_coverage: learningIntelligenceSummary
      ? readOptionalNumber(learningIntelligenceSummary, "outcome_registry_coverage")
      : null,
    learning_intelligence_decision_quality_index: learningIntelligenceSummary
      ? readOptionalNumber(learningIntelligenceSummary, "decision_quality_index")
      : null,
    learning_intelligence_learning_velocity_ms: learningIntelligenceSummary
      ? readOptionalNumber(learningIntelligenceSummary, "learning_velocity_ms")
      : null,
    learning_intelligence_knowledge_gain_units: learningIntelligenceSummary
      ? readOptionalNumber(learningIntelligenceSummary, "knowledge_gain_units")
      : null,
    learning_intelligence_knowledge_gain: learningIntelligenceSummary
      ? readOptionalNumber(learningIntelligenceSummary, "knowledge_gain")
      : null,
    learning_intelligence_knowledge_object_count: learningIntelligenceSummary
      ? readOptionalNumber(learningIntelligenceSummary, "knowledge_object_count")
      : null,
    learning_intelligence_operationalized_knowledge_count:
      learningIntelligenceSummary
        ? readOptionalNumber(
            learningIntelligenceSummary,
            "operationalized_knowledge_count",
          )
        : null,
    learning_intelligence_knowledge_availability_rate: learningIntelligenceSummary
      ? readOptionalNumber(
          learningIntelligenceSummary,
          "knowledge_availability_rate",
        )
      : null,
    learning_intelligence_knowledge_reuse_rate: learningIntelligenceSummary
      ? readOptionalNumber(learningIntelligenceSummary, "knowledge_reuse_rate")
      : null,
    learning_intelligence_reused_knowledge_object_count:
      learningIntelligenceSummary
        ? readOptionalNumber(
            learningIntelligenceSummary,
            "reused_knowledge_object_count",
          )
        : null,
    learning_intelligence_improved_knowledge_object_count:
      learningIntelligenceSummary
        ? readOptionalNumber(
            learningIntelligenceSummary,
            "improved_knowledge_object_count",
          )
        : null,
    learning_intelligence_knowledge_lineage_count: learningIntelligenceSummary
      ? readOptionalNumber(
          learningIntelligenceSummary,
          "knowledge_lineage_count",
        )
      : null,
    learning_intelligence_knowledge_lineage_preview: learningIntelligenceReport
      ? readOptionalArray(
          learningIntelligenceReport,
          "knowledge_lineage_preview",
        )
      : null,
    learning_intelligence_recommendation_effectiveness_rate:
      learningIntelligenceSummary
        ? readOptionalNumber(
            learningIntelligenceSummary,
            "recommendation_effectiveness_rate",
          )
        : null,
    learning_intelligence_decision_pattern_change_rate:
      learningIntelligenceSummary
        ? readOptionalNumber(
            learningIntelligenceSummary,
            "decision_pattern_change_rate",
          )
        : null,
    learning_intelligence_recommendation_acceptance_rate:
      learningIntelligenceSummary
        ? readOptionalNumber(
            learningIntelligenceSummary,
            "recommendation_acceptance_rate",
          )
        : null,
    learning_intelligence_behavior_change_rate: learningIntelligenceSummary
      ? readOptionalNumber(learningIntelligenceSummary, "behavior_change_rate")
      : null,
    learning_intelligence_engineering_leverage_ratio:
      learningIntelligenceSummary
        ? readOptionalNumber(
            learningIntelligenceSummary,
            "engineering_leverage_ratio",
          )
        : null,
    learning_intelligence_repeated_mistake_count: learningIntelligenceSummary
      ? readOptionalNumber(learningIntelligenceSummary, "repeated_mistake_count")
      : null,
    learning_intelligence_future_decision_improvement_rate:
      learningIntelligenceSummary
        ? readOptionalNumber(
            learningIntelligenceSummary,
            "future_decision_improvement_rate",
          )
        : null,
    evidence_producer_convergence_hash: evidenceProducerConvergenceReport
      ? hashFile(input.paths.evidenceProducerConvergenceReportPath)
      : null,
    evidence_producer_convergence_status: evidenceProducerConvergenceReport
      ? readOptionalString(evidenceProducerConvergenceReport, "status") ??
        "DECLARED"
      : "UNVERIFIED",
    evidence_producer_count: evidenceProducerConvergenceSummary
      ? readOptionalNumber(evidenceProducerConvergenceSummary, "producer_count")
      : null,
    evidence_producer_target_count: evidenceProducerConvergenceSummary
      ? readOptionalNumber(
          evidenceProducerConvergenceSummary,
          "target_producer_count",
        )
      : null,
    evidence_producer_registered_target_count: evidenceProducerConvergenceSummary
      ? readOptionalNumber(
          evidenceProducerConvergenceSummary,
          "registered_target_producer_count",
        )
      : null,
    evidence_producer_target_coverage_ratio: evidenceProducerConvergenceSummary
      ? readOptionalNumber(
          evidenceProducerConvergenceSummary,
          "target_coverage_ratio",
        )
      : null,
  };
}

function computeAcceptanceEvidenceInventory(acceptanceDir: string): {
  readonly fileCount: number;
  readonly inventoryHash: string | null;
} {
  if (!existsSync(acceptanceDir)) {
    return {
      fileCount: 0,
      inventoryHash: null,
    };
  }

  const files = listFilesRecursively(acceptanceDir);
  return {
    fileCount: files.length,
    inventoryHash: files.length > 0 ? hashArtifactList(files) : null,
  };
}

function listFilesRecursively(root: string): readonly string[] {
  if (!existsSync(root)) {
    return [];
  }
  const entries = readdirSync(root, { withFileTypes: true });
  return entries
    .flatMap((entry) => {
      const path = join(root, entry.name);
      return entry.isDirectory() ? listFilesRecursively(path) : [path];
    })
    .sort();
}

function hashArtifactList(paths: readonly string[]): string {
  return sha256(
    JSON.stringify(
      paths.map((path) => ({
        path,
        sha256: hashFile(path),
        bytes: statSync(path).size,
      })),
    ),
  );
}

function hashFile(path: string): string {
  return sha256(readFileSync(path));
}

function sha256(value: string | Uint8Array): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function asMutableRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  return value;
}

function readJsonRecordIfExists(path: string): Record<string, JsonValue> | null {
  if (!existsSync(path)) {
    return null;
  }
  return asMutableRecord(
    JSON.parse(readFileSync(path, "utf8")),
    `${path} json`,
  ) as Record<string, JsonValue>;
}

function readNestedRecord(
  value: Record<string, JsonValue>,
  key: string,
  label: string,
): Record<string, JsonValue> {
  return asMutableRecord(value[key], `${label}.${key}`) as Record<
    string,
    JsonValue
  >;
}

function readOptionalString(
  value: Record<string, JsonValue>,
  key: string,
): string | null {
  return typeof value[key] === "string" ? (value[key] as string) : null;
}

function readOptionalNumber(
  value: Record<string, JsonValue>,
  key: string,
): number | null {
  return typeof value[key] === "number" ? (value[key] as number) : null;
}

function readNestedNumberOrNull(
  value: Record<string, JsonValue>,
  key: string,
  nestedKey: string,
  label: string,
): number | null {
  const record = value[key];
  if (typeof record !== "object" || record === null || Array.isArray(record)) {
    return null;
  }
  return readOptionalNumber(
    asMutableRecord(record, label) as Record<string, JsonValue>,
    nestedKey,
  );
}

function readOptionalBoolean(
  value: Record<string, JsonValue>,
  key: string,
): boolean | null {
  return typeof value[key] === "boolean" ? (value[key] as boolean) : null;
}

function readOptionalArray(
  value: Record<string, JsonValue>,
  key: string,
): readonly JsonValue[] | null {
  return Array.isArray(value[key]) ? (value[key] as readonly JsonValue[]) : null;
}
