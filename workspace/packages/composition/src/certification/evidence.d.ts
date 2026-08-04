import type { EvidenceId, EvidencePackage, EvidencePackageIdentity, GraphTopologyId, ClaimRelation, CertificationClaim, RelationId, CertificationSnapshotId, CertificationMatrixEnvelope, ExperimentDefinition, ExperimentDefinitionId, ExperimentExecution, ExperimentExecutionId, RawObservation, RawObservationId, ObservationSemanticEquivalenceEdge, ObservationQualityEntry, ObservationLifecycleEntry, ReplicationGroup, ClaimConsensusClassification } from "./types";
import { PROVENANCE_PROTOCOL_VERSION } from "./types";
export type Sha256Hex = string;
export declare function canonicalEvidenceBundle(pkg: EvidencePackage): string;
export declare function computeEvidenceIdSync(pkg: EvidencePackage): EvidencePackageIdentity;
export declare function computeEvidenceId(pkg: EvidencePackage): Promise<EvidencePackageIdentity>;
export declare function verifyEvidenceIdentity(identity: EvidencePackageIdentity): {
    readonly ok: boolean;
    readonly recomputedId: EvidenceId;
    readonly expected: EvidenceId;
};
export declare function canonicalTopology(claims: Readonly<Record<string, CertificationClaim>>, relations: readonly ClaimRelation[]): string;
export declare function computeGraphTopologyIdSync(claims: Readonly<Record<string, CertificationClaim>>, relations: readonly ClaimRelation[]): {
    readonly id: GraphTopologyId;
    readonly topologyLength: number;
};
export declare function computeGraphTopologyId(claims: Readonly<Record<string, CertificationClaim>>, relations: readonly ClaimRelation[]): Promise<{
    readonly id: GraphTopologyId;
    readonly topologyLength: number;
}>;
export declare function canonicalRelation(r: ClaimRelation): string;
export declare function computeRelationIdSync(r: ClaimRelation): {
    readonly id: RelationId;
    readonly canonicalLength: number;
};
export declare function computeRelationId(r: ClaimRelation): Promise<{
    readonly id: RelationId;
    readonly canonicalLength: number;
}>;
export declare function verifyRelationIdentity(r: ClaimRelation): {
    readonly ok: boolean;
    readonly recomputedId: RelationId;
    readonly expected: RelationId | null;
};
export type CertificationSnapshotHashable = Omit<CertificationMatrixEnvelope, "snapshotId" | "producedBy">;
export declare function canonicalSnapshotBundle(envelope: CertificationSnapshotHashable): string;
export declare function computeSnapshotIdSync(envelope: CertificationMatrixEnvelope): {
    readonly id: CertificationSnapshotId;
    readonly canonicalBundleLength: number;
    readonly canonicalBundle: string;
};
export declare function computeSnapshotId(envelope: CertificationMatrixEnvelope): Promise<{
    readonly id: CertificationSnapshotId;
    readonly canonicalBundleLength: number;
    readonly canonicalBundle: string;
}>;
export declare function verifySnapshotIdentity(envelope: CertificationMatrixEnvelope): {
    readonly ok: boolean;
    readonly recomputedId: CertificationSnapshotId;
    readonly expected: CertificationSnapshotId | null;
};
export declare function computeSnapshotDelta(envelopeA: CertificationMatrixEnvelope, envelopeB: CertificationMatrixEnvelope): {
    readonly idA: CertificationSnapshotId;
    readonly idB: CertificationSnapshotId;
    readonly identical: boolean;
    readonly changed: readonly ("claims" | "evidencePackages" | "claimRelations" | "statuses" | "topology" | "meta")[];
};
export declare function canonicalExperimentDefinition(def: ExperimentDefinition): string;
export interface ExperimentDefinitionIdentity {
    readonly id: ExperimentDefinitionId;
    readonly algorithm: "sha-256";
    readonly provenanceVersion: typeof PROVENANCE_PROTOCOL_VERSION;
    readonly canonicalBundleLength: number;
    readonly def: ExperimentDefinition;
}
export declare function computeExperimentDefinitionIdSync(def: ExperimentDefinition): ExperimentDefinitionIdentity;
export declare function computeExperimentDefinitionId(def: ExperimentDefinition): Promise<ExperimentDefinitionIdentity>;
export declare function verifyExperimentDefinitionIdentity(identity: ExperimentDefinitionIdentity): {
    readonly ok: boolean;
    readonly recomputedId: ExperimentDefinitionId;
    readonly expected: ExperimentDefinitionId;
};
export declare function canonicalExperimentExecution(exe: ExperimentExecution): string;
export interface ExperimentExecutionIdentity {
    readonly id: ExperimentExecutionId;
    readonly algorithm: "sha-256";
    readonly provenanceVersion: typeof PROVENANCE_PROTOCOL_VERSION;
    readonly canonicalBundleLength: number;
    readonly exe: ExperimentExecution;
}
export declare function computeExperimentExecutionIdSync(exe: ExperimentExecution): ExperimentExecutionIdentity;
export declare function computeExperimentExecutionId(exe: ExperimentExecution): Promise<ExperimentExecutionIdentity>;
export declare function verifyExperimentExecutionIdentity(identity: ExperimentExecutionIdentity): {
    readonly ok: boolean;
    readonly recomputedId: ExperimentExecutionId;
    readonly expected: ExperimentExecutionId;
};
export declare function canonicalRawObservation(obs: RawObservation): string;
export interface RawObservationIdentity {
    readonly id: RawObservationId;
    readonly algorithm: "sha-256";
    readonly provenanceVersion: typeof PROVENANCE_PROTOCOL_VERSION;
    readonly canonicalBundleLength: number;
    readonly obs: RawObservation;
}
export declare function computeRawObservationIdSync(obs: RawObservation): RawObservationIdentity;
export declare function computeRawObservationId(obs: RawObservation): Promise<RawObservationIdentity>;
export declare function verifyRawObservationIdentity(identity: RawObservationIdentity): {
    readonly ok: boolean;
    readonly recomputedId: RawObservationId;
    readonly expected: RawObservationId;
};
export interface FullProvenanceChain {
    readonly definition: ExperimentDefinitionIdentity;
    readonly execution: ExperimentExecutionIdentity;
    readonly observations: readonly RawObservationIdentity[];
}
export interface ProvenanceChainResult {
    readonly chain: FullProvenanceChain;
    readonly provenanceField: NonNullable<EvidencePackage["provenance"]>;
}
export type PerObservationSemanticResolver = (observation: {
    readonly content: string;
    readonly index0: number;
    readonly sourceChannel: string;
}, ctx: {
    readonly exitCode: number;
    readonly assertionCount: number;
}) => SemanticObservationOutcome;
export declare function defaultSemanticOutcomeResolver(obs: {
    readonly content: string;
    readonly index0: number;
    readonly sourceChannel: string;
}, ctx: {
    readonly exitCode: number;
    readonly assertionCount: number;
}): SemanticObservationOutcome;
export interface BuildProvenanceChainInput {
    readonly definition: Omit<ExperimentDefinition, "provenanceVersion" | "id">;
    readonly executionMeta: {
        readonly executedAt: string;
        readonly executorIdentity: string;
        readonly gitCommit: string;
        readonly workingTreeDirtyCount?: number;
        readonly runner: ExperimentExecution["runner"];
        readonly exitCode?: number;
        readonly assertionCount?: number;
    };
    readonly observations: ReadonlyArray<{
        readonly content: string;
        readonly observedAt: string;
        readonly sourceChannel: string;
        readonly targetAssertionId?: string;
        readonly semanticOutcome?: SemanticObservationOutcome;
    }>;
    readonly semanticResolver?: PerObservationSemanticResolver;
}
export declare function buildProvenanceChainSync(input: BuildProvenanceChainInput): ProvenanceChainResult;
export interface ProvenanceRegistryCollection {
    readonly experimentDefinitions: Readonly<Record<string, import("./types").ExperimentDefinitionRegistryEntry>>;
    readonly experimentExecutions: Readonly<Record<string, import("./types").ExperimentExecutionRegistryEntry>>;
    readonly rawObservations: Readonly<Record<string, import("./types").RawObservationRegistryEntry>>;
}
export declare function buildEmptyProvenanceRegistry(): ProvenanceRegistryCollection;
export declare function mergeProvenanceChainIntoRegistry(registry: ProvenanceRegistryCollection, chain: FullProvenanceChain): ProvenanceRegistryCollection;
export type ExtendedEvidencePackage = EvidencePackage & {
    readonly __provenanceChain?: FullProvenanceChain;
};
export declare function collectProvenanceRegistryFromEvidencePackages(evidencePackages: Readonly<Record<string, EvidencePackageIdentity>>, extendedPkgs?: Readonly<Record<string, ExtendedEvidencePackage>>): ProvenanceRegistryCollection;
import type { EvidenceObservationSemanticEdge, ExperimentDefinitionVersionLineageEdge, CertificationProvenanceGraph, EvidenceToObservationSemanticLinkKind, SemanticObservationOutcome } from "./types";
export declare function buildEmptyProvenanceGraph(): CertificationProvenanceGraph;
export type PerObservationOutcomeAssigner = (obs: RawObservation, ctx: {
    readonly evidenceId: EvidenceId;
    readonly evidencePkg: EvidencePackage;
    readonly assertionIndex: number;
}) => EvidenceToObservationSemanticLinkKind;
export declare function defaultEvidenceObservationLinkKindFromSemanticOutcome(obsSemantic: SemanticObservationOutcome): EvidenceToObservationSemanticLinkKind;
export declare function buildEvidenceObservationEdgesForPackage(evidenceId: EvidenceId, pkg: EvidencePackage, observations: readonly RawObservation[], assigner?: PerObservationOutcomeAssigner): EvidenceObservationSemanticEdge[];
export type DefinitionVersionComparatorResult = {
    readonly sameExperimentKey: boolean;
    readonly versionA: string;
    readonly versionB: string;
    readonly protocolChanged: boolean;
    readonly assertionsChanged: boolean;
    readonly objectiveChanged: boolean;
    readonly protocolAddedCount: number;
    readonly protocolRemovedCount: number;
    readonly assertionsAddedCount: number;
    readonly assertionsRemovedCount: number;
    readonly compatibility: ExperimentDefinitionVersionLineageEdge["compatibility"];
    readonly rationale: string;
};
export declare function compareExperimentDefinitions(a: ExperimentDefinition, b: ExperimentDefinition): DefinitionVersionComparatorResult;
export declare function buildVersionLineageEdge(newer: ExperimentDefinition, older: ExperimentDefinition): ExperimentDefinitionVersionLineageEdge;
export interface BuildProvenanceGraphInput {
    readonly evidencePackages: Readonly<Record<string, EvidencePackageIdentity>>;
    readonly extendedPackages?: Readonly<Record<string, ExtendedEvidencePackage>>;
    readonly registry: ProvenanceRegistryCollection;
    readonly observationLinkAssigner?: PerObservationOutcomeAssigner;
    readonly definitionPairs?: ReadonlyArray<readonly [ExperimentDefinition, ExperimentDefinition]>;
}
export declare function buildProvenanceGraph(input: BuildProvenanceGraphInput): CertificationProvenanceGraph;
export type ObservationReuseIndex = Readonly<Record<string, readonly EvidenceId[]>>;
export declare function computeObservationReuseIndex(graph: CertificationProvenanceGraph): {
    readonly reuseIndex: ObservationReuseIndex;
    readonly reusedObservationCount: number;
    readonly singletonObservationCount: number;
    readonly maxReusePerObservation: number;
};
export declare function countSemanticEvidenceEdges(graph: CertificationProvenanceGraph): {
    supports: number;
    contradicts: number;
    inconclusive: number;
    metadata: number;
};
export interface SemanticEquivalenceScaffoldOpts {
    readonly numericToleranceAbsolute?: number;
    readonly onlyPairWithinSameExperimentKey?: boolean;
    readonly maxPairsPerKind?: number;
    readonly assertedByClassifierId?: string;
}
export declare function computeNumericToleranceEquivalenceEdges(registry: ProvenanceRegistryCollection, definitions: Readonly<Record<string, {
    readonly def: ExperimentDefinition;
}>>, opts?: SemanticEquivalenceScaffoldOpts): Readonly<Record<string, ObservationSemanticEquivalenceEdge>>;
export interface QualityBaselineOpts {
    readonly classifierId?: string;
    readonly classifierVersion?: string;
    readonly sampleSizeOverride?: number;
}
export declare function computeObservationQualityBaseline(registry: ProvenanceRegistryCollection, opts?: QualityBaselineOpts): Readonly<Record<string, ObservationQualityEntry>>;
export declare function computeObservationLifecycleBaseline(registry: ProvenanceRegistryCollection, reuseIdx: {
    readonly reuseIndex: ObservationReuseIndex;
}, opts?: {
    readonly classifierId?: string;
    readonly nowIso?: string;
}): Readonly<Record<string, ObservationLifecycleEntry>>;
export declare function buildReplicationGroupsScaffold(registry: ProvenanceRegistryCollection, opts?: {
    readonly classifierId?: string;
}): Readonly<Record<string, ReplicationGroup>>;
export interface ClaimConsensusOpts {
    readonly classifierVersion?: string;
    readonly minimumTotalWeight?: number;
}
export declare function computeClaimConsensusBaseline(envelope: {
    readonly claims: Readonly<Record<string, CertificationClaim>>;
    readonly evidencePackages: Readonly<Record<string, EvidencePackageIdentity>>;
}, graph: CertificationProvenanceGraph, qualityIndex: Readonly<Record<string, ObservationQualityEntry>> | undefined, opts?: ClaimConsensusOpts): Readonly<Record<string, ClaimConsensusClassification>>;
export declare function enrichGraphWithAlpha10FrontiersScaffold(input: {
    readonly envelope: {
        readonly provenanceRegistry: ProvenanceRegistryCollection;
        readonly claims: Readonly<Record<string, CertificationClaim>>;
        readonly evidencePackages: Readonly<Record<string, EvidencePackageIdentity>>;
    };
    readonly baseGraph: CertificationProvenanceGraph;
}): CertificationProvenanceGraph;
export declare function canonicalObservationContentFingerprint(obs: RawObservation): string;
export declare function computeObservationContentFingerprintSync(obs: RawObservation): string;
export declare function computeObservationContentFingerprint(obs: RawObservation): Promise<string>;
export type ObservationContentFingerprint = string & {
    readonly __contentFp: unique symbol;
};
export interface EmpiricalReplicationPerDefinition {
    readonly experimentDefinitionId: ExperimentDefinitionId;
    readonly experimentDefinitionVersion: string;
    readonly experimentKey: string;
    readonly totalExecutions: number;
    readonly successfulExecutions: number;
    readonly distinctExecutorIdentities: number;
    readonly totalUniqueContentFps: number;
    readonly replicatedContentFpsCount: number;
    readonly singletonContentFpsCount: number;
    readonly observationConvergenceRatio01: number;
    readonly replicationStatus: ReplicationGroup["replicationStatus"];
    readonly executionIds: readonly ExperimentExecutionId[];
    readonly executorIdentities: readonly string[];
    readonly perExecutionObsCounts: Readonly<Record<string, number>>;
    readonly fpOccurrenceCountsByExecutor: Readonly<Record<string, readonly string[]>>;
}
export interface MultiExecutorEmpiricalMetrics {
    readonly registryCount: number;
    readonly totalDefinitionsWithExecutions: number;
    readonly definitionsWithMultiExecutor: number;
    readonly definitionsReplicatedStrong: number;
    readonly definitionsReplicatedWeak: number;
    readonly definitionsReplicationFailed: number;
    readonly definitionsNotReplicated: number;
    readonly totalUniqueObservationFps: number;
    readonly replicatedObservationFps: number;
    readonly reproducibilityRate01: number;
    readonly observationStability01: number;
    readonly disagreementRate01: number;
    readonly executionVariance01: number;
    readonly crossExecutorPairCount: number;
    readonly assembledAt: string;
}
export declare function buildEmpiricalReplicationGroupsFromMultipleRegistries(registries: readonly ProvenanceRegistryCollection[], opts?: {
    readonly classifierId?: string;
}): {
    readonly replicationGroups: Readonly<Record<string, ReplicationGroup>>;
    readonly perDefinitionEmpirical: Readonly<Record<string, EmpiricalReplicationPerDefinition>>;
    readonly metrics: MultiExecutorEmpiricalMetrics;
};
export declare function enrichGraphWithAlpha11EmpiricalReplication(baseGraph: CertificationProvenanceGraph, multiRegistryResult: ReturnType<typeof buildEmpiricalReplicationGroupsFromMultipleRegistries>): CertificationProvenanceGraph;
//# sourceMappingURL=evidence.d.ts.map