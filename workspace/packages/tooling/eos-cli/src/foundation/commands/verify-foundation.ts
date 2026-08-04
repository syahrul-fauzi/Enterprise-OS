import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildArtifactGraph,
  buildArtifactGraphHealth,
  buildArtifactRegistryModel,
  buildCapabilityDependencyConstitutionReport,
  buildCapabilityRegistryModel,
  buildContractVersionRegistryReport,
  buildExecutionGraphFitness,
  buildExecutionGraphModel,
} from "@repo/core-capability-registry";
import { materializeArchitectureFitnessReport } from "../../architecture-fitness-runtime.js";
import { materializeCapabilityGraphProjection } from "../../capability/runtime/graph-runtime.js";
import { materializeCapabilityGovernanceProjection } from "../../capability/runtime/governance-runtime.js";
import { materializeContractVersionEvolutionVerificationReport } from "../../contract-version-evolution-runtime.js";
import { materializeEnterpriseControlGraph } from "../../enterprise-control-graph-runtime.js";
import { verifyWorkspaceConstitution } from "../../constitution-support.js";
import {
  DEFAULT_EXECUTABLE_SPEC_BINDINGS,
  REQUIRED_PRODUCT_EVIDENCE,
  buildCapabilityExecutionEvidence,
  buildEvolutionDelta,
  buildExecutionChainSummary,
  buildExecutionPlanSummary,
  buildFoundationMetrics,
  buildFoundationProductEvidence,
  buildGranularClrMatrix,
  loadGateCAcceptanceClosedLoopArtifacts,
  readPreviousFoundationArtifacts,
  resolveFoundationEvidenceFiles,
  buildSpecExecutionAudit,
  type FoundationProductPortfolio,
} from "../runtime/evidence-runtime.js";
import { ProjectionBuilders } from "../../projection/builders/index.js";
import {
  materializeConstitutionCertificateSet,
  materializeConstitutionExecutionGraphProof,
  summarizeConstitutionVerification,
  type ConstitutionProofBundle,
} from "../../certificate-runtime.js";
import { resolveConstitutionAttestationProfile } from "../../attestation-runtime.js";
import { materializeAttestationLifecycleMaterializationReport } from "../../attestation-lifecycle-materialization-runtime.js";
import { materializeAttestationLifecycleVerificationReport } from "../../attestation-lifecycle-runtime.js";
import {
  computeGovernanceSessionLineageDigest,
  materializeGovernanceSession,
  materializeGovernanceSessionProvenance,
} from "../../governance-session-runtime.js";
import { materializeGovernanceSessionVerificationReport } from "../../governance-session-verification-runtime.js";
import {
  materializeVerificationRun,
  materializeVerificationRunVerificationReport,
} from "../../verification-run-runtime.js";
import {
  materializeGovernanceCatalog,
  materializeGovernanceCatalogVerificationReport,
} from "../../governance-catalog-runtime.js";
import { materializeGovernanceIncrementalMaterializationReport } from "../../incremental-materialization-runtime.js";
import { materializeGovernanceReadModelArtifactsWithSelectiveExecution } from "../../read-model-selective-execution-runtime.js";
import { materializeGovernanceSelectiveExecutionArtifacts } from "../../selective-execution-runtime.js";
import { materializeGovernanceIncrementalMaterializationVerificationReport } from "../../incremental-materialization-verification-runtime.js";
import { materializeTrustFrameworkCatalog } from "../../trust-framework-runtime.js";
import {
  materializeTrustSignatureProviderRegistry,
  materializeTrustSignatureProviderVerificationReport,
} from "../../trust-signature-provider-runtime.js";
import { materializeTrustSignatureMaterializationReport } from "../../trust-signature-materialization-runtime.js";
import { materializeTrustFrameworkVerificationReport } from "../../trust-framework-verification-runtime.js";
import {
  materializeFoundationFitnessReport,
  materializeFoundationReport,
  materializeFoundationSummaryMarkdown,
  materializeGuardrailReport,
} from "../runtime/reporting-runtime.js";
import { persistFoundationReportArtifacts } from "../runtime/report-evidence-runtime.js";
import {
  buildFoundationReportProducerContext,
  executeFoundationReportProducerRegistry,
} from "../registry/producer-registry.js";
import { executeFoundationProducerRegistry } from "../registry/foundation-producer-registry.js";
import {
  persistSpecificationArtifactGraph,
  persistSpecificationConformanceReport,
} from "../../specification/runtime/conformance-runtime.js";
import {
  persistSpecificationVocabularyAuditReport,
} from "../../specification/runtime/vocabulary-runtime.js";
import {
  persistSpecificationConformanceEvidence,
  persistSpecificationConformanceProjection,
} from "../../specification/runtime/projection-runtime.js";
import {
  captureExecutionTimestampUtc,
  ensureDirectory,
  readJsonArtifact,
  readYamlArtifact,
  uniqueStrings,
  writeJsonArtifact,
  writeYamlArtifact,
  writeTextArtifact,
} from "../../governance-runtime.js";
import { persistProjectionArtifact } from "../../projection/runtime/index.js";
import { materializeKnowledgeProjectionArtifacts } from "../../knowledge/registry/index.js";
import { materializeLearningRecordedEvents } from "../../learning/runtime/intelligence-runtime.js";
import { EOS_ROOT } from "../../state.js";

