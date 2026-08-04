import type {
  GateCProjectionSourceSnapshot,
} from "../read-models/status-snapshot.js";
import type { GateCGovernanceBundle } from "../bundles/governance.js";
import type { GateCCapabilityBundle } from "../bundles/capability.js";
import type { GateCDecisionBundle } from "../bundles/decision.js";
import type { GateCLearningBundle } from "../bundles/learning.js";
import type { GateCSpecificationBundle } from "../bundles/specification.js";
import type { GateCFoundationBundle } from "../bundles/foundation.js";
import type { GateCTrustBundle } from "../bundles/trust.js";

type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

type GateCAuditRecord = Readonly<Record<string, JsonValue>>;

export function materializeGateCOperationalAggregationRuntime(input: {
  readonly truthTableRows: readonly string[];
  readonly matrix: Record<string, unknown>;
  readonly summary: Record<string, unknown>;
  readonly p1: Record<string, unknown>;
  readonly n1ExitCriteria: Record<string, unknown>;
  readonly proofLedgerEntries: readonly unknown[];
  readonly acceptanceDecisionEntries: readonly unknown[];
  readonly acceptanceAuditsByRow: Record<string, GateCAuditRecord | undefined>;
}): Readonly<{
  completedTruthTableRows: readonly string[];
  truthTableRowCompletionPercent: number;
  operationalCompletionPercent: number;
  operationalCompletedUnits: number;
  operationalTotalUnits: number;
  controls: Record<string, JsonValue>;
  diagnosticAccuracyNumerator: number;
  diagnosticAccuracyDenominator: number;
  apparatusStabilityNumerator: number;
  apparatusStabilityDenominator: number;
  instrumentDriftNumerator: number;
  instrumentDriftDenominator: number;
  acceptanceAttemptCount: number;
  acceptedDecisionCount: number;
  evidenceComplete: boolean;
  governanceRatifiable: boolean;
}> {
  const completedTruthTableRows = computeCompletedTruthTableRowsRuntime({
    truthTableRows: input.truthTableRows,
    matrix: input.matrix,
  });
  const truthTableRowCompletionPercent =
    (completedTruthTableRows.length / input.truthTableRows.length) * 100;
  const operationalCompletionPercent = asNumber(
    input.summary.coverage_percent,
    "summary.coverage_percent",
  );
  const operationalCompletedUnits = asNumber(
    input.summary.completed_rows,
    "summary.completed_rows",
  );
  const operationalTotalUnits = asNumber(
    input.summary.total_rows,
    "summary.total_rows",
  );
  const controls: Record<string, JsonValue> = {};

  for (const rowId of input.truthTableRows) {
    const row = asMutableRecord(input.matrix[rowId], `matrix.${rowId}`);
    const expected = asMutableRecord(row.expected, `matrix.${rowId}.expected`);
    const actual = asMutableRecord(row.actual, `matrix.${rowId}.actual`);
    const acceptanceAudit = input.acceptanceAuditsByRow[rowId];
    const controlProjection: Record<string, JsonValue> = {
      lifecycle_state: computeControlLifecycleStateRuntime({
        rowId,
        row,
        proofLedgerEntries: input.proofLedgerEntries,
        acceptanceAuditsByRow: input.acceptanceAuditsByRow,
      }),
      operational_status: computeControlProjectionStatusRuntime({
        rowId,
        row,
        proofLedgerEntries: input.proofLedgerEntries,
        acceptanceAuditsByRow: input.acceptanceAuditsByRow,
      }),
      expected_verdict: asString(
        expected.verdict,
        `matrix.${rowId}.expected.verdict`,
      ),
      truth_table_row: asString(
        expected.truth_table_row,
        `matrix.${rowId}.expected.truth_table_row`,
      ),
    };

    if (typeof row.scientific_role === "string") {
      controlProjection.scientific_role = row.scientific_role;
    }
    if (typeof row.primary_run_id === "string") {
      controlProjection.primary_run_id = row.primary_run_id;
    }
    if (typeof row.run_id === "string") {
      controlProjection.run_id = row.run_id;
    }
    if (typeof row.replay_isolated_run_id === "string") {
      controlProjection.replay_run_id = row.replay_isolated_run_id;
    }
    if (acceptanceAudit?.executed === true) {
      if (typeof acceptanceAudit.actual_verdict === "string") {
        controlProjection.actual_verdict = asString(
          acceptanceAudit.actual_verdict,
          `acceptanceAuditsByRow.${rowId}.actual_verdict`,
        );
      }
      if (
        typeof acceptanceAudit.actual_diagnostic_predicate_failure === "string"
      ) {
        controlProjection.actual_diagnostic_predicate_failure = asString(
          acceptanceAudit.actual_diagnostic_predicate_failure,
          `acceptanceAuditsByRow.${rowId}.actual_diagnostic_predicate_failure`,
        );
      }
    } else if (typeof actual.verdict === "string") {
      controlProjection.actual_verdict = actual.verdict;
    } else if (typeof actual.status === "string") {
      controlProjection.actual_status = actual.status;
    }
    if (typeof expected.diagnostic_predicate_failure === "string") {
      controlProjection.expected_diagnostic_predicate_failure =
        expected.diagnostic_predicate_failure;
    }
    if (typeof actual.diagnostic_predicate_failure === "string") {
      controlProjection.actual_diagnostic_predicate_failure =
        actual.diagnostic_predicate_failure;
    }
    if (typeof row.convergence === "string") {
      controlProjection.convergence = row.convergence;
    }
    controls[rowId] = controlProjection;
  }

  const n1DiagnosticPass =
    asMutableRecord(
      input.n1ExitCriteria.C2_DIAGNOSTIC_CORRECTNESS,
      "matrix.N1.exit_criteria_5_hardened.C2_DIAGNOSTIC_CORRECTNESS",
    ).status === "PASS";
  const executedGovernanceAudits = Object.values(input.acceptanceAuditsByRow).filter(
    (audit): audit is GateCAuditRecord => audit?.executed === true,
  );
  const diagnosticAccuracyNumerator =
    (n1DiagnosticPass ? 1 : 0) +
    executedGovernanceAudits.reduce((count, audit, index) => {
      const checklist = asMutableRecord(
        audit.checklist ?? {},
        `executedGovernanceAudits[${index}].checklist`,
      );
      return count + (checklist.oracle_diagnosis_sesuai_spesifikasi === true ? 1 : 0);
    }, 0);
  const diagnosticAccuracyDenominator = 1 + executedGovernanceAudits.length;
  const p1ReplayResults = asMutableRecord(
    input.p1.replay_results,
    "matrix.P1.replay_results",
  );
  const p1ReplayStable =
    p1ReplayResults.replay_verdict_match_original === true &&
    p1ReplayResults.replay_witness_canonical_match === true;
  const n1ReplayStable =
    asMutableRecord(
      input.n1ExitCriteria.C4_REPLAY_CORRECTNESS,
      "matrix.N1.exit_criteria_5_hardened.C4_REPLAY_CORRECTNESS",
    ).status === "PASS";
  const apparatusStabilityNumerator =
    (p1ReplayStable ? 1 : 0) +
    (n1ReplayStable ? 1 : 0) +
    executedGovernanceAudits.reduce((count, audit, index) => {
      const checklist = asMutableRecord(
        audit.checklist ?? {},
        `executedGovernanceAudits[${index}].checklist`,
      );
      return count + (checklist.replay_pass_reproducibility === true ? 1 : 0);
    }, 0);
  const apparatusStabilityDenominator = 2 + executedGovernanceAudits.length;
  const p1DriftFree =
    asMutableRecord(
      input.p1.pairwise_apparatus_vs_run_002_negative_control_n1,
      "matrix.P1.pairwise_apparatus_vs_run_002_negative_control_n1",
    ).apparatus_pairwise_identical === true;
  const n1DriftFree =
    asMutableRecord(
      input.n1ExitCriteria.C5_ISOLATION_CORRECTNESS,
      "matrix.N1.exit_criteria_5_hardened.C5_ISOLATION_CORRECTNESS",
    ).status === "PASS";
  const instrumentDriftNumerator =
    (p1DriftFree ? 0 : 1) +
    (n1DriftFree ? 0 : 1) +
    executedGovernanceAudits.reduce((count, audit, index) => {
      const checklist = asMutableRecord(
        audit.checklist ?? {},
        `executedGovernanceAudits[${index}].checklist`,
      );
      return count + (checklist.science_kernel_unchanged === true ? 0 : 1);
    }, 0);
  const instrumentDriftDenominator = 2 + executedGovernanceAudits.length;
  const acceptanceAttempts = input.acceptanceDecisionEntries.filter((entry, index) => {
    const record = asMutableRecord(
      entry,
      `acceptance_decisions.entries[${index}]`,
    );
    return record.counted_as_attempt === true;
  });
  const acceptedDecisions = acceptanceAttempts.filter((entry, index) => {
    const record = asMutableRecord(entry, `acceptance_attempts[${index}]`);
    return record.decision === "ACCEPTED" || record.decision === "ALREADY_ACCEPTED";
  });

  return {
    completedTruthTableRows,
    truthTableRowCompletionPercent,
    operationalCompletionPercent,
    operationalCompletedUnits,
    operationalTotalUnits,
    controls,
    diagnosticAccuracyNumerator,
    diagnosticAccuracyDenominator,
    apparatusStabilityNumerator,
    apparatusStabilityDenominator,
    instrumentDriftNumerator,
    instrumentDriftDenominator,
    acceptanceAttemptCount: acceptanceAttempts.length,
    acceptedDecisionCount: acceptedDecisions.length,
    evidenceComplete: completedTruthTableRows.length === input.truthTableRows.length,
    governanceRatifiable: Object.values(input.acceptanceAuditsByRow).every(
      (audit) => audit?.acceptance_complete === true,
    ),
  };
}

