"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVIDENCE_LAYER_DEFINITION = exports.LAYER_STATUS_SEMANTICS = exports.LAYER_LIFECYCLE_STATUS = exports.RELATION_LAYER_RULES = exports.PROVENANCE_GRAPH_MODEL_VERSION = exports.PROVENANCE_PROTOCOL_VERSION = exports.EVIDENCE_SCHEMA_VERSION = exports.EPISTEMIC_PROTOCOL_VERSION = void 0;
exports.EvidenceId = EvidenceId;
exports.GraphTopologyId = GraphTopologyId;
exports.RelationId = RelationId;
exports.CertificationSnapshotId = CertificationSnapshotId;
exports.ProvenanceEdgeId = ProvenanceEdgeId;
exports.ExperimentDefinitionId = ExperimentDefinitionId;
exports.ExperimentExecutionId = ExperimentExecutionId;
exports.RawObservationId = RawObservationId;
exports.isRelationAllowed = isRelationAllowed;
exports.EPISTEMIC_PROTOCOL_VERSION = "5.0";
function EvidenceId(sha256Hex) {
    if (!/^[a-f0-9]{64}$/.test(sha256Hex)) {
        throw new TypeError(`EvidenceId requires lowercase 64-hex SHA-256, got: ${sha256Hex}`);
    }
    return `evd:sha256:${sha256Hex}`;
}
exports.EVIDENCE_SCHEMA_VERSION = "2.0";
function GraphTopologyId(sha256Hex) {
    if (!/^[a-f0-9]{64}$/.test(sha256Hex)) {
        throw new TypeError(`GraphTopologyId requires lowercase 64-hex SHA-256, got: ${sha256Hex}`);
    }
    return `graph:sha256:${sha256Hex}`;
}
function RelationId(sha256Hex) {
    if (!/^[a-f0-9]{64}$/.test(sha256Hex)) {
        throw new TypeError(`RelationId requires lowercase 64-hex SHA-256, got: ${sha256Hex}`);
    }
    return `rel:sha256:${sha256Hex}`;
}
function CertificationSnapshotId(sha256Hex) {
    if (!/^[a-f0-9]{64}$/.test(sha256Hex)) {
        throw new TypeError(`CertificationSnapshotId requires lowercase 64-hex SHA-256, got: ${sha256Hex}`);
    }
    return `snp:sha256:${sha256Hex}`;
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
exports.PROVENANCE_PROTOCOL_VERSION = "1.0";
exports.PROVENANCE_GRAPH_MODEL_VERSION = "2.0";
function ProvenanceEdgeId(sha256Hex) {
    if (!/^[a-f0-9]{64}$/.test(sha256Hex))
        throw new TypeError(`ProvenanceEdgeId requires 64-hex SHA-256, got: ${sha256Hex}`);
    return `peg:sha256:${sha256Hex}`;
}
function ExperimentDefinitionId(sha256Hex) {
    if (!/^[a-f0-9]{64}$/.test(sha256Hex))
        throw new TypeError(`ExperimentDefinitionId requires 64-hex SHA-256, got: ${sha256Hex}`);
    return `exd:sha256:${sha256Hex}`;
}
function ExperimentExecutionId(sha256Hex) {
    if (!/^[a-f0-9]{64}$/.test(sha256Hex))
        throw new TypeError(`ExperimentExecutionId requires 64-hex SHA-256, got: ${sha256Hex}`);
    return `exe:sha256:${sha256Hex}`;
}
function RawObservationId(sha256Hex) {
    if (!/^[a-f0-9]{64}$/.test(sha256Hex))
        throw new TypeError(`RawObservationId requires 64-hex SHA-256, got: ${sha256Hex}`);
    return `obs:sha256:${sha256Hex}`;
}
exports.RELATION_LAYER_RULES = Object.freeze({
    supports: Object.freeze({
        Execution: Object.freeze(["Execution", "Architectural"]),
        Architectural: Object.freeze(["Architectural"]),
        Evolutionary: Object.freeze([]),
    }),
    dependsOn: Object.freeze({
        Execution: Object.freeze([]),
        Architectural: Object.freeze(["Execution", "Architectural"]),
        Evolutionary: Object.freeze(["Architectural", "Evolutionary"]),
    }),
    contradicts: Object.freeze({
        Execution: Object.freeze(["Execution", "Architectural"]),
        Architectural: Object.freeze(["Execution", "Architectural", "Evolutionary"]),
        Evolutionary: Object.freeze(["Architectural", "Evolutionary"]),
    }),
    supersedes: Object.freeze({
        Execution: Object.freeze(["Execution"]),
        Architectural: Object.freeze(["Architectural"]),
        Evolutionary: Object.freeze(["Evolutionary"]),
    }),
});
function isRelationAllowed(fromLevel, kind, toLevel) {
    const allowed = exports.RELATION_LAYER_RULES[kind][fromLevel];
    return Array.isArray(allowed) && allowed.includes(toLevel);
}
exports.LAYER_LIFECYCLE_STATUS = Object.freeze({
    Execution: ["PASS", "FAIL"],
    Architectural: ["Pending", "Supported", "Refuted"],
    Evolutionary: ["Planned", "Running", "Verified", "Refuted"],
});
exports.LAYER_STATUS_SEMANTICS = Object.freeze({
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
});
exports.EVIDENCE_LAYER_DEFINITION = Object.freeze({
    Execution: {
        name: "Execution Evidence",
        description: "Observasi mentah dari eksperimen yang dijalankan. Hanya berisi APA yang TERAMATI (exit code, assertion result, hash values, log), TIDAK berisi interpretasi atau kesimpulan.",
        falsifiability: "Dapat direproduksi dan difalsifikasi dengan menjalankan command eksperimen yang identik pada environment yang setara. Orang ketiga dapat mereplikasi hasilnya tanpa interpretasi.",
        validStatuses: exports.LAYER_LIFECYCLE_STATUS.Execution,
        lifecycle: {
            closedWord: "Resolved",
            description: "Execution claims yang telah Resolved adalah yang statusnya PASS atau FAIL — eksperimennya selesai dan ada hasil teramati.",
        },
    },
    Architectural: {
        name: "Architectural Hypothesis Supported by Current Evidence",
        description: "Hypothesis arsitektural yang DIPERKUAT (bukan dibuktikan) oleh execution evidence saat ini. Selalu dianggap tentative. Dapat diruntuhkan oleh counter-example pada eksperimen masa depan. Status lifecycle: Pending → Supported → (bisa kembali ke Pending atau Refuted), tidak pernah 'Closed'.",
        falsifiability: "Difalsifikasi dengan menemukan satu counter-example melalui: static audit mendalam, scenario test tambahan, fuzz testing, atau observasi runtime behavior yang bertentangan.",
        validStatuses: exports.LAYER_LIFECYCLE_STATUS.Architectural,
        lifecycle: {
            closedWord: "N/A — hypothesis never closed",
            description: "Architectural hypothesis TIDAK PERNAH ditutup. Status maksimal adalah Supported dan tetap terbuka untuk invalidasi masa depan.",
        },
    },
    Evolutionary: {
        name: "Evolutionary Validation (Future Experiment)",
        description: "Klaim tentang property evolusi SISTEM, bukan property code snapshot. Baru dapat dievaluasi setelah sistem benar-benar berevolusi (beberapa capability ditambahkan, beberapa product dibangun). Status: Planned → Running → Verified / Refuted. Juga tidak pernah 'Closed' pada tahap experiment awal.",
        falsifiability: "Difalsifikasi dengan menjalankan scenario evolusi riil dan mengamati bahwa property yang dijanjikan tidak terpenuhi (misal: menambahkan capability membutuhkan perubahan runtime core).",
        validStatuses: exports.LAYER_LIFECYCLE_STATUS.Evolutionary,
        lifecycle: {
            closedWord: "N/A — evolutionary claim stays revisable",
            description: "Evolutionary claim TIDAK PERNAH ditutup secara final. Verified berarti eksperimen telah berhasil, tetapi dapat di-refute oleh evidence evolusi berikutnya.",
        },
    },
});