const WORKSPACE_ROOT = resolve(EOS_ROOT, "workspace");
const ENTERPRISE_ROOT = resolve(EOS_ROOT, "enterprise");
const CAPABILITIES_ROOT = resolve(WORKSPACE_ROOT, "capabilities");
const FOUNDATION_EVIDENCE_DIR = resolve(
  WORKSPACE_ROOT,
  "foundation/evidence/verification",
);

type ProductPortfolio = FoundationProductPortfolio;

type QualityGates = {
  readonly governance_as_automation?: {
    readonly quality_gate?: {
      readonly clr?: string;
      readonly experience_reuse?: string;
      readonly capability_reuse?: string;
      readonly new_patterns?: string;
    };
  };
};

export async function runVerifyFoundationCommand(): Promise<number> {
  const sessionStartedAtUtc = captureExecutionTimestampUtc();
  const productPortfolioPath = resolve(
    ENTERPRISE_ROOT,
    "specifications/PRODUCT-PORTFOLIO.yaml",
  );
  const governancePortfolioPath = resolve(
    ENTERPRISE_ROOT,
    "specifications/GOVERNANCE-PORTFOLIO.yaml",
  );
  const qualityGatesPath = resolve(
    ENTERPRISE_ROOT,
    "execution/QUALITY-GATES.yaml",
  );

  const productPortfolio =
    readYamlArtifact<ProductPortfolio>(productPortfolioPath);
  const governancePortfolio = readYamlArtifact<Record<string, unknown>>(
    governancePortfolioPath,
  );
  const qualityGates = readYamlArtifact<QualityGates>(qualityGatesPath);
  const registryReport = buildCapabilityRegistryModel({
    eosRoot: EOS_ROOT,
    workspaceRoot: WORKSPACE_ROOT,
    enterpriseRoot: ENTERPRISE_ROOT,
    capabilitiesRoot: CAPABILITIES_ROOT,
  });
  const artifactRegistry = buildArtifactRegistryModel(
    {
      eosRoot: EOS_ROOT,
      workspaceRoot: WORKSPACE_ROOT,
      enterpriseRoot: ENTERPRISE_ROOT,
      capabilitiesRoot: CAPABILITIES_ROOT,
    },
    registryReport,
  );
  const artifactGraph = buildArtifactGraph(
    {
      eosRoot: EOS_ROOT,
      workspaceRoot: WORKSPACE_ROOT,
      enterpriseRoot: ENTERPRISE_ROOT,
      capabilitiesRoot: CAPABILITIES_ROOT,
    },
    registryReport,
  );
  const graphHealth = buildArtifactGraphHealth(registryReport, artifactGraph);
  const capabilityDependencyConstitution =
    buildCapabilityDependencyConstitutionReport(
      {
        eosRoot: EOS_ROOT,
        workspaceRoot: WORKSPACE_ROOT,
        enterpriseRoot: ENTERPRISE_ROOT,
        capabilitiesRoot: CAPABILITIES_ROOT,
      },
      registryReport,
    );
  const contractVersionRegistry = buildContractVersionRegistryReport(
    registryReport,
  );
  const contractVersionEvolution =
    materializeContractVersionEvolutionVerificationReport(
      contractVersionRegistry,
    );

  ensureDirectory(FOUNDATION_EVIDENCE_DIR);

  const declaredProducts =
    productPortfolio.products?.map((product) => product.id) ?? [];
  const productEvidence = declaredProducts.map((productId) =>
    buildFoundationProductEvidence({
      workspaceRoot: WORKSPACE_ROOT,
      productId,
      requiredProductEvidence: REQUIRED_PRODUCT_EVIDENCE,
    }),
  );
  const foundationMetrics = buildFoundationMetrics(
    productPortfolio,
    productEvidence,
  );
  const evolutionDelta = buildEvolutionDelta(productEvidence);
  const guardrailReport = materializeGuardrailReport({
    qualityGates,
    productEvidence,
  });
  const specAudit = buildSpecExecutionAudit({
    enterpriseRoot: ENTERPRISE_ROOT,
    executableSpecBindings: DEFAULT_EXECUTABLE_SPEC_BINDINGS,
  });
  const granularClrMatrix = buildGranularClrMatrix(productEvidence);
  const executionEvidence = buildCapabilityExecutionEvidence({
    registryReport,
    productEvidence,
  });
  const executionChain = buildExecutionChainSummary(productEvidence);
  const executionPlan = buildExecutionPlanSummary({
    portfolio: productPortfolio,
    productEvidence,
  });
  const topologyDrift = ProjectionBuilders.topologyDrift.build(productEvidence);
  const evidenceFiles = resolveFoundationEvidenceFiles(FOUNDATION_EVIDENCE_DIR);
  const { previousFitnessReport, previousTrendReport } =
    readPreviousFoundationArtifacts(evidenceFiles);
  const fitnessReport = materializeFoundationFitnessReport({
    previous:
      previousFitnessReport &&
      typeof previousFitnessReport.current === "object" &&
      previousFitnessReport.current !== null
        ? (previousFitnessReport.current as Record<string, unknown>)
        : null,
    foundationMetrics,
    graphHealth,
    specAudit: specAudit as {
      readonly summary: { readonly documentation_only: number };
    },
  });
  const architectureTrend = ProjectionBuilders.trend.build({
    previous: previousTrendReport,
    currentMetrics: {
      foundation_status: (foundationMetrics as { foundation_status: string })
        .foundation_status,
      verified_products: (foundationMetrics as { verified_products: number })
        .verified_products,
      declared_products: (foundationMetrics as { declared_products: number })
        .declared_products,
      owner_coverage_ratio: graphHealth.owner_coverage_ratio,
      reachability_ratio: graphHealth.reachability_ratio,
      orphan_artifacts: graphHealth.orphan_artifacts.length,
      documentation_only_specs: (
        specAudit as {
          readonly summary: { readonly documentation_only: number };
        }
      ).summary.documentation_only,
      weighted_clr_normalized: (
        granularClrMatrix as { readonly weighted_clr_normalized: number | null }
      ).weighted_clr_normalized,
      total_artifacts: artifactRegistry.summary.total_artifacts,
      observed_capabilities: (
        executionEvidence as {
          readonly summary: { readonly observed_capabilities: number };
        }
      ).summary.observed_capabilities,
      verified_capabilities: (
        executionEvidence as {
          readonly summary: { readonly verified_capabilities: number };
        }
      ).summary.verified_capabilities,
      reproducible_capabilities: (
        executionEvidence as {
          readonly summary: { readonly reproducible_capabilities: number };
        }
      ).summary.reproducible_capabilities,
      products_with_execution_plan: executionPlan.products_with_execution_plan,
      total_chain_invocations: executionChain.total_invocations,
      unique_chain_digests: executionChain.unique_chain_digests,
      chains_with_requirement: executionChain.chains_with_requirement,
      reproducible_chains: executionChain.reproducible_chains,
      stable_chains: executionChain.stable_chains,
      chain_projection_digest: executionChain.chain_projection_digest,
      chain_status_fingerprints: uniqueStrings(
        productEvidence.flatMap((product) =>
          product.execution_chains.map(
            (chain) =>
              `${chain.product_id}:${chain.chain_digest}:${chain.chain_status}`,
          ),
        ),
      ),
    },
  });
  const executionEvidenceByCapability = new Map(
    (
      executionEvidence as {
        readonly capabilities: readonly {
          readonly capability_id: string;
        }[];
      }
    ).capabilities.map((capability) => [capability.capability_id, capability]),
  );
  const artifactRegistryWithExecutionEvidence = {
    ...artifactRegistry,
    artifacts: artifactRegistry.artifacts.map((artifact) =>
      artifact.artifact_type === "capability"
        ? {
            ...artifact,
            execution_evidence:
              executionEvidenceByCapability.get(
                artifact.id.replace(/^capability:/, ""),
              ) ?? null,
          }
        : artifact,
    ),
    claim_boundary: `${artifactRegistry.claim_boundary} Execution evidence is attached from current verified product artifacts and trend-aware foundation verification.`,
  };
  const executionGraph = buildExecutionGraphModel(
    artifactRegistryWithExecutionEvidence,
  );
  const graphFitness = buildExecutionGraphFitness(
    executionGraph,
    registryReport.duplicate_candidates.length,
  );
  const apiPlatformCapability =
    registryReport.capabilities.find(
      (capability) => capability.id === "api-platform",
    ) ?? null;
  writeJsonArtifact(
    evidenceFiles.artifactRegistry,
    artifactRegistryWithExecutionEvidence,
  );
  writeJsonArtifact(
    evidenceFiles.capabilityDependencyConstitution,
    capabilityDependencyConstitution,
  );
  writeJsonArtifact(
    evidenceFiles.contractVersionRegistry,
    contractVersionRegistry,
  );
  writeJsonArtifact(
    evidenceFiles.contractVersionEvolution,
    contractVersionEvolution,
  );
  writeJsonArtifact(evidenceFiles.executionGraph, executionGraph);
  writeJsonArtifact(evidenceFiles.graphFitness, graphFitness);
  persistProjectionArtifact({
    path: evidenceFiles.architectureTrend,
    scope: "foundation_verification",
    projection: architectureTrend,
    expectedProjectionType: "TrendProjection",
  });
  writeJsonArtifact(evidenceFiles.executionPlan, executionPlan);
  writeJsonArtifact(evidenceFiles.executionChain, executionChain);
  writeJsonArtifact(evidenceFiles.executionEvidence, executionEvidence);
  persistProjectionArtifact({
    path: evidenceFiles.topologyDrift,
    scope: "foundation_verification",
    projection: topologyDrift,
    expectedProjectionType: "TopologyDriftProjection",
  });
  const constitutionReport = verifyWorkspaceConstitution({
    foundationEvidenceDir: FOUNDATION_EVIDENCE_DIR,
    productsRoot: resolve(WORKSPACE_ROOT, "products"),
    workspaceRoot: WORKSPACE_ROOT,
  });
  const certificateSet = materializeConstitutionCertificateSet(
    constitutionReport as Record<string, unknown>,
    {
      attestationProfile: resolveConstitutionAttestationProfile(),
    },
  );
  const selectiveExecution =
    materializeGovernanceSelectiveExecutionArtifacts({
      executionScope: "verify-foundation",
      certificates: certificateSet,
      previousProofBundle: existsSync(evidenceFiles.constitutionProofBundle)
        ? readJsonArtifact<ConstitutionProofBundle>(
            evidenceFiles.constitutionProofBundle,
          )
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
  const trustSignatureMaterialization =
    materializeTrustSignatureMaterializationReport({
      attestationProfile: constitutionArtifacts.certificates.attestation_profile,
      attestationPolicy: constitutionArtifacts.certificates.attestation_policy,
      lawAttestations: constitutionArtifacts.lawAttestations,
    });
  const attestationLifecycleVerification =
    materializeAttestationLifecycleVerificationReport(
      constitutionArtifacts.lawAttestations,
    );
  const attestationLifecycleMaterialization =
    materializeAttestationLifecycleMaterializationReport(
      constitutionArtifacts.lawAttestations,
    );
  writeJsonArtifact(evidenceFiles.constitution, constitutionReport);
  writeJsonArtifact(
    evidenceFiles.constitutionAttestationPolicy,
    constitutionArtifacts.certificates.attestation_policy,
  );
  writeJsonArtifact(
    evidenceFiles.constitutionLawResults,
    constitutionArtifacts.lawResults,
  );
  writeJsonArtifact(
    evidenceFiles.constitutionEvidencePackages,
    constitutionArtifacts.evidencePackages,
  );
  writeJsonArtifact(
    evidenceFiles.constitutionCertificates,
    constitutionArtifacts.lawCertificates,
  );
  writeJsonArtifact(
    evidenceFiles.constitutionAttestations,
    constitutionArtifacts.lawAttestations,
  );
  writeJsonArtifact(
    evidenceFiles.constitutionClaims,
    constitutionArtifacts.claims,
  );
  writeJsonArtifact(
    evidenceFiles.constitutionSummary,
    constitutionArtifacts.constitutionSummary,
  );
  writeJsonArtifact(
    evidenceFiles.governanceSelectiveExecution,
    selectiveExecution.report,
  );
  const governanceSessionProvenance = materializeGovernanceSessionProvenance({
    executionScope: "verify-foundation",
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
      executionScope: "verify-foundation",
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
          statSync(evidenceFiles.constitutionClaims).mtimeMs,
          statSync(evidenceFiles.constitutionSummary).mtimeMs,
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
        existsSync(evidenceFiles.governanceClaimsView) &&
        existsSync(evidenceFiles.governanceSummaryView) &&
        existsSync(evidenceFiles.governanceHealthView) &&
        existsSync(evidenceFiles.governanceDashboardView) &&
        existsSync(evidenceFiles.governanceReadModelMetrics)
          ? {
              claimsView: readJsonArtifact(evidenceFiles.governanceClaimsView),
              summaryView: readJsonArtifact(evidenceFiles.governanceSummaryView),
              healthView: readJsonArtifact(evidenceFiles.governanceHealthView),
              dashboardView: readJsonArtifact(
                evidenceFiles.governanceDashboardView,
              ),
              metrics: readJsonArtifact(evidenceFiles.governanceReadModelMetrics),
            }
          : null,
    },
  );
  const trustFrameworkCatalog = materializeTrustFrameworkCatalog();
  const trustFrameworkVerification =
    materializeTrustFrameworkVerificationReport(trustFrameworkCatalog);
  const trustSignatureProviderRegistry =
    materializeTrustSignatureProviderRegistry(trustFrameworkCatalog);
  const trustSignatureProviderVerification =
    materializeTrustSignatureProviderVerificationReport({
      catalog: trustFrameworkCatalog,
      registry: trustSignatureProviderRegistry,
    });
  const gateCAcceptanceClosedLoop = loadGateCAcceptanceClosedLoopArtifacts();
  const knowledgeProjection = materializeKnowledgeProjectionArtifacts({
    generatedAtUtc: sessionStartedAtUtc,
    learningEvents: materializeLearningRecordedEvents({
      ledgerEntries: gateCAcceptanceClosedLoop.ledgerEntries,
      outcomeRecords: gateCAcceptanceClosedLoop.outcomeRecords,
      learningRecords: gateCAcceptanceClosedLoop.learningRecords,
    }),
  });
  const foundationProducerRegistryExecutions =
    await executeFoundationProducerRegistry({
      specification: {
        reportRef:
          "workspace/foundation/evidence/verification/specification-conformance-report.json",
        projectionRef:
          "workspace/foundation/evidence/verification/specification-conformance-projection.json",
      },
      decision: {
        ledgerEntries: gateCAcceptanceClosedLoop.ledgerEntries,
        outcomeRecords: gateCAcceptanceClosedLoop.outcomeRecords,
        learningRecords: gateCAcceptanceClosedLoop.learningRecords,
        impactGraphs: gateCAcceptanceClosedLoop.impactGraphs,
        knowledgeRegistryEntries: knowledgeProjection.registry.entries,
        reportRef:
          "workspace/foundation/evidence/verification/decision-quality-report.json",
      },
      learning: {
        ledgerEntries: gateCAcceptanceClosedLoop.ledgerEntries,
        outcomeRecords: gateCAcceptanceClosedLoop.outcomeRecords,
        learningRecords: gateCAcceptanceClosedLoop.learningRecords,
        impactGraphs: gateCAcceptanceClosedLoop.impactGraphs,
        reportRef:
          "workspace/foundation/evidence/verification/learning-intelligence-report.json",
        learningRegistryRef:
          "workspace/foundation/evidence/verification/learning-registry.json",
        knowledgeRegistryRef:
          "workspace/foundation/evidence/verification/knowledge-registry.json",
      },
      evidenceConvergence: {
        reportRef:
          "workspace/foundation/evidence/verification/evidence-producer-convergence-report.json",
      },
      capability: {
      registry: registryReport,
      dependencyConstitution: capabilityDependencyConstitution,
      contractVersionRegistry,
      executionEvidence: executionEvidence as {
        readonly capabilities: readonly {
          readonly capability_id: string;
          readonly runtime_products?: readonly string[];
          readonly execution_reachability?: {
            readonly status?:
              | "DECLARED"
              | "OBSERVED"
              | "VERIFIED"
              | "REPRODUCIBLE";
          };
          readonly runtime_invocations?: {
            readonly total?: number;
          };
          readonly per_product?: readonly {
            readonly runtime_invocation_count?: number;
            readonly runtime_verified?: boolean;
            readonly runtime_reproducible?: boolean;
          }[];
        }[];
      },
      governanceReadModelMetrics: governanceReadModels.artifacts.metrics,
      metricsRef:
        "workspace/foundation/evidence/verification/capability-operational-metrics.json",
      certificationRef:
        "workspace/foundation/evidence/verification/capability-certification.json",
      },
    });
  const {
    specification: specificationProducerExecution,
    decision: decisionProducerExecution,
    learning: learningProducerExecution,
    evidenceConvergence: evidenceConvergenceProducerExecution,
    capability: capabilityProducerExecution,
  } = foundationProducerRegistryExecutions;
  writeJsonArtifact(
    evidenceFiles.governanceClaimsView,
    governanceReadModels.artifacts.claimsView,
  );
  writeJsonArtifact(
    evidenceFiles.governanceSummaryView,
    governanceReadModels.artifacts.summaryView,
  );
  writeJsonArtifact(
    evidenceFiles.governanceHealthView,
    governanceReadModels.artifacts.healthView,
  );
  writeJsonArtifact(
    evidenceFiles.governanceDashboardView,
    governanceReadModels.artifacts.dashboardView,
  );
  writeJsonArtifact(
    evidenceFiles.governanceReadModelMetrics,
    governanceReadModels.artifacts.metrics,
  );
  writeJsonArtifact(
    evidenceFiles.governanceReadModelSelectiveExecution,
    governanceReadModels.report,
  );
  writeJsonArtifact(evidenceFiles.trustFramework, trustFrameworkCatalog);
  writeJsonArtifact(
    evidenceFiles.trustFrameworkVerification,
    trustFrameworkVerification,
  );
  writeJsonArtifact(
    evidenceFiles.attestationLifecycleVerification,
    attestationLifecycleVerification,
  );
  writeJsonArtifact(
    evidenceFiles.attestationLifecycleMaterialization,
    attestationLifecycleMaterialization,
  );
  writeJsonArtifact(
    evidenceFiles.trustSignatureProviderRegistry,
    trustSignatureProviderRegistry,
  );
  writeJsonArtifact(
    evidenceFiles.trustSignatureProviderVerification,
    trustSignatureProviderVerification,
  );
  writeJsonArtifact(
    evidenceFiles.trustSignatureMaterialization,
    trustSignatureMaterialization,
  );
  const governanceSession = materializeGovernanceSession({
    provenance: governanceSessionProvenance,
    governanceReadModels: governanceReadModels.artifacts,
  });
  const governanceSessionVerification =
    materializeGovernanceSessionVerificationReport(governanceSession);
  const capabilityGovernance = materializeCapabilityGovernanceProjection({
    registry: registryReport,
    contractVersionRegistry,
    artifactRootRef: "workspace/foundation/evidence/verification/capability-governance",
  });
  const architectureFitness = materializeArchitectureFitnessReport({
    dependencyConstitution: capabilityDependencyConstitution,
    contractVersionRegistry,
    capabilityGovernanceVerification: capabilityGovernance.verification,
    apiPlatform: apiPlatformCapability
      ? {
          declared_dependencies: apiPlatformCapability.declared_dependencies,
          required_contract_names:
            apiPlatformCapability.required_contract_ranges.map(
              (contract) => contract.name,
            ),
        }
      : null,
    governanceSession,
    governanceSessionVerification,
    governanceReadModels: governanceReadModels.artifacts,
    lawResults: constitutionArtifacts.lawResults,
    evidencePackages: constitutionArtifacts.evidencePackages,
    lawCertificates: constitutionArtifacts.lawCertificates,
    claims: constitutionArtifacts.claims,
    constitutionSummary: constitutionArtifacts.constitutionSummary,
    proofBundle: constitutionArtifacts.proofBundle,
  });
  const capabilityGraph = materializeCapabilityGraphProjection({
    capabilityGovernance,
    dependencyConstitutionSummary: capabilityDependencyConstitution.summary,
  });
  const governanceIncrementalMaterialization =
    materializeGovernanceIncrementalMaterializationReport({
      executionScope: "verify-foundation",
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
      previousReport: existsSync(evidenceFiles.governanceIncrementalMaterialization)
        ? readJsonArtifact(evidenceFiles.governanceIncrementalMaterialization)
        : null,
      selectiveExecutionStatus: "APPLIED",
    });
  const governanceIncrementalMaterializationVerification =
    materializeGovernanceIncrementalMaterializationVerificationReport(
      governanceIncrementalMaterialization,
    );
  const verificationRun = materializeVerificationRun({
    governanceSession,
    governanceSessionVerification,
    contractVersionEvolution,
    capabilityGovernanceIndex: capabilityGovernance.index,
    capabilityGovernanceVerification: capabilityGovernance.verification,
    architectureFitness,
    governanceIncrementalMaterializationVerification,
    trustFrameworkVerification,
    attestationLifecycleVerification,
    trustSignatureProviderVerification,
    trustSignatureMaterialization,
    lawResults: constitutionArtifacts.lawResults,
    evidencePackages: constitutionArtifacts.evidencePackages,
    lawCertificates: constitutionArtifacts.lawCertificates,
    lawAttestations: constitutionArtifacts.lawAttestations,
    claims: constitutionArtifacts.claims,
    constitutionSummary: constitutionArtifacts.constitutionSummary,
    proofBundle: constitutionArtifacts.proofBundle,
  });
  const verificationRunVerification =
    materializeVerificationRunVerificationReport(verificationRun);
  const enterpriseControlGraph = materializeEnterpriseControlGraph({
    capabilityGovernance,
    capabilityGraph: capabilityGraph.graph,
    lawResults: constitutionArtifacts.lawResults,
    evidencePackages: constitutionArtifacts.evidencePackages,
    lawCertificates: constitutionArtifacts.lawCertificates,
    lawAttestations: constitutionArtifacts.lawAttestations,
    governanceReadModels: governanceReadModels.artifacts,
    governanceSession,
    verificationRun,
  });
  const governanceCatalog = materializeGovernanceCatalog({
    certificates: constitutionArtifacts.certificates,
    lawResults: constitutionArtifacts.lawResults,
    evidencePackages: constitutionArtifacts.evidencePackages,
    lawCertificates: constitutionArtifacts.lawCertificates,
    lawProofs: constitutionArtifacts.certificates.law_proofs,
    claims: constitutionArtifacts.claims,
    constitutionSummary: constitutionArtifacts.constitutionSummary,
    proofBundle: constitutionArtifacts.proofBundle,
    trustFrameworkCatalog,
    governanceReadModels: governanceReadModels.artifacts,
    governanceSession,
    governanceSessionVerification,
    verificationRun,
    verificationRunVerification,
  });
  const governanceCatalogVerification =
    materializeGovernanceCatalogVerificationReport(governanceCatalog);
  writeJsonArtifact(
    evidenceFiles.governanceIncrementalMaterialization,
    governanceIncrementalMaterialization,
  );
  writeJsonArtifact(
    evidenceFiles.governanceIncrementalMaterializationVerification,
    governanceIncrementalMaterializationVerification,
  );
  writeJsonArtifact(
    evidenceFiles.governanceSession,
    governanceSession,
  );
  writeJsonArtifact(
    evidenceFiles.governanceSessionVerification,
    governanceSessionVerification,
  );
  writeJsonArtifact(evidenceFiles.verificationRun, verificationRun);
  writeJsonArtifact(
    evidenceFiles.verificationRunVerification,
    verificationRunVerification,
  );
  writeJsonArtifact(evidenceFiles.governanceCatalog, governanceCatalog);
  writeJsonArtifact(
    evidenceFiles.governanceCatalogVerification,
    governanceCatalogVerification,
  );
  writeJsonArtifact(evidenceFiles.architectureFitness, architectureFitness);
  writeJsonArtifact(
    evidenceFiles.capabilityGovernanceIndex,
    capabilityGovernance.index,
  );
  writeJsonArtifact(
    evidenceFiles.capabilityGovernanceVerification,
    capabilityGovernance.verification,
  );
  writeJsonArtifact(evidenceFiles.capabilityGraph, capabilityGraph.graph);
  writeYamlArtifact(evidenceFiles.capabilityGraphYaml, capabilityGraph.graph);
  writeJsonArtifact(
    evidenceFiles.capabilityGraphVerification,
    capabilityGraph.verification,
  );
  writeJsonArtifact(
    evidenceFiles.enterpriseControlGraph,
    enterpriseControlGraph.graph,
  );
  writeJsonArtifact(
    evidenceFiles.enterpriseControlGraphVerification,
    enterpriseControlGraph.verification,
  );
  for (const capabilityArtifacts of capabilityGovernance.capabilities) {
    writeYamlArtifact(
      `${evidenceFiles.capabilityGovernanceDir}/${capabilityArtifacts.directory_name}/capability-manifest.yaml`,
      capabilityArtifacts.manifest,
    );
    writeJsonArtifact(
      `${evidenceFiles.capabilityGovernanceDir}/${capabilityArtifacts.directory_name}/capability-manifest.json`,
      capabilityArtifacts.manifest,
    );
    writeJsonArtifact(
      `${evidenceFiles.capabilityGovernanceDir}/${capabilityArtifacts.directory_name}/capability-dependencies.json`,
      capabilityArtifacts.dependencies,
    );
    writeJsonArtifact(
      `${evidenceFiles.capabilityGovernanceDir}/${capabilityArtifacts.directory_name}/capability-version.json`,
      capabilityArtifacts.version,
    );
    writeJsonArtifact(
      `${evidenceFiles.capabilityGovernanceDir}/${capabilityArtifacts.directory_name}/capability-contracts.json`,
      capabilityArtifacts.contracts,
    );
  }
  writeJsonArtifact(
    evidenceFiles.capabilityCertification,
    capabilityProducerExecution.materialized.certification,
  );
  writeJsonArtifact(
    evidenceFiles.capabilityOperationalMetrics,
    capabilityProducerExecution.materialized.operationalMetrics,
  );
  writeJsonArtifact(
    evidenceFiles.constitutionProofBundle,
    constitutionArtifacts.proofBundle,
  );
  const foundationProducerExecutions =
    await executeFoundationReportProducerRegistry(
      buildFoundationReportProducerContext({
        producerExecutions: foundationProducerRegistryExecutions,
        foundationMetrics: {
          verified_products: Number(foundationMetrics.verified_products ?? 0),
          declared_products: Number(foundationMetrics.declared_products ?? 0),
        },
        gateCStatus: {
          status: existsSync(
            resolve(
              EOS_ROOT,
              "workspace/foundation/evidence/verification/gate-c-status-evidence.json",
            ),
          )
            ? "PASS"
            : "UNVERIFIED",
          evidence_ref:
            "workspace/foundation/evidence/verification/gate-c-status-evidence.json",
          projection_ref:
            "workspace/foundation/evidence/verification/gate-c-status-projection.json",
        },
      }),
    );
  const foundationReport = materializeFoundationReport({
    foundationMetrics,
    graphHealth,
    executionEvidence: executionEvidence as {
      readonly summary: Record<string, unknown>;
    },
    executionPlan,
    executionChain,
    topologyDrift,
    architectureTrend,
    governanceSummary: constitutionArtifacts.constitutionSummary,
    governanceReadModelMetrics: {
      freshness_ms: governanceReadModels.artifacts.metrics.freshness_ms,
      generation_duration_ms:
        governanceReadModels.artifacts.metrics.generation_duration_ms,
      consumer_count: governanceReadModels.artifacts.metrics.consumer_count,
      generation_digest:
        governanceReadModels.artifacts.metrics.generation_digest,
      source_digest: governanceReadModels.artifacts.metrics.source_digest,
    },
    governanceIncrementalMaterialization:
      governanceIncrementalMaterialization.summary,
    governanceSelectiveExecution: selectiveExecution.report.summary,
    governanceReadModelSelectiveExecution: governanceReadModels.report.summary,
    capabilityOperationalMetrics:
      capabilityProducerExecution.projection.capability_operational_metrics,
    capabilityCertification:
      capabilityProducerExecution.projection.capability_certification,
    specificationSystem: specificationProducerExecution.projection,
    decisionQuality: decisionProducerExecution.projection,
      learningIntelligence: learningProducerExecution.projection,
    evidenceConvergence: evidenceConvergenceProducerExecution.projection,
    producers: foundationProducerExecutions.map((execution) => execution.projection),
    executionGraphProof: materializeConstitutionExecutionGraphProof({
      certificates: constitutionArtifacts.certificates,
      executionGraph,
    }),
    graphFitness,
    sharedCapabilityInventory: uniqueStrings(
      (productPortfolio.products ?? []).flatMap(
        (product) => product.shared_capabilities ?? [],
      ),
    ),
    products: productEvidence,
    governancePortfolioLoaded: Boolean(governancePortfolio),
  });
  persistFoundationReportArtifacts({
    payload: foundationReport,
    reportPath: evidenceFiles.foundation,
    projectionJsonPath: evidenceFiles.foundationProjection,
    evidencePath: evidenceFiles.foundationEvidence,
    subjectRef: "workspace/foundation/evidence/verification/foundation-report.json",
  });
  writeJsonArtifact(evidenceFiles.evolution, evolutionDelta);
  writeJsonArtifact(evidenceFiles.fitness, fitnessReport);
  writeJsonArtifact(evidenceFiles.guardrails, guardrailReport);
  writeJsonArtifact(evidenceFiles.granularClr, granularClrMatrix);
  writeJsonArtifact(evidenceFiles.artifactGraph, artifactGraph);
  writeJsonArtifact(evidenceFiles.graphHealth, graphHealth);
  writeJsonArtifact(evidenceFiles.specAudit, specAudit);
  writeJsonArtifact(
    evidenceFiles.decisionQuality,
    decisionProducerExecution.materialized.report,
  );
  writeJsonArtifact(
    evidenceFiles.learningIntelligence,
    learningProducerExecution.materialized.report,
  );
  writeJsonArtifact(
    evidenceFiles.learningRegistry,
    learningProducerExecution.materialized.learningRegistry,
  );
  writeJsonArtifact(
    evidenceFiles.knowledgeRegistry,
    knowledgeProjection.registry,
  );
  writeJsonArtifact(
    evidenceFiles.evidenceProducerConvergence,
    evidenceConvergenceProducerExecution.materialized.report,
  );
  persistSpecificationConformanceReport({
    path: evidenceFiles.specificationConformance,
    report: specificationProducerExecution.materialized.conformanceReport,
  });
  persistSpecificationConformanceProjection({
    path: evidenceFiles.specificationConformanceProjection,
    report: specificationProducerExecution.materialized.conformanceReport,
  });
  persistSpecificationConformanceEvidence({
    path: evidenceFiles.specificationConformanceEvidence,
    report: specificationProducerExecution.materialized.conformanceReport,
    projection: specificationProducerExecution.materialized.conformanceProjection,
    projectionRef:
      "workspace/foundation/evidence/verification/specification-conformance-projection.json",
  });
  persistSpecificationArtifactGraph({
    path: evidenceFiles.specificationArtifactGraph,
    graph: specificationProducerExecution.materialized.artifactGraph,
  });
  persistSpecificationVocabularyAuditReport({
    path: evidenceFiles.specificationVocabularyAudit,
    report: specificationProducerExecution.materialized.vocabularyAudit,
  });
  writeTextArtifact(
    evidenceFiles.summary,
    materializeFoundationSummaryMarkdown({
      foundationMetrics: foundationMetrics as {
        readonly foundation_status: string;
        readonly declared_products: number;
        readonly active_products: number;
        readonly implemented_products: number;
        readonly verified_products: number;
        readonly implemented_active_products: number;
        readonly verified_active_products: number;
        readonly active_portfolio_coverage_percentage: number;
        readonly implementation_coverage_percentage: number;
        readonly missing_active_product_implementation: readonly string[];
        readonly pending_active_product_verification: readonly string[];
        readonly portfolio_coverage_percentage: number;
        readonly missing_product_implementation: readonly string[];
        readonly pending_product_verification: readonly string[];
        readonly missing_product_verification: readonly string[];
      },
      graphHealth: graphHealth as {
        readonly registry_health: string;
        readonly graph_integrity_status: string;
        readonly owner_coverage_ratio: number;
        readonly reachability_ratio: number;
        readonly orphan_artifacts: readonly string[];
        readonly dead_capabilities: readonly string[];
        readonly orphan_capability_classification: readonly {
          readonly classification: string;
        }[];
      },
      specAudit: specAudit as {
        readonly summary: {
          readonly total_specs: number;
          readonly executable_ssot: number;
          readonly documentation_only: number;
        };
      },
      fitnessReport: fitnessReport as {
        readonly fitness_status: string;
      },
      executionEvidence: executionEvidence as {
        readonly summary: {
          readonly declared_capabilities: number;
          readonly observed_capabilities: number;
          readonly verified_capabilities: number;
          readonly reproducible_capabilities: number;
        };
      },
      executionChain: executionChain,
      executionPlan: executionPlan,
      topologyDrift: {
        drift_status: String(
          topologyDrift.payload.drift_status ?? "UNVERIFIED",
        ),
        aligned_products: Number(
          (topologyDrift.payload.summary as Record<string, unknown> | undefined)
            ?.aligned_products ?? 0,
        ),
        drifted_products: Number(
          (topologyDrift.payload.summary as Record<string, unknown> | undefined)
            ?.drifted_products ?? 0,
        ),
        undeclared_observed_edges: Number(
          (topologyDrift.payload.summary as Record<string, unknown> | undefined)
            ?.undeclared_observed_edges ?? 0,
        ),
        unobserved_declared_edges: Number(
          (topologyDrift.payload.summary as Record<string, unknown> | undefined)
            ?.unobserved_declared_edges ?? 0,
        ),
        unmodeled_observed_requirements: Number(
          (topologyDrift.payload.summary as Record<string, unknown> | undefined)
            ?.unmodeled_observed_requirements ?? 0,
        ),
        unmodeled_observed_workflows: Number(
          (topologyDrift.payload.summary as Record<string, unknown> | undefined)
            ?.unmodeled_observed_workflows ?? 0,
        ),
        unmodeled_observed_plans: Number(
          (topologyDrift.payload.summary as Record<string, unknown> | undefined)
            ?.unmodeled_observed_plans ?? 0,
        ),
      },
      architectureTrend: {
        trend_status: String(
          architectureTrend.payload.trend_status ?? "UNVERIFIED",
        ),
        latest_epoch: String(
          architectureTrend.payload.latest_epoch ?? "epoch-000",
        ),
        total_epochs: Number(architectureTrend.payload.total_epochs ?? 0),
      },
      graphFitness: graphFitness as {
        readonly fitness_status: string;
        readonly connectivity_ratio: number;
        readonly planner_coverage_ratio: number;
        readonly runtime_coverage_ratio: number;
        readonly verification_coverage_ratio: number;
        readonly replay_stability_ratio: number;
      },
      specificationSystem: specificationProducerExecution.projection,
      governanceReadModelMetrics: {
        freshness_ms: governanceReadModels.artifacts.metrics.freshness_ms,
        generation_duration_ms:
          governanceReadModels.artifacts.metrics.generation_duration_ms,
        consumer_count: governanceReadModels.artifacts.metrics.consumer_count,
      },
      governanceIncrementalMaterialization:
        governanceIncrementalMaterialization.summary,
      governanceSelectiveExecution: selectiveExecution.report.summary,
      governanceReadModelSelectiveExecution: governanceReadModels.report.summary,
      capabilityOperationalMetrics:
        capabilityProducerExecution.projection.capability_operational_metrics,
      capabilityCertification:
        capabilityProducerExecution.projection.capability_certification,
      evidenceFiles: Object.values(evidenceFiles).map((file) =>
        file.replace(`${EOS_ROOT}/`, ""),
      ),
    }),
  );

  const verifiedProducts = productEvidence.filter(
    (product) =>
      product.app_manifest_exists &&
      product.evidence_complete &&
      product.functional_tests_total > 0 &&
      product.functional_tests_passed === product.functional_tests_total,
  ).length;
  const activeProducts = Number(
    (foundationMetrics as { active_products?: number }).active_products ?? 0,
  );
  const verifiedActiveProducts = Number(
    (foundationMetrics as { verified_active_products?: number })
      .verified_active_products ?? 0,
  );

  process.stdout.write(
    [
      "Foundation verification complete",
      `Active products verified: ${verifiedActiveProducts}/${activeProducts}`,
      `Declared products verified: ${verifiedProducts}/${declaredProducts.length}`,
      `Evidence directory: ${FOUNDATION_EVIDENCE_DIR}`,
      `Foundation status: ${(foundationMetrics as { foundation_status: string }).foundation_status}`,
      `Fitness status: ${(fitnessReport as { fitness_status: string }).fitness_status}`,
      `Architecture trend: ${String(architectureTrend.payload.trend_status ?? "UNVERIFIED")}`,
      `Constitution status: ${constitutionArtifacts.verificationSummary.graph_purity_status}`,
      `Proof determinism: ${constitutionArtifacts.verificationSummary.proof_determinism_status}`,
      `Graph fitness: ${graphFitness.fitness_status}`,
      `Documentation-only specs: ${(specAudit as { summary: { documentation_only: number } }).summary.documentation_only}`,
    ].join("\n") + "\n",
  );

  return 0;
}
