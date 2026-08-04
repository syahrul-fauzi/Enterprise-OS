function asMutableRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected object at ${label}`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`Expected string at ${label}`);
  }
  return value;
}

function asNumber(value: unknown, label: string): number {
  if (typeof value !== "number") {
    throw new Error(`Expected number at ${label}`);
  }
  return value;
}

function asBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Expected boolean at ${label}`);
  }
  return value;
}

export function materializeGateCRefreshStatusOutput(input: {
  readonly projection: Record<string, unknown>;
  readonly statusProjectionPath: string;
}): string {
  const projection = input.projection;
  const coverage = asMutableRecord(projection.coverage, "projection.coverage");
  const verificationAudits = asMutableRecord(
    coverage.verification_audits,
    "projection.coverage.verification_audits",
  );
  const n2Audit = asMutableRecord(
    verificationAudits.n2,
    "projection.coverage.verification_audits.n2",
  );
  const n3Audit = asMutableRecord(
    verificationAudits.n3,
    "projection.coverage.verification_audits.n3",
  );
  const n4Audit = asMutableRecord(
    verificationAudits.n4,
    "projection.coverage.verification_audits.n4",
  );
  const overall = asMutableRecord(projection.overall, "projection.overall");
  const phase = asMutableRecord(projection.phase, "projection.phase");

  return (
    [
      `status_projection_path=${input.statusProjectionPath}`,
      `projection_basis_hash=${asString(projection.projection_basis_hash, "projection.projection_basis_hash")}`,
      `phase_current=${asString(phase.current, "projection.phase.current")}`,
      `gate_c1_framework_status=${asString(
        phase.gate_c1_framework_status,
        "projection.phase.gate_c1_framework_status",
      )}`,
      `truth_table_row_completion_percent=${String(
        asNumber(
          coverage.truth_table_row_completion_percent,
          "projection.coverage.truth_table_row_completion_percent",
        ),
      )}`,
      `operational_completion_percent=${String(
        asNumber(
          coverage.operational_completion_percent,
          "projection.coverage.operational_completion_percent",
        ),
      )}`,
      `n2_audit_status=${asString(n2Audit.status, "projection.coverage.verification_audits.n2.status")}`,
      `n2_acceptance_complete=${String(
        asBoolean(
          n2Audit.acceptance_complete,
          "projection.coverage.verification_audits.n2.acceptance_complete",
        ),
      )}`,
      `n3_audit_status=${asString(n3Audit.status, "projection.coverage.verification_audits.n3.status")}`,
      `n3_acceptance_complete=${String(
        asBoolean(
          n3Audit.acceptance_complete,
          "projection.coverage.verification_audits.n3.acceptance_complete",
        ),
      )}`,
      `n4_audit_status=${asString(n4Audit.status, "projection.coverage.verification_audits.n4.status")}`,
      `n4_acceptance_complete=${String(
        asBoolean(
          n4Audit.acceptance_complete,
          "projection.coverage.verification_audits.n4.acceptance_complete",
        ),
      )}`,
      `constitutional_status=${asString(overall.constitutional_status, "projection.overall.constitutional_status")}`,
      `dependency_constitution_status=${asString(
        overall.dependency_constitution_status,
        "projection.overall.dependency_constitution_status",
      )}`,
      `contract_registry_status=${asString(overall.contract_registry_status, "projection.overall.contract_registry_status")}`,
      `contract_version_evolution_status=${asString(
        overall.contract_version_evolution_status,
        "projection.overall.contract_version_evolution_status",
      )}`,
      `governance_session_status=${asString(overall.governance_session_status, "projection.overall.governance_session_status")}`,
      `governance_session_verification_status=${asString(
        overall.governance_session_verification_status,
        "projection.overall.governance_session_verification_status",
      )}`,
      `verification_run_status=${asString(overall.verification_run_status, "projection.overall.verification_run_status")}`,
      `governance_catalog_status=${asString(overall.governance_catalog_status, "projection.overall.governance_catalog_status")}`,
      `capability_governance_status=${asString(
        overall.capability_governance_status,
        "projection.overall.capability_governance_status",
      )}`,
      `capability_governance_compatibility_status=${asString(
        overall.capability_governance_compatibility_status,
        "projection.overall.capability_governance_compatibility_status",
      )}`,
      `capability_graph_status=${asString(overall.capability_graph_status, "projection.overall.capability_graph_status")}`,
      `capability_graph_governance_health_status=${asString(
        overall.capability_graph_governance_health_status,
        "projection.overall.capability_graph_governance_health_status",
      )}`,
      `capability_graph_structural_health_status=${asString(
        overall.capability_graph_structural_health_status,
        "projection.overall.capability_graph_structural_health_status",
      )}`,
      `capability_graph_evidence_health_status=${asString(
        overall.capability_graph_evidence_health_status,
        "projection.overall.capability_graph_evidence_health_status",
      )}`,
      `capability_graph_architectural_health_status=${asString(
        overall.capability_graph_architectural_health_status,
        "projection.overall.capability_graph_architectural_health_status",
      )}`,
      `capability_graph_evolution_health_status=${asString(
        overall.capability_graph_evolution_health_status,
        "projection.overall.capability_graph_evolution_health_status",
      )}`,
      `capability_graph_cycle_count=${String(
        asNumber(
          overall.capability_graph_cycle_count,
          "projection.overall.capability_graph_cycle_count",
        ),
      )}`,
      `capability_graph_orphan_capability_count=${String(
        asNumber(
          overall.capability_graph_orphan_capability_count,
          "projection.overall.capability_graph_orphan_capability_count",
        ),
      )}`,
      `capability_graph_forbidden_dependency_count=${String(
        asNumber(
          overall.capability_graph_forbidden_dependency_count,
          "projection.overall.capability_graph_forbidden_dependency_count",
        ),
      )}`,
      `capability_graph_layering_violation_count=${String(
        asNumber(
          overall.capability_graph_layering_violation_count,
          "projection.overall.capability_graph_layering_violation_count",
        ),
      )}`,
      `capability_graph_abstraction_leak_count=${String(
        asNumber(
          overall.capability_graph_abstraction_leak_count,
          "projection.overall.capability_graph_abstraction_leak_count",
        ),
      )}`,
      `capability_graph_unstable_dependency_count=${String(
        asNumber(
          overall.capability_graph_unstable_dependency_count,
          "projection.overall.capability_graph_unstable_dependency_count",
        ),
      )}`,
      `capability_graph_capability_without_evidence_count=${String(
        asNumber(
          overall.capability_graph_capability_without_evidence_count,
          "projection.overall.capability_graph_capability_without_evidence_count",
        ),
      )}`,
      `capability_graph_stale_evidence_count=${String(
        asNumber(
          overall.capability_graph_stale_evidence_count,
          "projection.overall.capability_graph_stale_evidence_count",
        ),
      )}`,
      `capability_graph_unverifiable_capability_count=${String(
        asNumber(
          overall.capability_graph_unverifiable_capability_count,
          "projection.overall.capability_graph_unverifiable_capability_count",
        ),
      )}`,
      `enterprise_control_graph_status=${asString(
        overall.enterprise_control_graph_status,
        "projection.overall.enterprise_control_graph_status",
      )}`,
      `architecture_fitness_status=${asString(overall.architecture_fitness_status, "projection.overall.architecture_fitness_status")}`,
      `governance_incremental_materialization_status=${asString(
        overall.governance_incremental_materialization_status,
        "projection.overall.governance_incremental_materialization_status",
      )}`,
      `governance_incremental_delta_mode=${asString(
        overall.governance_incremental_delta_mode,
        "projection.overall.governance_incremental_delta_mode",
      )}`,
      `governance_incremental_delta_scope_status=${asString(
        overall.governance_incremental_delta_scope_status,
        "projection.overall.governance_incremental_delta_scope_status",
      )}`,
      `governance_read_model_selective_execution_status=${asString(
        overall.governance_read_model_selective_execution_status,
        "projection.overall.governance_read_model_selective_execution_status",
      )}`,
      `governance_read_model_selective_execution_mode=${asString(
        overall.governance_read_model_selective_execution_mode,
        "projection.overall.governance_read_model_selective_execution_mode",
      )}`,
      `governance_read_model_selective_execution_delta_scope_status=${asString(
        overall.governance_read_model_selective_execution_delta_scope_status,
        "projection.overall.governance_read_model_selective_execution_delta_scope_status",
      )}`,
      `trust_framework_status=${asString(overall.trust_framework_status, "projection.overall.trust_framework_status")}`,
      `attestation_lifecycle_status=${asString(
        overall.attestation_lifecycle_status,
        "projection.overall.attestation_lifecycle_status",
      )}`,
      `attestation_lifecycle_materialization_status=${asString(
        overall.attestation_lifecycle_materialization_status,
        "projection.overall.attestation_lifecycle_materialization_status",
      )}`,
      `trust_signature_provider_status=${asString(
        overall.trust_signature_provider_status,
        "projection.overall.trust_signature_provider_status",
      )}`,
      `trust_signature_materialization_status=${asString(
        overall.trust_signature_materialization_status,
        "projection.overall.trust_signature_materialization_status",
      )}`,
      `specification_system_status=${asString(
        overall.specification_system_status,
        "projection.overall.specification_system_status",
      )}`,
      `specification_conformance_status=${asString(
        overall.specification_conformance_status,
        "projection.overall.specification_conformance_status",
      )}`,
      `specification_vocabulary_status=${asString(
        overall.specification_vocabulary_status,
        "projection.overall.specification_vocabulary_status",
      )}`,
    ].join("\n") + "\n"
  );
}

