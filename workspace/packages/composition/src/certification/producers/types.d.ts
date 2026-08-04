import type { EvidencePackage, EvidenceDerivationKind, ExperimentDefinition } from "../types";
import { type ProvenanceChainResult } from "../evidence";
export interface ProducerContext {
    readonly repoRoot: string;
    readonly generatedAt: string;
    readonly commonSources: readonly string[];
    readonly runner: Readonly<{
        readonly os?: string;
        readonly arch?: string;
        readonly runtime?: string;
        readonly runtimeVersion?: string;
    }>;
    readonly gitCommit?: string;
    readonly workingTreeDirtyCount?: number;
    readonly executorIdentity?: string;
}
export interface IndependentEvidenceProducer {
    readonly producerId: string;
    readonly producerName: string;
    readonly derivation: EvidenceDerivationKind;
    readonly experimentId: string;
    readonly targetArtifactPath: string;
    readonly experimentDefinition?: Omit<ExperimentDefinition, "provenanceVersion" | "id">;
    produce(ctx: ProducerContext): EvidencePackage;
}
export interface ProduceEnvelopeWithProvenanceBody extends Partial<EvidencePackage> {
    readonly experimentProtocol: readonly string[];
    readonly rawObservations: readonly string[];
    readonly evidenceSources: readonly string[];
    readonly scriptFile?: string;
    readonly functionName?: string;
    readonly assertionIds?: readonly string[];
    readonly exitCode?: number;
    readonly environmentConstraints?: readonly string[];
    readonly hashConsistency?: readonly string[];
    readonly gitCommit?: string;
    readonly experimentDefinition?: Omit<ExperimentDefinition, "provenanceVersion" | "id">;
    readonly observationSourceChannels?: readonly string[];
    readonly observationTimestamps?: readonly string[];
}
export declare function produceEvidencePackageEnvelope(producer: IndependentEvidenceProducer, body: Partial<EvidencePackage> & {
    readonly experimentProtocol: readonly string[];
    readonly rawObservations: readonly string[];
    readonly evidenceSources: readonly string[];
    readonly scriptFile?: string;
    readonly functionName?: string;
    readonly assertionIds?: readonly string[];
    readonly exitCode?: number;
    readonly environmentConstraints?: readonly string[];
    readonly hashConsistency?: readonly string[];
    readonly gitCommit?: string;
}, ctx: ProducerContext): EvidencePackage;
export declare function produceEvidencePackageEnvelopeWithProvenance(producer: IndependentEvidenceProducer, body: ProduceEnvelopeWithProvenanceBody, ctx: ProducerContext): EvidencePackage & {
    readonly __provenanceChain?: ProvenanceChainResult;
};
//# sourceMappingURL=types.d.ts.map