export function materializeGateCStatusProjectionRuntime(input: {
  readonly acceptanceContractId: string;
  readonly proofLedgerAppendOnlyEnforced: boolean;
  readonly proofLedgerEntryCount: number;
  readonly proofLedgerLastEntryHash: string;
  readonly completedTruthTableRows: readonly string[];
  readonly truthTableRowsTotal: number;
  readonly truthTableRowCompletionPercent: number;
  readonly operationalCompletedUnits: number;
  readonly operationalTotalUnits: number;
  readonly operationalCompletionPercent: number;
  readonly controls: Record<string, JsonValue>;
  readonly n2AcceptanceAudit: GateCAuditRecord;
  readonly n3AcceptanceAudit: GateCAuditRecord;
  readonly n4AcceptanceAudit: GateCAuditRecord;
  readonly n5AcceptanceAudit: GateCAuditRecord;
  readonly n6AcceptanceAudit: GateCAuditRecord;
  readonly n7AcceptanceAudit: GateCAuditRecord;
  readonly diagnosticAccuracyNumerator: number;
  readonly diagnosticAccuracyDenominator: number;
  readonly apparatusStabilityNumerator: number;
  readonly apparatusStabilityDenominator: number;
  readonly instrumentDriftNumerator: number;
  readonly instrumentDriftDenominator: number;
  readonly acceptedDecisionCount: number;
  readonly acceptanceAttemptCount: number;
  readonly sourceEvidence: GateCProjectionSourceSnapshot;
  readonly sourceEvidenceHash: string;
  readonly governance: GateCGovernanceBundle;
  readonly capability: GateCCapabilityBundle;
  readonly decision: GateCDecisionBundle;
  readonly learning: GateCLearningBundle;
  readonly specification: GateCSpecificationBundle;
  readonly foundation: GateCFoundationBundle;
  readonly trust: GateCTrustBundle;
  readonly evidenceComplete: boolean;
  readonly governanceRatifiable: boolean;
  readonly scientificPhaseCurrent: string;
  readonly phaseAOneNegativeComplete: boolean;
  readonly gateC1MilestoneFirstNegativePassed: boolean;
  readonly scienceKernelBundleSha256: string;
  readonly genesisEvidenceRunId: string;
  readonly frozenPositiveControlReplayRunId: string;
  readonly firstNegativeControlRunId: string;
  readonly nextActionsImmediate: readonly string[];
  readonly refs: {
    readonly constitutionSummary: string;
    readonly capabilityDependencyConstitution: string;
    readonly contractVersionRegistry: string;
    readonly contractVersionEvolution: string;
    readonly governanceSession: string;
    readonly governanceSessionVerification: string;
    readonly verificationRun: string;
    readonly verificationRunVerification: string;
    readonly governanceCatalog: string;
    readonly governanceCatalogVerification: string;
    readonly capabilityGovernanceIndex: string;
    readonly capabilityGovernanceVerification: string;
    readonly capabilityGraph: string;
    readonly capabilityGraphVerification: string;
    readonly enterpriseControlGraph: string;
    readonly enterpriseControlGraphVerification: string;
    readonly architectureFitness: string;
    readonly governanceReadModelSelectiveExecution: string;
    readonly trustFramework: string;
    readonly trustFrameworkVerification: string;
    readonly attestationLifecycleVerification: string;
    readonly attestationLifecycleMaterialization: string;
    readonly trustSignatureProviderRegistry: string;
    readonly trustSignatureProviderVerification: string;
    readonly trustSignatureMaterialization: string;
    readonly specificationConformance: string;
    readonly specificationArtifactGraph: string;
    readonly specificationVocabularyAudit: string;
    readonly decisionQualityReport: string;
    readonly learningIntelligenceReport: string;
    readonly evidenceProducerConvergenceReport: string;
  };
}): Record<string, JsonValue> {
  const governancePlatformStatus =
    buildPlatformGovernanceSnapshotStatus(input.governance);
  const acceptanceIntegrityValue =
    input.acceptanceAttemptCount > 0
      ? input.acceptedDecisionCount / input.acceptanceAttemptCount
      : null;

  return {
    version: "1.0.0",
    status_projection_id: "GATE-C-STATUS-001",
    kind: "OPERATIONAL_READ_MODEL",
    status: "ACTIVE",
    projection_basis_hash: input.sourceEvidenceHash,
    source_artifacts: {
      coverage_matrix_ref: "execution/coverage-matrix.yaml",
      coverage_matrix_hash: input.sourceEvidence.coverage_matrix_hash,
      proof_ledger_ref: "execution/proof-ledger.yaml",
      proof_ledger_hash: input.sourceEvidence.proof_ledger_hash,
      acceptance_contract_ref: "execution/acceptance-contract.yaml",
      acceptance_contract_hash: input.sourceEvidence.acceptance_contract_hash,
      acceptance_decisions_ref: "execution/acceptance-decisions.yaml",
      acceptance_decisions_hash: input.sourceEvidence.acceptance_decisions_hash,
      acceptance_reports_dir_ref: "execution/acceptance",
      acceptance_evidence_file_count:
        input.sourceEvidence.acceptance_evidence_file_count,
      acceptance_evidence_inventory_hash:
        input.sourceEvidence.acceptance_evidence_inventory_hash,
      constitution_summary_ref: input.refs.constitutionSummary,
      constitution_summary_hash: input.sourceEvidence.constitution_summary_hash,
      capability_dependency_constitution_ref:
        input.refs.capabilityDependencyConstitution,
      capability_dependency_constitution_hash:
        input.sourceEvidence.capability_dependency_constitution_hash,
      contract_version_registry_ref: input.refs.contractVersionRegistry,
      contract_version_registry_hash: input.sourceEvidence.contract_version_registry_hash,
      contract_version_evolution_ref: input.refs.contractVersionEvolution,
      contract_version_evolution_hash:
        input.sourceEvidence.contract_version_evolution_hash,
      governance_session_ref: input.refs.governanceSession,
      governance_session_hash: input.sourceEvidence.governance_session_hash,
      trust_framework_ref: input.refs.trustFramework,
      trust_framework_hash: input.sourceEvidence.trust_framework_hash,
      trust_framework_verification_ref: input.refs.trustFrameworkVerification,
      trust_framework_verification_hash:
        input.sourceEvidence.trust_framework_verification_hash,
      specification_conformance_ref: input.refs.specificationConformance,
      specification_conformance_hash:
        input.sourceEvidence.specification_conformance_hash,
      specification_artifact_graph_ref: input.refs.specificationArtifactGraph,
      specification_artifact_graph_hash:
        input.sourceEvidence.specification_artifact_graph_hash,
      specification_vocabulary_audit_ref: input.refs.specificationVocabularyAudit,
      specification_vocabulary_audit_hash:
        input.sourceEvidence.specification_vocabulary_audit_hash,
      learning_intelligence_ref: input.refs.learningIntelligenceReport,
      learning_intelligence_hash: input.sourceEvidence.learning_intelligence_hash,
      n2_run_ref: "execution/runs/run-004",
      n4_run_ref: `execution/runs/${String(input.n4AcceptanceAudit.run_id ?? "run-006")}`,
      append_only_proof_ledger_enforced: input.proofLedgerAppendOnlyEnforced,
      proof_ledger_entry_count: input.proofLedgerEntryCount,
      last_entry_hash: input.proofLedgerLastEntryHash,
    },
    operational_rule: {
      evidence_immutability: "HISTORICAL_EXECUTION_EVIDENCE_IMMUTABLE",
      projection_mutability: "READ_MODELS_AND_STATUS_AGGREGATIONS_MUTABLE",
      rule: "Never modify historical execution evidence. If operational interpretation changes, create or regenerate read models instead of mutating immutable evidence.",
    },
    governance_capabilities: {
      acceptance_evidence_immutability: {
        status: "ENFORCED",
        storage_model: "DECISION_SCOPED_APPEND_ONLY_ACCEPTANCE_REPORTS",
        note: "Acceptance reports are written once per acceptance decision id and cannot be overwritten in place.",
      },
      projection_regeneration: {
        status: "DETERMINISTIC_REBUILD_CAPABLE",
        basis_hash: input.sourceEvidenceHash,
        note: "Projection content is derived only from historical evidence, acceptance evidence, decision log, and proof ledger snapshot hashes.",
      },
      platform_governance_snapshot: {
        status: governancePlatformStatus,
        note: "Gate C operational read model now carries repository-level governance evidence so scientific ratification can be interpreted alongside platform constitution, dependency law, and contract law status.",
      },
    },
    acceptance_authority: {
      contract_id: input.acceptanceContractId,
      authority_artifact: "execution/proof-ledger.yaml",
      invariant: "Accepted(run) = Execution AND Verification AND Ledger",
      note: "Run directories prove execution history. Proof Ledger proves accepted evidence corpus membership.",
    },
    state_machine: {
      lifecycle_vocabulary: ["PENDING", "EXECUTED", "VERIFIED", "LEDGERED", "ACCEPTED"],
      note: "Current projection emits PENDING, VERIFIED, and ACCEPTED based on observable evidence and ledger state.",
    },
    phase: {
      current: input.evidenceComplete ? "PHASE_3" : input.scientificPhaseCurrent,
      phase_a_status: input.phaseAOneNegativeComplete ? "SUCCESS" : "IN_PROGRESS",
      gate_c1_framework_status: input.gateC1MilestoneFirstNegativePassed
        ? "NEGATIVE_CONTROL_FRAMEWORK_OPERATIONAL"
        : "NOT_YET_OPERATIONAL",
    },
    science_kernel: {
      status: "CALIBRATED_AND_FROZEN",
      bundle_sha256: input.scienceKernelBundleSha256,
    },
    baseline: {
      genesis_evidence_run_id: input.genesisEvidenceRunId,
      frozen_positive_control_replay_run_id:
        input.frozenPositiveControlReplayRunId,
      first_negative_control_run_id: input.firstNegativeControlRunId,
    },
    governance_platform: materializeGovernancePlatform({
      governance: input.governance,
      capability: input.capability,
      decision: input.decision,
      learning: input.learning,
      specification: input.specification,
      foundation: input.foundation,
      trust: input.trust,
      refs: input.refs,
    }),
    coverage: {
      metric_definitions: {
        truth_table_row_completion_percent:
          "Counts unique truth-table rows P1..N7 with completed actual verdicts.",
        operational_completion_percent:
          "Operational internal projection metric from coverage-matrix. Currently counts P1, frozen positive-control replay baseline, and N1 milestone as completed units.",
      },
      truth_table_rows_completed: input.completedTruthTableRows,
      truth_table_rows_total: input.truthTableRowsTotal,
      truth_table_row_completion_percent: input.truthTableRowCompletionPercent,
      operational_completed_units: input.operationalCompletedUnits,
      operational_total_units: input.operationalTotalUnits,
      operational_completion_percent: input.operationalCompletionPercent,
      controls: input.controls,
      verification_audits: {
        n2: input.n2AcceptanceAudit,
        n3: input.n3AcceptanceAudit,
        n4: input.n4AcceptanceAudit,
        n5: input.n5AcceptanceAudit,
        n6: input.n6AcceptanceAudit,
        n7: input.n7AcceptanceAudit,
      },
      verification_metrics: {
        diagnostic_accuracy: {
          formula:
            "Correct Diagnostic Verdict / Executed Negative-Control Scenarios With Diagnostic Expectation",
          numerator: input.diagnosticAccuracyNumerator,
          denominator: input.diagnosticAccuracyDenominator,
          value:
            input.diagnosticAccuracyNumerator /
            input.diagnosticAccuracyDenominator,
          note: "Counts N1 together with all executed negative controls whose diagnostic predicate attribution matches specification.",
        },
        apparatus_stability: {
          formula:
            "Convergent Replays / Total Frozen-Apparatus Replay Evaluations",
          numerator: input.apparatusStabilityNumerator,
          denominator: input.apparatusStabilityDenominator,
          value:
            input.apparatusStabilityNumerator /
            input.apparatusStabilityDenominator,
          note: "Counts replay and convergence evidence under the frozen apparatus across P1 baseline and executed negative controls.",
        },
        instrument_drift: {
          formula: "Instrument Changes / Executed Frozen-Apparatus Experiments",
          numerator: input.instrumentDriftNumerator,
          denominator: input.instrumentDriftDenominator,
          value:
            input.instrumentDriftNumerator / input.instrumentDriftDenominator,
          note: "Counts observed drift against the frozen isolation snapshot across the P1 baseline and executed negative controls.",
        },
        acceptance_integrity: {
          formula: "Accepted Evidence / Acceptance Attempts",
          numerator: input.acceptedDecisionCount,
          denominator: input.acceptanceAttemptCount,
          value: acceptanceIntegrityValue,
          status:
            input.acceptanceAttemptCount > 0 ? "ACTIVE" : "PENDING_BASELINE",
          note:
            input.acceptanceAttemptCount > 0
              ? "Counts append-only acceptance decisions recorded under the frozen acceptance contract."
              : "No append-only acceptance decision corpus recorded yet under the frozen contract.",
        },
      },
    },
    overall: materializeOverallSummary({
      evidenceComplete: input.evidenceComplete,
      governanceRatifiable: input.governanceRatifiable,
      governance: input.governance,
      capability: input.capability,
      decision: input.decision,
      learning: input.learning,
      specification: input.specification,
      foundation: input.foundation,
      trust: input.trust,
    }),
    next_actions: input.nextActionsImmediate.filter((action) => {
      if (isAcceptanceComplete(input.n2AcceptanceAudit) && action.includes("N2:")) {
        return false;
      }
      if (isAcceptanceComplete(input.n4AcceptanceAudit) && action.includes("N4:")) {
        return false;
      }
      return true;
    }),
  };
}

