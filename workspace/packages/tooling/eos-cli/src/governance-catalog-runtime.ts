// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine.js";
import type {
  ConstitutionCertificateSet,
  ConstitutionClaims,
  ConstitutionEvidencePackage,
  ConstitutionLawCertificate,
  ConstitutionLawProof,
  ConstitutionProofBundle,
  ConstitutionSummary,
} from "./certificate-runtime.js";
import type { GovernanceReadModelArtifacts } from "./governance-read-model-runtime.js";
import type { GovernanceSession } from "./governance-session-runtime.js";
import type { GovernanceSessionVerificationReport } from "./governance-session-verification-runtime.js";
import type { ConstitutionLawResult } from "./law-result-runtime.js";
import type { TrustFrameworkCatalog } from "./trust-framework-runtime.js";
import type {
  VerificationRun,
  VerificationRunVerificationReport,
} from "./verification-run-runtime.js";

type GovernanceCatalogEntry = {
  readonly type_id: string;
  readonly type_kind: string;
  readonly canonical_name: string;
  readonly digest: string;
  readonly semantic_boundary: string;
};

export type GovernanceCatalog = {
  readonly catalog_version: "1.0.0";
  readonly catalog_id: string;
  readonly catalog_digest: string;
  readonly evidence_types: readonly GovernanceCatalogEntry[];
  readonly law_types: readonly GovernanceCatalogEntry[];
  readonly package_types: readonly GovernanceCatalogEntry[];
  readonly certificate_types: readonly GovernanceCatalogEntry[];
  readonly policy_types: readonly GovernanceCatalogEntry[];
  readonly read_model_types: readonly GovernanceCatalogEntry[];
  readonly report_types: readonly GovernanceCatalogEntry[];
  readonly claim_boundary: string;
};

export type GovernanceCatalogVerificationReport = {
  readonly report_version: "1.0.0";
  readonly report_digest: string;
  readonly summary: {
    readonly category_completeness_status: "PASS" | "FAIL";
    readonly duplicate_type_status: "PASS" | "FAIL";
    readonly read_model_contract_status: "PASS" | "FAIL";
    readonly report_vocabulary_status: "PASS" | "FAIL";
    readonly overall_status: "PASS" | "FAIL";
  };
  readonly catalog: {
    readonly evidence_type_count: number;
    readonly law_type_count: number;
    readonly package_type_count: number;
    readonly certificate_type_count: number;
    readonly policy_type_count: number;
    readonly read_model_type_count: number;
    readonly report_type_count: number;
    readonly duplicate_type_ids: readonly string[];
  };
  readonly claim_boundary: string;
};

function createCatalogEntry(input: {
  readonly type_id: string;
  readonly type_kind: string;
  readonly canonical_name: string;
  readonly semantic_boundary: string;
}): GovernanceCatalogEntry {
  const payload = {
    type_id: input.type_id,
    type_kind: input.type_kind,
    canonical_name: input.canonical_name,
  };

  return {
    ...payload,
    digest: DigestEngine.digest(payload),
    semantic_boundary: input.semantic_boundary,
  };
}

function uniqueEntries(
  entries: readonly GovernanceCatalogEntry[],
): readonly GovernanceCatalogEntry[] {
  const seen = new Set<string>();

  return entries.filter((entry) => {
    if (seen.has(entry.type_id)) {
      return false;
    }
    seen.add(entry.type_id);
    return true;
  });
}

