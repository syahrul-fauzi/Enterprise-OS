export type CertificationMilestoneTag = "alpha.6" | "alpha.7" | "alpha.8" | "alpha.9" | "alpha.10" | "beta.1";
export type EvidenceLevel = "Execution" | "Architectural" | "Evolutionary";
export type ExecutionStatus = "PASS" | "FAIL";
export type ArchitecturalStatus = "Pending" | "Supported" | "Refuted";
export type EvolutionaryStatus = "Planned" | "Running" | "Verified" | "Refuted";
export type CertificationStatus = ExecutionStatus | ArchitecturalStatus | EvolutionaryStatus | "Not-Yet-Evaluated";
export declare const EPISTEMIC_PROTOCOL_VERSION = "5.0";
export type EvidenceId = `evd:sha256:${string}` & {
    readonly __evidenceId: unique symbol;
};
export declare function EvidenceId(sha256Hex: string): EvidenceId;
export type ClaimRelationKind = "supports" | "dependsOn" | "contradicts" | "supersedes";
export interface ClaimRelation {
    readonly id?: RelationId;
    readonly fromClaimId: string;
    readonly kind: ClaimRelationKind;
    readonly toClaimId: string;
    readonly rationale?: string;
}
export type EvidenceDerivationKind = "Raw" | "Derived" | "Aggregate";
export declare const EVIDENCE_SCHEMA_VERSION = "2.0";
export interface EvidencePackage {
    readonly packageVersion: "2.0";
    readonly schemaVersion: typeof EVIDENCE_SCHEMA_VERSION;
    readonly derivation: EvidenceDerivationKind;
    readonly derivedFromEvidenceIds?: readonly EvidenceId[];
    readonly experimentId: string;
    readonly experimentProtocol: readonly string[];
    readonly provenance?: {
        readonly experimentDefinitionId: ExperimentDefinitionId;
        readonly experimentExecutionId: ExperimentExecutionId;
        readonly rawObservationIds: readonly RawObservationId[];
    };
    readonly environmentConstraints?: readonly string[];
    readonly assertionIds?: readonly string[];
    readonly rawObservations: readonly string[];
    readonly hashConsistency?: readonly string[];
    readonly exitCode?: number;
    readonly generatedBy: readonly string[];
    readonly evidenceSources: readonly string[];
    readonly scriptFile?: string;
    readonly functionName?: string;
    readonly generatedAt: string;
    readonly gitCommit?: string;
    readonly runner?: {
        readonly os?: string;
        readonly arch?: string;
        readonly runtime?: string;
        readonly runtimeVersion?: string;
    };
    readonly producerId?: string;
    readonly producerName?: string;
    readonly targetArtifactPath?: string;
    readonly independentRun?: boolean;
}
export interface EvidencePackageIdentity {
    readonly id: EvidenceId;
    readonly algorithm: "sha-256";
    readonly schemaVersion: typeof EVIDENCE_SCHEMA_VERSION;
    readonly canonicalBundleLength: number;
    readonly pkg: EvidencePackage;
}
export type GraphTopologyId = `graph:sha256:${string}` & {
    readonly __graphTopologyId: unique symbol;
};
export declare function GraphTopologyId(sha256Hex: string): GraphTopologyId;
export type RelationId = `rel:sha256:${string}` & {
    readonly __relationId: unique symbol;
};
export declare function RelationId(sha256Hex: string): RelationId;
export type CertificationSnapshotId = `snp:sha256:${string}` & {
    readonly __certificationSnapshotId: unique symbol;
};
export declare function CertificationSnapshotId(sha256Hex: string): CertificationSnapshotId;
export declare const PROVENANCE_PROTOCOL_VERSION = "1.0";
export declare const PROVENANCE_GRAPH_MODEL_VERSION = "2.0";
export type SemanticObservationOutcome = "supports" | "contradicts" | "inconclusive" | "independent";
export type ExperimentDefinitionVersionTag = string & {
    readonly __experimentDefVersion: unique symbol;
};
export type ProvenanceEdgeId = `peg:sha256:${string}` & {
    readonly __provenanceEdgeId: unique symbol;
};
export declare function ProvenanceEdgeId(sha256Hex: string): ProvenanceEdgeId;
export type ExperimentDefinitionId = `exd:sha256:${string}` & {
    readonly __experimentDefinitionId: unique symbol;
};
export declare function ExperimentDefinitionId(sha256Hex: string): ExperimentDefinitionId;
export type ExperimentExecutionId = `exe:sha256:${string}` & {
    readonly __experimentExecutionId: unique symbol;
};
export declare function ExperimentExecutionId(sha256Hex: string): ExperimentExecutionId;
export type RawObservationId = `obs:sha256:${string}` & {
    readonly __rawObservationId: unique symbol;
};
export declare function RawObservationId(sha256Hex: string): RawObservationId;
/**
 * ExperimentDefinition — objek "apa yang diukur dan bagaimana protocol-nya".
 * IDENTITASNYA TIDAK BERUBAH selama protocol/procedure/assertion list tidak berubah.
 * (Sama sekali TIDAK bergantung pada waktu, commit, atau hasil pengukuran).
 *
 * Alpha.9 VERSIONING:
 *   Setiap definition punya version + supersedes (version lineage graph).
 *   Definition v2 BISA "membatalkan" / "memperbarui" v1.
 *   Dua definitions dengan experimentKey SAMA + version BERBEDA
 *   → dibandingkan melalui compareExperimentDefinitions() utk tau delta compatible.
 */
