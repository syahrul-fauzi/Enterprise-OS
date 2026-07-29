export type CertificationMilestoneTag =
  | "alpha.6"
  | "alpha.7"
  | "alpha.8"
  | "alpha.9"
  | "alpha.10"
  | "beta.1";

export type EvidenceLevel =
  | "Execution"
  | "Architectural"
  | "Evolutionary";

export type ExecutionStatus = "PASS" | "FAIL";

export type ArchitecturalStatus = "Pending" | "Supported" | "Refuted";

export type EvolutionaryStatus = "Planned" | "Running" | "Verified" | "Refuted";

export type CertificationStatus =
  | ExecutionStatus
  | ArchitecturalStatus
  | EvolutionaryStatus
  | "Not-Yet-Evaluated";

export const EPISTEMIC_PROTOCOL_VERSION = "5.0";

export type EvidenceId = `evd:sha256:${string}` & { readonly __evidenceId: unique symbol };

export function EvidenceId(sha256Hex: string): EvidenceId {
  if (!/^[a-f0-9]{64}$/.test(sha256Hex)) {
    throw new TypeError(`EvidenceId requires lowercase 64-hex SHA-256, got: ${sha256Hex}`);
  }
  return `evd:sha256:${sha256Hex}` as EvidenceId;
}

export type ClaimRelationKind = "supports" | "dependsOn" | "contradicts" | "supersedes";

export interface ClaimRelation {
  readonly id?: RelationId;
  readonly fromClaimId: string;
  readonly kind: ClaimRelationKind;
  readonly toClaimId: string;
  readonly rationale?: string;
}

export type EvidenceDerivationKind = "Raw" | "Derived" | "Aggregate";

export const EVIDENCE_SCHEMA_VERSION = "2.0";

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

export type GraphTopologyId = `graph:sha256:${string}` & { readonly __graphTopologyId: unique symbol };

export function GraphTopologyId(sha256Hex: string): GraphTopologyId {
  if (!/^[a-f0-9]{64}$/.test(sha256Hex)) {
    throw new TypeError(`GraphTopologyId requires lowercase 64-hex SHA-256, got: ${sha256Hex}`);
  }
  return `graph:sha256:${sha256Hex}` as GraphTopologyId;
}

export type RelationId = `rel:sha256:${string}` & { readonly __relationId: unique symbol };

export function RelationId(sha256Hex: string): RelationId {
  if (!/^[a-f0-9]{64}$/.test(sha256Hex)) {
    throw new TypeError(`RelationId requires lowercase 64-hex SHA-256, got: ${sha256Hex}`);
  }
  return `rel:sha256:${sha256Hex}` as RelationId;
}

export type CertificationSnapshotId = `snp:sha256:${string}` & { readonly __certificationSnapshotId: unique symbol };

export function CertificationSnapshotId(sha256Hex: string): CertificationSnapshotId {
  if (!/^[a-f0-9]{64}$/.test(sha256Hex)) {
    throw new TypeError(`CertificationSnapshotId requires lowercase 64-hex SHA-256, got: ${sha256Hex}`);
  }
  return `snp:sha256:${sha256Hex}` as CertificationSnapshotId;
}

// ──────────────────────────────────────────────────────────────────────
// SCIENTIFIC PROVENANCE GRAPH — Alpha.8 Provenance Chain
// Chain: ExperimentDefinition → ExperimentExecution → RawObservation
//        → EvidencePackage → Claim → CertificationSnapshot
//
// Setiap node memiliki IDENTITY KRIPTOGRAFIS tersendiri (SHA-256).
// Dua execution dari experiment YANG SAMA (experimentDefinitionId SAMA)
// DI commit BERBEDA / platform BERBEDA / waktu BERBEDA
// AKAN menghasilkan experimentExecutionId BERBEDA — sehingga evidence
// pada masing-masing execution dapat DIBEDAKAN secara eksplisit
// (bukan hanya field experimentId string flat tanpa identity).
// ──────────────────────────────────────────────────────────────────────

export const PROVENANCE_PROTOCOL_VERSION = "1.0";
export const PROVENANCE_GRAPH_MODEL_VERSION = "2.0";

