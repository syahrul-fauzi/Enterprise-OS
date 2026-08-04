import { DigestEngine } from "@repo/core-kernel";
import {
  materializeConstitutionAttestationPolicy,
  materializeConstitutionLawAttestations,
  type ConstitutionAttestationPolicy,
  type ConstitutionAttestationProfile,
  type ConstitutionLawAttestation,
} from "./attestation-runtime.js";
import {
  materializeConstitutionLawResults,
  type ConstitutionLawResult,
} from "./law-result-runtime.js";

export type ConstitutionVerificationSummary = {
  readonly graph_purity_status: string;
  readonly constitutional_digest: string;
  readonly graph_violation_count: number;
  readonly proof_determinism_status: string;
  readonly proof_strength: string;
  readonly projection_certificates_passed: number;
  readonly projection_certificates_total: number;
  readonly dependency_constitution_status: string;
};

export type ConstitutionFingerprint = {
  readonly declared_graph_digest: string;
  readonly execution_chain_digest: string;
  readonly projection_api_version: string;
  readonly constitution_version: string;
};

export type ConstitutionExecutedLaw = {
  readonly law_id: string;
  readonly description: string;
  readonly predicate: {
    readonly predicate_id: string;
    readonly description: string;
    readonly blocking: boolean;
  };
  readonly proof: {
    readonly proof_id: string;
    readonly status: string;
    readonly report_key: string;
    readonly report_digest: string;
  };
  readonly blocking_status: string;
};

export type ConstitutionLawProof = {
  readonly law_id: string;
  readonly predicate_id: string;
  readonly proof_id: string;
  readonly status: string;
  readonly report_key: string;
  readonly report_digest: string;
  readonly blocking_status: string;
};

export type ConstitutionLawCertificate = {
  readonly certificate_id: string;
  readonly certificate_digest: string;
  readonly package_id: string;
  readonly package_digest: string;
  readonly issued_at_utc: null;
  readonly certificate_boundary: string;
};

export type ConstitutionEvidencePackage = {
  readonly package_id: string;
  readonly package_digest: string;
  readonly package_scope: "single_law_evaluation";
  readonly law_ids: readonly string[];
  readonly result_ids: readonly string[];
  readonly result_digests: readonly string[];
  readonly proof_ids: readonly string[];
  readonly proof_digests: readonly string[];
  readonly artifact_keys: readonly string[];
  readonly constitutional_digest: string;
  readonly proof_digest: string;
  readonly constitutional_fingerprint: ConstitutionFingerprint;
  readonly proof_fragments_digest: string;
  readonly proof_fragments: {
    readonly graph_purity_certificate_digest: string;
    readonly proof_determinism_certificate_digest: string;
    readonly dependency_constitution_digest: string;
    readonly projection_certificates_digest: string;
    readonly replay_certificates_digest: string;
    readonly projection_determinism_certificates_digest: string;
  };
  readonly package_boundary: string;
};

export type ConstitutionClaim = {
  readonly id: string;
  readonly title: string;
  readonly status: "PASS" | "FAIL";
  readonly digest: string;
};

export type ConstitutionClaims = {
  readonly status: "PASS" | "FAIL";
  readonly claim_count: number;
  readonly violated_law_count: number;
  readonly laws_passed: number;
  readonly laws_failed: number;
  readonly constitutional_digest: string;
  readonly proof_strength: "baseline" | "proof-centric";
  readonly claims: readonly ConstitutionClaim[];
  readonly claim_boundary: string;
};

export type ConstitutionSummary = {
  readonly status: "PASS" | "FAIL";
  readonly claim_count: number;
  readonly violated_law_count: number;
  readonly laws_passed: number;
  readonly laws_failed: number;
  readonly constitutional_digest: string;
  readonly law_profile: string;
  readonly proof_strength: "baseline" | "proof-centric";
  readonly summary_boundary: string;
};

export type GovernanceSummary = ConstitutionSummary;