export function materializeGateCStatusOutput(input: {
  readonly projection: Record<string, unknown>;
  readonly statusProjectionPath: string;
}): string {
  const projection = input.projection;
  const phase = asMutableRecord(projection.phase, "projection.phase");
  const coverage = asMutableRecord(projection.coverage, "projection.coverage");
  const overall = asMutableRecord(projection.overall, "projection.overall");
  const baseline = asMutableRecord(projection.baseline, "projection.baseline");
  const verificationAudits = asMutableRecord(
    coverage.verification_audits,
    "projection.coverage.verification_audits",
  );
  const n2Audit = asMutableRecord(
    verificationAudits.n2,
    "projection.coverage.verification_audits.n2",
  );
  const n3Audit = asMutableRecord(
    verificationAudits.n3,
    "projection.coverage.verification_audits.n3",
  );
  const n4Audit = asMutableRecord(
    verificationAudits.n4,
    "projection.coverage.verification_audits.n4",
  );
  const verificationMetrics = asMutableRecord(
    coverage.verification_metrics,
    "projection.coverage.verification_metrics",
  );
  const diagnosticAccuracy = asMutableRecord(
    verificationMetrics.diagnostic_accuracy,
    "projection.coverage.verification_metrics.diagnostic_accuracy",
  );
  const apparatusStability = asMutableRecord(
    verificationMetrics.apparatus_stability,
    "projection.coverage.verification_metrics.apparatus_stability",
  );
  const instrumentDrift = asMutableRecord(
    verificationMetrics.instrument_drift,
    "projection.coverage.verification_metrics.instrument_drift",
  );
  const acceptanceIntegrity = asMutableRecord(
    verificationMetrics.acceptance_integrity,
    "projection.coverage.verification_metrics.acceptance_integrity",
  );

  return (
    [
      `status_projection_id=${asString(projection.status_projection_id, "projection.status_projection_id")}`,
      `status_projection_path=${input.statusProjectionPath}`,
      `projection_basis_hash=${asString(projection.projection_basis_hash, "projection.projection_basis_hash")}`,
      `phase_current=${asString(phase.current, "projection.phase.current")}`,
      `phase_a_status=${asString(phase.phase_a_status, "projection.phase.phase_a_status")}`,
      `gate_c1_framework_status=${asString(
        phase.gate_c1_framework_status,
        "projection.phase.gate_c1_framework_status",
      )}`,
      `baseline_run=${asString(
        baseline.genesis_evidence_run_id,
        "projection.baseline.genesis_evidence_run_id",
      )}`,
      `truth_table_row_completion_percent=${String(
        asNumber(
          coverage.truth_table_row_completion_percent,
          "projection.coverage.truth_table_row_completion_percent",
        ),
      )}`,
      `operational_completion_percent=${String(
        asNumber(
          coverage.operational_completion_percent,
          "projection.coverage.operational_completion_percent",
        ),
      )}`,
      `n2_audit_status=${asString(n2Audit.status, "projection.coverage.verification_audits.n2.status")}`,
      `n2_acceptance_complete=${String(
        asBoolean(
          n2Audit.acceptance_complete,
          "projection.coverage.verification_audits.n2.acceptance_complete",
        ),
      )}`,
      `n3_audit_status=${asString(n3Audit.status, "projection.coverage.verification_audits.n3.status")}`,
      `n3_acceptance_complete=${String(
        asBoolean(
          n3Audit.acceptance_complete,
          "projection.coverage.verification_audits.n3.acceptance_complete",
        ),
      )}`,
      `n4_audit_status=${asString(n4Audit.status, "projection.coverage.verification_audits.n4.status")}`,
      `n4_acceptance_complete=${String(
        asBoolean(
          n4Audit.acceptance_complete,
          "projection.coverage.verification_audits.n4.acceptance_complete",
        ),
      )}`,
      `diagnostic_accuracy=${String(
        asNumber(
          diagnosticAccuracy.value,
          "projection.coverage.verification_metrics.diagnostic_accuracy.value",
        ),
      )}`,
      `apparatus_stability=${String(
        asNumber(
          apparatusStability.value,
          "projection.coverage.verification_metrics.apparatus_stability.value",
        ),
      )}`,
      `instrument_drift=${String(
        asNumber(
          instrumentDrift.value,
          "projection.coverage.verification_metrics.instrument_drift.value",
        ),
      )}`,
      `acceptance_integrity=${String(
        asNumber(
          acceptanceIntegrity.value,
          "projection.coverage.verification_metrics.acceptance_integrity.value",
        ),
      )}`,
      `currently_supported_claim=${asString(
        overall.currently_supported_claim,
        "projection.overall.currently_supported_claim",
      )}`,
      `constitutional_status=${asString(overall.constitutional_status, "projection.overall.constitutional_status")}`,
      `dependency_constitution_status=${asString(
        overall.dependency_constitution_status,
        "projection.overall.dependency_constitution_status",
      )}`,
      `contract_registry_status=${asString(overall.contract_registry_status, "projection.overall.contract_registry_status")}`,
      `contract_version_evolution_status=${asString(
        overall.contract_version_evolution_status,
        "projection.overall.contract_version_evolution_status",
      )}`,
      `governance_session_status=${asString(overall.governance_session_status, "projection.overall.governance_session_status")}`,
      `governance_session_verification_status=${asString(
        overall.governance_session_verification_status,
        "projection.overall.governance_session_verification_status",
      )}`,
      `verification_run_status=${asString(overall.verification_run_status, "projection.overall.verification_run_status")}`,
      `governance_catalog_status=${asString(overall.governance_catalog_status, "projection.overall.governance_catalog_status")}`,
      `capability_governance_status=${asString(
        overall.capability_governance_status,
        "projection.overall.capability_governance_status",
      )}`,
      `capability_governance_compatibility_status=${asString(
        overall.capability_governance_compatibility_status,
        "projection.overall.capability_governance_compatibility_status",
      )}`,
      `capability_graph_status=${asString(overall.capability_graph_status, "projection.overall.capability_graph_status")}`,
      `capability_graph_governance_health_status=${asString(
        overall.capability_graph_governance_health_status,
        "projection.overall.capability_graph_governance_health_status",
      )}`,
      `capability_graph_structural_health_status=${asString(
        overall.capability_graph_structural_health_status,
        "projection.overall.capability_graph_structural_health_status",
      )}`,
      `capability_graph_evidence_health_status=${asString(
        overall.capability_graph_evidence_health_status,
        "projection.overall.capability_graph_evidence_health_status",
      )}`,
      `capability_graph_architectural_health_status=${asString(
        overall.capability_graph_architectural_health_status,
        "projection.overall.capability_graph_architectural_health_status",
      )}`,
      `capability_graph_evolution_health_status=${asString(
        overall.capability_graph_evolution_health_status,
        "projection.overall.capability_graph_evolution_health_status",
      )}`,
      `capability_graph_cycle_count=${String(
        asNumber(
          overall.capability_graph_cycle_count,
          "projection.overall.capability_graph_cycle_count",
        ),
      )}`,
      `capability_graph_orphan_capability_count=${String(
        asNumber(
          overall.capability_graph_orphan_capability_count,
          "projection.overall.capability_graph_orphan_capability_count",
        ),
      )}`,
      `capability_graph_forbidden_dependency_count=${String(
        asNumber(
          overall.capability_graph_forbidden_dependency_count,
          "projection.overall.capability_graph_forbidden_dependency_count",
        ),
      )}`,
      `capability_graph_layering_violation_count=${String(
        asNumber(
          overall.capability_graph_layering_violation_count,
          "projection.overall.capability_graph_layering_violation_count",
        ),
      )}`,
      `capability_graph_abstraction_leak_count=${String(
        asNumber(
          overall.capability_graph_abstraction_leak_count,
          "projection.overall.capability_graph_abstraction_leak_count",
        ),
      )}`,
      `capability_graph_unstable_dependency_count=${String(
        asNumber(
          overall.capability_graph_unstable_dependency_count,
          "projection.overall.capability_graph_unstable_dependency_count",
        ),
      )}`,
      `capability_graph_capability_without_evidence_count=${String(
        asNumber(
          overall.capability_graph_capability_without_evidence_count,
          "projection.overall.capability_graph_capability_without_evidence_count",
        ),
      )}`,
      `capability_graph_stale_evidence_count=${String(
        asNumber(
          overall.capability_graph_stale_evidence_count,
          "projection.overall.capability_graph_stale_evidence_count",
        ),
      )}`,
      `capability_graph_unverifiable_capability_count=${String(
        asNumber(
          overall.capability_graph_unverifiable_capability_count,
          "projection.overall.capability_graph_unverifiable_capability_count",
        ),
      )}`,
      `enterprise_control_graph_status=${asString(
        overall.enterprise_control_graph_status,
        "projection.overall.enterprise_control_graph_status",
      )}`,
      `architecture_fitness_status=${asString(overall.architecture_fitness_status, "projection.overall.architecture_fitness_status")}`,
      `governance_incremental_materialization_status=${asString(
        overall.governance_incremental_materialization_status,
        "projection.overall.governance_incremental_materialization_status",
      )}`,
      `governance_incremental_delta_mode=${asString(
        overall.governance_incremental_delta_mode,
        "projection.overall.governance_incremental_delta_mode",
      )}`,
      `governance_incremental_delta_scope_status=${asString(
        overall.governance_incremental_delta_scope_status,
        "projection.overall.governance_incremental_delta_scope_status",
      )}`,
      `governance_read_model_selective_execution_status=${asString(
        overall.governance_read_model_selective_execution_status,
        "projection.overall.governance_read_model_selective_execution_status",
      )}`,
      `governance_read_model_selective_execution_mode=${asString(
        overall.governance_read_model_selective_execution_mode,
        "projection.overall.governance_read_model_selective_execution_mode",
      )}`,
      `governance_read_model_selective_execution_delta_scope_status=${asString(
        overall.governance_read_model_selective_execution_delta_scope_status,
        "projection.overall.governance_read_model_selective_execution_delta_scope_status",
      )}`,
      `trust_framework_status=${asString(overall.trust_framework_status, "projection.overall.trust_framework_status")}`,
      `attestation_lifecycle_status=${asString(
        overall.attestation_lifecycle_status,
        "projection.overall.attestation_lifecycle_status",
      )}`,
      `attestation_lifecycle_materialization_status=${asString(
        overall.attestation_lifecycle_materialization_status,
        "projection.overall.attestation_lifecycle_materialization_status",
      )}`,
      `trust_signature_provider_status=${asString(
        overall.trust_signature_provider_status,
        "projection.overall.trust_signature_provider_status",
      )}`,
      `trust_signature_materialization_status=${asString(
        overall.trust_signature_materialization_status,
        "projection.overall.trust_signature_materialization_status",
      )}`,
      `specification_system_status=${asString(
        overall.specification_system_status,
        "projection.overall.specification_system_status",
      )}`,
      `specification_conformance_status=${asString(
        overall.specification_conformance_status,
        "projection.overall.specification_conformance_status",
      )}`,
      `specification_vocabulary_status=${asString(
        overall.specification_vocabulary_status,
        "projection.overall.specification_vocabulary_status",
      )}`,
      `specification_registry_artifact_count=${String(
        overall.specification_registry_artifact_count ?? "null",
      )}`,
      `specification_registry_edge_count=${String(
        overall.specification_registry_edge_count ?? "null",
      )}`,
      `specification_rfc_count=${String(overall.specification_rfc_count ?? "null")}`,
      `specification_conf_count=${String(overall.specification_conf_count ?? "null")}`,
      `specification_spec_count=${String(overall.specification_spec_count ?? "null")}`,
      `specification_conformance_warning_count=${String(
        overall.specification_conformance_warning_count ?? "null",
      )}`,
      `specification_conformance_failure_count=${String(
        overall.specification_conformance_failure_count ?? "null",
      )}`,
      `specification_vocabulary_term_count=${String(
        overall.specification_vocabulary_term_count ?? "null",
      )}`,
      `specification_vocabulary_duplicate_count=${String(
        overall.specification_vocabulary_duplicate_count ?? "null",
      )}`,
    ].join("\n") + "\n"
  );
}