export type SemanticObservationOutcome = "supports" | "contradicts" | "inconclusive" | "independent";
export type ExperimentDefinitionVersionTag = string & { readonly __experimentDefVersion: unique symbol };

export type ProvenanceEdgeId = `peg:sha256:${string}` & { readonly __provenanceEdgeId: unique symbol };
export function ProvenanceEdgeId(sha256Hex: string): ProvenanceEdgeId {
  if (!/^[a-f0-9]{64}$/.test(sha256Hex)) throw new TypeError(`ProvenanceEdgeId requires 64-hex SHA-256, got: ${sha256Hex}`);
  return `peg:sha256:${sha256Hex}` as ProvenanceEdgeId;
}

export type ExperimentDefinitionId = `exd:sha256:${string}` & { readonly __experimentDefinitionId: unique symbol };
export function ExperimentDefinitionId(sha256Hex: string): ExperimentDefinitionId {
  if (!/^[a-f0-9]{64}$/.test(sha256Hex)) throw new TypeError(`ExperimentDefinitionId requires 64-hex SHA-256, got: ${sha256Hex}`);
  return `exd:sha256:${sha256Hex}` as ExperimentDefinitionId;
}

export type ExperimentExecutionId = `exe:sha256:${string}` & { readonly __experimentExecutionId: unique symbol };
export function ExperimentExecutionId(sha256Hex: string): ExperimentExecutionId {
  if (!/^[a-f0-9]{64}$/.test(sha256Hex)) throw new TypeError(`ExperimentExecutionId requires 64-hex SHA-256, got: ${sha256Hex}`);
  return `exe:sha256:${sha256Hex}` as ExperimentExecutionId;
}

export type RawObservationId = `obs:sha256:${string}` & { readonly __rawObservationId: unique symbol };
export function RawObservationId(sha256Hex: string): RawObservationId {
  if (!/^[a-f0-9]{64}$/.test(sha256Hex)) throw new TypeError(`RawObservationId requires 64-hex SHA-256, got: ${sha256Hex}`);
  return `obs:sha256:${sha256Hex}` as RawObservationId;
}

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
  readonly experimentKey: string;                    // e.g. "EXP-A8-004-RUNTIME-BOUNDARY"
  readonly version: string;                          // e.g. "1.0.0" / "2.1.3" (semver-ish, manual label)
  readonly supersedes?: readonly ExperimentDefinitionId[];  // version lineage: v2.0.0 supersedes [v1.0.0-id]
  readonly title: string;                            // human readable
  readonly objective: string;                        // tujuan ilmiah / audit
  readonly protocolSteps: readonly string[];         // ordered procedure (urutan DIPERTANGGUNGJAWABKAN)
  readonly assertions: readonly string[];            // daftar assertion (ordered)
  readonly expectedArtifact?: string;                // path/target yang diukur
  readonly ownerMilestone: CertificationMilestoneTag;
  readonly definedAt: string;                        // ISO timestamp SAAT DEFINISI dibuat (bukan execution)
  readonly definedBy: string;                        // role/persona (mis "platform-certification-framework")
  readonly changeNotes?: readonly string[];          // apa berubah dibanding supersedes definitions (human audit)
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
  readonly experimentDefinitionId: ExperimentDefinitionId;   // ← Parent provenance chain node 1
  readonly executedAt: string;                               // ISO timestamp actual run
  readonly executorIdentity: string;                         // process pid, user, host, etc (fingerprint)
  readonly gitCommit: string;                                // commit actual SAAT execution
  readonly workingTreeDirtyCount: number;                    // 0 = pristine vs HEAD
  readonly runner: {
    readonly os: string;
    readonly arch: string;
    readonly runtime: string;                                // "node" / "browser" / ...
    readonly runtimeVersion: string;                         // e.g. "v24.16.0"
    readonly extra?: readonly string[];                      // freeform tag: docker=true, ci=false, etc
  };
  readonly exitCode: number;                                 // 0 = seluruh protocol step selesai
  readonly rawObservationIds: readonly RawObservationId[];   // ← Parent provenance chain node 2 (ordered)
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
  readonly experimentExecutionId: ExperimentExecutionId;     // ← Parent provenance chain node
  readonly index0: number;                                   // urutan dalam execution (0-based, ordered)
  readonly content: string;                                  // actual observation string
  readonly observedAt: string;                               // ISO timestamp actual probe
  readonly sourceChannel: string;                            // e.g. "stdout", "fs.stat", "git.stdout", "ts.TypeChecker"
  readonly semanticOutcome: SemanticObservationOutcome;      // Alpha.9: supports/contradicts/inconclusive/independent
  readonly targetAssertionId?: string;                       // Jika ditujukan ke assertion id tertentu, opsional
}