function materializeGovernancePlatform(input: {
  readonly governance: GateCGovernanceBundle;
  readonly capability: GateCCapabilityBundle;
  readonly decision: GateCDecisionBundle;
  readonly learning: GateCLearningBundle;
  readonly specification: GateCSpecificationBundle;
  readonly foundation: GateCFoundationBundle;
  readonly trust: GateCTrustBundle;
  readonly refs: {
    readonly constitutionSummary: string;
    readonly capabilityDependencyConstitution: string;
    readonly contractVersionRegistry: string;
    readonly contractVersionEvolution: string;
    readonly governanceSession: string;
    readonly governanceSessionVerification: string;
    readonly verificationRun: string;
    readonly verificationRunVerification: string;
    readonly governanceCatalog: string;
    readonly governanceCatalogVerification: string;
    readonly capabilityGovernanceIndex: string;
    readonly capabilityGovernanceVerification: string;
    readonly capabilityGraph: string;
    readonly capabilityGraphVerification: string;
    readonly enterpriseControlGraph: string;
    readonly enterpriseControlGraphVerification: string;
    readonly architectureFitness: string;
    readonly governanceReadModelSelectiveExecution: string;
    readonly trustFramework: string;
    readonly trustFrameworkVerification: string;
    readonly attestationLifecycleVerification: string;
    readonly attestationLifecycleMaterialization: string;
    readonly trustSignatureProviderRegistry: string;
    readonly trustSignatureProviderVerification: string;
    readonly trustSignatureMaterialization: string;
    readonly specificationConformance: string;
    readonly specificationArtifactGraph: string;
    readonly specificationVocabularyAudit: string;
    readonly decisionQualityReport: string;
    readonly learningIntelligenceReport: string;
    readonly evidenceProducerConvergenceReport: string;
  };
}): Record<string, JsonValue> {
  const governance = input.governance;
  const capability = input.capability;
  const decision = input.decision;
  const learning = input.learning;
  const specification = input.specification;
  const foundation = input.foundation;
  const trust = input.trust;
  return {
    constitution: {
      status: governance.constitution.status,
      law_profile: governance.constitution.lawProfile,
      evidence_ref: input.refs.constitutionSummary,
    },
    dependency_graph: {
      status: governance.dependencyGraph.status,
      dependency_cycles: governance.dependencyGraph.dependencyCycles,
      boundary_violations: governance.dependencyGraph.boundaryViolations,
      dependency_policy_violations:
        governance.dependencyGraph.dependencyPolicyViolations,
      evidence_ref: input.refs.capabilityDependencyConstitution,
    },
    contract_governance: {
      status: governance.contracts.registryStatus,
      evolution_status: governance.contracts.evolutionStatus,
      ready_contracts: governance.contracts.readyContractCount,
      ambiguous_provider_bindings: governance.contracts.ambiguousProviderBindings,
      unbounded_consumer_requirements:
        governance.contracts.unboundedConsumerRequirements,
      evidence_ref: input.refs.contractVersionRegistry,
      evolution_ref: input.refs.contractVersionEvolution,
    },
    provenance: {
      status: governance.provenance.sessionStatus,
      verification_status: governance.provenance.sessionVerificationStatus,
      session_id: governance.provenance.sessionId,
      execution_scope: governance.provenance.sessionScope,
      read_model_count: governance.provenance.sessionReadModelCount,
      evidence_ref: input.refs.governanceSession,
      verification_ref: input.refs.governanceSessionVerification,
    },
    verification_run: {
      status: governance.verificationRun.status,
      run_id: governance.verificationRun.runId,
      readiness_status: governance.verificationRun.readinessStatus,
      evidence_ref: input.refs.verificationRun,
      verification_ref: input.refs.verificationRunVerification,
    },
    governance_catalog: {
      status: governance.catalog.status,
      report_type_count: governance.catalog.reportTypeCount,
      evidence_ref: input.refs.governanceCatalog,
      verification_ref: input.refs.governanceCatalogVerification,
    },
    capability_governance: {
      status: capability.governance.status,
      compatibility_status: capability.governance.compatibilityStatus,
      compatibility_score: capability.governance.compatibilityScore,
      unknown_dependency_class_count:
        capability.governance.unknownDependencyClassCount,
      contract_drift_count: capability.governance.contractDriftCount,
      migration_required_count: capability.governance.migrationRequiredCount,
      evidence_ref: input.refs.capabilityGovernanceIndex,
      verification_ref: input.refs.capabilityGovernanceVerification,
    },
    capability_graph: {
      status: capability.graph.status,
      governance_health_status: capability.graph.governanceHealthStatus,
      health_domains: {
        structural: {
          status: capability.graph.structuralHealthStatus,
          cycle_count: capability.graph.cycleCount,
          unknown_dependency_count: capability.graph.unknownDependencyCount,
          unstable_dependency_count: capability.graph.unstableDependencyCount,
          orphan_capability_count: capability.graph.orphanCapabilityCount,
        },
        architectural: {
          status: capability.graph.architecturalHealthStatus,
          forbidden_dependency_count: capability.graph.forbiddenDependencyCount,
          layering_violation_count: capability.graph.layeringViolationCount,
          abstraction_leak_count: capability.graph.abstractionLeakCount,
        },
        governance: {
          status: capability.graph.governanceDomainStatus,
          ownership_gap_count: capability.graph.ownershipGapCount,
        },
        evolution: {
          status: capability.graph.evolutionHealthStatus,
          migration_debt_count: capability.graph.migrationDebtCount,
        },
        evidence: {
          status: capability.graph.evidenceHealthStatus,
          capability_without_evidence_count:
            capability.graph.capabilityWithoutEvidenceCount,
          stale_evidence_count: capability.graph.staleEvidenceCount,
          unverifiable_capability_count:
            capability.graph.unverifiableCapabilityCount,
          orphaned_evidence_count: capability.graph.orphanedEvidenceCount,
          inconsistent_evidence_count:
            capability.graph.inconsistentEvidenceCount,
          unsigned_evidence_count: capability.graph.unsignedEvidenceCount,
          tampered_evidence_count: capability.graph.tamperedEvidenceCount,
          partial_evidence_count: capability.graph.partialEvidenceCount,
          superseded_evidence_count: capability.graph.supersededEvidenceCount,
          expired_evidence_count: capability.graph.expiredEvidenceCount,
        },
      },
      dependency_edge_count: capability.graph.edgeCount,
      circular_dependency_count: capability.graph.cycleCount,
      forbidden_dependency_count: capability.graph.forbiddenDependencyCount,
      layering_violation_count: capability.graph.layeringViolationCount,
      abstraction_leak_count: capability.graph.abstractionLeakCount,
      unknown_dependency_count: capability.graph.unknownDependencyCount,
      unstable_dependency_count: capability.graph.unstableDependencyCount,
      orphan_capability_count: capability.graph.orphanCapabilityCount,
      ownership_gap_count: capability.graph.ownershipGapCount,
      migration_debt_count: capability.graph.migrationDebtCount,
      capability_without_evidence_count:
        capability.graph.capabilityWithoutEvidenceCount,
      stale_evidence_count: capability.graph.staleEvidenceCount,
      unverifiable_capability_count:
        capability.graph.unverifiableCapabilityCount,
      orphaned_evidence_count: capability.graph.orphanedEvidenceCount,
      inconsistent_evidence_count: capability.graph.inconsistentEvidenceCount,
      unsigned_evidence_count: capability.graph.unsignedEvidenceCount,
      tampered_evidence_count: capability.graph.tamperedEvidenceCount,
      partial_evidence_count: capability.graph.partialEvidenceCount,
      superseded_evidence_count: capability.graph.supersededEvidenceCount,
      expired_evidence_count: capability.graph.expiredEvidenceCount,
      warn_capability_count: capability.graph.warnCapabilityCount,
      fail_capability_count: capability.graph.failCapabilityCount,
      evidence_ref: input.refs.capabilityGraph,
      verification_ref: input.refs.capabilityGraphVerification,
    },
    enterprise_control_graph: {
      status: governance.enterpriseControlGraph.status,
      node_count: governance.enterpriseControlGraph.nodeCount,
      edge_count: governance.enterpriseControlGraph.edgeCount,
      disconnected_node_count: governance.enterpriseControlGraph.disconnectedNodeCount,
      evidence_ref: input.refs.enterpriseControlGraph,
      verification_ref: input.refs.enterpriseControlGraphVerification,
    },
    architecture_fitness: {
      status: governance.architecture.fitnessStatus,
      violated_metric_count: governance.architecture.violatedMetricCount,
      evidence_ref: input.refs.architectureFitness,
    },
    read_model_selective_execution: {
      status: governance.selectiveExecution.status,
      execution_mode: governance.selectiveExecution.mode,
      delta_scope_status: governance.selectiveExecution.deltaScopeStatus,
      reused_node_count: governance.selectiveExecution.reusedNodeCount,
      rematerialized_node_count:
        governance.selectiveExecution.rematerializedNodeCount,
      evidence_ref: input.refs.governanceReadModelSelectiveExecution,
    },
    trust_framework: {
      status: trust.framework.status,
      framework_count: trust.framework.frameworkCount,
      frameworks_with_full_spi_coverage: trust.framework.fullSpiCoverageCount,
      attestation_lifecycle_status: trust.attestationLifecycle.status,
      attestation_terminal_event_readiness_status:
        trust.attestationLifecycle.terminalEventReadinessStatus,
      attestation_terminal_event_count:
        trust.attestationLifecycle.terminalEventCount,
      attestation_terminal_materialization_status:
        trust.attestationLifecycle.materializationStatus,
      attestation_terminal_materialized_sample_count:
        trust.attestationLifecycle.materializedSampleCount,
      signature_provider_activation_status: trust.signatures.providerStatus,
      signature_provider_adapter_count: trust.signatures.providerAdapterCount,
      signature_materialization_status: trust.signatures.materializationStatus,
      signature_materialized_attestation_count:
        trust.signatures.materializedAttestationCount,
      signature_provider_spi: trust.signatures.providerSpi,
      evidence_ref: input.refs.trustFramework,
      verification_ref: input.refs.trustFrameworkVerification,
      attestation_lifecycle_ref: input.refs.attestationLifecycleVerification,
      attestation_lifecycle_materialization_ref:
        input.refs.attestationLifecycleMaterialization,
      signature_provider_registry_ref:
        input.refs.trustSignatureProviderRegistry,
      signature_provider_verification_ref:
        input.refs.trustSignatureProviderVerification,
      signature_materialization_ref: input.refs.trustSignatureMaterialization,
    },
    specification_system: {
      status: buildSpecificationSystemStatus(input.specification),
      conformance_status: specification.conformance.status,
      vocabulary_status: specification.vocabulary.status,
      registry_artifact_count: specification.artifactGraph.registryArtifactCount,
      registry_edge_count: specification.artifactGraph.registryEdgeCount,
      rfc_count: specification.conformance.rfcCount,
      conf_count: specification.conformance.confCount,
      spec_count: specification.artifactGraph.specCount,
      conformance_warning_count: specification.conformance.warningCount,
      conformance_failure_count: specification.conformance.failureCount,
      vocabulary_term_count: specification.vocabulary.termCount,
      vocabulary_duplicate_count: specification.vocabulary.duplicateCount,
      conformance_ref: input.refs.specificationConformance,
      artifact_graph_ref: input.refs.specificationArtifactGraph,
      vocabulary_audit_ref: input.refs.specificationVocabularyAudit,
    },
    decision_quality: {
      status: decision.quality.status,
      decision_count: decision.quality.decisionCount,
      decision_traceability_coverage: decision.quality.traceabilityCoverage,
      decision_outcome_coverage: decision.quality.outcomeCoverage,
      decision_learning_closure: decision.quality.learningClosure,
      decision_reproducibility: decision.quality.reproducibility,
      decision_reversibility: decision.quality.reversibility,
      decision_impact_graph_completeness:
        decision.quality.impactGraphCompleteness,
      engineering_leverage_measurement_coverage:
        decision.quality.engineeringLeverageMeasurementCoverage,
      decision_effectiveness: decision.quality.effectiveness,
      decision_success_rate: decision.quality.successRate,
      false_decision_rate: decision.quality.falseDecisionRate,
      decision_reversal_rate: decision.quality.reversalRate,
      evidence_utilization_rate: decision.quality.evidenceUtilizationRate,
      knowledge_reuse_rate: decision.quality.knowledgeReuseRate,
      evidence_strength_index: decision.quality.evidenceStrengthIndex,
      outcome_improvement_rate:
        decision.quality.outcomeImprovementRate,
      decision_confidence_index:
        decision.quality.decisionConfidenceIndex,
      knowledge_weighted_quality_index:
        decision.quality.knowledgeWeightedQualityIndex,
      mean_time_to_outcome_ms: decision.quality.meanTimeToOutcomeMs,
      learning_velocity_ms: decision.quality.learningVelocityMs,
      decision_confidence_growth: decision.quality.confidenceGrowth,
      report_ref: input.refs.decisionQualityReport,
    },
    learning_intelligence: {
      status: learning.intelligence.status,
      decision_count: learning.intelligence.decisionCount,
      outcome_count: learning.intelligence.outcomeCount,
      outcome_registry_coverage:
        learning.intelligence.outcomeRegistryCoverage,
      decision_quality_index: learning.intelligence.decisionQualityIndex,
      learning_velocity_ms: learning.intelligence.learningVelocityMs,
      knowledge_gain_units: learning.intelligence.knowledgeGainUnits,
      knowledge_gain: learning.intelligence.knowledgeGain,
      knowledge_object_count: learning.intelligence.knowledgeObjectCount,
      operationalized_knowledge_count:
        learning.intelligence.operationalizedKnowledgeCount,
      knowledge_availability_rate:
        learning.intelligence.knowledgeAvailabilityRate,
      knowledge_reuse_rate: learning.intelligence.knowledgeReuseRate,
      reused_knowledge_object_count:
        learning.intelligence.reusedKnowledgeObjectCount,
      improved_knowledge_object_count:
        learning.intelligence.improvedKnowledgeObjectCount,
      knowledge_lineage_count:
        learning.intelligence.knowledgeLineageCount,
      knowledge_lineage_preview:
        learning.intelligence.knowledgeLineagePreview ?? [],
      recommendation_effectiveness_rate:
        learning.intelligence.recommendationEffectivenessRate,
      decision_pattern_change_rate:
        learning.intelligence.decisionPatternChangeRate,
      recommendation_acceptance_rate:
        learning.intelligence.recommendationAcceptanceRate,
      behavior_change_rate: learning.intelligence.behaviorChangeRate,
      engineering_leverage_ratio:
        learning.intelligence.engineeringLeverageRatio,
      repeated_mistake_count: learning.intelligence.repeatedMistakeCount,
      future_decision_improvement_rate:
        learning.intelligence.futureDecisionImprovementRate,
      report_ref: input.refs.learningIntelligenceReport,
    },
    closed_loop_hypothesis: materializeClosedLoopHypothesis({
      decision,
      learning,
      refs: {
        decisionQualityReport: input.refs.decisionQualityReport,
        learningIntelligenceReport: input.refs.learningIntelligenceReport,
      },
    }),
    evidence_convergence: {
      status: foundation.evidenceProducers.convergenceStatus,
      producer_count: foundation.evidenceProducers.producerCount,
      target_producer_count: foundation.evidenceProducers.targetCount,
      registered_target_producer_count:
        foundation.evidenceProducers.registeredTargetCount,
      target_coverage_ratio: foundation.evidenceProducers.targetCoverageRatio,
      report_ref: input.refs.evidenceProducerConvergenceReport,
    },
  };
}