export type ConstitutionCertificateSet = {
  readonly constitution_version: string;
  readonly law_profile: string;
  readonly attestation_profile: ConstitutionAttestationProfile;
  readonly attestation_policy: ConstitutionAttestationPolicy;
  readonly constitutional_digest: string;
  readonly proof_digest: string;
  readonly constitutional_fingerprint: ConstitutionFingerprint;
  readonly graph_purity_certificate: Record<string, unknown>;
  readonly proof_determinism_certificate: Record<string, unknown>;
  readonly dependency_constitution: Record<string, unknown>;
  readonly projection_certificates: readonly Record<string, unknown>[];
  readonly replay_certificates: readonly Record<string, unknown>[];
  readonly projection_determinism_certificates: readonly Record<
    string,
    unknown
  >[];
  readonly executed_laws: readonly ConstitutionExecutedLaw[];
  readonly law_proofs: readonly ConstitutionLawProof[];
  readonly law_results: readonly ConstitutionLawResult[];
  readonly evidence_packages: readonly ConstitutionEvidencePackage[];
  readonly law_certificates: readonly ConstitutionLawCertificate[];
  readonly law_attestations: readonly ConstitutionLawAttestation[];
};

export type ConstitutionProofBundle = {
  readonly bundle_id: string;
  readonly bundle_digest: string;
  readonly constitution_version: string;
  readonly law_profile: string;
  readonly attestation_profile: ConstitutionAttestationProfile;
  readonly attestation_policy: ConstitutionAttestationPolicy;
  readonly constitutional_digest: string;
  readonly proof_digest: string;
  readonly constitutional_fingerprint: ConstitutionFingerprint;
  readonly claims_digest: string;
  readonly law_results_digest: string;
  readonly evidence_packages_digest: string;
  readonly law_certificates_digest: string;
  readonly law_attestations_digest: string;
  readonly proof_fragments_digest: string;
  readonly summary: ConstitutionSummary;
  readonly claims: ConstitutionClaims;
  readonly law_results: readonly ConstitutionLawResult[];
  readonly evidence_packages: readonly ConstitutionEvidencePackage[];
  readonly law_certificates: readonly ConstitutionLawCertificate[];
  readonly law_attestations: readonly ConstitutionLawAttestation[];
  readonly executed_laws: readonly ConstitutionExecutedLaw[];
  readonly law_proofs: readonly ConstitutionLawProof[];
  readonly proof_fragments: {
    readonly graph_purity_certificate: Record<string, unknown>;
    readonly proof_determinism_certificate: Record<string, unknown>;
    readonly dependency_constitution: Record<string, unknown>;
    readonly projection_certificates: readonly Record<string, unknown>[];
    readonly replay_certificates: readonly Record<string, unknown>[];
    readonly projection_determinism_certificates: readonly Record<
      string,
      unknown
    >[];
  };
  readonly bundle_boundary: string;
};

export type ConstitutionProofArtifacts = {
  readonly certificates: ConstitutionCertificateSet;
  readonly lawResults: readonly ConstitutionLawResult[];
  readonly evidencePackages: readonly ConstitutionEvidencePackage[];
  readonly lawCertificates: readonly ConstitutionLawCertificate[];
  readonly lawAttestations: readonly ConstitutionLawAttestation[];
  readonly claims: ConstitutionClaims;
  readonly constitutionSummary: ConstitutionSummary;
  readonly proofBundle: ConstitutionProofBundle;
  readonly verificationSummary: ConstitutionVerificationSummary;
};