export interface ExperimentDefinition {
    readonly provenanceVersion: typeof PROVENANCE_PROTOCOL_VERSION;
    readonly id: ExperimentDefinitionId;
    readonly experimentKey: string;
    readonly version: string;
    readonly supersedes?: readonly ExperimentDefinitionId[];
    readonly title: string;
    readonly objective: string;
    readonly protocolSteps: readonly string[];
    readonly assertions: readonly string[];
    readonly expectedArtifact?: string;
    readonly ownerMilestone: CertificationMilestoneTag;
    readonly definedAt: string;
    readonly definedBy: string;
    readonly changeNotes?: readonly string[];
}
/**
 * ExperimentExecution — SATU KALI PENGUKURAN nyata.
 * SAMA DEFINISI (experimentDefinitionId SAMA) + commit BERBEDA / platform BERBEDA
 * → identity experimentExecutionId SELALU BERBEDA.
 * Di sinilah provenance chain memisahkan "definisi yang sama" dengan "execution yang berbeda".
 */
export interface ExperimentExecution {
    readonly provenanceVersion: typeof PROVENANCE_PROTOCOL_VERSION;
    readonly id: ExperimentExecutionId;
    readonly experimentDefinitionId: ExperimentDefinitionId;
    readonly executedAt: string;
    readonly executorIdentity: string;
    readonly gitCommit: string;
    readonly workingTreeDirtyCount: number;
    readonly runner: {
        readonly os: string;
        readonly arch: string;
        readonly runtime: string;
        readonly runtimeVersion: string;
        readonly extra?: readonly string[];
    };
    readonly exitCode: number;
    readonly rawObservationIds: readonly RawObservationId[];
}
/**
 * RawObservation — SATU baris bukti mentah (measurement, output, probe result).
 * SETIAP observation punya identity sendiri.
 * SHA-256 dihitung atas canonical { executionId, index0, contentString }
 * → sehingga jika content SATU PUN BERUBAH meskipun 1 byte, identity akan BERUBAH,
 * yang kemudian merambat ke ExperimentExecution.id, EvidencePackage.id, dst.
 *
 * Alpha.9 SEMANTIC OUTCOME:
 *   Setiap RawObservation MEMILIKI semantic outcome sendiri:
 *   - supports    = observation ini MENDUKUNG claim / assertion yang dituju
 *   - contradicts = observation ini MENYANGGAH / memberikan bukti NEGATIF
 *   - inconclusive= observation ini TIDAK CUKUP untuk menyimpulkan pro/kontra
 *   - independent = observation ini netral (misalnya metadata, tanpa klaim spesifik)
 *
 * Alpha.9 REUSABLE GRAPH NODE:
 *   Satu RawObservation BISA dirujuk oleh > 1 EvidencePackage.
 *   Object tidak diduplikasi; setiap evidence package menyimpan id reference
 *   melalui provenance.rawObservationIds[] + observationOutcomeMap[].
 */
