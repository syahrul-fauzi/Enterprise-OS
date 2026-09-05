// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine";
import type {
  ConstitutionClaims,
  ConstitutionEvidencePackage,
  ConstitutionLawCertificate,
  ConstitutionProofBundle,
  ConstitutionSummary,
} from "./certificate-runtime.js";
import type { ConstitutionLawAttestation } from "./attestation-runtime.js";
import type { ConstitutionLawResult } from "./law-result-runtime.js";
import {
  computeGovernanceSessionLineageDigest,
  type GovernanceSession,
} from "./governance-session-runtime.js";
import type { GovernanceSessionVerificationReport } from "./governance-session-verification-runtime.js";
import type { ArchitectureFitnessReport } from "./architecture-fitness-runtime.js";
import type {
  CapabilityGovernanceIndex,
  CapabilityGovernanceVerificationReport,
} from "./capability-governance-runtime.js";
import type { ContractVersionEvolutionVerificationReport } from "./contract-version-evolution-runtime.js";
import type { TrustFrameworkVerificationReport } from "./trust-framework-verification-runtime.js";
import type { AttestationLifecycleVerificationReport } from "./attestation-lifecycle-runtime.js";
import type { TrustSignatureProviderVerificationReport } from "./trust-signature-provider-runtime.js";
import type { TrustSignatureMaterializationReport } from "./trust-signature-materialization-runtime.js";
import type { GovernanceIncrementalMaterializationVerificationReport } from "./incremental-materialization-verification-runtime.js";

export type VerificationRun = {
  readonly run_version: "1.0.0";
  readonly run_id: string;
  readonly run_digest: string;
  readonly run_status: "COMPLETED";
  readonly run_scope: "verify-constitution" | "verify-foundation";
  readonly started_at_utc: string;
  readonly completed_at_utc: string;
  readonly governance_session: {
    readonly session_id: string;
    readonly session_digest: string;
    readonly session_lineage_digest: string;
    readonly session_projection_digest: string;
    readonly verification_status: "PASS" | "FAIL";
  };
  readonly evidence_chain: {
    readonly law_result_count: number;
    readonly law_result_digest: string;
    readonly evidence_package_count: number;
    readonly evidence_package_digest: string;
    readonly certificate_count: number;
    readonly certificate_digest: string;
    readonly attestation_event_count: number;
    readonly attestation_event_digest: string;
  };
  readonly outputs: {
    readonly read_model_count: number;
    readonly summary_view_id: string;
    readonly summary_view_digest: string;
    readonly claims_view_id: string;
    readonly claims_view_digest: string;
    readonly health_view_id: string;
    readonly health_view_digest: string;
    readonly dashboard_view_id: string;
    readonly dashboard_view_digest: string;
    readonly metrics_id: string;
    readonly metrics_digest: string;
    readonly report_count: number;
    readonly claims_digest: string;
    readonly summary_digest: string;
    readonly proof_bundle_id: string;
    readonly proof_bundle_digest: string;
  };
  readonly readiness: {
    readonly governance_session_status: "PASS" | "FAIL";
    readonly contract_version_evolution_status: "PASS" | "FAIL";
    readonly capability_governance_status: "PASS" | "FAIL";
    readonly architecture_fitness_status: "PASS" | "FAIL";
    readonly incremental_materialization_status: "PASS" | "FAIL";
    readonly trust_framework_status: "PASS" | "FAIL";
    readonly attestation_lifecycle_status: "PASS" | "FAIL";
    readonly trust_signature_provider_status: "PASS" | "FAIL";
    readonly trust_signature_materialization_status: "PASS" | "FAIL";
    readonly overall_status: "PASS" | "FAIL";
  };
  readonly control_plane: {
    readonly capability_governance_projection_digest: string;
    readonly capability_governance_verification_digest: string;
    readonly architecture_fitness_digest: string;
    readonly contract_version_evolution_digest: string;
    readonly trust_framework_verification_digest: string;
    readonly attestation_lifecycle_verification_digest: string;
    readonly trust_signature_provider_verification_digest: string;
    readonly trust_signature_materialization_digest: string;
    readonly incremental_materialization_verification_digest: string;
  };
  readonly run_boundary: string;
};