export type ConstitutionExecutionGraphProof = {
  readonly constitutional_version: string;
  readonly proof_digest: string;
  readonly proof_determinism_status: string;
  readonly declared_graph_digest: string;
  readonly execution_chain_digest: string;
  readonly constitutional_digest: string;
  readonly constitutional_claims: Record<string, unknown> | null;
  readonly graph_version: string;
  readonly projection_version: string;
  readonly projection_digest: string;
  readonly generated_from: readonly unknown[];
  readonly generated_at_utc: string;
  readonly total_nodes: number;
  readonly total_edges: number;
  readonly declared_edges: number;
  readonly observed_edges: number;
  readonly claim_boundary: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function materializeConstitutionEvidencePackages(input: {
  readonly lawResults: readonly ConstitutionLawResult[];
  readonly lawProofs: readonly ConstitutionLawProof[];
  readonly constitutionalDigest: string;
  readonly proofDigest: string;
  readonly constitutionalFingerprint: ConstitutionFingerprint;
  readonly proofFragments: {
    readonly graph_purity_certificate: Record<string, unknown>;
    readonly proof_determinism_certificate: Record<string, unknown>;
    readonly dependency_constitution: Record<string, unknown>;
    readonly projection_certificates: readonly Record<string, unknown>[];
    readonly replay_certificates: readonly Record<string, unknown>[];
    readonly projection_determinism_certificates: readonly Record<
      string,
      unknown
    >[];
  };
}): readonly ConstitutionEvidencePackage[] {
  const proofById = new Map(
    input.lawProofs.map((proof) => [proof.proof_id, proof]),
  );
  const proofFragmentsDigest = {
    graph_purity_certificate_digest: DigestEngine.digest(
      input.proofFragments.graph_purity_certificate,
    ),
    proof_determinism_certificate_digest: DigestEngine.digest(
      input.proofFragments.proof_determinism_certificate,
    ),
    dependency_constitution_digest: DigestEngine.digest(
      input.proofFragments.dependency_constitution,
    ),
    projection_certificates_digest: DigestEngine.digest(
      input.proofFragments.projection_certificates,
    ),
    replay_certificates_digest: DigestEngine.digest(
      input.proofFragments.replay_certificates,
    ),
    projection_determinism_certificates_digest: DigestEngine.digest(
      input.proofFragments.projection_determinism_certificates,
    ),
  };
  const proofFragmentsDigestValue = DigestEngine.digest(proofFragmentsDigest);

  return input.lawResults.map((result) => {
    const matchingProof = proofById.get(result.evaluation.proof_id);
    const packagePayload = {
      package_scope: "single_law_evaluation" as const,
      law_ids: [result.law.law_id],
      result_ids: [result.result_id],
      result_digests: [result.result_digest],
      proof_ids: [result.evaluation.proof_id],
      proof_digests: [
        matchingProof?.report_digest ?? result.evaluation.proof_digest,
      ],
      artifact_keys: [
        matchingProof?.report_key ?? result.evaluation.artifact_key,
      ],
      constitutional_digest: input.constitutionalDigest,
      proof_digest: input.proofDigest,
      constitutional_fingerprint: input.constitutionalFingerprint,
      proof_fragments_digest: proofFragmentsDigestValue,
      proof_fragments: proofFragmentsDigest,
    };
    const packageDigest = DigestEngine.digest(packagePayload);

    return {
      package_id: `evidence-package:${result.law.law_id}:${packageDigest.slice(0, 16)}`,
      package_digest: packageDigest,
      ...packagePayload,
      package_boundary:
        "Evidence package is the immutable aggregate of law-result identity and supporting governance proof fragments. Certificate issuance depends only on this frozen package, not on the internal structure or cardinality of law results.",
    } satisfies ConstitutionEvidencePackage;
  });
}

export function summarizeConstitutionVerification(
  constitutionReport: Record<string, unknown>,
): ConstitutionVerificationSummary {
  const certificateSet =
    materializeConstitutionCertificateSet(constitutionReport);
  const summary = materializeConstitutionSummary(certificateSet);
  const projectionCertificates = certificateSet.projection_certificates;
  const passedProjectionCertificates = projectionCertificates.filter(
    (certificate) => certificate.status === "PASS",
  ).length;

  return {
    graph_purity_status: String(
      certificateSet.graph_purity_certificate.status ?? "FAIL",
    ),
    constitutional_digest: summary.constitutional_digest,
    graph_violation_count: summary.violated_law_count,
    proof_determinism_status: String(
      certificateSet.proof_determinism_certificate.status ?? "FAIL",
    ),
    proof_strength: summary.proof_strength,
    projection_certificates_passed: passedProjectionCertificates,
    projection_certificates_total: projectionCertificates.length,
    dependency_constitution_status: String(
      certificateSet.dependency_constitution.status ?? "UNVERIFIED",
    ),
  };
}

export function materializeConstitutionCertificateSet(
  constitutionReport: Record<string, unknown>,
  options: {
    readonly attestationProfile?: ConstitutionAttestationProfile;
  } = {},
): ConstitutionCertificateSet {
  const executedLaws = Array.isArray(constitutionReport.executed_laws)
    ? (
        constitutionReport.executed_laws as readonly Record<string, unknown>[]
      ).map((entry) => {
        const predicate = asRecord(entry.predicate);
        const proof = asRecord(entry.proof);
        return {
          law_id: String(entry.law_id ?? "UNVERIFIED"),
          description: String(entry.description ?? "UNVERIFIED"),
          predicate: {
            predicate_id: String(predicate?.predicate_id ?? "UNVERIFIED"),
            description: String(predicate?.description ?? "UNVERIFIED"),
            blocking: Boolean(predicate?.blocking),
          },
          proof: {
            proof_id: String(proof?.proof_id ?? "UNVERIFIED"),
            status: String(proof?.status ?? "UNVERIFIED"),
            report_key: String(proof?.report_key ?? "UNVERIFIED"),
            report_digest: String(proof?.report_digest ?? "UNVERIFIED"),
          },
          blocking_status: String(entry.blocking_status ?? "UNVERIFIED"),
        } satisfies ConstitutionExecutedLaw;
      })
    : [];

  const constitutionalFingerprint = {
    declared_graph_digest: String(
      asRecord(constitutionReport.constitutional_fingerprint)
        ?.declared_graph_digest ?? "UNVERIFIED",
    ),
    execution_chain_digest: String(
      asRecord(constitutionReport.constitutional_fingerprint)
        ?.execution_chain_digest ?? "UNVERIFIED",
    ),
    projection_api_version: String(
      asRecord(constitutionReport.constitutional_fingerprint)
        ?.projection_api_version ?? "UNVERIFIED",
    ),
    constitution_version: String(
      asRecord(constitutionReport.constitutional_fingerprint)
        ?.constitution_version ?? "UNVERIFIED",
    ),
  } satisfies ConstitutionFingerprint;

  const lawResults = materializeConstitutionLawResults({
    constitutionReport,
    executedLaws,
    constitutionalFingerprint,
  });
  const lawProofs = Array.isArray(constitutionReport.law_proofs)
    ? (constitutionReport.law_proofs as readonly Record<string, unknown>[]).map(
        (entry) => ({
          law_id: String(entry.law_id ?? "UNVERIFIED"),
          predicate_id: String(entry.predicate_id ?? "UNVERIFIED"),
          proof_id: String(entry.proof_id ?? "UNVERIFIED"),
          status: String(entry.status ?? "UNVERIFIED"),
          report_key: String(entry.report_key ?? "UNVERIFIED"),
          report_digest: String(entry.report_digest ?? "UNVERIFIED"),
          blocking_status: String(entry.blocking_status ?? "UNVERIFIED"),
        }),
      )
    : executedLaws.map((entry) => ({
        law_id: entry.law_id,
        predicate_id: entry.predicate.predicate_id,
        proof_id: entry.proof.proof_id,
        status: entry.proof.status,
        report_key: entry.proof.report_key,
        report_digest: entry.proof.report_digest,
        blocking_status: entry.blocking_status,
      }));
  const proofFragments = {
    graph_purity_certificate:
      asRecord(constitutionReport.graph_purity_certificate) ?? {},
    proof_determinism_certificate:
      asRecord(constitutionReport.proof_determinism_certificate) ?? {},
    dependency_constitution:
      asRecord(constitutionReport.dependency_constitution) ?? {},
    projection_certificates: Array.isArray(
      constitutionReport.projection_certificates,
    )
      ? (constitutionReport.projection_certificates as readonly Record<
          string,
          unknown
        >[])
      : [],
    replay_certificates: Array.isArray(constitutionReport.replay_certificates)
      ? (constitutionReport.replay_certificates as readonly Record<
          string,
          unknown
        >[])
      : [],
    projection_determinism_certificates: Array.isArray(
      constitutionReport.projection_determinism_certificates,
    )
      ? (constitutionReport.projection_determinism_certificates as readonly Record<
          string,
          unknown
        >[])
      : [],
  };
  const evidencePackages = materializeConstitutionEvidencePackages({
    lawResults,
    lawProofs,
    constitutionalDigest: String(
      constitutionReport.constitutional_digest ?? "UNVERIFIED",
    ),
    proofDigest: String(constitutionReport.proof_digest ?? "UNVERIFIED"),
    constitutionalFingerprint,
    proofFragments,
  });

  const lawCertificates = evidencePackages.map((evidencePackage) => {
    const certificatePayload = {
      package_id: evidencePackage.package_id,
      package_digest: evidencePackage.package_digest,
    };
    const certificateDigest = DigestEngine.digest(certificatePayload);

    return {
      certificate_id: `certificate:${evidencePackage.package_id}:${certificateDigest.slice(0, 16)}`,
      certificate_digest: certificateDigest,
      ...certificatePayload,
      issued_at_utc: null,
      certificate_boundary:
        "Certificate is the immutable identity reference to a frozen evidence-package digest. It does not embed evaluation evidence or trust metadata.",
    } satisfies ConstitutionLawCertificate;
  });

  const attestationProfile = options.attestationProfile ?? "local_signed";
  const attestationPolicy =
    materializeConstitutionAttestationPolicy(attestationProfile);
  const lawAttestations = materializeConstitutionLawAttestations(
    lawCertificates,
    {
      profile: attestationProfile,
    },
  );

  return {
    constitution_version: String(
      constitutionReport.constitution_version ?? "UNVERIFIED",
    ),
    law_profile: String(constitutionReport.law_profile ?? "enterprise"),
    attestation_profile: attestationProfile,
    attestation_policy: attestationPolicy,
    constitutional_digest: String(
      constitutionReport.constitutional_digest ?? "UNVERIFIED",
    ),
    proof_digest: String(constitutionReport.proof_digest ?? "UNVERIFIED"),
    constitutional_fingerprint: constitutionalFingerprint,
    graph_purity_certificate: proofFragments.graph_purity_certificate,
    proof_determinism_certificate: proofFragments.proof_determinism_certificate,
    dependency_constitution: proofFragments.dependency_constitution,
    projection_certificates: proofFragments.projection_certificates,
    replay_certificates: proofFragments.replay_certificates,
    projection_determinism_certificates:
      proofFragments.projection_determinism_certificates,
    executed_laws: executedLaws,
    law_proofs: lawProofs,
    law_results: lawResults,
    evidence_packages: evidencePackages,
    law_certificates: lawCertificates,
    law_attestations: lawAttestations,
  };
}

export function materializeConstitutionClaims(
  certificates: ConstitutionCertificateSet,
): ConstitutionClaims {
  const evidencePackageByResultId = new Map(
    certificates.evidence_packages.flatMap((evidencePackage) =>
      evidencePackage.result_ids.map(
        (resultId) => [resultId, evidencePackage] as const,
      ),
    ),
  );
  const certificateByPackageId = new Map(
    certificates.law_certificates.map((certificate) => [
      certificate.package_id,
      certificate,
    ]),
  );
  const claims = certificates.law_results.map((result) => ({
    id:
      certificateByPackageId.get(
        evidencePackageByResultId.get(result.result_id)?.package_id ?? "",
      )?.certificate_id ??
      `claim:${result.law.law_id}:${result.result_digest.slice(0, 16)}`,
    title: result.law.description,
    status: result.evaluation.status === "PASS" ? "PASS" : "FAIL",
    digest:
      certificateByPackageId.get(
        evidencePackageByResultId.get(result.result_id)?.package_id ?? "",
      )?.certificate_digest ??
      evidencePackageByResultId.get(result.result_id)?.package_digest ??
      result.result_digest,
  })) satisfies readonly ConstitutionClaim[];
  const lawsPassed = claims.filter((claim) => claim.status === "PASS").length;
  const lawsFailed = claims.length - lawsPassed;
  const proofStrength =
    certificates.proof_determinism_certificate.status === "PASS" &&
    certificates.law_results.length > 0 &&
    certificates.dependency_constitution.status === "PASS"
      ? "proof-centric"
      : "baseline";

  return {
    status: lawsFailed === 0 ? "PASS" : "FAIL",
    claim_count: claims.length,
    violated_law_count: lawsFailed,
    laws_passed: lawsPassed,
    laws_failed: lawsFailed,
    constitutional_digest: certificates.constitutional_digest,
    proof_strength: proofStrength,
    claims,
    claim_boundary:
      "Constitution claims are the presentation-safe summary of constitutional proof. They intentionally collapse detailed law evidence into digest-addressed pass/fail claims for reporting and dashboard consumption.",
  };
}

export function materializeConstitutionSummary(
  certificates: ConstitutionCertificateSet,
  claims: ConstitutionClaims = materializeConstitutionClaims(certificates),
): ConstitutionSummary {
  return {
    status: claims.status,
    claim_count: claims.claim_count,
    violated_law_count: claims.violated_law_count,
    laws_passed: claims.laws_passed,
    laws_failed: claims.laws_failed,
    constitutional_digest: claims.constitutional_digest,
    law_profile: certificates.law_profile,
    proof_strength: claims.proof_strength,
    summary_boundary:
      "Constitution summary is the presentation-safe governance read model for reporting and dashboards. It intentionally omits per-law proof payloads and individual claim entries.",
  };
}

export function materializeConstitutionProofBundle(
  certificates: ConstitutionCertificateSet,
  claims: ConstitutionClaims = materializeConstitutionClaims(certificates),
): ConstitutionProofBundle {
  const constitutionSummary = materializeConstitutionSummary(
    certificates,
    claims,
  );
  const proofFragments = {
    graph_purity_certificate: certificates.graph_purity_certificate,
    proof_determinism_certificate: certificates.proof_determinism_certificate,
    dependency_constitution: certificates.dependency_constitution,
    projection_certificates: certificates.projection_certificates,
    replay_certificates: certificates.replay_certificates,
    projection_determinism_certificates:
      certificates.projection_determinism_certificates,
  };
  const bundlePayload = {
    constitution_version: certificates.constitution_version,
    law_profile: certificates.law_profile,
    attestation_profile: certificates.attestation_profile,
    attestation_policy: certificates.attestation_policy,
    constitutional_digest: certificates.constitutional_digest,
    proof_digest: certificates.proof_digest,
    constitutional_fingerprint: certificates.constitutional_fingerprint,
    claims_digest: DigestEngine.digest(claims),
    law_results_digest: DigestEngine.digest(certificates.law_results),
    evidence_packages_digest: DigestEngine.digest(
      certificates.evidence_packages,
    ),
    law_certificates_digest: DigestEngine.digest(certificates.law_certificates),
    law_attestations_digest: DigestEngine.digest(certificates.law_attestations),
    proof_fragments_digest: DigestEngine.digest(proofFragments),
    summary: constitutionSummary,
    claims,
    law_results: certificates.law_results,
    evidence_packages: certificates.evidence_packages,
    law_certificates: certificates.law_certificates,
    law_attestations: certificates.law_attestations,
    executed_laws: certificates.executed_laws,
    law_proofs: certificates.law_proofs,
    proof_fragments: proofFragments,
  };
  const bundleDigest = DigestEngine.digest(bundlePayload);

  return {
    bundle_id: `constitution-proof-bundle:${bundleDigest.slice(0, 16)}`,
    bundle_digest: bundleDigest,
    ...bundlePayload,
    bundle_boundary:
      "Constitution proof bundle is the audit-ready aggregation of law results, immutable certificates, attestations, presentation-safe claims, and proof fragments required to verify constitutional status without reconstructing them from the raw constitution report.",
  };
}

export function materializeConstitutionProofArtifacts(
  constitutionReport: Record<string, unknown>,
  options: {
    readonly attestationProfile?: ConstitutionAttestationProfile;
  } = {},
): ConstitutionProofArtifacts {
  const certificates = materializeConstitutionCertificateSet(
    constitutionReport,
    options,
  );
  const claims = materializeConstitutionClaims(certificates);
  const constitutionSummary = materializeConstitutionSummary(
    certificates,
    claims,
  );
  const verificationSummary =
    summarizeConstitutionVerification(constitutionReport);

  return {
    certificates,
    lawResults: certificates.law_results,
    evidencePackages: certificates.evidence_packages,
    lawCertificates: certificates.law_certificates,
    lawAttestations: certificates.law_attestations,
    claims,
    constitutionSummary,
    proofBundle: materializeConstitutionProofBundle(certificates, claims),
    verificationSummary,
  };
}

export function materializeConstitutionExecutionGraphProof(input: {
  readonly certificates: ConstitutionCertificateSet;
  readonly executionGraph: {
    readonly graph_version: string;
    readonly projection_version: string;
    readonly projection_digest: string;
    readonly generated_from: readonly unknown[];
    readonly generated_at_utc: string;
    readonly claim_boundary: string;
    readonly summary: {
      readonly total_nodes: number;
      readonly total_edges: number;
      readonly declared_edges: number;
      readonly observed_edges: number;
    };
  };
}): ConstitutionExecutionGraphProof {
  const executionGraphCertificate =
    input.certificates.projection_certificates.find(
      (certificate) =>
        certificate.projection_type === "ExecutionGraphProjection",
    ) ?? null;

  return {
    constitutional_version: input.certificates.constitution_version,
    proof_digest: input.certificates.proof_digest,
    proof_determinism_status: String(
      input.certificates.proof_determinism_certificate.status ?? "FAIL",
    ),
    declared_graph_digest:
      input.certificates.constitutional_fingerprint.declared_graph_digest,
    execution_chain_digest:
      input.certificates.constitutional_fingerprint.execution_chain_digest,
    constitutional_digest: input.certificates.constitutional_digest,
    constitutional_claims:
      asRecord(executionGraphCertificate?.constitutional_claims) ?? null,
    graph_version: input.executionGraph.graph_version,
    projection_version: input.executionGraph.projection_version,
    projection_digest: input.executionGraph.projection_digest,
    generated_from: input.executionGraph.generated_from,
    generated_at_utc: input.executionGraph.generated_at_utc,
    total_nodes: input.executionGraph.summary.total_nodes,
    total_edges: input.executionGraph.summary.total_edges,
    declared_edges: input.executionGraph.summary.declared_edges,
    observed_edges: input.executionGraph.summary.observed_edges,
    claim_boundary: input.executionGraph.claim_boundary,
  };
}

export function materializeConstitutionVerificationOutput(input: {
  readonly evidenceDirectory: string;
  readonly summary: ConstitutionVerificationSummary;
}): string {
  return [
    "Constitution verification complete",
    `Evidence directory: ${input.evidenceDirectory}`,
    `Graph purity: ${input.summary.graph_purity_status}`,
    `Constitution digest: ${input.summary.constitutional_digest}`,
    `Violation count: ${input.summary.graph_violation_count}`,
    `Proof determinism: ${input.summary.proof_determinism_status}`,
    `Proof strength: ${input.summary.proof_strength}`,
    `Projection certificates: ${input.summary.projection_certificates_passed}/${input.summary.projection_certificates_total} PASS`,
    `Dependency constitution: ${input.summary.dependency_constitution_status}`,
  ].join("\n");
}
