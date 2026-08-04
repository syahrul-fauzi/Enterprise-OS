import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { buildCapabilityRegistryModel } from "@repo/core-capability-registry";
import {
  materializeConstitutionCertificateSet,
  materializeConstitutionVerificationOutput,
  summarizeConstitutionVerification,
  type ConstitutionProofBundle,
} from "../certificate-runtime.js";
import { resolveConstitutionAttestationProfile } from "../attestation-runtime.js";
import { verifyWorkspaceConstitution } from "../constitution-support.js";
import {
  computeGovernanceSessionLineageDigest,
  materializeGovernanceSession,
  materializeGovernanceSessionProvenance,
} from "../governance-session-runtime.js";
import { materializeGovernanceIncrementalMaterializationReport } from "../incremental-materialization-runtime.js";
import { materializeGovernanceReadModelArtifactsWithSelectiveExecution } from "../read-model-selective-execution-runtime.js";
import { materializeGovernanceSelectiveExecutionArtifacts } from "../selective-execution-runtime.js";
import { materializeTrustFrameworkCatalog } from "../trust-framework-runtime.js";
import {
  captureExecutionTimestampUtc,
  fail,
  readJsonArtifact,
  writeJsonArtifact,
} from "../governance-runtime.js";
import { resolveProjectionStorageLocation } from "../projections.js";
import { EOS_ROOT } from "../state.js";

const WORKSPACE_ROOT = resolve(EOS_ROOT, "workspace");
const ENTERPRISE_ROOT = resolve(EOS_ROOT, "enterprise");
const FOUNDATION_EVIDENCE_DIR = resolve(
  WORKSPACE_ROOT,
  "foundation/evidence/verification",
);
const PRODUCTS_ROOT = resolve(WORKSPACE_ROOT, "products");
const CAPABILITIES_ROOT = resolve(WORKSPACE_ROOT, "capabilities");

