import { DigestEngine } from "@repo/core-kernel";
import type {
  ConstitutionClaims,
  ConstitutionEvidencePackage,
  ConstitutionLawCertificate,
  ConstitutionProofBundle,
  ConstitutionSummary,
  ConstitutionCertificateSet,
} from "./certificate-runtime.js";
import {
  SUPPORTED_CONSTITUTION_ATTESTATION_EVENT_TYPES,
  SUPPORTED_CONSTITUTION_TERMINAL_ATTESTATION_EVENT_TYPES,
  type ConstitutionLawAttestation,
} from "./attestation-runtime.js";
import type { GovernanceReadModelArtifacts } from "./governance-read-model-runtime.js";
import type { ConstitutionLawResult } from "./law-result-runtime.js";

export type GovernanceSessionProvenance = {
  readonly session_id: string;
  readonly session_digest: string;
  readonly session_status: "COMPLETED";
  readonly execution_scope: "verify-constitution" | "verify-foundation";
  readonly started_at_utc: string;
  readonly completed_at_utc: string;
  readonly constitution: {
    readonly constitution_version: string;
    readonly law_profile: string;
    readonly constitutional_digest: string;
    readonly proof_digest: string;
  };
  readonly trust_context: {
    readonly attestation_profile: string;
    readonly attestation_policy_id: string;
    readonly attestation_policy_digest: string;
    readonly trust_framework: Record<string, unknown>;
  };
  readonly inputs: {
    readonly constitution_report_digest: string;
    readonly constitutional_fingerprint: Record<string, unknown>;
  };
  readonly law_results: {
    readonly count: number;
    readonly digest: string;
  };
  readonly evidence_packages: {
    readonly count: number;
    readonly digest: string;
  };
  readonly certificates: {
    readonly count: number;
    readonly digest: string;
  };
  readonly attestations: {
    readonly event_count: number;
    readonly digest: string;
    readonly event_types: readonly string[];
    readonly supported_event_types: readonly string[];
    readonly terminal_event_count: number;
  };
  readonly reports: {
    readonly claims_digest: string;
    readonly summary_digest: string;
    readonly proof_bundle_id: string;
    readonly proof_bundle_digest: string;
  };
  readonly session_boundary: string;
};

export type GovernanceSession = GovernanceSessionProvenance & {
  readonly session_projection_digest: string;
  readonly read_models: {
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
  };
};

export function computeGovernanceSessionLineageDigest(
  provenance: GovernanceSessionProvenance,
): string {
  return DigestEngine.digest({
    constitution: provenance.constitution,
    trust_context: provenance.trust_context,
    inputs: provenance.inputs,
    law_results: provenance.law_results,
    evidence_packages: provenance.evidence_packages,
    certificates: provenance.certificates,
    attestations: provenance.attestations,
    reports: provenance.reports,
  });
}

