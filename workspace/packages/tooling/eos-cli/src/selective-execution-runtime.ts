// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine";
import {
  materializeConstitutionClaims,
  materializeConstitutionProofBundle,
  materializeConstitutionSummary,
  type ConstitutionCertificateSet,
  type ConstitutionClaims,
  type ConstitutionProofBundle,
  type ConstitutionSummary,
} from "./certificate-runtime.js";

export type GovernanceSelectiveExecutionNodeId =
  | "claims"
  | "summary"
  | "proof_bundle";

export type GovernanceSelectiveExecutionDecision = {
  readonly node_id: GovernanceSelectiveExecutionNodeId;
  readonly action: "REUSE" | "REMATERIALIZE";
  readonly lineage_digest: string;
  readonly previous_output_digest: string | null;
  readonly current_output_digest: string;
  readonly reason: string;
};

export type GovernanceSelectiveExecutionReport = {
  readonly report_version: "1.0.0";
  readonly report_digest: string;
  readonly execution_scope: "verify-constitution" | "verify-foundation";
  readonly planner_status: "APPLIED";
  readonly summary: {
    readonly reusable_node_count: number;
    readonly reused_node_count: number;
    readonly rematerialized_node_count: number;
    readonly reused_nodes: readonly GovernanceSelectiveExecutionNodeId[];
    readonly rematerialized_nodes: readonly GovernanceSelectiveExecutionNodeId[];
  };
  readonly decisions: readonly GovernanceSelectiveExecutionDecision[];
  readonly claim_boundary: string;
};

export type GovernanceSelectiveExecutionArtifacts = {
  readonly claims: ConstitutionClaims;
  readonly constitutionSummary: ConstitutionSummary;
  readonly proofBundle: ConstitutionProofBundle;
  readonly report: GovernanceSelectiveExecutionReport;
};

function proofFragmentsDigest(
  certificates: ConstitutionCertificateSet,
): string {
  return DigestEngine.digest({
    graph_purity_certificate: certificates.graph_purity_certificate,
    proof_determinism_certificate: certificates.proof_determinism_certificate,
    dependency_constitution: certificates.dependency_constitution,
    projection_certificates: certificates.projection_certificates,
    replay_certificates: certificates.replay_certificates,
    projection_determinism_certificates:
      certificates.projection_determinism_certificates,
  });
}

function claimsLineageDigest(certificates: ConstitutionCertificateSet): string {
  return DigestEngine.digest({
    constitutional_digest: certificates.constitutional_digest,
    law_results_digest: DigestEngine.digest(certificates.law_results),
    evidence_packages_digest: DigestEngine.digest(certificates.evidence_packages),
    law_certificates_digest: DigestEngine.digest(certificates.law_certificates),
    proof_fragments_digest: proofFragmentsDigest(certificates),
  });
}

function proofBundleLineageDigest(
  certificates: ConstitutionCertificateSet,
  claimsDigest: string,
): string {
  return DigestEngine.digest({
    constitution_version: certificates.constitution_version,
    law_profile: certificates.law_profile,
    attestation_profile: certificates.attestation_profile,
    attestation_policy_digest: certificates.attestation_policy.policy_digest,
    constitutional_digest: certificates.constitutional_digest,
    proof_digest: certificates.proof_digest,
    constitutional_fingerprint: certificates.constitutional_fingerprint,
    claims_digest: claimsDigest,
    law_results_digest: DigestEngine.digest(certificates.law_results),
    evidence_packages_digest: DigestEngine.digest(certificates.evidence_packages),
    law_certificates_digest: DigestEngine.digest(certificates.law_certificates),
    law_attestations_digest: DigestEngine.digest(certificates.law_attestations),
    proof_fragments_digest: proofFragmentsDigest(certificates),
  });
}