function materializeOverallSummary(input: {
  readonly evidenceComplete: boolean;
  readonly governanceRatifiable: boolean;
  readonly governance: GateCGovernanceBundle;
  readonly capability: GateCCapabilityBundle;
  readonly decision: GateCDecisionBundle;
  readonly learning: GateCLearningBundle;
  readonly specification: GateCSpecificationBundle;
  readonly foundation: GateCFoundationBundle;
  readonly trust: GateCTrustBundle;
}): Record<string, JsonValue> {
  return {
    gate_c1_status: input.governanceRatifiable
      ? "RATIFIABLE"
      : input.evidenceComplete
        ? "TECHNICALLY_COMPLETE_GOVERNANCE_RATIFICATION_PENDING"
        : "IN_PROGRESS",
    currently_supported_claim: input.governanceRatifiable
      ? buildPlatformGovernanceSnapshotStatus(input.governance) === "HEALTHY"
        ? "Gate C1 ratifiable; evidence corpus complete and governance invariants pass."
        : "Gate C1 ratifiable at evidence level; repository governance review still required."
      : input.evidenceComplete
        ? "Gate C1 evidence complete; governance ratification pending."
        : "Gate C1 Phase A SUCCESS; Negative Control Framework Operational.",
    constitutional_status: input.governance.constitution.status,
    dependency_constitution_status: input.governance.dependencyGraph.status,
    contract_registry_status: input.governance.contracts.registryStatus,
    contract_version_evolution_status:
      input.governance.contracts.evolutionStatus,
    governance_session_status: input.governance.provenance.sessionStatus,
    governance_session_verification_status:
      input.governance.provenance.sessionVerificationStatus,
    verification_run_status: input.governance.verificationRun.status,
    governance_catalog_status: input.governance.catalog.status,
    capability_governance_status: input.capability.governance.status,
    capability_governance_compatibility_status:
      input.capability.governance.compatibilityStatus,
    capability_graph_status: input.capability.graph.status,
    capability_graph_governance_health_status:
      input.capability.graph.governanceHealthStatus,
    capability_graph_structural_health_status:
      input.capability.graph.structuralHealthStatus,
    capability_graph_architectural_health_status:
      input.capability.graph.architecturalHealthStatus,
    capability_graph_governance_domain_status:
      input.capability.graph.governanceDomainStatus,
    capability_graph_evolution_health_status:
      input.capability.graph.evolutionHealthStatus,
    capability_graph_evidence_health_status:
      input.capability.graph.evidenceHealthStatus,
    capability_graph_cycle_count: input.capability.graph.cycleCount,
    capability_graph_orphan_capability_count:
      input.capability.graph.orphanCapabilityCount,
    capability_graph_forbidden_dependency_count:
      input.capability.graph.forbiddenDependencyCount,
    capability_graph_layering_violation_count:
      input.capability.graph.layeringViolationCount,
    capability_graph_abstraction_leak_count:
      input.capability.graph.abstractionLeakCount,
    capability_graph_unstable_dependency_count:
      input.capability.graph.unstableDependencyCount,
    capability_graph_unknown_dependency_count:
      input.capability.graph.unknownDependencyCount,
    capability_graph_ownership_gap_count:
      input.capability.graph.ownershipGapCount,
    capability_graph_migration_debt_count:
      input.capability.graph.migrationDebtCount,
    capability_graph_capability_without_evidence_count:
      input.capability.graph.capabilityWithoutEvidenceCount,
    capability_graph_stale_evidence_count: input.capability.graph.staleEvidenceCount,
    capability_graph_unverifiable_capability_count:
      input.capability.graph.unverifiableCapabilityCount,
    capability_graph_orphaned_evidence_count:
      input.capability.graph.orphanedEvidenceCount,
    capability_graph_inconsistent_evidence_count:
      input.capability.graph.inconsistentEvidenceCount,
    capability_graph_unsigned_evidence_count:
      input.capability.graph.unsignedEvidenceCount,
    capability_graph_tampered_evidence_count:
      input.capability.graph.tamperedEvidenceCount,
    capability_graph_partial_evidence_count:
      input.capability.graph.partialEvidenceCount,
    capability_graph_superseded_evidence_count:
      input.capability.graph.supersededEvidenceCount,
    capability_graph_expired_evidence_count:
      input.capability.graph.expiredEvidenceCount,
    enterprise_control_graph_status: input.governance.enterpriseControlGraph.status,
    architecture_fitness_status: input.governance.architecture.fitnessStatus,
    governance_incremental_materialization_status:
      input.governance.verification.incrementalMaterializationStatus,
    governance_incremental_delta_mode: input.governance.verification.deltaMode,
    governance_incremental_delta_scope_status:
      input.governance.verification.deltaScopeStatus,
    governance_read_model_selective_execution_status:
      input.governance.selectiveExecution.status,
    governance_read_model_selective_execution_mode:
      input.governance.selectiveExecution.mode,
    governance_read_model_selective_execution_delta_scope_status:
      input.governance.selectiveExecution.deltaScopeStatus,
    trust_framework_status: input.trust.framework.status,
    attestation_lifecycle_status: input.trust.attestationLifecycle.status,
    attestation_lifecycle_materialization_status:
      input.trust.attestationLifecycle.materializationStatus,
    trust_signature_provider_status: input.trust.signatures.providerStatus,
    trust_signature_materialization_status:
      input.trust.signatures.materializationStatus,
    specification_system_status: buildSpecificationSystemStatus(input.specification),
    specification_conformance_status: input.specification.conformance.status,
    specification_vocabulary_status: input.specification.vocabulary.status,
    specification_registry_artifact_count:
      input.specification.artifactGraph.registryArtifactCount,
    specification_registry_edge_count:
      input.specification.artifactGraph.registryEdgeCount,
    specification_rfc_count: input.specification.conformance.rfcCount,
    specification_conf_count: input.specification.conformance.confCount,
    specification_spec_count: input.specification.artifactGraph.specCount,
    specification_conformance_warning_count:
      input.specification.conformance.warningCount,
    specification_conformance_failure_count:
      input.specification.conformance.failureCount,
    specification_vocabulary_term_count:
      input.specification.vocabulary.termCount,
    specification_vocabulary_duplicate_count:
      input.specification.vocabulary.duplicateCount,
    decision_quality_status: input.decision.quality.status,
    decision_quality_decision_count: input.decision.quality.decisionCount,
    decision_quality_traceability_coverage:
      input.decision.quality.traceabilityCoverage,
    decision_quality_outcome_coverage: input.decision.quality.outcomeCoverage,
    decision_quality_learning_closure: input.decision.quality.learningClosure,
    decision_quality_reproducibility: input.decision.quality.reproducibility,
    decision_quality_reversibility: input.decision.quality.reversibility,
    decision_quality_impact_graph_completeness:
      input.decision.quality.impactGraphCompleteness,
    decision_quality_engineering_leverage_measurement_coverage:
      input.decision.quality.engineeringLeverageMeasurementCoverage,
    decision_quality_effectiveness: input.decision.quality.effectiveness,
    decision_quality_success_rate: input.decision.quality.successRate,
    decision_quality_false_decision_rate: input.decision.quality.falseDecisionRate,
    decision_quality_reversal_rate: input.decision.quality.reversalRate,
    decision_quality_evidence_utilization_rate:
      input.decision.quality.evidenceUtilizationRate,
    decision_quality_knowledge_reuse_rate:
      input.decision.quality.knowledgeReuseRate,
    decision_quality_evidence_strength_index:
      input.decision.quality.evidenceStrengthIndex,
    decision_quality_outcome_improvement_rate:
      input.decision.quality.outcomeImprovementRate,
    decision_quality_decision_confidence_index:
      input.decision.quality.decisionConfidenceIndex,
    decision_quality_knowledge_weighted_quality_index:
      input.decision.quality.knowledgeWeightedQualityIndex,
    decision_quality_mean_time_to_outcome_ms:
      input.decision.quality.meanTimeToOutcomeMs,
    decision_quality_learning_velocity_ms:
      input.decision.quality.learningVelocityMs,
    decision_quality_confidence_growth:
      input.decision.quality.confidenceGrowth,
    learning_intelligence_status: input.learning.intelligence.status,
    learning_intelligence_decision_count:
      input.learning.intelligence.decisionCount,
    learning_intelligence_outcome_count: input.learning.intelligence.outcomeCount,
    learning_intelligence_outcome_registry_coverage:
      input.learning.intelligence.outcomeRegistryCoverage,
    learning_intelligence_decision_quality_index:
      input.learning.intelligence.decisionQualityIndex,
    learning_intelligence_learning_velocity_ms:
      input.learning.intelligence.learningVelocityMs,
    learning_intelligence_knowledge_gain_units:
      input.learning.intelligence.knowledgeGainUnits,
    learning_intelligence_knowledge_gain: input.learning.intelligence.knowledgeGain,
    learning_intelligence_knowledge_object_count:
      input.learning.intelligence.knowledgeObjectCount,
    learning_intelligence_operationalized_knowledge_count:
      input.learning.intelligence.operationalizedKnowledgeCount,
    learning_intelligence_knowledge_availability_rate:
      input.learning.intelligence.knowledgeAvailabilityRate,
    learning_intelligence_knowledge_reuse_rate:
      input.learning.intelligence.knowledgeReuseRate,
    learning_intelligence_reused_knowledge_object_count:
      input.learning.intelligence.reusedKnowledgeObjectCount,
    learning_intelligence_improved_knowledge_object_count:
      input.learning.intelligence.improvedKnowledgeObjectCount,
    learning_intelligence_knowledge_lineage_count:
      input.learning.intelligence.knowledgeLineageCount,
    learning_intelligence_knowledge_lineage_preview:
      input.learning.intelligence.knowledgeLineagePreview ?? [],
    learning_intelligence_recommendation_effectiveness_rate:
      input.learning.intelligence.recommendationEffectivenessRate,
    learning_intelligence_decision_pattern_change_rate:
      input.learning.intelligence.decisionPatternChangeRate,
    learning_intelligence_recommendation_acceptance_rate:
      input.learning.intelligence.recommendationAcceptanceRate,
    learning_intelligence_behavior_change_rate:
      input.learning.intelligence.behaviorChangeRate,
    learning_intelligence_engineering_leverage_ratio:
      input.learning.intelligence.engineeringLeverageRatio,
    learning_intelligence_repeated_mistake_count:
      input.learning.intelligence.repeatedMistakeCount,
    learning_intelligence_future_decision_improvement_rate:
      input.learning.intelligence.futureDecisionImprovementRate,
    closed_loop_hypothesis: materializeClosedLoopHypothesis({
      decision: input.decision,
      learning: input.learning,
      refs: {
        decisionQualityReport: "workspace/foundation/evidence/verification/decision-quality-report.json",
        learningIntelligenceReport:
          "workspace/foundation/evidence/verification/learning-intelligence-report.json",
      },
    }),
    evidence_convergence_status: input.foundation.evidenceProducers.convergenceStatus,
    evidence_producer_count: input.foundation.evidenceProducers.producerCount,
    evidence_target_producer_count: input.foundation.evidenceProducers.targetCount,
    evidence_registered_target_producer_count:
      input.foundation.evidenceProducers.registeredTargetCount,
    evidence_target_coverage_ratio:
      input.foundation.evidenceProducers.targetCoverageRatio,
    unsupported_claims: [
      "Gate C1 complete",
      "CC-001 corroborated",
      "CC-001 proven",
    ],
  };
}

