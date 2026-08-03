export type {
  ArtifactRegistryReport,
  CapabilityCertificationDimension,
  CapabilityCertificationDimensionStatus,
  CapabilityCertificationEntry,
  CapabilityCertificationReport,
  CapabilityDependencyPolicy,
  CapabilityDiscoveryReport,
  CapabilityDependencyConstitutionFinding,
  CapabilityDependencyConstitutionLawId,
  CapabilityDependencyConstitutionLawResult,
  CapabilityDependencyConstitutionReport,
  CapabilityPerformanceCertificationInput,
  CapabilityContractRequirement,
  CapabilityContractVersion,
  CapabilityManifestStability,
  CapabilityPlanningReport,
  CapabilityRegistryReport,
  ContractVersionRegistryCompatibleProvider,
  ContractVersionRegistryConsumer,
  ContractVersionRegistryEntry,
  ContractVersionRangePolicyStatus,
  ContractVersionRegistryProvider,
  ContractVersionRegistryReport,
  ExecutionGraphNode,
  ExecutionGraphEdge,
  ExecutionGraphReport,
  ExecutionGraphFitnessReport,
  CapabilityRegistry,
  DefineCapabilityBindingResult,
  RepositoryRegistryOptions,
  StaticRegistryConfig,
} from "./types";
export type { CapabilityDescriptor } from "./types";
/**
 * @deprecated Renamed to DefineCapabilityBindingResult.
 * Backward compatibility type alias.
 */
export type { DefineWorkspaceResult } from "./types";
export {
  StaticRegistry,
  defineCapabilityBinding,
  defineWorkspace,
} from "./registry";
export {
  buildArtifactRegistryModel,
  buildArtifactGraph,
  buildArtifactGraphHealth,
  buildCapabilityCertificationReport,
  buildCapabilityDiscoveryReport,
  buildCapabilityDiscoveryReportFromArtifactRegistry,
  buildCapabilityDiscoveryReportFromExecutionGraph,
  buildCapabilityDependencyConstitutionReport,
  buildCapabilityPlanningReport,
  buildCapabilityPlanningReportFromExecutionGraph,
  buildCapabilityRegistryModel,
  buildContractVersionRegistryReport,
  buildExecutionGraphFitness,
  buildExecutionGraphModel,
} from "./repository-registry";