// ──────────────────────────────────────────────────────────────────────
// SCIENTIFIC PROVENANCE GRAPH (Alpha.9 Graph Model — BUKAN LAGI TREE)
// ──────────────────────────────────────────────────────────────────────
// 5 Node Types:
//   ExperimentDefinition  (EXD)
//   ExperimentExecution   (EXE)
//   RawObservation        (OBS)
//   EvidencePackage       (EVD) — Evidence sebagai structured interpretation
//   CertificationClaim    (CLM)
//
// Relasi = EDGE, BUKAN nesting object.
//   EXD --version-lineage--> EXD (supersedes)
//   EXE --instance-of-------> EXD
//   OBS --produced-by-------> EXE
//   EVD --interpretation-of-> OBS (dengan semantic outcome explicit)
//   CLM --supports/contradicts/dependsOn--> CLM  (claim relation edges)
// ──────────────────────────────────────────────────────────────────────

export type ProvenanceGraphNodeKind =
  | "experimentDefinition"
  | "experimentExecution"
  | "rawObservation"
  | "evidencePackage"
  | "certificationClaim";

export type EvidenceToObservationSemanticLinkKind =
  | "supports"       // Evidence mendukung (menyimpulkan positif dari observation)
  | "contradicts"    // Evidence MENYANGGAH claim (observation = bukti negatif)
  | "inconclusive"   // Evidence DIBANGUN dari observation tapi inconclusive (gap/no-support)
  | "metadata";      // Observation sebagai metadata pembangun evidence (tanpa semantic kontribusi pro/kontra)

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
  // ── Alpha.10 Frontier 1–5 Extensions (OPTIONAL = backward compatible with Alpha.9 snapshot consumers) ──
  // #1 Identity vs Semantic Equivalence: hash-identity !== scientific equivalence
  readonly observationSemanticEquivalenceEdges?: Readonly<Record<string, ObservationSemanticEquivalenceEdge>>;
  // #3 Observation Lifecycle: created → verified → replicated → deprecated / superseded
  //    Registry-style entries keyed by RawObservationId
  readonly observationLifecycleIndex?: Readonly<Record<string, ObservationLifecycleEntry>>;
  // #2 Weighted Evidence: Quality Model per observation (confidence / precision / uncertainty / …)
  //    Registry-style entries keyed by RawObservationId
  readonly observationQualityIndex?: Readonly<Record<string, ObservationQualityEntry>>;
  // #4 Independent Replication Aggregation: per ExperimentDefinition, group of N EXEs
  readonly replicationGroupIndex?: Readonly<Record<string, ReplicationGroup>>;
  // #5 Evidence Consensus Reasoning: per Claim, classification + quality-weighted rationale
  readonly claimConsensusIndex?: Readonly<Record<string, ClaimConsensusClassification>>;
}

// ═══════════════════════════════════════════════════════════════════════
// ALPHA.10 FIVE EPISTEMIC FRONTIERS — Type Contract Declarations
// ═══════════════════════════════════════════════════════════════════════
//
// Semua struktur DI BAWAH INI adalah APPEND-ONLY terhadap type contract
// Alpha.9. NONE of the existing Alpha.9 interfaces / id-brand / enum
// values diubah. Snapshot Alpha.9 tetap valid di bawah type contract
// Alpha.10 (seluruh field tambahan opsional).
//
// ───────────────────────────────────────────────────────────────────────
// FRONTIER #1 — Observation Identity vs Observation Semantic Equivalence
// ───────────────────────────────────────────────────────────────────────
// Dua observation dengan hash identity BERBEDA (karena beda persis string
// content, beda execution, beda microsecond timestamp) bisa jadi secara
// ilmiah ekuivalen: misalnya temperature=25.0001 vs 25.0002, atau
// timestamp 12:00:00.001 vs 12:00:00.003 pada pengukuran "hari ini".
//
// ObservationSemanticEquivalenceEdge menyatakan relasi equivalence
// SEBAGAI EDGE, BUKAN identity. Identity tetap SHA-256(canonical(obs));
// equivalence adalah hubungan *tambahan* yang bisa ditambahkan oleh
// classifier atau auditor manusia.
export type SemanticEquivalenceKind =
  // numeric tolerance: |A-B| ≤ tol (misal ±5 ms, ±0.001 unit)
  | "numeric-tolerance"
  // temporal: dua observation "dalam jendela waktu yang sama" (misal 1 hari)
  | "temporal-window"
  // textual-synonym: "pass" ≅ "ok" ≅ "0" dalam boolean-like exitcode domain
  | "textual-synonym-domain"
  // structural: object beda identity tapi subset fields sama / ekuivalen
  | "structural-subset-equal"
  // auditor-human classified: equivalence dinyatakan oleh auditor identity,
  // bukan classifier otomatis
  | "auditor-human-classified";