export type VerificationRunVerificationReport = {
  readonly report_version: "1.0.0";
  readonly report_digest: string;
  readonly summary: {
    readonly chronology_status: "PASS" | "FAIL";
    readonly session_binding_status: "PASS" | "FAIL";
    readonly output_completeness_status: "PASS" | "FAIL";
    readonly readiness_projection_status: "PASS" | "FAIL";
    readonly overall_status: "PASS" | "FAIL";
  };
  readonly run: {
    readonly run_id: string;
    readonly run_scope: string;
    readonly run_status: string;
    readonly governance_session_id: string;
    readonly read_model_count: number;
    readonly report_count: number;
    readonly readiness_status: "PASS" | "FAIL";
  };
  readonly claim_boundary: string;
};

export function materializeVerificationRun(input: {
  readonly governanceSession: GovernanceSession;
  readonly governanceSessionVerification: GovernanceSessionVerificationReport;
  readonly contractVersionEvolution: ContractVersionEvolutionVerificationReport;
  readonly capabilityGovernanceIndex: CapabilityGovernanceIndex;
  readonly capabilityGovernanceVerification: CapabilityGovernanceVerificationReport;
  readonly architectureFitness: ArchitectureFitnessReport;
  readonly governanceIncrementalMaterializationVerification: GovernanceIncrementalMaterializationVerificationReport;
  readonly trustFrameworkVerification: TrustFrameworkVerificationReport;
  readonly attestationLifecycleVerification: AttestationLifecycleVerificationReport;
  readonly trustSignatureProviderVerification: TrustSignatureProviderVerificationReport;
  readonly trustSignatureMaterialization: TrustSignatureMaterializationReport;
  readonly lawResults: readonly ConstitutionLawResult[];
  readonly evidencePackages: readonly ConstitutionEvidencePackage[];
  readonly lawCertificates: readonly ConstitutionLawCertificate[];
  readonly lawAttestations: readonly ConstitutionLawAttestation[];
  readonly claims: ConstitutionClaims;
  readonly constitutionSummary: ConstitutionSummary;
  readonly proofBundle: ConstitutionProofBundle;
}): VerificationRun {
  const readiness = {
    governance_session_status:
      input.governanceSessionVerification.summary.overall_status,
    contract_version_evolution_status:
      input.contractVersionEvolution.summary.overall_status,
    capability_governance_status:
      input.capabilityGovernanceVerification.summary.overall_status,
    architecture_fitness_status: input.architectureFitness.summary.fitness_status,
    incremental_materialization_status:
      input.governanceIncrementalMaterializationVerification.summary
        .overall_status,
    trust_framework_status: input.trustFrameworkVerification.summary.overall_status,
    attestation_lifecycle_status:
      input.attestationLifecycleVerification.summary.overall_status,
    trust_signature_provider_status:
      input.trustSignatureProviderVerification.summary.overall_status,
    trust_signature_materialization_status:
      input.trustSignatureMaterialization.summary.overall_status,
    overall_status: "FAIL" as const,
  };
  const finalizedReadiness = {
    ...readiness,
    overall_status: Object.entries(readiness)
      .filter(([key]) => key !== "overall_status")
      .every(([, status]) => status === "PASS")
      ? ("PASS" as const)
      : ("FAIL" as const),
  };
  const payload = {
    run_status: "COMPLETED" as const,
    run_scope: input.governanceSession.execution_scope,
    started_at_utc: input.governanceSession.started_at_utc,
    completed_at_utc: input.governanceSession.completed_at_utc,
    governance_session: {
      session_id: input.governanceSession.session_id,
      session_digest: input.governanceSession.session_digest,
      session_lineage_digest: computeGovernanceSessionLineageDigest(
        input.governanceSession,
      ),
      session_projection_digest:
        input.governanceSession.session_projection_digest,
      verification_status: input.governanceSessionVerification.summary
        .overall_status,
    },
    evidence_chain: {
      law_result_count: input.lawResults.length,
      law_result_digest: DigestEngine.digest(input.lawResults),
      evidence_package_count: input.evidencePackages.length,
      evidence_package_digest: DigestEngine.digest(input.evidencePackages),
      certificate_count: input.lawCertificates.length,
      certificate_digest: DigestEngine.digest(input.lawCertificates),
      attestation_event_count: input.lawAttestations.length,
      attestation_event_digest: DigestEngine.digest(input.lawAttestations),
    },
    outputs: {
      read_model_count: 5,
      summary_view_id: input.governanceSession.read_models.summary_view_id,
      summary_view_digest:
        input.governanceSession.read_models.summary_view_digest,
      claims_view_id: input.governanceSession.read_models.claims_view_id,
      claims_view_digest: input.governanceSession.read_models.claims_view_digest,
      health_view_id: input.governanceSession.read_models.health_view_id,
      health_view_digest: input.governanceSession.read_models.health_view_digest,
      dashboard_view_id: input.governanceSession.read_models.dashboard_view_id,
      dashboard_view_digest:
        input.governanceSession.read_models.dashboard_view_digest,
      metrics_id: input.governanceSession.read_models.metrics_id,
      metrics_digest: input.governanceSession.read_models.metrics_digest,
      report_count: 9,
      claims_digest: DigestEngine.digest(input.claims),
      summary_digest: DigestEngine.digest(input.constitutionSummary),
      proof_bundle_id: input.proofBundle.bundle_id,
      proof_bundle_digest: input.proofBundle.bundle_digest,
    },
    readiness: finalizedReadiness,
    control_plane: {
      capability_governance_projection_digest:
        input.capabilityGovernanceIndex.projection_digest,
      capability_governance_verification_digest:
        input.capabilityGovernanceVerification.report_digest,
      architecture_fitness_digest: input.architectureFitness.report_digest,
      contract_version_evolution_digest:
        input.contractVersionEvolution.report_digest,
      trust_framework_verification_digest:
        input.trustFrameworkVerification.report_digest,
      attestation_lifecycle_verification_digest:
        input.attestationLifecycleVerification.report_digest,
      trust_signature_provider_verification_digest:
        input.trustSignatureProviderVerification.report_digest,
      trust_signature_materialization_digest:
        input.trustSignatureMaterialization.report_digest,
      incremental_materialization_verification_digest:
        input.governanceIncrementalMaterializationVerification.report_digest,
    },
  };
  const runDigest = DigestEngine.digest(payload);

  return {
    run_version: "1.0.0",
    run_id: `verification-run:${runDigest.slice(0, 16)}`,
    run_digest: runDigest,
    ...payload,
    run_boundary:
      "Verification run is the orchestration aggregate for one governance verification execution. It binds GovernanceSession provenance, evidence-chain outputs, read-model outputs, and platform readiness controls into a single operational identity without changing the frozen governance domain model.",
  };
}