function materializeClosedLoopHypothesis(input: {
  readonly decision: GateCDecisionBundle;
  readonly learning: GateCLearningBundle;
  readonly refs: {
    readonly decisionQualityReport: string;
    readonly learningIntelligenceReport: string;
  };
}): Record<string, JsonValue> {
  const stages = {
    evidence: buildHypothesisStage({
      observed:
        (input.decision.quality.decisionCount ?? 0) > 0 &&
        (input.decision.quality.evidenceUtilizationRate ?? 0) > 0,
      saturated: (input.decision.quality.evidenceStrengthIndex ?? 0) >= 1,
      metric:
        input.decision.quality.evidenceStrengthIndex ??
        input.decision.quality.evidenceUtilizationRate,
      metric_name: "evidence_strength_index",
      evidence_ref: input.refs.decisionQualityReport,
    }),
    decision: buildHypothesisStage({
      observed: (input.decision.quality.decisionCount ?? 0) > 0,
      saturated: (input.decision.quality.decisionCount ?? 0) > 0,
      metric: input.decision.quality.decisionCount,
      metric_name: "decision_count",
      evidence_ref: input.refs.decisionQualityReport,
    }),
    outcome: buildHypothesisStage({
      observed: (input.decision.quality.outcomeCoverage ?? 0) > 0,
      saturated: (input.decision.quality.outcomeCoverage ?? 0) >= 1,
      metric: input.decision.quality.outcomeCoverage,
      metric_name: "decision_outcome_coverage",
      evidence_ref: input.refs.decisionQualityReport,
    }),
    learning: buildHypothesisStage({
      observed:
        (input.decision.quality.learningClosure ?? 0) > 0 ||
        (input.learning.intelligence.knowledgeGainUnits ?? 0) > 0,
      saturated: (input.decision.quality.learningClosure ?? 0) >= 1,
      metric:
        input.decision.quality.learningClosure ??
        input.learning.intelligence.knowledgeGainUnits,
      metric_name: "decision_learning_closure",
      evidence_ref: input.refs.learningIntelligenceReport,
    }),
    knowledge: buildHypothesisStage({
      observed:
        (input.learning.intelligence.knowledgeObjectCount ?? 0) > 0 ||
        (input.learning.intelligence.knowledgeGainUnits ?? 0) > 0,
      saturated:
        (input.learning.intelligence.operationalizedKnowledgeCount ?? 0) > 0,
      metric:
        input.learning.intelligence.knowledgeAvailabilityRate ??
        input.learning.intelligence.knowledgeObjectCount ??
        input.learning.intelligence.knowledgeGainUnits,
      metric_name: "knowledge_availability_rate",
      evidence_ref: input.refs.learningIntelligenceReport,
    }),
    better_decision: buildHypothesisStage({
      observed:
        (input.decision.quality.knowledgeReuseRate ?? 0) > 0 ||
        (input.learning.intelligence.decisionPatternChangeRate ?? 0) > 0,
      saturated:
        (input.decision.quality.knowledgeWeightedQualityIndex ?? 0) > 0,
      metric:
        input.decision.quality.knowledgeWeightedQualityIndex ??
        input.learning.intelligence.decisionPatternChangeRate,
      metric_name: "knowledge_weighted_quality_index",
      evidence_ref: input.refs.decisionQualityReport,
    }),
    better_outcome: buildHypothesisStage({
      observed:
        (input.decision.quality.outcomeImprovementRate ?? 0) > 0 ||
        (input.learning.intelligence.futureDecisionImprovementRate ?? 0) > 0,
      saturated: (input.decision.quality.outcomeImprovementRate ?? 0) > 0,
      metric:
        input.decision.quality.outcomeImprovementRate ??
        input.learning.intelligence.futureDecisionImprovementRate,
      metric_name: "outcome_improvement_rate",
      evidence_ref: input.refs.learningIntelligenceReport,
    }),
  } as const;

  const stageStatuses = Object.values(stages).map((stage) => stage.status);
  const overallStatus = stageStatuses.every((status) => status === "PASS")
    ? "PASS"
    : stageStatuses.some((status) => status === "PASS")
      ? "PARTIAL"
      : "BLOCKED";

  return {
    statement:
      "Evidence -> Decision -> Outcome -> Learning -> Knowledge -> Better Decision -> Better Outcome",
    status: overallStatus,
    stages,
    evidence_basis: {
      decision_quality_ref: input.refs.decisionQualityReport,
      learning_intelligence_ref: input.refs.learningIntelligenceReport,
    },
    claim_boundary:
      "Closed-loop hypothesis status is derived only from materialized decision quality and learning intelligence evidence already present in Foundation verification. It does not infer unobserved decisions, outcomes, or knowledge reuse outside the supplied evidence corpus.",
  };
}