export interface ObservationSemanticEquivalenceEdge {
  readonly id: ProvenanceEdgeId;
  readonly leftObservationId: RawObservationId;
  readonly rightObservationId: RawObservationId;
  readonly kind: SemanticEquivalenceKind;
  // untuk numeric-tolerance: tol yang dipakai (explicit agar reproducible)
  readonly toleranceNumericAbsolute?: number;
  // untuk textual-synonym: domain identifier (e.g. "exitcode-bool")
  readonly synonymDomain?: string;
  // untuk temporal-window: ukuran jendela + reference ISO
  readonly windowIsoStart?: string;
  readonly windowIsoEnd?: string;
  readonly rationale?: string;
  // Siapa yang membuat edge? otomatis=classifier-name | auditor=identity
  readonly assertedBy: string;
  readonly assertedAt: string;
}

// ───────────────────────────────────────────────────────────────────────
// FRONTIER #2 — Weighted Evidence / Quality Model per Observation
// ───────────────────────────────────────────────────────────────────────
// Semua skor 0..1 (0 = terburuk / tidak layak, 1 = sempurna / kepastian).
// Bobot tidak di-embed ke RawObservation agar identity hash TIDAK berubah
// ketika quality model di-refine (identity SHA-256(obs) tetap sama).
// Quality entries adalah sidecar keyed-by-RawObservationId.
export interface ObservationQualityEntry {
  readonly observationId: RawObservationId;
  // Keyakinan subjektif / pengukuran instrumen: 0..1
  readonly confidence: number;
  // Ketepatan (precision) — repeatability instrumen: 0..1
  readonly precision: number;
  // Ketidakpastian (uncertainty) — 1 - fractional uncertainty = normalized: 0..1
  readonly certainty: number;
  // Ukuran sample / jumlah pengukuran independen yang mendukung observation.
  readonly sampleSize: number;
  // Reliability sumber channel (e.g. fs.stat sangat andal=1, stdout grep≈0.7)
  readonly sourceChannelReliability: number;
  // Summary scalar — weighted aggregate dari 5 field di atas, reproducible
  // melalui canonical function, TIDAK disimpan sebagai truth (derivable).
  // Hanya di-simpan sebagai pre-computed convenience.
  readonly aggregateQualityScore01: number;
  // Klasifikasi kualitas kasar (memudahkan filter auditor)
  readonly qualityBucket: "critical-unknown" | "low" | "medium" | "high" | "gold-standard";
  // Sumber / classifier yang menetapkan skor (identity reproducible)
  readonly qualityClassifierId: string;
  readonly classifierVersion: string;
  readonly assertedAt: string;
}

// ───────────────────────────────────────────────────────────────────────
// FRONTIER #3 — Observation Lifecycle State Machine
// ───────────────────────────────────────────────────────────────────────
// Lifecycle per RawObservation:
//
//   [created] ── instrument initial write ──► [verified]
//                                                 │
//      N independent identical-definition EXEs ──┘ (replicated N≥2)
//                                                 ▼
//                                           [replicated]
//                                                 │
//          instrument error / superseded by newer │ obs with stronger quality
//                                                 ▼
//                                         [deprecated] ──► [superseded-by]
//                                                              (edge ke obs baru)
//
// Setiap transisi dicatat sebagai event transition TIDAK dihapus (audit
// immutability).
export type ObservationLifecycleState =
  | "created"      // observation baru saja dihasilkan instrument, belum diverifikasi
  | "verified"     // identity hash cocok, structure valid, source channel sesuai
  | "replicated"   // ≥2 independent EXE (different executor/process) menghasilkan equivalence
  | "deprecated"   // dinyatakan TIDAK valid lagi (e.g. instrument error, protocol flaw terungkap)
  | "superseded";  // digantikan oleh observation lain (supersedesId di bawah)