export function materializeVerificationRunVerificationReport(
  run: VerificationRun,
): VerificationRunVerificationReport {
  const chronologyStatus =
    Date.parse(run.started_at_utc) <= Date.parse(run.completed_at_utc)
      ? ("PASS" as const)
      : ("FAIL" as const);
  const sessionBindingStatus =
    run.governance_session.session_id.length > 0 &&
    run.governance_session.session_digest.length > 0 &&
    run.governance_session.session_lineage_digest.length > 0 &&
    run.governance_session.session_projection_digest.length > 0 &&
    run.governance_session.verification_status === "PASS"
      ? ("PASS" as const)
      : ("FAIL" as const);
  const outputCompletenessStatus =
    run.evidence_chain.law_result_count > 0 &&
    run.evidence_chain.evidence_package_count > 0 &&
    run.evidence_chain.certificate_count > 0 &&
    run.evidence_chain.attestation_event_count > 0 &&
    run.outputs.read_model_count === 5 &&
    run.outputs.report_count >= 5 &&
    run.outputs.claims_digest.length > 0 &&
    run.outputs.summary_digest.length > 0 &&
    run.outputs.proof_bundle_digest.length > 0
      ? ("PASS" as const)
      : ("FAIL" as const);
  const readinessProjectionStatus = run.readiness.overall_status === "PASS"
    ? ("PASS" as const)
    : ("FAIL" as const);
  const summary = {
    chronology_status: chronologyStatus,
    session_binding_status: sessionBindingStatus,
    output_completeness_status: outputCompletenessStatus,
    readiness_projection_status: readinessProjectionStatus,
    overall_status:
      chronologyStatus === "PASS" &&
      sessionBindingStatus === "PASS" &&
      outputCompletenessStatus === "PASS" &&
      readinessProjectionStatus === "PASS"
        ? ("PASS" as const)
        : ("FAIL" as const),
  };
  const runSummary = {
    run_id: run.run_id,
    run_scope: run.run_scope,
    run_status: run.run_status,
    governance_session_id: run.governance_session.session_id,
    read_model_count: run.outputs.read_model_count,
    report_count: run.outputs.report_count,
    readiness_status: run.readiness.overall_status,
  };
  const payload = {
    summary,
    run: runSummary,
  };

  return {
    report_version: "1.0.0",
    report_digest: DigestEngine.digest(payload),
    ...payload,
    claim_boundary:
      "Verification run verification proves that the operational governance execution aggregate is chronologically valid, bound to a verified GovernanceSession, complete in its evidence and read-model outputs, and ready according to platform governance controls.",
  };
}