function buildHypothesisStage(input: {
  readonly observed: boolean;
  readonly saturated: boolean;
  readonly metric: JsonValue;
  readonly metric_name: string;
  readonly evidence_ref: string;
}): Record<string, JsonValue> {
  return {
    status: input.saturated ? "PASS" : input.observed ? "PARTIAL" : "BLOCKED",
    metric_name: input.metric_name,
    metric: input.metric,
    evidence_ref: input.evidence_ref,
  };
}

function buildPlatformGovernanceSnapshotStatus(
  governance: GateCGovernanceBundle,
): "HEALTHY" | "REVIEW_REQUIRED" {
  return governance.constitution.status === "PASS" &&
    governance.dependencyGraph.status === "PASS" &&
    governance.contracts.registryStatus === "PASS" &&
    governance.contracts.evolutionStatus === "PASS" &&
    governance.provenance.sessionVerificationStatus === "PASS" &&
    governance.verificationRun.status === "PASS" &&
    governance.catalog.status === "PASS" &&
    governance.architecture.fitnessStatus === "PASS" &&
    governance.verification.incrementalMaterializationStatus === "PASS" &&
    governance.acceptance.platform.trust_framework_status === "PASS" &&
    governance.acceptance.platform.attestation_lifecycle_status === "PASS" &&
    governance.acceptance.platform.attestation_lifecycle_materialization_status === "PASS" &&
    governance.acceptance.platform.trust_signature_provider_status === "PASS" &&
    governance.acceptance.platform.trust_signature_materialization_status === "PASS"
    ? "HEALTHY"
    : "REVIEW_REQUIRED";
}

