import { join, relative } from "node:path";

import type { GateCAcceptanceGovernanceEvidenceRefs } from "../evaluators/acceptance-governance.js";
import {
  buildGovernancePlatformSnapshotRuntime,
  type GateCGovernancePlatformSnapshot,
  type GateCGovernanceSnapshotPaths,
} from "../../read-models/status-snapshot.js";
import type { ArtifactReader } from "./artifact-reader.js";
import { EOS_ROOT } from "../../../state.js";

export type GateCArtifactReaderContext = Readonly<{
  gateExecutionDir: string;
  foundationVerificationDir: string;
}>;

export type GateCGovernancePlatformReadModel = Readonly<{
  snapshot: GateCGovernancePlatformSnapshot;
  refs: GateCAcceptanceGovernanceEvidenceRefs;
}>;

export function resolveGateCGovernanceSnapshotPaths(
  context: GateCArtifactReaderContext,
): GateCGovernanceSnapshotPaths {
  return {
    constitutionSummaryPath: join(
      context.foundationVerificationDir,
      "constitution-summary.json",
    ),
    capabilityDependencyConstitutionPath: join(
      context.foundationVerificationDir,
      "capability-dependency-constitution.json",
    ),
    contractVersionRegistryPath: join(
      context.foundationVerificationDir,
      "contract-version-registry.json",
    ),
    contractVersionEvolutionPath: join(
      context.foundationVerificationDir,
      "contract-version-evolution.json",
    ),
    governanceSessionPath: join(
      context.foundationVerificationDir,
      "governance-session.json",
    ),
    governanceSessionVerificationPath: join(
      context.foundationVerificationDir,
      "governance-session-verification.json",
    ),
    verificationRunPath: join(
      context.foundationVerificationDir,
      "verification-run.json",
    ),
    verificationRunVerificationPath: join(
      context.foundationVerificationDir,
      "verification-run-verification.json",
    ),
    governanceCatalogPath: join(
      context.foundationVerificationDir,
      "governance-catalog.json",
    ),
    governanceCatalogVerificationPath: join(
      context.foundationVerificationDir,
      "governance-catalog-verification.json",
    ),
    architectureFitnessPath: join(
      context.foundationVerificationDir,
      "architecture-fitness.json",
    ),
    capabilityGovernanceIndexPath: join(
      context.foundationVerificationDir,
      "capability-governance-index.json",
    ),
    capabilityGovernanceVerificationPath: join(
      context.foundationVerificationDir,
      "capability-governance-verification.json",
    ),
    capabilityGraphPath: join(
      context.foundationVerificationDir,
      "capability-graph.json",
    ),
    capabilityGraphVerificationPath: join(
      context.foundationVerificationDir,
      "capability-graph-verification.json",
    ),
    enterpriseControlGraphPath: join(
      context.foundationVerificationDir,
      "enterprise-control-graph.json",
    ),
    enterpriseControlGraphVerificationPath: join(
      context.foundationVerificationDir,
      "enterprise-control-graph-verification.json",
    ),
    governanceIncrementalMaterializationPath: join(
      context.foundationVerificationDir,
      "governance-incremental-materialization.json",
    ),
    governanceIncrementalMaterializationVerificationPath: join(
      context.foundationVerificationDir,
      "governance-incremental-materialization-verification.json",
    ),
    governanceReadModelSelectiveExecutionPath: join(
      context.foundationVerificationDir,
      "governance-read-model-selective-execution.json",
    ),
    trustFrameworkPath: join(
      context.foundationVerificationDir,
      "trust-framework.json",
    ),
    trustFrameworkVerificationPath: join(
      context.foundationVerificationDir,
      "trust-framework-verification.json",
    ),
    attestationLifecycleVerificationPath: join(
      context.foundationVerificationDir,
      "attestation-lifecycle-verification.json",
    ),
    attestationLifecycleMaterializationPath: join(
      context.foundationVerificationDir,
      "attestation-lifecycle-materialization.json",
    ),
    trustSignatureProviderRegistryPath: join(
      context.foundationVerificationDir,
      "trust-signature-provider-registry.json",
    ),
    trustSignatureProviderVerificationPath: join(
      context.foundationVerificationDir,
      "trust-signature-provider-verification.json",
    ),
    trustSignatureMaterializationPath: join(
      context.foundationVerificationDir,
      "trust-signature-materialization.json",
    ),
    specificationConformancePath: join(
      context.foundationVerificationDir,
      "specification-conformance-report.json",
    ),
    specificationArtifactGraphPath: join(
      context.foundationVerificationDir,
      "specification-artifact-graph.json",
    ),
    specificationVocabularyAuditPath: join(
      context.foundationVerificationDir,
      "specification-vocabulary-audit.json",
    ),
    decisionQualityReportPath: join(
      context.foundationVerificationDir,
      "decision-quality-report.json",
    ),
    learningIntelligenceReportPath: join(
      context.foundationVerificationDir,
      "learning-intelligence-report.json",
    ),
    evidenceProducerConvergenceReportPath: join(
      context.foundationVerificationDir,
      "canonical-evidence-producer-report.json",
    ),
  };
}

