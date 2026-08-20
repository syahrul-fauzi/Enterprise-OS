export interface CapabilityContracts {
  readonly entities?: readonly unknown[];
  readonly valueObjects?: readonly unknown[];
  readonly domainEvents?: readonly unknown[];
  readonly dtos?: readonly unknown[];
}

export interface CapabilityCommand<TInput = unknown, TOutput = unknown> {
  readonly kind: "command";
  readonly name: string;
  readonly version?: string;
  readonly input?: TInput;
  readonly output?: TOutput;
  execute(input: TInput): Promise<TOutput> | TOutput;
}

export interface CapabilityQuery<TInput = unknown, TOutput = unknown> {
  readonly kind: "query";
  readonly name: string;
  readonly version?: string;
  readonly input?: TInput;
  readonly output?: TOutput;
  execute(input: TInput): Promise<TOutput> | TOutput;
}

export interface CapabilityRepository<TEntity = unknown, TId = string> {
  readonly kind: "repository";
  readonly entityName: string;
  byId(id: TId): Promise<TEntity | undefined> | TEntity | undefined;
  list(): Promise<readonly TEntity[]> | readonly TEntity[];
  save(entity: TEntity): Promise<TEntity> | TEntity;
  remove(id: TId): Promise<boolean> | boolean;
}

export interface CapabilityImplementation {
  readonly commands?: Readonly<Record<string, CapabilityCommand>>;
  readonly queries?: Readonly<Record<string, CapabilityCommand>>;
  readonly repositories?: Readonly<Record<string, CapabilityRepository>>;
  readonly services?: Readonly<Record<string, unknown>>;
  readonly entry?: unknown;
}

export interface CapabilityDescriptor {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly contracts?: CapabilityContracts;
  readonly presentation?: unknown;
  /**
   * @deprecated Renamed to `presentation`. Field ini disimpan untuk backward
   */
  ui?: unknown;
}

// Export all additional types required by index.ts
export interface ArtifactRegistryReport {}
export interface CapabilityCertificationDimension {}
export type CapabilityCertificationDimensionStatus = string;
export interface CapabilityCertificationEntry {}
export interface CapabilityCertificationReport {}
export interface CapabilityDependencyPolicy {}
export interface CapabilityDiscoveryReport {}
export interface CapabilityDependencyConstitutionFinding {}
export type CapabilityDependencyConstitutionLawId = string;
export interface CapabilityDependencyConstitutionLawResult {}
export interface CapabilityDependencyConstitutionReport {}
export interface CapabilityPerformanceCertificationInput {}
export interface CapabilityContractRequirement {}
export interface CapabilityContractVersion {}
export type CapabilityManifestStability = string;
export interface CapabilityPlanningReport {}
export interface CapabilityRegistryReport {}
export interface ContractVersionRegistryCompatibleProvider {}
export interface ContractVersionRegistryConsumer {}
export interface ContractVersionRegistryEntry {}
export type ContractVersionRangePolicyStatus = string;
export interface ContractVersionRegistryProvider {}
export interface ContractVersionRegistryReport {}
export interface ExecutionGraphNode {
  readonly artifact_type: string;
  readonly id: string;
  readonly governance_status?: string;
  readonly execution_status?: string;
}
export interface ExecutionGraphEdge {}
export interface ExecutionGraphReport {
  readonly nodes: readonly ExecutionGraphNode[];
}
export interface ExecutionGraphFitnessReport {}
export interface CapabilityRegistry {}
export interface DefineCapabilityBindingResult<T = unknown> {
  readonly definition: T;
  validate(): { ok: true } | { ok: false; error: Error };
}
export interface RepositoryRegistryOptions {}
export interface StaticRegistryConfig {
  readonly entries: Record<string, CapabilityDescriptor>;
}
export interface DefineWorkspaceResult {}

export type { CapabilityAggregateBindingManifest } from "./schemas";
export { CapabilityAggregateBindingSchema } from "./schemas";