function buildSpecificationSystemStatus(
  specification: GateCSpecificationBundle,
): "FAIL" | "WARN" | "UNVERIFIED" | "PASS" {
  if (
    specification.conformance.status === "FAIL" ||
    specification.vocabulary.status === "FAIL"
  ) {
    return "FAIL";
  }
  if (
    specification.conformance.status === "WARN" ||
    specification.vocabulary.status === "WARN"
  ) {
    return "WARN";
  }
  if (
    specification.conformance.status === "UNVERIFIED" &&
    specification.vocabulary.status === "UNVERIFIED"
  ) {
    return "UNVERIFIED";
  }
  return "PASS";
}

function isAcceptanceComplete(audit: GateCAuditRecord): boolean {
  return audit.acceptance_complete === true;
}

function computeCompletedTruthTableRowsRuntime(input: {
  readonly truthTableRows: readonly string[];
  readonly matrix: Record<string, unknown>;
}): readonly string[] {
  return input.truthTableRows.filter((rowId) => {
    const row = asMutableRecord(input.matrix[rowId], `matrix.${rowId}`);
    const actual = asMutableRecord(row.actual, `matrix.${rowId}.actual`);
    return typeof actual.verdict === "string";
  });
}

function computeControlLifecycleStateRuntime(input: {
  readonly rowId: string;
  readonly row: Record<string, unknown>;
  readonly proofLedgerEntries: readonly unknown[];
  readonly acceptanceAuditsByRow: Record<string, GateCAuditRecord | undefined>;
}): string {
  const acceptanceAudit = input.acceptanceAuditsByRow[input.rowId];
  if (acceptanceAudit) {
    if (acceptanceAudit.acceptance_complete === true) {
      return "ACCEPTED";
    }
    if (acceptanceAudit.executed === true) {
      return "VERIFIED";
    }
  }

  const actual = asMutableRecord(input.row.actual, `matrix.${input.rowId}.actual`);
  if (actual.status === "PENDING") {
    return "PENDING";
  }

  const runId =
    typeof input.row.run_id === "string"
      ? input.row.run_id
      : typeof input.row.primary_run_id === "string"
        ? input.row.primary_run_id
        : "";
  if (runId && hasProofLedgerEntryForRunRuntime(input.proofLedgerEntries, runId)) {
    return "ACCEPTED";
  }
  if (typeof actual.verdict === "string") {
    return "EXECUTED";
  }
  return "PENDING";
}

function computeControlProjectionStatusRuntime(input: {
  readonly rowId: string;
  readonly row: Record<string, unknown>;
  readonly proofLedgerEntries: readonly unknown[];
  readonly acceptanceAuditsByRow: Record<string, GateCAuditRecord | undefined>;
}): string {
  const lifecycleState = computeControlLifecycleStateRuntime(input);
  if (lifecycleState === "ACCEPTED") {
    return "PASS";
  }
  if (lifecycleState === "VERIFIED") {
    return "VERIFIED";
  }
  if (lifecycleState === "EXECUTED") {
    return "EXECUTED";
  }
  return "PENDING";
}

function hasProofLedgerEntryForRunRuntime(
  proofLedgerEntries: readonly unknown[],
  runId: string,
): boolean {
  return proofLedgerEntries.some((entry, index) => {
    const record = asMutableRecord(entry, `proof_ledger.entries[${index}]`);
    return record.run_id === runId;
  });
}

function asMutableRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  return value;
}

function asNumber(value: unknown, label: string): number {
  if (typeof value !== "number") {
    throw new Error(`${label} must be a number`);
  }
  return value;
}