export const GATE_C_GOVERNANCE_PLATFORM_READER: ArtifactReader<
  GateCArtifactReaderContext,
  GateCGovernancePlatformSnapshot
> = {
  id: "governance-platform-reader",
  read(context) {
    return buildGovernancePlatformSnapshotRuntime({
      paths: resolveGateCGovernanceSnapshotPaths(context),
    });
  },
};

export function readGateCGovernancePlatformSnapshot(
  context: GateCArtifactReaderContext,
): GateCGovernancePlatformSnapshot {
  return GATE_C_GOVERNANCE_PLATFORM_READER.read(context);
}

export const GATE_C_GOVERNANCE_PLATFORM_READ_MODEL_READER: ArtifactReader<
  GateCArtifactReaderContext,
  GateCGovernancePlatformReadModel
> = {
  id: "governance-platform-read-model-reader",
  read(context) {
    return {
      snapshot: readGateCGovernancePlatformSnapshot(context),
      refs: resolveGateCAcceptanceGovernanceEvidenceRefs(context),
    };
  },
};

export function readGateCGovernancePlatformReadModel(
  context: GateCArtifactReaderContext,
): GateCGovernancePlatformReadModel {
  return GATE_C_GOVERNANCE_PLATFORM_READ_MODEL_READER.read(context);
}

export function resolveGateCAcceptanceGovernanceEvidenceRefs(
  context: GateCArtifactReaderContext,
): GateCAcceptanceGovernanceEvidenceRefs {
  const paths = resolveGateCGovernanceSnapshotPaths(context);
  return {
    constitution: toRepoRelative(paths.constitutionSummaryPath),
    dependencyGraph: toRepoRelative(paths.capabilityDependencyConstitutionPath),
    contractGovernance: toRepoRelative(paths.contractVersionRegistryPath),
    contractGovernanceEvolution: toRepoRelative(
      paths.contractVersionEvolutionPath,
    ),
    provenance: toRepoRelative(paths.governanceSessionPath),
    provenanceVerification: toRepoRelative(
      paths.governanceSessionVerificationPath,
    ),
    verificationRun: toRepoRelative(paths.verificationRunPath),
    verificationRunVerification: toRepoRelative(
      paths.verificationRunVerificationPath,
    ),
    governanceCatalog: toRepoRelative(paths.governanceCatalogPath),
    governanceCatalogVerification: toRepoRelative(
      paths.governanceCatalogVerificationPath,
    ),
    capabilityGovernance: toRepoRelative(paths.capabilityGovernanceIndexPath),
    capabilityGovernanceVerification: toRepoRelative(
      paths.capabilityGovernanceVerificationPath,
    ),
    architectureFitness: toRepoRelative(paths.architectureFitnessPath),
    incrementalMaterialization: toRepoRelative(
      paths.governanceIncrementalMaterializationPath,
    ),
    incrementalMaterializationVerification: toRepoRelative(
      paths.governanceIncrementalMaterializationVerificationPath,
    ),
    trustFramework: toRepoRelative(paths.trustFrameworkPath),
    attestationLifecycleVerification: toRepoRelative(
      paths.attestationLifecycleVerificationPath,
    ),
    attestationLifecycleMaterialization: toRepoRelative(
      paths.attestationLifecycleMaterializationPath,
    ),
  };
}

function toRepoRelative(path: string): string {
  return relative(EOS_ROOT, path).replaceAll("\\", "/");
}