export async function runVerifyConstitutionCommand(): Promise<number> {
  const sessionStartedAtUtc = captureExecutionTimestampUtc();
  const executionGraphPath = resolveProjectionStorageLocation({
    baseDir: FOUNDATION_EVIDENCE_DIR,
    scope: "foundation_verification",
    projectionType: "ExecutionGraphProjection",
  });
  const artifactRegistryPath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "artifact-registry.json",
  );
  const constitutionReportPath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "constitution-report.json",
  );
  const constitutionLawResultsPath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "constitution-law-results.json",
  );
  const constitutionEvidencePackagesPath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "constitution-evidence-packages.json",
  );
  const constitutionAttestationPolicyPath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "constitution-attestation-policy.json",
  );
  const constitutionCertificatesPath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "constitution-certificates.json",
  );
  const constitutionAttestationsPath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "constitution-attestations.json",
  );
  const constitutionClaimsPath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "constitution-claims.json",
  );
  const governanceClaimsViewPath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "governance-claims-view.json",
  );
  const constitutionSummaryPath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "constitution-summary.json",
  );
  const governanceSummaryViewPath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "governance-summary-view.json",
  );
  const governanceHealthViewPath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "governance-health-view.json",
  );
  const governanceDashboardViewPath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "governance-dashboard-view.json",
  );
  const governanceReadModelMetricsPath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "governance-read-model-metrics.json",
  );
  const governanceIncrementalMaterializationPath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "governance-incremental-materialization.json",
  );
  const governanceSelectiveExecutionPath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "governance-selective-execution.json",
  );
  const governanceReadModelSelectiveExecutionPath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "governance-read-model-selective-execution.json",
  );
  const governanceSessionPath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "governance-session.json",
  );
  const trustFrameworkPath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "trust-framework.json",
  );
  const constitutionProofBundlePath = resolve(
    FOUNDATION_EVIDENCE_DIR,
    "constitution-proof-bundle.json",
  );

  if (!existsSync(executionGraphPath) || !existsSync(artifactRegistryPath)) {
    fail(
      "Constitution verification requires foundation evidence. Run `pnpm eos verify-foundation` first.",
    );
  }

  const constitutionReport = verifyWorkspaceConstitution({
    foundationEvidenceDir: FOUNDATION_EVIDENCE_DIR,
    productsRoot: PRODUCTS_ROOT,
    workspaceRoot: WORKSPACE_ROOT,
  });
  const certificateSet = materializeConstitutionCertificateSet(
    constitutionReport,
    {
      attestationProfile: resolveConstitutionAttestationProfile(),
    },
  );
  const selectiveExecution =
    materializeGovernanceSelectiveExecutionArtifacts({
      executionScope: "verify-constitution",
      certificates: certificateSet,
      previousProofBundle: existsSync(constitutionProofBundlePath)
        ? readJsonArtifact<ConstitutionProofBundle>(constitutionProofBundlePath)
        : null,
    });
  const constitutionArtifacts = {
    certificates: certificateSet,
    lawResults: certificateSet.law_results,
    evidencePackages: certificateSet.evidence_packages,
    lawCertificates: certificateSet.law_certificates,
    lawAttestations: certificateSet.law_attestations,
    claims: selectiveExecution.claims,
    constitutionSummary: selectiveExecution.constitutionSummary,
    proofBundle: selectiveExecution.proofBundle,
    verificationSummary: summarizeConstitutionVerification(constitutionReport),
  } as const;
  const registryReport = buildCapabilityRegistryModel({
    eosRoot: EOS_ROOT,
    workspaceRoot: WORKSPACE_ROOT,
    enterpriseRoot: ENTERPRISE_ROOT,
    capabilitiesRoot: CAPABILITIES_ROOT,
  });
  writeJsonArtifact(constitutionReportPath, constitutionReport);
  writeJsonArtifact(
    constitutionAttestationPolicyPath,
    constitutionArtifacts.certificates.attestation_policy,
  );
  writeJsonArtifact(
    constitutionLawResultsPath,
    constitutionArtifacts.lawResults,
  );
  writeJsonArtifact(
    constitutionEvidencePackagesPath,
    constitutionArtifacts.evidencePackages,
  );
  writeJsonArtifact(
    constitutionCertificatesPath,
    constitutionArtifacts.lawCertificates,
  );
  writeJsonArtifact(
    constitutionAttestationsPath,
    constitutionArtifacts.lawAttestations,
  );
  writeJsonArtifact(constitutionClaimsPath, constitutionArtifacts.claims);
  writeJsonArtifact(
    constitutionSummaryPath,
    constitutionArtifacts.constitutionSummary,
  );
  const governanceSessionProvenance = materializeGovernanceSessionProvenance({
    executionScope: "verify-constitution",
    startedAtUtc: sessionStartedAtUtc,
    completedAtUtc: captureExecutionTimestampUtc(),
    constitutionReport,
    certificates: constitutionArtifacts.certificates,
    lawResults: constitutionArtifacts.lawResults,
    evidencePackages: constitutionArtifacts.evidencePackages,
    lawCertificates: constitutionArtifacts.lawCertificates,
    lawAttestations: constitutionArtifacts.lawAttestations,
    claims: constitutionArtifacts.claims,
    constitutionSummary: constitutionArtifacts.constitutionSummary,
    proofBundle: constitutionArtifacts.proofBundle,
  });
  const governanceReadModels =
    materializeGovernanceReadModelArtifactsWithSelectiveExecution(
    {
      executionScope: "verify-constitution",
      claims: constitutionArtifacts.claims,
      summary: constitutionArtifacts.constitutionSummary,
    },
    {
      consumerCount:
        registryReport.capabilities.find(
          (capability) => capability.id === "governance-read-model",
        )?.declared_consumers.length ?? 0,
      sourceGeneratedAtUtc: new Date(
        Math.max(
          statSync(constitutionClaimsPath).mtimeMs,
          statSync(constitutionSummaryPath).mtimeMs,
        ),
      ).toISOString(),
      sourceSession: {
        session_id: governanceSessionProvenance.session_id,
        session_digest: governanceSessionProvenance.session_digest,
        session_lineage_digest: computeGovernanceSessionLineageDigest(
          governanceSessionProvenance,
        ),
      },
      previousArtifacts:
        existsSync(governanceClaimsViewPath) &&
        existsSync(governanceSummaryViewPath) &&
        existsSync(governanceHealthViewPath) &&
        existsSync(governanceDashboardViewPath) &&
        existsSync(governanceReadModelMetricsPath)
          ? {
              claimsView: readJsonArtifact(governanceClaimsViewPath),
              summaryView: readJsonArtifact(governanceSummaryViewPath),
              healthView: readJsonArtifact(governanceHealthViewPath),
              dashboardView: readJsonArtifact(governanceDashboardViewPath),
              metrics: readJsonArtifact(governanceReadModelMetricsPath),
            }
          : null,
    },
  );
  writeJsonArtifact(
    governanceReadModelSelectiveExecutionPath,
    governanceReadModels.report,
  );
  writeJsonArtifact(
    governanceClaimsViewPath,
    governanceReadModels.artifacts.claimsView,
  );
  writeJsonArtifact(
    governanceSummaryViewPath,
    governanceReadModels.artifacts.summaryView,
  );
  writeJsonArtifact(
    governanceHealthViewPath,
    governanceReadModels.artifacts.healthView,
  );
  writeJsonArtifact(
    governanceDashboardViewPath,
    governanceReadModels.artifacts.dashboardView,
  );
  writeJsonArtifact(
    governanceReadModelMetricsPath,
    governanceReadModels.artifacts.metrics,
  );
  writeJsonArtifact(
    governanceSelectiveExecutionPath,
    selectiveExecution.report,
  );
  const trustFrameworkCatalog = materializeTrustFrameworkCatalog();
  writeJsonArtifact(trustFrameworkPath, trustFrameworkCatalog);
  const governanceSession = materializeGovernanceSession({
    provenance: governanceSessionProvenance,
    governanceReadModels: governanceReadModels.artifacts,
  });
  writeJsonArtifact(
    governanceIncrementalMaterializationPath,
    materializeGovernanceIncrementalMaterializationReport({
      executionScope: "verify-constitution",
      trustFrameworkCatalog,
      attestationPolicy: constitutionArtifacts.certificates.attestation_policy,
      lawResults: constitutionArtifacts.lawResults,
      evidencePackages: constitutionArtifacts.evidencePackages,
      lawCertificates: constitutionArtifacts.lawCertificates,
      lawAttestations: constitutionArtifacts.lawAttestations,
      claims: constitutionArtifacts.claims,
      constitutionSummary: constitutionArtifacts.constitutionSummary,
      proofBundle: constitutionArtifacts.proofBundle,
      sessionProvenance: governanceSessionProvenance,
      summaryView: governanceReadModels.artifacts.summaryView,
      claimsView: governanceReadModels.artifacts.claimsView,
      healthView: governanceReadModels.artifacts.healthView,
      dashboardView: governanceReadModels.artifacts.dashboardView,
      readModelMetrics: governanceReadModels.artifacts.metrics,
      governanceSession,
      previousReport: existsSync(governanceIncrementalMaterializationPath)
        ? readJsonArtifact(governanceIncrementalMaterializationPath)
        : null,
      selectiveExecutionStatus: "APPLIED",
    }),
  );
  writeJsonArtifact(
    governanceSessionPath,
    governanceSession,
  );
  writeJsonArtifact(
    constitutionProofBundlePath,
    constitutionArtifacts.proofBundle,
  );

  process.stdout.write(
    `${materializeConstitutionVerificationOutput({
      evidenceDirectory: FOUNDATION_EVIDENCE_DIR,
      summary: constitutionArtifacts.verificationSummary,
    })}\n`,
  );

  return 0;
}