export function materializeGovernanceSessionProvenance(input: {
  readonly executionScope: "verify-constitution" | "verify-foundation";
  readonly startedAtUtc: string;
  readonly completedAtUtc: string;
  readonly constitutionReport: Record<string, unknown>;
  readonly certificates: ConstitutionCertificateSet;
  readonly lawResults: readonly ConstitutionLawResult[];
  readonly evidencePackages: readonly ConstitutionEvidencePackage[];
  readonly lawCertificates: readonly ConstitutionLawCertificate[];
  readonly lawAttestations: readonly ConstitutionLawAttestation[];
  readonly claims: ConstitutionClaims;
  readonly constitutionSummary: ConstitutionSummary;
  readonly proofBundle: ConstitutionProofBundle;
}): GovernanceSessionProvenance {
  const payload = {
    session_status: "COMPLETED" as const,
    execution_scope: input.executionScope,
    started_at_utc: input.startedAtUtc,
    completed_at_utc: input.completedAtUtc,
    constitution: {
      constitution_version: input.certificates.constitution_version,
      law_profile: input.certificates.law_profile,
      constitutional_digest: input.certificates.constitutional_digest,
      proof_digest: input.certificates.proof_digest,
    },
    trust_context: {
      attestation_profile: input.certificates.attestation_profile,
      attestation_policy_id: input.certificates.attestation_policy.policy_id,
      attestation_policy_digest:
        input.certificates.attestation_policy.policy_digest,
      trust_framework:
        input.certificates.attestation_policy.trust_framework ?? {},
    },
    inputs: {
      constitution_report_digest: DigestEngine.digest(input.constitutionReport),
      constitutional_fingerprint: input.certificates.constitutional_fingerprint,
    },
    law_results: {
      count: input.lawResults.length,
      digest: DigestEngine.digest(input.lawResults),
    },
    evidence_packages: {
      count: input.evidencePackages.length,
      digest: DigestEngine.digest(input.evidencePackages),
    },
    certificates: {
      count: input.lawCertificates.length,
      digest: DigestEngine.digest(input.lawCertificates),
    },
    attestations: {
      event_count: input.lawAttestations.length,
      digest: DigestEngine.digest(input.lawAttestations),
      event_types: Array.from(
        new Set(input.lawAttestations.map((entry) => entry.event_type)),
      ).sort(),
      supported_event_types: [...SUPPORTED_CONSTITUTION_ATTESTATION_EVENT_TYPES],
      terminal_event_count: input.lawAttestations.filter((entry) =>
        SUPPORTED_CONSTITUTION_TERMINAL_ATTESTATION_EVENT_TYPES.includes(
          entry.event_type as (typeof SUPPORTED_CONSTITUTION_TERMINAL_ATTESTATION_EVENT_TYPES)[number],
        ),
      ).length,
    },
    reports: {
      claims_digest: DigestEngine.digest(input.claims),
      summary_digest: DigestEngine.digest(input.constitutionSummary),
      proof_bundle_id: input.proofBundle.bundle_id,
      proof_bundle_digest: input.proofBundle.bundle_digest,
    },
  };
  const sessionDigest = DigestEngine.digest(payload);

  return {
    session_id: `governance-session:${sessionDigest.slice(0, 16)}`,
    session_digest: sessionDigest,
    ...payload,
    session_boundary:
      "Governance session provenance is the replayable lifecycle record for a single governance verification execution before read-model materialization. It binds constitutional evidence, immutable evidence packages, certificates, trust assertions, and report digests into one stable provenance identity.",
  };
}

export function materializeGovernanceSession(input: {
  readonly provenance: GovernanceSessionProvenance;
  readonly governanceReadModels: GovernanceReadModelArtifacts;
}): GovernanceSession {
  const readModels = {
    summary_view_id: input.governanceReadModels.summaryView.view_id,
    summary_view_digest: input.governanceReadModels.summaryView.view_digest,
    claims_view_id: input.governanceReadModels.claimsView.view_id,
    claims_view_digest: input.governanceReadModels.claimsView.view_digest,
    health_view_id: input.governanceReadModels.healthView.view_id,
    health_view_digest: input.governanceReadModels.healthView.view_digest,
    dashboard_view_id: input.governanceReadModels.dashboardView.view_id,
    dashboard_view_digest: input.governanceReadModels.dashboardView.view_digest,
    metrics_id: input.governanceReadModels.metrics.metrics_id,
    metrics_digest: input.governanceReadModels.metrics.metrics_digest,
  };
  const sessionProjectionDigest = DigestEngine.digest({
    session_digest: input.provenance.session_digest,
    read_models: readModels,
  });

  return {
    ...input.provenance,
    session_projection_digest: sessionProjectionDigest,
    read_models: readModels,
    session_boundary:
      "Governance session is the provenance aggregate for a single governance verification execution. Read models are projected from the stable session provenance and then attached as session outputs without changing the session identity.",
  };
}
