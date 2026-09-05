// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine";
import type { GovernanceSession } from "./governance-session-runtime.js";

export type GovernanceSessionVerificationReport = {
  readonly report_version: "1.0.0";
  readonly report_digest: string;
  readonly summary: {
    readonly provenance_completeness_status: "PASS" | "FAIL";
    readonly evidence_chain_status: "PASS" | "FAIL";
    readonly report_lineage_status: "PASS" | "FAIL";
    readonly read_model_projection_status: "PASS" | "FAIL";
    readonly attestation_event_stream_status: "PASS" | "FAIL";
    readonly attestation_lifecycle_readiness_status: "PASS" | "FAIL";
    readonly overall_status: "PASS" | "FAIL";
  };
  readonly session: {
    readonly session_id: string;
    readonly session_status: string;
    readonly execution_scope: string;
    readonly session_digest: string;
    readonly session_projection_digest: string;
    readonly law_result_count: number;
    readonly evidence_package_count: number;
    readonly certificate_count: number;
    readonly attestation_event_count: number;
    readonly read_model_count: number;
    readonly attestation_event_types: readonly string[];
    readonly supported_attestation_event_types: readonly string[];
    readonly attestation_terminal_event_count: number;
  };
  readonly completeness: {
    readonly started_at_present: boolean;
    readonly completed_at_present: boolean;
    readonly constitution_present: boolean;
    readonly trust_context_present: boolean;
    readonly inputs_present: boolean;
    readonly law_results_present: boolean;
    readonly evidence_packages_present: boolean;
    readonly certificates_present: boolean;
    readonly attestations_present: boolean;
    readonly reports_present: boolean;
    readonly read_models_present: boolean;
  };
  readonly claim_boundary: string;
};

export function materializeGovernanceSessionVerificationReport(
  session: GovernanceSession,
): GovernanceSessionVerificationReport {
  const completeness = {
    started_at_present: session.started_at_utc.length > 0,
    completed_at_present: session.completed_at_utc.length > 0,
    constitution_present:
      session.constitution.constitution_version.length > 0 &&
      session.constitution.law_profile.length > 0 &&
      session.constitution.constitutional_digest.length > 0 &&
      session.constitution.proof_digest.length > 0,
    trust_context_present:
      session.trust_context.attestation_profile.length > 0 &&
      session.trust_context.attestation_policy_id.length > 0 &&
      session.trust_context.attestation_policy_digest.length > 0,
    inputs_present:
      session.inputs.constitution_report_digest.length > 0 &&
      Object.keys(session.inputs.constitutional_fingerprint).length > 0,
    law_results_present:
      session.law_results.count > 0 && session.law_results.digest.length > 0,
    evidence_packages_present:
      session.evidence_packages.count > 0 &&
      session.evidence_packages.digest.length > 0,
    certificates_present:
      session.certificates.count > 0 && session.certificates.digest.length > 0,
    attestations_present:
      session.attestations.event_count > 0 &&
      session.attestations.digest.length > 0 &&
      session.attestations.event_types.length > 0 &&
      session.attestations.supported_event_types.length > 0,
    reports_present:
      session.reports.claims_digest.length > 0 &&
      session.reports.summary_digest.length > 0 &&
      session.reports.proof_bundle_id.length > 0 &&
      session.reports.proof_bundle_digest.length > 0,
    read_models_present:
      session.read_models.summary_view_id.length > 0 &&
      session.read_models.summary_view_digest.length > 0 &&
      session.read_models.claims_view_id.length > 0 &&
      session.read_models.claims_view_digest.length > 0 &&
      session.read_models.health_view_id.length > 0 &&
      session.read_models.health_view_digest.length > 0 &&
      session.read_models.dashboard_view_id.length > 0 &&
      session.read_models.dashboard_view_digest.length > 0 &&
      session.read_models.metrics_id.length > 0 &&
      session.read_models.metrics_digest.length > 0,
  } as const;

  const provenanceCompletenessStatus =
    completeness.started_at_present &&
    completeness.completed_at_present &&
    completeness.constitution_present &&
    completeness.trust_context_present &&
    completeness.inputs_present
      ? ("PASS" as const)
      : ("FAIL" as const);
  const evidenceChainStatus =
    completeness.law_results_present &&
    completeness.evidence_packages_present &&
    completeness.certificates_present
      ? ("PASS" as const)
      : ("FAIL" as const);
  const reportLineageStatus =
    completeness.reports_present && session.session_digest.length > 0
      ? ("PASS" as const)
      : ("FAIL" as const);
  const readModelProjectionStatus =
    completeness.read_models_present && session.session_projection_digest.length > 0
      ? ("PASS" as const)
      : ("FAIL" as const);
  const attestationEventStreamStatus =
    completeness.attestations_present &&
    session.attestations.event_types.includes("AttestationCreated") &&
    session.attestations.event_types.includes("AttestationVerified")
      ? ("PASS" as const)
      : ("FAIL" as const);
  const attestationLifecycleReadinessStatus =
    completeness.attestations_present &&
    session.attestations.supported_event_types.includes("AttestationCreated") &&
    session.attestations.supported_event_types.includes("AttestationVerified") &&
    session.attestations.supported_event_types.includes("AttestationExpired") &&
    session.attestations.supported_event_types.includes("AttestationRevoked") &&
    session.attestations.supported_event_types.includes("AttestationSuperseded")
      ? ("PASS" as const)
      : ("FAIL" as const);

  const summary = {
    provenance_completeness_status: provenanceCompletenessStatus,
    evidence_chain_status: evidenceChainStatus,
    report_lineage_status: reportLineageStatus,
    read_model_projection_status: readModelProjectionStatus,
    attestation_event_stream_status: attestationEventStreamStatus,
    attestation_lifecycle_readiness_status:
      attestationLifecycleReadinessStatus,
    overall_status:
      provenanceCompletenessStatus === "PASS" &&
      evidenceChainStatus === "PASS" &&
      reportLineageStatus === "PASS" &&
      readModelProjectionStatus === "PASS" &&
      attestationEventStreamStatus === "PASS" &&
      attestationLifecycleReadinessStatus === "PASS"
        ? ("PASS" as const)
        : ("FAIL" as const),
  };
  const sessionSummary = {
    session_id: session.session_id,
    session_status: session.session_status,
    execution_scope: session.execution_scope,
    session_digest: session.session_digest,
    session_projection_digest: session.session_projection_digest,
    law_result_count: session.law_results.count,
    evidence_package_count: session.evidence_packages.count,
    certificate_count: session.certificates.count,
    attestation_event_count: session.attestations.event_count,
    read_model_count: 5,
    attestation_event_types: session.attestations.event_types,
    supported_attestation_event_types:
      session.attestations.supported_event_types,
    attestation_terminal_event_count:
      session.attestations.terminal_event_count,
  };
  const payload = {
    summary,
    session: sessionSummary,
    completeness,
  };

  return {
    report_version: "1.0.0",
    report_digest: DigestEngine.digest(payload),
    ...payload,
    claim_boundary:
      "Governance session verification proves that the provenance aggregate is complete enough to serve as the lifecycle single source of truth for governance execution. It validates the presence of constitutional inputs, trust context, evidence-chain digests, report lineage, attestation events, and projected read-model outputs without changing the underlying domain model.",
  };
}