export interface ObservationLifecycleEntry {
  readonly observationId: RawObservationId;
  readonly currentState: ObservationLifecycleState;
  // ordered transitions — tidak pernah di-truncate (append-only immutability)
  readonly transitions: ReadonlyArray<{
    readonly fromState: ObservationLifecycleState | "none";
    readonly toState: ObservationLifecycleState;
    readonly transitionedAt: string;
    readonly reason: string;
    readonly transitionedBy: string;   // classifier identity / auditor identity
  }>;
  // jika state = superseded → observation penggantinya (lebih baru, lebih akurat)
  readonly supersededById?: RawObservationId;
  // jika state = deprecated → rationale penjelasan mengapa tidak dipakai
  readonly deprecationRationale?: string;
}

// ───────────────────────────────────────────────────────────────────────
// FRONTIER #4 — Independent Replication Groups
// ───────────────────────────────────────────────────────────────────────
// Satu ExperimentDefinition dijalankan oleh N INDEPENDENT executors
// (berbeda process, berbeda pid, berbeda startTs, idealnya berbeda host
//  atau berbeda sandbox / docker run). ReplicationGroup mengumpulkan
// seluruh EXE tersebut, menyatakan ada berapa replika, mana yang SUKSES
// menghasilan observation equivalence, mana yang FAIL (replication failed).
export interface ReplicationGroup {
  readonly groupId: string;  // stable identifier, e.g. "repgrp:EXP-A8-FS-RUNTIME-MANIFEST:v2.0.0"
  readonly experimentDefinitionId: ExperimentDefinitionId;
  readonly experimentDefinitionVersion: string;
  // Semua EXE yang menjalankan definition IDENTIK (dalam group ini)
  readonly executionIds: readonly ExperimentExecutionId[];
  // jumlah independent executor identity berbeda yang menjalankan (N ≥ 2 = replicated)
  readonly distinctExecutorIdentities: number;
  // jumlah EXE dengan exitCode === 0
  readonly successfulExecutionCount: number;
  // jumlah EXE total dalam group
  readonly totalExecutionCount: number;
  // Convergence: berapa persentase observation dalam equivalence class ≥2
  // 1.0 = seluruh observation direplikasi identik / ekuivalen
  // 0.0 = tidak ada satupun observation yang dapat direplikasi
  readonly observationConvergenceRatio01: number;
  // Classified replication status.
  readonly replicationStatus:
    | "not-replicated"    // totalExecutionCount < 2
    | "replicated-strong" // ≥2 EXEs success + observationConvergenceRatio01 ≥ 0.95
    | "replicated-weak"   // ≥2 EXEs success + 0.50 ≤ convergence < 0.95
    | "replication-failed"; // ≥2 EXEs dijalankan, tapi ada mismatch besar
  readonly reportSummary: string;
  readonly assembledAt: string;
}

// ───────────────────────────────────────────────────────────────────────
// FRONTIER #5 — Evidence Consensus Reasoning on top of Graph
// ───────────────────────────────────────────────────────────────────────
// Bukan sekadar menghitung jumlah "supports" vs "contradicts" edges;
// Consensus memasukkan bobot (Frontier #2 quality score), lifecycle state
// (Frontier #3), dan replication status (Frontier #4), sehingga
// kesimpulan "strong consensus" membutuhkan bukti berkualitas tinggi,
// replikasi, dan tidak ada contradiction dari observation gold-quality.
export type ClaimConsensusStrength =
  | "strong"     // high-quality supports > 2/3 weighted + replicated ≥2 + no high-quality contradicts
  | "moderate"   // supports > simple majority, tapi beberapa ambiguity
  | "weak"       // tipis, atau banyak observation low-quality yang mendukung
  | "conflicting"// contradictory high-quality observations ada (tidak bisa konsensus sederhana)
  | "inconclusive"; // insufficient evidence total weight