export function materializeGovernanceCatalog(input: {
  readonly certificates: ConstitutionCertificateSet;
  readonly lawResults: readonly ConstitutionLawResult[];
  readonly evidencePackages: readonly ConstitutionEvidencePackage[];
  readonly lawCertificates: readonly ConstitutionLawCertificate[];
  readonly lawProofs: readonly ConstitutionLawProof[];
  readonly claims: ConstitutionClaims;
  readonly constitutionSummary: ConstitutionSummary;
  readonly proofBundle: ConstitutionProofBundle;
  readonly trustFrameworkCatalog: TrustFrameworkCatalog;
  readonly governanceReadModels: GovernanceReadModelArtifacts;
  readonly governanceSession: GovernanceSession;
  readonly governanceSessionVerification: GovernanceSessionVerificationReport;
  readonly verificationRun: VerificationRun;
  readonly verificationRunVerification: VerificationRunVerificationReport;
}): GovernanceCatalog {
  const evidenceTypes = uniqueEntries([
    createCatalogEntry({
      type_id: "evidence-type:law-result-evidence-artifact",
      type_kind: "evidence_type",
      canonical_name: "LawResultEvidenceArtifact",
      semantic_boundary:
        "Evidence artifacts are the raw constitutional proof payloads consumed by LawResult without changing certificate or trust identity.",
    }),
    createCatalogEntry({
      type_id: "evidence-type:constitution-proof-fragment",
      type_kind: "evidence_type",
      canonical_name: "ConstitutionProofFragment",
      semantic_boundary:
        "Proof fragments are immutable evidence inputs that contribute to constitutional evaluation and evidence-package assembly.",
    }),
    createCatalogEntry({
      type_id: "evidence-type:governance-session-provenance",
      type_kind: "evidence_type",
      canonical_name: "GovernanceSessionProvenance",
      semantic_boundary:
        "Governance session provenance is the replayable evidence anchor that binds trust, law results, evidence packages, certificates, reports, and projected read models.",
    }),
  ]);
  const lawTypes = uniqueEntries(
    input.lawResults.map((lawResult) =>
      createCatalogEntry({
        type_id: `law-type:${lawResult.law.law_id}`,
        type_kind: "law_type",
        canonical_name: lawResult.law.law_id,
        semantic_boundary:
          "Law types define the canonical governance evaluation vocabulary used by law results, evidence packages, certificates, and reports.",
      }),
    ),
  );
  const packageTypes = uniqueEntries([
    ...input.evidencePackages.map((evidencePackage) =>
      createCatalogEntry({
        type_id: `package-type:${evidencePackage.package_scope}`,
        type_kind: "package_type",
        canonical_name: evidencePackage.package_scope,
        semantic_boundary:
          "Evidence package types preserve the canonical materialization boundary for immutable governance evidence bundles.",
      }),
    ),
    createCatalogEntry({
      type_id: "package-type:constitution-proof-bundle",
      type_kind: "package_type",
      canonical_name: "ConstitutionProofBundle",
      semantic_boundary:
        "Proof bundle is the governed package type for replayable constitutional reporting and downstream provenance linkage.",
    }),
  ]);
  const certificateTypes = uniqueEntries([
    createCatalogEntry({
      type_id: "certificate-type:constitution-law-certificate",
      type_kind: "certificate_type",
      canonical_name: "ConstitutionLawCertificate",
      semantic_boundary:
        "Constitution law certificates are immutable certificate outputs issued from evidence packages before attestation and session projection.",
    }),
    createCatalogEntry({
      type_id: "certificate-type:attestation-policy",
      type_kind: "certificate_type",
      canonical_name: input.certificates.attestation_policy.policy_id,
      semantic_boundary:
        "Attestation policy is cataloged as the trust-boundary certificate policy reference consumed by governance provenance.",
    }),
  ]);
  const policyTypes = uniqueEntries([
    createCatalogEntry({
      type_id: `policy-type:${input.certificates.attestation_policy.policy_id}`,
      type_kind: "policy_type",
      canonical_name: input.certificates.attestation_policy.profile,
      semantic_boundary:
        "Policy types keep trust-boundary naming stable across attestation profiles, trust frameworks, and provenance.",
    }),
    ...input.trustFrameworkCatalog.frameworks.flatMap((framework) =>
      framework.policies.map((policy) =>
        createCatalogEntry({
          type_id: `policy-type:${policy.policy_id}`,
          type_kind: "policy_type",
          canonical_name: policy.policy_scope,
          semantic_boundary:
            "Trust framework policies are cataloged so governance can consume stable policy identities without embedding trust internals.",
        }),
      ),
    ),
  ]);
  const readModelTypes = uniqueEntries([
    createCatalogEntry({
      type_id: `read-model-type:${input.governanceReadModels.summaryView.view_kind}`,
      type_kind: "read_model_type",
      canonical_name: "GovernanceSummaryView",
      semantic_boundary:
        "Summary view is the governed read-model contract for constitutional status and proof-strength consumption.",
    }),
    createCatalogEntry({
      type_id: `read-model-type:${input.governanceReadModels.claimsView.view_kind}`,
      type_kind: "read_model_type",
      canonical_name: "GovernanceClaimsView",
      semantic_boundary:
        "Claims view is the governed read-model contract for constitutional claims and violations consumption.",
    }),
    createCatalogEntry({
      type_id: `read-model-type:${input.governanceReadModels.healthView.view_kind}`,
      type_kind: "read_model_type",
      canonical_name: "GovernanceHealthView",
      semantic_boundary:
        "Health view is the governed read-model contract for platform and governance operational status.",
    }),
    createCatalogEntry({
      type_id: `read-model-type:${input.governanceReadModels.dashboardView.view_kind}`,
      type_kind: "read_model_type",
      canonical_name: "GovernanceDashboardView",
      semantic_boundary:
        "Dashboard view is the governed read-model contract for executive governance consumption.",
    }),
    createCatalogEntry({
      type_id: "read-model-type:metrics",
      type_kind: "read_model_type",
      canonical_name: "GovernanceReadModelMetrics",
      semantic_boundary:
        "Read-model metrics are the governed observability contract for materialization freshness, latency, and generation lineage.",
    }),
  ]);
  const reportTypes = uniqueEntries([
    createCatalogEntry({
      type_id: "report-type:constitution-summary",
      type_kind: "report_type",
      canonical_name: "ConstitutionSummary",
      semantic_boundary:
        "Constitution summary is the canonical report type for top-level governance pass/fail interpretation.",
    }),
    createCatalogEntry({
      type_id: "report-type:constitution-claims",
      type_kind: "report_type",
      canonical_name: "ConstitutionClaims",
      semantic_boundary:
        "Constitution claims is the canonical report type for individual governance claim outcomes.",
    }),
    createCatalogEntry({
      type_id: "report-type:constitution-proof-bundle",
      type_kind: "report_type",
      canonical_name: "ConstitutionProofBundle",
      semantic_boundary:
        "Constitution proof bundle is the canonical replayable report package for constitutional governance.",
    }),
    createCatalogEntry({
      type_id: "report-type:governance-session",
      type_kind: "report_type",
      canonical_name: "GovernanceSession",
      semantic_boundary:
        "Governance session is the canonical provenance report type for execution-wide lifecycle identity.",
    }),
    createCatalogEntry({
      type_id: "report-type:governance-session-verification",
      type_kind: "report_type",
      canonical_name: "GovernanceSessionVerificationReport",
      semantic_boundary:
        "Governance session verification is the canonical report type for validating provenance completeness and lifecycle readiness.",
    }),
    createCatalogEntry({
      type_id: "report-type:verification-run",
      type_kind: "report_type",
      canonical_name: "VerificationRun",
      semantic_boundary:
        "Verification run is the canonical operational report type for one governance verification execution above GovernanceSession provenance.",
    }),
    createCatalogEntry({
      type_id: "report-type:verification-run-verification",
      type_kind: "report_type",
      canonical_name: "VerificationRunVerificationReport",
      semantic_boundary:
        "Verification run verification is the canonical report type for validating orchestration completeness, readiness, and GovernanceSession binding.",
    }),
    createCatalogEntry({
      type_id: "report-type:trust-framework-catalog",
      type_kind: "report_type",
      canonical_name: input.trustFrameworkCatalog.catalog_id,
      semantic_boundary:
        "Trust framework catalog is the canonical report type for trust-domain policy and provider vocabulary.",
    }),
  ]);

  const payload = {
    evidence_types: evidenceTypes,
    law_types: lawTypes,
    package_types: packageTypes,
    certificate_types: certificateTypes,
    policy_types: policyTypes,
    read_model_types: readModelTypes,
    report_types: reportTypes,
    supporting_digests: {
      law_results_digest: DigestEngine.digest(input.lawResults),
      evidence_packages_digest: DigestEngine.digest(input.evidencePackages),
      law_certificates_digest: DigestEngine.digest(input.lawCertificates),
      law_proofs_digest: DigestEngine.digest(input.lawProofs),
      claims_digest: DigestEngine.digest(input.claims),
      constitution_summary_digest: DigestEngine.digest(input.constitutionSummary),
      proof_bundle_digest: input.proofBundle.bundle_digest,
      governance_session_digest: input.governanceSession.session_digest,
      governance_session_verification_digest:
        input.governanceSessionVerification.report_digest,
      verification_run_digest: input.verificationRun.run_digest,
      verification_run_verification_digest:
        input.verificationRunVerification.report_digest,
    },
  };
  const catalogDigest = DigestEngine.digest(payload);

  return {
    catalog_version: "1.0.0",
    catalog_id: `governance-catalog:${catalogDigest.slice(0, 16)}`,
    catalog_digest: catalogDigest,
    ...payload,
    claim_boundary:
      "Governance catalog is the semantic registry for core governance vocabulary. It freezes canonical type identities for laws, evidence packages, certificates, policies, read models, and reports so the platform can evolve without naming drift.",
  };
}