export function materializeGovernanceSelectiveExecutionArtifacts(input: {
  readonly executionScope: "verify-constitution" | "verify-foundation";
  readonly certificates: ConstitutionCertificateSet;
  readonly previousProofBundle?: ConstitutionProofBundle | null;
}): GovernanceSelectiveExecutionArtifacts {
  const claimsLineage = claimsLineageDigest(input.certificates);
  const previousProofBundle = input.previousProofBundle ?? null;

  const claimsReusable =
    previousProofBundle !== null &&
    previousProofBundle.constitutional_digest ===
      input.certificates.constitutional_digest &&
    previousProofBundle.law_results_digest ===
      DigestEngine.digest(input.certificates.law_results) &&
    previousProofBundle.evidence_packages_digest ===
      DigestEngine.digest(input.certificates.evidence_packages) &&
    previousProofBundle.law_certificates_digest ===
      DigestEngine.digest(input.certificates.law_certificates) &&
    previousProofBundle.proof_fragments_digest ===
      proofFragmentsDigest(input.certificates);

  const claims = claimsReusable
    ? previousProofBundle!.claims
    : materializeConstitutionClaims(input.certificates);
  const claimsDigest = DigestEngine.digest(claims);

  const summaryLineage = DigestEngine.digest({
    claims_lineage_digest: claimsLineage,
    claims_digest: claimsDigest,
    law_profile: input.certificates.law_profile,
    constitutional_digest: input.certificates.constitutional_digest,
  });
  const summaryReusable =
    claimsReusable &&
    previousProofBundle !== null &&
    previousProofBundle.claims_digest === claimsDigest &&
    previousProofBundle.summary.law_profile === input.certificates.law_profile &&
    previousProofBundle.summary.constitutional_digest ===
      input.certificates.constitutional_digest;

  const constitutionSummary = summaryReusable
    ? previousProofBundle!.summary
    : materializeConstitutionSummary(input.certificates, claims);

  const proofBundleLineage = proofBundleLineageDigest(
    input.certificates,
    claimsDigest,
  );
  const proofBundleReusable =
    previousProofBundle !== null &&
    previousProofBundle.constitution_version ===
      input.certificates.constitution_version &&
    previousProofBundle.law_profile === input.certificates.law_profile &&
    previousProofBundle.attestation_profile ===
      input.certificates.attestation_profile &&
    previousProofBundle.attestation_policy.policy_digest ===
      input.certificates.attestation_policy.policy_digest &&
    previousProofBundle.constitutional_digest ===
      input.certificates.constitutional_digest &&
    previousProofBundle.proof_digest === input.certificates.proof_digest &&
    previousProofBundle.claims_digest === claimsDigest &&
    previousProofBundle.law_results_digest ===
      DigestEngine.digest(input.certificates.law_results) &&
    previousProofBundle.evidence_packages_digest ===
      DigestEngine.digest(input.certificates.evidence_packages) &&
    previousProofBundle.law_certificates_digest ===
      DigestEngine.digest(input.certificates.law_certificates) &&
    previousProofBundle.law_attestations_digest ===
      DigestEngine.digest(input.certificates.law_attestations) &&
    previousProofBundle.proof_fragments_digest ===
      proofFragmentsDigest(input.certificates);

  const proofBundle = proofBundleReusable
    ? previousProofBundle!
    : materializeConstitutionProofBundle(input.certificates, claims);

  const decisions = [
    {
      node_id: "claims" as const,
      action: claimsReusable ? ("REUSE" as const) : ("REMATERIALIZE" as const),
      lineage_digest: claimsLineage,
      previous_output_digest:
        previousProofBundle?.claims_digest ?? null,
      current_output_digest: claimsDigest,
      reason: claimsReusable
        ? "Claims lineage is unchanged, so previous claims artifact is reused."
        : "Claims lineage changed or prior proof bundle is unavailable, so claims are rematerialized.",
    },
    {
      node_id: "summary" as const,
      action: summaryReusable
        ? ("REUSE" as const)
        : ("REMATERIALIZE" as const),
      lineage_digest: summaryLineage,
      previous_output_digest:
        previousProofBundle?.summary
          ? DigestEngine.digest(previousProofBundle.summary)
          : null,
      current_output_digest: DigestEngine.digest(constitutionSummary),
      reason: summaryReusable
        ? "Summary lineage is unchanged, so previous summary artifact is reused."
        : "Summary lineage changed or reusable claims were not available, so summary is rematerialized.",
    },
    {
      node_id: "proof_bundle" as const,
      action: proofBundleReusable
        ? ("REUSE" as const)
        : ("REMATERIALIZE" as const),
      lineage_digest: proofBundleLineage,
      previous_output_digest:
        previousProofBundle?.bundle_digest ?? null,
      current_output_digest: proofBundle.bundle_digest,
      reason: proofBundleReusable
        ? "Proof-bundle lineage is unchanged, so previous bundle is reused."
        : "Proof-bundle lineage changed or prior bundle is unavailable, so proof bundle is rematerialized.",
    },
  ] as const;

  const summary = {
    reusable_node_count: decisions.length,
    reused_node_count: decisions.filter((entry) => entry.action === "REUSE")
      .length,
    rematerialized_node_count: decisions.filter(
      (entry) => entry.action === "REMATERIALIZE",
    ).length,
    reused_nodes: decisions
      .filter((entry) => entry.action === "REUSE")
      .map((entry) => entry.node_id),
    rematerialized_nodes: decisions
      .filter((entry) => entry.action === "REMATERIALIZE")
      .map((entry) => entry.node_id),
  };
  const payload = {
    execution_scope: input.executionScope,
    planner_status: "APPLIED" as const,
    summary,
    decisions,
  };
  const reportDigest = DigestEngine.digest(payload);

  return {
    claims,
    constitutionSummary,
    proofBundle,
    report: {
      report_version: "1.0.0",
      report_digest: reportDigest,
      ...payload,
      claim_boundary:
        "Selective execution applies incremental governance reuse only where lineage is explicit and replay-safe. In this phase it is limited to claims, summary, and proof-bundle artifacts while provenance, certificates, attestations, and read-model session binding remain freshly evaluated.",
    },
  };
}
