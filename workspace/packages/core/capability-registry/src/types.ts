import type { CapabilityDescriptor } from "@repo/core-kernel";
export type { CapabilityDescriptor };
export type {
  ArtifactRegistryEntry,
  ArtifactRegistryReport,
  ArtifactEdge,
  ArtifactGraphHealthReport,
  ArtifactGraphReport,
  ArtifactNode,
  CapabilityDependencyConstitutionFinding,
  CapabilityDependencyConstitutionLawId,
  CapabilityDependencyConstitutionLawResult,
  CapabilityDependencyConstitutionReport,
  CapabilityDependencyPolicy,
  CapabilityCertificationDimension,
  CapabilityCertificationDimensionStatus,
  CapabilityCertificationEntry,
  CapabilityCertificationReport,
  CapabilityPerformanceCertificationInput,
  ContractVersionRegistryCompatibleProvider,
  ContractVersionRegistryConsumer,
  ContractVersionRegistryEntry,
  ContractVersionRangePolicyStatus,
  ContractVersionRegistryProvider,
  ContractVersionRegistryReport,
  ExecutionGraphEdge,
  ExecutionGraphFitnessReport,
  ExecutionGraphNode,
  ExecutionGraphReport,
  CapabilityDiscoveryCandidate,
  CapabilityDiscoveryReport,
  CapabilityContractRequirement,
  CapabilityContractVersion,
  CapabilityManifestStability,
  CapabilityPlanningReport,
  CapabilityRegistryEntry,
  CapabilityRegistryReport,
  DuplicateCandidate,
  GovernanceStatus,
  LifecycleStage,
  ProductPortfolio,
  RepositoryRegistryOptions,
} from "./repository-registry.js";

export interface CapabilityRegistry {
  readonly kind: string;
  resolve(id: string): CapabilityDescriptor | undefined;
  list(): CapabilityDescriptor[];
  validate():
    { ok: true } | { ok: false; errors: Array<{ id?: string; error: Error }> };
}

export interface StaticRegistryConfig {
  entries: Record<string, CapabilityDescriptor>;
}

export interface DefineCapabilityBindingResult<
  T extends { id: string; capabilities: readonly string[] },
> {
  readonly definition: T;
  validate: () => { ok: true } | { ok: false; error: Error };
}

/**
 * @deprecated Renamed to DefineCapabilityBindingResult.
 * "Workspace" = presentation-level vocabulary yang tidak seharusnya berada
 * di foundation registry type names. Backward compatibility alias.
 */
export type DefineWorkspaceResult<
  T extends { id: string; capabilities: readonly string[] },
> = DefineCapabilityBindingResult<T>;