export interface ClaimConsensusClassification {
  readonly claimId: string;
  readonly strength: ClaimConsensusStrength;
  // Ringkasan bobot kumulatif (normalized 0..1)
  readonly weightedSupportsScore01: number;
  readonly weightedContradictsScore01: number;
  readonly weightedInconclusiveScore01: number;
  // Kontributor evidence yang dominan: top 3 observationIds dengan bobot tertinggi
  readonly topContributorObservationIds: readonly RawObservationId[];
  // Jika conflicting → observationIds mana yang bertentangan
  readonly conflictingObservationIds?: readonly RawObservationId[];
  // Minimal replication status dari observation terlibat (yang terburuk menentukan)
  readonly worstReplicationStatusAmongContributors?: ReplicationGroup["replicationStatus"];
  readonly rationale: string;
  readonly classifierVersion: string;
  readonly computedAt: string;
}

export const RELATION_LAYER_RULES: Readonly<Record<ClaimRelationKind, Readonly<Record<EvidenceLevel, readonly EvidenceLevel[]>>>> =
  Object.freeze<Record<ClaimRelationKind, Record<EvidenceLevel, readonly EvidenceLevel[]>>>({
    supports: Object.freeze<Record<EvidenceLevel, readonly EvidenceLevel[]>>({
      Execution: Object.freeze<readonly EvidenceLevel[]>(["Execution", "Architectural"]),
      Architectural: Object.freeze<readonly EvidenceLevel[]>(["Architectural"]),
      Evolutionary: Object.freeze<readonly EvidenceLevel[]>([]),
    }),
    dependsOn: Object.freeze<Record<EvidenceLevel, readonly EvidenceLevel[]>>({
      Execution: Object.freeze<readonly EvidenceLevel[]>([]),
      Architectural: Object.freeze<readonly EvidenceLevel[]>(["Execution", "Architectural"]),
      Evolutionary: Object.freeze<readonly EvidenceLevel[]>(["Architectural", "Evolutionary"]),
    }),
    contradicts: Object.freeze<Record<EvidenceLevel, readonly EvidenceLevel[]>>({
      Execution: Object.freeze<readonly EvidenceLevel[]>(["Execution", "Architectural"]),
      Architectural: Object.freeze<readonly EvidenceLevel[]>(["Execution", "Architectural", "Evolutionary"]),
      Evolutionary: Object.freeze<readonly EvidenceLevel[]>(["Architectural", "Evolutionary"]),
    }),
    supersedes: Object.freeze<Record<EvidenceLevel, readonly EvidenceLevel[]>>({
      Execution: Object.freeze<readonly EvidenceLevel[]>(["Execution"]),
      Architectural: Object.freeze<readonly EvidenceLevel[]>(["Architectural"]),
      Evolutionary: Object.freeze<readonly EvidenceLevel[]>(["Evolutionary"]),
    }),
  });

export function isRelationAllowed(
  fromLevel: EvidenceLevel,
  kind: ClaimRelationKind,
  toLevel: EvidenceLevel,
): boolean {
  const allowed = RELATION_LAYER_RULES[kind][fromLevel];
  return Array.isArray(allowed) && allowed.includes(toLevel);
}

export const LAYER_LIFECYCLE_STATUS = Object.freeze({
  Execution: ["PASS", "FAIL"] as const,
  Architectural: ["Pending", "Supported", "Refuted"] as const,
  Evolutionary: ["Planned", "Running", "Verified", "Refuted"] as const,
} as const);