export function materializeGovernanceCatalogVerificationReport(
  catalog: GovernanceCatalog,
): GovernanceCatalogVerificationReport {
  const allEntries = [
    ...catalog.evidence_types,
    ...catalog.law_types,
    ...catalog.package_types,
    ...catalog.certificate_types,
    ...catalog.policy_types,
    ...catalog.read_model_types,
    ...catalog.report_types,
  ];
  const typeIdCounts = new Map<string, number>();

  for (const entry of allEntries) {
    typeIdCounts.set(entry.type_id, (typeIdCounts.get(entry.type_id) ?? 0) + 1);
  }

  const duplicateTypeIds = Array.from(typeIdCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([typeId]) => typeId)
    .sort();
  const requiredReadModelTypes = [
    "read-model-type:summary",
    "read-model-type:claims",
    "read-model-type:health",
    "read-model-type:dashboard",
    "read-model-type:metrics",
  ];
  const requiredReportTypes = [
    "report-type:constitution-summary",
    "report-type:constitution-claims",
    "report-type:constitution-proof-bundle",
    "report-type:governance-session",
    "report-type:governance-session-verification",
    "report-type:verification-run",
    "report-type:verification-run-verification",
  ];
  const categoryCompletenessStatus =
    catalog.evidence_types.length > 0 &&
    catalog.law_types.length > 0 &&
    catalog.package_types.length > 0 &&
    catalog.certificate_types.length > 0 &&
    catalog.policy_types.length > 0 &&
    catalog.read_model_types.length > 0 &&
    catalog.report_types.length > 0
      ? ("PASS" as const)
      : ("FAIL" as const);
  const duplicateTypeStatus =
    duplicateTypeIds.length === 0 ? ("PASS" as const) : ("FAIL" as const);
  const readModelContractStatus = requiredReadModelTypes.every((typeId) =>
    catalog.read_model_types.some((entry) => entry.type_id === typeId),
  )
    ? ("PASS" as const)
    : ("FAIL" as const);
  const reportVocabularyStatus = requiredReportTypes.every((typeId) =>
    catalog.report_types.some((entry) => entry.type_id === typeId),
  )
    ? ("PASS" as const)
    : ("FAIL" as const);
  const summary = {
    category_completeness_status: categoryCompletenessStatus,
    duplicate_type_status: duplicateTypeStatus,
    read_model_contract_status: readModelContractStatus,
    report_vocabulary_status: reportVocabularyStatus,
    overall_status:
      categoryCompletenessStatus === "PASS" &&
      duplicateTypeStatus === "PASS" &&
      readModelContractStatus === "PASS" &&
      reportVocabularyStatus === "PASS"
        ? ("PASS" as const)
        : ("FAIL" as const),
  };
  const catalogSummary = {
    evidence_type_count: catalog.evidence_types.length,
    law_type_count: catalog.law_types.length,
    package_type_count: catalog.package_types.length,
    certificate_type_count: catalog.certificate_types.length,
    policy_type_count: catalog.policy_types.length,
    read_model_type_count: catalog.read_model_types.length,
    report_type_count: catalog.report_types.length,
    duplicate_type_ids: duplicateTypeIds,
  };
  const payload = {
    summary,
    catalog: catalogSummary,
  };

  return {
    report_version: "1.0.0",
    report_digest: DigestEngine.digest(payload),
    ...payload,
    claim_boundary:
      "Governance catalog verification proves that canonical governance vocabulary is present, unique, and complete enough to prevent semantic drift across reports, read models, policies, and evidence packaging.",
  };
}
