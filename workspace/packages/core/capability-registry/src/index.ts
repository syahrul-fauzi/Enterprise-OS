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
} from "./types.js";
export type { CapabilityDescriptor } from "./types.js";
/**
 * @deprecated Renamed to DefineCapabilityBindingResult.
 * Backward compatibility type alias.
 */
export type { DefineWorkspaceResult } from "./types.js";
export {
  StaticRegistry,
  defineCapabilityBinding,
  defineWorkspace,
} from "./registry.js";
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
} from "./repository-registry.js";