export const LAYER_STATUS_SEMANTICS = Object.freeze({
  Execution: {
    PASS: "Eksperimen telah dijalankan dan assertion yang relevan bernilai true pada environment yang diuji. Hasil dapat direproduksi dengan menjalankan eksperimen yang sama.",
    FAIL: "Eksperimen telah dijalankan dan minimal satu assertion menghasilkan false pada environment yang diuji. Pelanggaran terobservasi.",
  },
  Architectural: {
    Pending: "Hypothesis arsitektural telah dirumuskan, tetapi eksperimen yang akan mendukung atau meruntuhkannya BELUM dijalankan.",
    Supported: "Execution evidence saat ini TIDAK MENYANGGAH hypothesis, dan evidence tersebut CONSISTENT dengan hypothesis arsitektural. INI BUKAN PEMBUKTIAN.",
    Refuted: "Minimal satu execution evidence secara langsung menyangga hypothesis arsitektural. Counter-example ditemukan.",
  },
  Evolutionary: {
    Planned: "Validation experiment untuk property evolusi telah didesain, tetapi sistem BELUM berkembang ke titik di mana eksperimen dapat dijalankan.",
    Running: "Eksperimen evolusi sedang berjalan (contoh: capability baru sedang ditambahkan, perubahan diff sedang dipantau).",
    Verified: "Eksperimen evolusi SELESAI dan hasilnya konsisten dengan klaim. Bukti evolusi riil telah terkumpul.",
    Refuted: "Eksperimen evolusi SELESAI dan hasilnya menyangga klaim. Property evolusi tidak berlaku.",
  },
} as const);

export const EVIDENCE_LAYER_DEFINITION = Object.freeze({
  Execution: {
    name: "Execution Evidence",
    description:
      "Observasi mentah dari eksperimen yang dijalankan. Hanya berisi APA yang TERAMATI (exit code, assertion result, hash values, log), TIDAK berisi interpretasi atau kesimpulan.",
    falsifiability:
      "Dapat direproduksi dan difalsifikasi dengan menjalankan command eksperimen yang identik pada environment yang setara. Orang ketiga dapat mereplikasi hasilnya tanpa interpretasi.",
    validStatuses: LAYER_LIFECYCLE_STATUS.Execution,
    lifecycle: {
      closedWord: "Resolved",
      description: "Execution claims yang telah Resolved adalah yang statusnya PASS atau FAIL — eksperimennya selesai dan ada hasil teramati.",
    },
  },
  Architectural: {
    name: "Architectural Hypothesis Supported by Current Evidence",
    description:
      "Hypothesis arsitektural yang DIPERKUAT (bukan dibuktikan) oleh execution evidence saat ini. Selalu dianggap tentative. Dapat diruntuhkan oleh counter-example pada eksperimen masa depan. Status lifecycle: Pending → Supported → (bisa kembali ke Pending atau Refuted), tidak pernah 'Closed'.",
    falsifiability:
      "Difalsifikasi dengan menemukan satu counter-example melalui: static audit mendalam, scenario test tambahan, fuzz testing, atau observasi runtime behavior yang bertentangan.",
    validStatuses: LAYER_LIFECYCLE_STATUS.Architectural,
    lifecycle: {
      closedWord: "N/A — hypothesis never closed",
      description: "Architectural hypothesis TIDAK PERNAH ditutup. Status maksimal adalah Supported dan tetap terbuka untuk invalidasi masa depan.",
    },
  },
  Evolutionary: {
    name: "Evolutionary Validation (Future Experiment)",
    description:
      "Klaim tentang property evolusi SISTEM, bukan property code snapshot. Baru dapat dievaluasi setelah sistem benar-benar berevolusi (beberapa capability ditambahkan, beberapa product dibangun). Status: Planned → Running → Verified / Refuted. Juga tidak pernah 'Closed' pada tahap experiment awal.",
    falsifiability:
      "Difalsifikasi dengan menjalankan scenario evolusi riil dan mengamati bahwa property yang dijanjikan tidak terpenuhi (misal: menambahkan capability membutuhkan perubahan runtime core).",
    validStatuses: LAYER_LIFECYCLE_STATUS.Evolutionary,
    lifecycle: {
      closedWord: "N/A — evolutionary claim stays revisable",
      description: "Evolutionary claim TIDAK PERNAH ditutup secara final. Verified berarti eksperimen telah berhasil, tetapi dapat di-refute oleh evidence evolusi berikutnya.",
    },
  },
} as const);

export type CertificationGate =
  | "Repository"
  | "Architecture"
  | "Foundation"
  | "Platform"
  | "Experience"
  | "Gateway"
  | "Observability"
  | "Security"
  | "Production";

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
  readonly category:
    | "scope"
    | "environment"
    | "coverage"
    | "methodology"
    | "hidden-dependency"
    | "measurement";
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
