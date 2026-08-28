// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine.js";
import type {
  ConstitutionClaims,
  ConstitutionLawCertificate,
  ConstitutionSummary,
} from "./certificate-runtime.js";
import {
  computeGovernanceSessionLineageDigest,
  type GovernanceSession,
} from "./governance-session-runtime.js";
import type { GovernanceReadModelArtifacts } from "./governance-read-model-runtime.js";
import type { GovernanceSessionVerificationReport } from "./governance-session-verification-runtime.js";
import type { ConstitutionLawResult } from "./law-result-runtime.js";
import type { ConstitutionEvidencePackage, ConstitutionProofBundle } from "./certificate-runtime.js";

type ArchitectureFitnessMetric = {
  readonly metric_id:
    | "cyclic_capability_dependency"
    | "evidence_lineage_break"
    | "read_model_generated_outside_session"
    | "certificate_mutability"
    | "trust_implementation_leaked_to_api"
    | "capability_contract_violations"
    | "dependency_class_drift";
  readonly target: 0;
  readonly observed: number;
  readonly status: "PASS" | "FAIL";
  readonly evidence_basis: string;
};

export type ArchitectureFitnessReport = {
  readonly report_version: "1.0.0";
  readonly report_digest: string;
  readonly summary: {
    readonly fitness_status: "PASS" | "FAIL";
    readonly violated_metric_count: number;
    readonly cyclic_capability_dependency: number;
    readonly evidence_lineage_break: number;
    readonly read_model_generated_outside_session: number;
    readonly certificate_mutability: number;
    readonly trust_implementation_leaked_to_api: number;
    readonly capability_contract_violations: number;
    readonly dependency_class_drift: number;
  };
  readonly metrics: readonly ArchitectureFitnessMetric[];
  readonly claim_boundary: string;
};

function metric(input: {
  readonly metricId: ArchitectureFitnessMetric["metric_id"];
  readonly observed: number;
  readonly evidenceBasis: string;
}): ArchitectureFitnessMetric {
  return {
    metric_id: input.metricId,
    target: 0,
    observed: input.observed,
    status: input.observed === 0 ? "PASS" : "FAIL",
    evidence_basis: input.evidenceBasis,
  };
}