export interface RawObservation {
    readonly provenanceVersion: typeof PROVENANCE_PROTOCOL_VERSION;
    readonly id: RawObservationId;
    readonly experimentExecutionId: ExperimentExecutionId;
    readonly index0: number;
    readonly content: string;
    readonly observedAt: string;
    readonly sourceChannel: string;
    readonly semanticOutcome: SemanticObservationOutcome;
    readonly targetAssertionId?: string;
}
export type ProvenanceGraphNodeKind = "experimentDefinition" | "experimentExecution" | "rawObservation" | "evidencePackage" | "certificationClaim";
export type EvidenceToObservationSemanticLinkKind = "supports" | "contradicts" | "inconclusive" | "metadata";
/**
 * Observation-to-Evidence Semantic Edge.
 * Satu OBS bisa direferensikan oleh BANYAK (≥ 2) Evidence via edges berbeda.
 * Tidak ada child exclusive. OBS = reusable scientific object.
 */
export interface EvidenceObservationSemanticEdge {
    readonly id: ProvenanceEdgeId;
    readonly fromEvidenceId: EvidenceId;
    readonly toRawObservationId: RawObservationId;
    readonly kind: EvidenceToObservationSemanticLinkKind;
    readonly assertionIndex?: number;
    readonly rationale?: string;
}
export interface ExperimentDefinitionVersionLineageEdge {
    readonly id: ProvenanceEdgeId;
    readonly newDefinitionId: ExperimentDefinitionId;
    readonly supersedesDefinitionId: ExperimentDefinitionId;
    readonly compatibility: "identical-protocol" | "compatible-subset" | "incomparable" | "breaking-change";
    readonly rationale?: string;
}
export interface CertificationProvenanceGraph {
    readonly modelVersion: typeof PROVENANCE_GRAPH_MODEL_VERSION;
    readonly builtAt: string;
    readonly edgeCount: number;
    readonly evidenceObservationEdges: Readonly<Record<string, EvidenceObservationSemanticEdge>>;
    readonly definitionVersionLineageEdges: Readonly<Record<string, ExperimentDefinitionVersionLineageEdge>>;
    readonly observationSemanticEquivalenceEdges?: Readonly<Record<string, ObservationSemanticEquivalenceEdge>>;
    readonly observationLifecycleIndex?: Readonly<Record<string, ObservationLifecycleEntry>>;
    readonly observationQualityIndex?: Readonly<Record<string, ObservationQualityEntry>>;
    readonly replicationGroupIndex?: Readonly<Record<string, ReplicationGroup>>;
    readonly claimConsensusIndex?: Readonly<Record<string, ClaimConsensusClassification>>;
}
export type SemanticEquivalenceKind = "numeric-tolerance" | "temporal-window" | "textual-synonym-domain" | "structural-subset-equal" | "auditor-human-classified";
export interface ObservationSemanticEquivalenceEdge {
    readonly id: ProvenanceEdgeId;
    readonly leftObservationId: RawObservationId;
    readonly rightObservationId: RawObservationId;
    readonly kind: SemanticEquivalenceKind;
    readonly toleranceNumericAbsolute?: number;
    readonly synonymDomain?: string;
    readonly windowIsoStart?: string;
    readonly windowIsoEnd?: string;
    readonly rationale?: string;
    readonly assertedBy: string;
    readonly assertedAt: string;
}
export interface ObservationQualityEntry {
    readonly observationId: RawObservationId;
    readonly confidence: number;
    readonly precision: number;
    readonly certainty: number;
    readonly sampleSize: number;
    readonly sourceChannelReliability: number;
    readonly aggregateQualityScore01: number;
    readonly qualityBucket: "critical-unknown" | "low" | "medium" | "high" | "gold-standard";
    readonly qualityClassifierId: string;
    readonly classifierVersion: string;
    readonly assertedAt: string;
}
export type ObservationLifecycleState = "created" | "verified" | "replicated" | "deprecated" | "superseded";
export interface ObservationLifecycleEntry {
    readonly observationId: RawObservationId;
    readonly currentState: ObservationLifecycleState;
    readonly transitions: ReadonlyArray<{
        readonly fromState: ObservationLifecycleState | "none";
        readonly toState: ObservationLifecycleState;
        readonly transitionedAt: string;
        readonly reason: string;
        readonly transitionedBy: string;
    }>;
    readonly supersededById?: RawObservationId;
    readonly deprecationRationale?: string;
}
export interface ReplicationGroup {
    readonly groupId: string;
    readonly experimentDefinitionId: ExperimentDefinitionId;
    readonly experimentDefinitionVersion: string;
    readonly executionIds: readonly ExperimentExecutionId[];
    readonly distinctExecutorIdentities: number;
    readonly successfulExecutionCount: number;
    readonly totalExecutionCount: number;
    readonly observationConvergenceRatio01: number;
    readonly replicationStatus: "not-replicated" | "replicated-strong" | "replicated-weak" | "replication-failed";
    readonly reportSummary: string;
    readonly assembledAt: string;
}
export type ClaimConsensusStrength = "strong" | "moderate" | "weak" | "conflicting" | "inconclusive";
export interface ClaimConsensusClassification {
    readonly claimId: string;
    readonly strength: ClaimConsensusStrength;
    readonly weightedSupportsScore01: number;
    readonly weightedContradictsScore01: number;
    readonly weightedInconclusiveScore01: number;
    readonly topContributorObservationIds: readonly RawObservationId[];
    readonly conflictingObservationIds?: readonly RawObservationId[];
    readonly worstReplicationStatusAmongContributors?: ReplicationGroup["replicationStatus"];
    readonly rationale: string;
    readonly classifierVersion: string;
    readonly computedAt: string;
}
export declare const RELATION_LAYER_RULES: Readonly<Record<ClaimRelationKind, Readonly<Record<EvidenceLevel, readonly EvidenceLevel[]>>>>;
export declare function isRelationAllowed(fromLevel: EvidenceLevel, kind: ClaimRelationKind, toLevel: EvidenceLevel): boolean;
export declare const LAYER_LIFECYCLE_STATUS: Readonly<{
    readonly Execution: readonly ["PASS", "FAIL"];
    readonly Architectural: readonly ["Pending", "Supported", "Refuted"];
    readonly Evolutionary: readonly ["Planned", "Running", "Verified", "Refuted"];
}>;
export declare const LAYER_STATUS_SEMANTICS: Readonly<{
    readonly Execution: {
        readonly PASS: "Eksperimen telah dijalankan dan assertion yang relevan bernilai true pada environment yang diuji. Hasil dapat direproduksi dengan menjalankan eksperimen yang sama.";
        readonly FAIL: "Eksperimen telah dijalankan dan minimal satu assertion menghasilkan false pada environment yang diuji. Pelanggaran terobservasi.";
    };
    readonly Architectural: {
        readonly Pending: "Hypothesis arsitektural telah dirumuskan, tetapi eksperimen yang akan mendukung atau meruntuhkannya BELUM dijalankan.";
        readonly Supported: "Execution evidence saat ini TIDAK MENYANGGAH hypothesis, dan evidence tersebut CONSISTENT dengan hypothesis arsitektural. INI BUKAN PEMBUKTIAN.";
        readonly Refuted: "Minimal satu execution evidence secara langsung menyangga hypothesis arsitektural. Counter-example ditemukan.";
    };
    readonly Evolutionary: {
        readonly Planned: "Validation experiment untuk property evolusi telah didesain, tetapi sistem BELUM berkembang ke titik di mana eksperimen dapat dijalankan.";
        readonly Running: "Eksperimen evolusi sedang berjalan (contoh: capability baru sedang ditambahkan, perubahan diff sedang dipantau).";
        readonly Verified: "Eksperimen evolusi SELESAI dan hasilnya konsisten dengan klaim. Bukti evolusi riil telah terkumpul.";
        readonly Refuted: "Eksperimen evolusi SELESAI dan hasilnya menyangga klaim. Property evolusi tidak berlaku.";
    };
}>;
export declare const EVIDENCE_LAYER_DEFINITION: Readonly<{
    readonly Execution: {
        readonly name: "Execution Evidence";
        readonly description: "Observasi mentah dari eksperimen yang dijalankan. Hanya berisi APA yang TERAMATI (exit code, assertion result, hash values, log), TIDAK berisi interpretasi atau kesimpulan.";
        readonly falsifiability: "Dapat direproduksi dan difalsifikasi dengan menjalankan command eksperimen yang identik pada environment yang setara. Orang ketiga dapat mereplikasi hasilnya tanpa interpretasi.";
        readonly validStatuses: readonly ["PASS", "FAIL"];
        readonly lifecycle: {
            readonly closedWord: "Resolved";
            readonly description: "Execution claims yang telah Resolved adalah yang statusnya PASS atau FAIL — eksperimennya selesai dan ada hasil teramati.";
        };
    };
    readonly Architectural: {
        readonly name: "Architectural Hypothesis Supported by Current Evidence";
        readonly description: "Hypothesis arsitektural yang DIPERKUAT (bukan dibuktikan) oleh execution evidence saat ini. Selalu dianggap tentative. Dapat diruntuhkan oleh counter-example pada eksperimen masa depan. Status lifecycle: Pending → Supported → (bisa kembali ke Pending atau Refuted), tidak pernah 'Closed'.";
        readonly falsifiability: "Difalsifikasi dengan menemukan satu counter-example melalui: static audit mendalam, scenario test tambahan, fuzz testing, atau observasi runtime behavior yang bertentangan.";
        readonly validStatuses: readonly ["Pending", "Supported", "Refuted"];
        readonly lifecycle: {
            readonly closedWord: "N/A — hypothesis never closed";
            readonly description: "Architectural hypothesis TIDAK PERNAH ditutup. Status maksimal adalah Supported dan tetap terbuka untuk invalidasi masa depan.";
        };
    };
    readonly Evolutionary: {
        readonly name: "Evolutionary Validation (Future Experiment)";
        readonly description: "Klaim tentang property evolusi SISTEM, bukan property code snapshot. Baru dapat dievaluasi setelah sistem benar-benar berevolusi (beberapa capability ditambahkan, beberapa product dibangun). Status: Planned → Running → Verified / Refuted. Juga tidak pernah 'Closed' pada tahap experiment awal.";
        readonly falsifiability: "Difalsifikasi dengan menjalankan scenario evolusi riil dan mengamati bahwa property yang dijanjikan tidak terpenuhi (misal: menambahkan capability membutuhkan perubahan runtime core).";
        readonly validStatuses: readonly ["Planned", "Running", "Verified", "Refuted"];
        readonly lifecycle: {
            readonly closedWord: "N/A — evolutionary claim stays revisable";
            readonly description: "Evolutionary claim TIDAK PERNAH ditutup secara final. Verified berarti eksperimen telah berhasil, tetapi dapat di-refute oleh evidence evolusi berikutnya.";
        };
    };
}>;
export type CertificationGate = "Repository" | "Architecture" | "Foundation" | "Platform" | "Experience" | "Gateway" | "Observability" | "Security" | "Production";
export interface ClaimExperiment {
    readonly id?: string;
    readonly protocol: readonly string[];
    readonly environmentConstraints?: readonly string[];
}
export interface ClaimObservedEvidence {
    readonly rawObservations: readonly string[];
    readonly assertionIds?: readonly string[];
    readonly exitCode?: number;
    readonly hashConsistency?: readonly string[];
}
export interface ClaimInterpretation {
    readonly summary: string;
    readonly caveats?: readonly string[];
}
export interface ThreatToValidity {
    readonly id?: string;
    readonly category: "scope" | "environment" | "coverage" | "methodology" | "hidden-dependency" | "measurement";
    readonly description: string;
    readonly mitigationExperiment?: string;
}
export interface SpecificationTriple {
    readonly specification: string;
    readonly verificationMechanism: string;
    readonly observedCompliance: CertificationStatus;
    readonly complianceEvidence?: readonly string[];
}
export interface ClaimProvenance {
    readonly generatedBy: readonly string[];
    readonly evidenceSources: readonly string[];
    readonly assertionIds?: readonly string[];
    readonly scriptFile?: string;
    readonly functionName?: string;
    readonly generatedAt?: string;
    readonly gitCommit?: string;
}
export interface CertificationClaim {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly evidenceLevel: EvidenceLevel;
    readonly gate?: CertificationGate;
    readonly status: CertificationStatus;
    readonly ownerMilestone: CertificationMilestoneTag;
    readonly evidenceIds?: readonly EvidenceId[];
    readonly experiment?: ClaimExperiment;
    readonly observedEvidence?: ClaimObservedEvidence;
    readonly interpretation?: ClaimInterpretation;
    readonly threatsToValidity?: readonly ThreatToValidity[];
    readonly specification?: SpecificationTriple;
    readonly provenance?: ClaimProvenance;
}
export interface ExperimentDefinitionRegistryEntry {
    readonly id: ExperimentDefinitionId;
    readonly algorithm: "sha-256";
    readonly provenanceVersion: typeof PROVENANCE_PROTOCOL_VERSION;
    readonly canonicalBundleLength: number;
    readonly def: ExperimentDefinition;
}
export interface ExperimentExecutionRegistryEntry {
    readonly id: ExperimentExecutionId;
    readonly algorithm: "sha-256";
    readonly provenanceVersion: typeof PROVENANCE_PROTOCOL_VERSION;
    readonly canonicalBundleLength: number;
    readonly exe: ExperimentExecution;
}
export interface RawObservationRegistryEntry {
    readonly id: RawObservationId;
    readonly algorithm: "sha-256";
    readonly provenanceVersion: typeof PROVENANCE_PROTOCOL_VERSION;
    readonly canonicalBundleLength: number;
    readonly obs: RawObservation;
}
export interface CertificationMatrixEnvelope {
    readonly protocolVersion: "1.0";
    readonly epistemicProtocolVersion: "5.0";
    readonly evidenceSchemaVersion: typeof EVIDENCE_SCHEMA_VERSION;
    readonly relationLayerRules: typeof RELATION_LAYER_RULES;
    readonly evidenceLayers: typeof EVIDENCE_LAYER_DEFINITION;
    readonly layerLifecycle: typeof LAYER_LIFECYCLE_STATUS;
    readonly layerStatusSemantics: typeof LAYER_STATUS_SEMANTICS;
    readonly producedAt: string;
    readonly producedBy: readonly string[];
    readonly milestone: CertificationMilestoneTag;
    readonly claims: Readonly<Record<string, CertificationClaim>>;
    readonly evidencePackages: Readonly<Record<string, EvidencePackageIdentity>>;
    readonly claimRelations: readonly ClaimRelation[];
    readonly graphTopology: {
        readonly id: GraphTopologyId;
        readonly algorithm: "sha-256";
        readonly schemaVersion: "1.0";
        readonly claimCount: number;
        readonly relationCount: number;
    };
    readonly summary: Readonly<Record<EvidenceLevel, Readonly<Record<CertificationStatus, number>>>>;
    readonly overall: {
        readonly executionResolved: readonly string[];
        readonly executionUnresolved: readonly string[];
        readonly architecturalHypotheses: readonly string[];
        readonly evolutionaryClaims: readonly string[];
        readonly executionAllResolved: boolean;
    };
    readonly snapshotId?: CertificationSnapshotId;
    readonly provenanceRegistry?: {
        readonly experimentDefinitions: Readonly<Record<string, ExperimentDefinitionRegistryEntry>>;
        readonly experimentExecutions: Readonly<Record<string, ExperimentExecutionRegistryEntry>>;
        readonly rawObservations: Readonly<Record<string, RawObservationRegistryEntry>>;
    };
    readonly provenanceGraph?: CertificationProvenanceGraph;
}
//# sourceMappingURL=types.d.ts.map