export function materializeArchitectureFitnessReport(input: {
  readonly dependencyConstitution: {
    readonly summary: {
      readonly dependency_cycles: number;
    };
  };
  readonly contractVersionRegistry: {
    readonly summary: {
      readonly unsatisfied_requirements: number;
      readonly ambiguous_provider_bindings: number;
      readonly unbounded_consumer_requirements: number;
    };
  };
  readonly capabilityGovernanceVerification: {
    readonly summary: {
      readonly unknown_dependency_class_count: number;
    };
  };
  readonly apiPlatform: {
    readonly declared_dependencies: readonly string[];
    readonly required_contract_names: readonly string[];
  } | null;
  readonly governanceSession: GovernanceSession;
  readonly governanceSessionVerification: GovernanceSessionVerificationReport;
  readonly governanceReadModels: GovernanceReadModelArtifacts;
  readonly lawResults: readonly ConstitutionLawResult[];
  readonly evidencePackages: readonly ConstitutionEvidencePackage[];
  readonly lawCertificates: readonly ConstitutionLawCertificate[];
  readonly claims: ConstitutionClaims;
  readonly constitutionSummary: ConstitutionSummary;
  readonly proofBundle: ConstitutionProofBundle;
}): ArchitectureFitnessReport {
  const sessionLineageDigest = computeGovernanceSessionLineageDigest(
    input.governanceSession,
  );
  const readModelSources = [
    {
      source_session_id: input.governanceReadModels.summaryView.source_session_id,
      source_session_digest:
        input.governanceReadModels.summaryView.source_session_digest,
      source_session_lineage_digest:
        input.governanceReadModels.summaryView.source_session_lineage_digest,
    },
    {
      source_session_id: input.governanceReadModels.claimsView.source_session_id,
      source_session_digest:
        input.governanceReadModels.claimsView.source_session_digest,
      source_session_lineage_digest:
        input.governanceReadModels.claimsView.source_session_lineage_digest,
    },
    {
      source_session_id: input.governanceReadModels.healthView.source_session_id,
      source_session_digest:
        input.governanceReadModels.healthView.source_session_digest,
      source_session_lineage_digest:
        input.governanceReadModels.healthView.source_session_lineage_digest,
    },
    {
      source_session_id: input.governanceReadModels.dashboardView.source_session_id,
      source_session_digest:
        input.governanceReadModels.dashboardView.source_session_digest,
      source_session_lineage_digest:
        input.governanceReadModels.dashboardView.source_session_lineage_digest,
    },
    {
      source_session_id: input.governanceReadModels.metrics.source_session_id,
      source_session_digest: input.governanceReadModels.metrics.source_session_digest,
      source_session_lineage_digest:
        input.governanceReadModels.metrics.source_session_lineage_digest,
    },
  ];
  const readModelGeneratedOutsideSession = readModelSources.filter(
    (source) =>
      source.source_session_id !== input.governanceSession.session_id ||
      source.source_session_digest !== input.governanceSession.session_digest ||
      source.source_session_lineage_digest !== sessionLineageDigest,
  ).length;
  let evidenceLineageBreak = 0;

  if (
    input.governanceSession.law_results.digest !==
    DigestEngine.digest(input.lawResults)
  ) {
    evidenceLineageBreak += 1;
  }
  if (
    input.governanceSession.evidence_packages.digest !==
    DigestEngine.digest(input.evidencePackages)
  ) {
    evidenceLineageBreak += 1;
  }
  if (
    input.governanceSession.certificates.digest !==
    DigestEngine.digest(input.lawCertificates)
  ) {
    evidenceLineageBreak += 1;
  }
  if (
    input.governanceSession.reports.claims_digest !==
    DigestEngine.digest(input.claims)
  ) {
    evidenceLineageBreak += 1;
  }
  if (
    input.governanceSession.reports.summary_digest !==
    DigestEngine.digest(input.constitutionSummary)
  ) {
    evidenceLineageBreak += 1;
  }
  if (
    input.governanceSession.reports.proof_bundle_digest !==
    input.proofBundle.bundle_digest
  ) {
    evidenceLineageBreak += 1;
  }
  if (input.governanceSessionVerification.summary.overall_status !== "PASS") {
    evidenceLineageBreak += 1;
  }

  const certificateMutability = input.lawCertificates.filter(
    (certificate) =>
      certificate.issued_at_utc !== null ||
      !certificate.certificate_boundary.toLowerCase().includes("immutable"),
  ).length;
  const trustImplementationLeakedToApi =
    (input.apiPlatform?.declared_dependencies.includes("trust-framework")
      ? 1
      : 0) +
    (input.apiPlatform?.required_contract_names.includes("TrustFrameworkProvider")
      ? 1
      : 0);
  const capabilityContractViolations =
    input.contractVersionRegistry.summary.unsatisfied_requirements +
    input.contractVersionRegistry.summary.ambiguous_provider_bindings +
    input.contractVersionRegistry.summary.unbounded_consumer_requirements;
  const dependencyClassDrift =
    input.capabilityGovernanceVerification.summary.unknown_dependency_class_count;
  const metrics = [
    metric({
      metricId: "cyclic_capability_dependency",
      observed: input.dependencyConstitution.summary.dependency_cycles,
      evidenceBasis:
        "Derived from capability dependency constitution summary.dependency_cycles.",
    }),
    metric({
      metricId: "evidence_lineage_break",
      observed: evidenceLineageBreak,
      evidenceBasis:
        "Derived from governance session digests, proof bundle digest, and governance session verification status.",
    }),
    metric({
      metricId: "read_model_generated_outside_session",
      observed: readModelGeneratedOutsideSession,
      evidenceBasis:
        "Derived from read-model source_session identity and lineage digest alignment with GovernanceSession.",
    }),
    metric({
      metricId: "certificate_mutability",
      observed: certificateMutability,
      evidenceBasis:
        "Derived from certificate issuance immutability invariants on issued_at_utc and certificate_boundary.",
    }),
    metric({
      metricId: "trust_implementation_leaked_to_api",
      observed: trustImplementationLeakedToApi,
      evidenceBasis:
        "Derived from api-platform declared dependencies and required contract names.",
    }),
    metric({
      metricId: "capability_contract_violations",
      observed: capabilityContractViolations,
      evidenceBasis:
        "Derived from contract version registry unsatisfied requirements, ambiguous bindings, and unbounded consumers.",
    }),
    metric({
      metricId: "dependency_class_drift",
      observed: dependencyClassDrift,
      evidenceBasis:
        "Derived from capability governance verification unknown dependency class count.",
    }),
  ] as const;
  const summary = {
    fitness_status: metrics.every((entry) => entry.status === "PASS")
      ? ("PASS" as const)
      : ("FAIL" as const),
    violated_metric_count: metrics.filter((entry) => entry.status === "FAIL")
      .length,
    cyclic_capability_dependency:
      input.dependencyConstitution.summary.dependency_cycles,
    evidence_lineage_break: evidenceLineageBreak,
    read_model_generated_outside_session: readModelGeneratedOutsideSession,
    certificate_mutability: certificateMutability,
    trust_implementation_leaked_to_api: trustImplementationLeakedToApi,
    capability_contract_violations: capabilityContractViolations,
    dependency_class_drift: dependencyClassDrift,
  };
  const payload = {
    summary,
    metrics,
  };

  return {
    report_version: "1.0.0",
    report_digest: DigestEngine.digest(payload),
    ...payload,
    claim_boundary:
      "Architecture fitness report converts stable governance evidence into zero-tolerance architecture metrics. It measures churn-sensitive failures such as dependency cycles, lineage breaks, out-of-session read models, mutable certificates, trust leakage into API, contract-governance violations, and dependency classification drift.",
  };
}
