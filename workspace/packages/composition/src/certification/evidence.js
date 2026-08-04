"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalEvidenceBundle = canonicalEvidenceBundle;
exports.computeEvidenceIdSync = computeEvidenceIdSync;
exports.computeEvidenceId = computeEvidenceId;
exports.verifyEvidenceIdentity = verifyEvidenceIdentity;
exports.canonicalTopology = canonicalTopology;
exports.computeGraphTopologyIdSync = computeGraphTopologyIdSync;
exports.computeGraphTopologyId = computeGraphTopologyId;
exports.canonicalRelation = canonicalRelation;
exports.computeRelationIdSync = computeRelationIdSync;
exports.computeRelationId = computeRelationId;
exports.verifyRelationIdentity = verifyRelationIdentity;
exports.canonicalSnapshotBundle = canonicalSnapshotBundle;
exports.computeSnapshotIdSync = computeSnapshotIdSync;
exports.computeSnapshotId = computeSnapshotId;
exports.verifySnapshotIdentity = verifySnapshotIdentity;
exports.computeSnapshotDelta = computeSnapshotDelta;
exports.canonicalExperimentDefinition = canonicalExperimentDefinition;
exports.computeExperimentDefinitionIdSync = computeExperimentDefinitionIdSync;
exports.computeExperimentDefinitionId = computeExperimentDefinitionId;
exports.verifyExperimentDefinitionIdentity = verifyExperimentDefinitionIdentity;
exports.canonicalExperimentExecution = canonicalExperimentExecution;
exports.computeExperimentExecutionIdSync = computeExperimentExecutionIdSync;
exports.computeExperimentExecutionId = computeExperimentExecutionId;
exports.verifyExperimentExecutionIdentity = verifyExperimentExecutionIdentity;
exports.canonicalRawObservation = canonicalRawObservation;
exports.computeRawObservationIdSync = computeRawObservationIdSync;
exports.computeRawObservationId = computeRawObservationId;
exports.verifyRawObservationIdentity = verifyRawObservationIdentity;
exports.defaultSemanticOutcomeResolver = defaultSemanticOutcomeResolver;
exports.buildProvenanceChainSync = buildProvenanceChainSync;
exports.buildEmptyProvenanceRegistry = buildEmptyProvenanceRegistry;
exports.mergeProvenanceChainIntoRegistry = mergeProvenanceChainIntoRegistry;
exports.collectProvenanceRegistryFromEvidencePackages = collectProvenanceRegistryFromEvidencePackages;
exports.buildEmptyProvenanceGraph = buildEmptyProvenanceGraph;
exports.defaultEvidenceObservationLinkKindFromSemanticOutcome = defaultEvidenceObservationLinkKindFromSemanticOutcome;
exports.buildEvidenceObservationEdgesForPackage = buildEvidenceObservationEdgesForPackage;
exports.compareExperimentDefinitions = compareExperimentDefinitions;
exports.buildVersionLineageEdge = buildVersionLineageEdge;
exports.buildProvenanceGraph = buildProvenanceGraph;
exports.computeObservationReuseIndex = computeObservationReuseIndex;
exports.countSemanticEvidenceEdges = countSemanticEvidenceEdges;
exports.computeNumericToleranceEquivalenceEdges = computeNumericToleranceEquivalenceEdges;
exports.computeObservationQualityBaseline = computeObservationQualityBaseline;
exports.computeObservationLifecycleBaseline = computeObservationLifecycleBaseline;
exports.buildReplicationGroupsScaffold = buildReplicationGroupsScaffold;
exports.computeClaimConsensusBaseline = computeClaimConsensusBaseline;
exports.enrichGraphWithAlpha10FrontiersScaffold = enrichGraphWithAlpha10FrontiersScaffold;
exports.canonicalObservationContentFingerprint = canonicalObservationContentFingerprint;
exports.computeObservationContentFingerprintSync = computeObservationContentFingerprintSync;
exports.computeObservationContentFingerprint = computeObservationContentFingerprint;
exports.buildEmpiricalReplicationGroupsFromMultipleRegistries = buildEmpiricalReplicationGroupsFromMultipleRegistries;
exports.enrichGraphWithAlpha11EmpiricalReplication = enrichGraphWithAlpha11EmpiricalReplication;
const serialize_1 = require("../canonical/serialize");
const types_1 = require("./types");
let runtimeSha256 = null;
function isStringRecord(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}
function detectNodeCryptoFromGlobalThis() {
    try {
        const anyGlobal = globalThis;
        const proc = anyGlobal.process;
        if (!isStringRecord(proc))
            return null;
        const versions = proc.versions;
        if (!isStringRecord(versions))
            return null;
        if (typeof versions.node !== "string")
            return null;
        const tryAsCrypto = (v) => {
            if (isStringRecord(v) && typeof v.createHash === "function") {
                return v;
            }
            return null;
        };
        const anyMod = anyGlobal.module;
        const builtinRequire = isStringRecord(anyMod) ? anyMod.builtinRequire : undefined;
        // Path 1: globalThis.require (CommonJS context — not available in pure ESM)
        const gRequire = anyGlobal.require;
        if (typeof gRequire === "function") {
            const r = tryAsCrypto(gRequire("crypto"));
            if (r !== null)
                return r;
        }
        // Path 2: module.builtinRequire (some bundlers)
        if (typeof builtinRequire === "function") {
            const r = tryAsCrypto(builtinRequire("crypto"));
            if (r !== null)
                return r;
        }
        // Path 3: process.mainModule.require (Node CJS legacy — null in ESM but try anyway)
        const mainMod = proc.mainModule;
        if (isStringRecord(mainMod) && typeof mainMod.require === "function") {
            try {
                const r = tryAsCrypto(mainMod.require("crypto"));
                if (r !== null)
                    return r;
            }
            catch { /* ignore */ }
        }
        // Path 4: Function-constructor dynamic evaluation (SAFE: identifier `require` hanya ada DALAM STRING — tidak terdeteksi TS2580,
        // dan pada Node.js runtime, Function constructor mendapatkan scope globals + require pada CJS.
        // Untuk ESM Node: fallback ke process.dlopen atau internal binding melalui eval string juga.
        const pathways = [
            // CJS-style: require dari Function scope globals
            '(function(){try{return require("crypto")}catch(e){return null}})()',
            // ESM workaround via createRequire on module (if it exists):
            '(function(){try{var m=process.binding("natives");if(m&&m.crypto){return null}return null}catch(e){return null}})()',
            // Last: try module.createRequire via process.mainModule.filename
            '(function(){try{var m=require("module");var r=m.createRequire(process.argv[1]||process.cwd()+"/x.js");return r("crypto")}catch(e){return null}})()',
        ];
        for (const expr of pathways) {
            try {
                const fn = new Function(expr);
                const resolved = fn();
                const crypto = tryAsCrypto(resolved);
                if (crypto !== null)
                    return crypto;
            }
            catch { /* ignore pathway */ }
        }
    }
    catch {
        // ignore top-level
    }
    return null;
}
function detectRuntimeSha256() {
    if (typeof crypto !== "undefined" &&
        typeof crypto === "object" &&
        crypto !== null &&
        typeof crypto.subtle === "object" &&
        typeof TextEncoder !== "undefined") {
        return async function webCryptoSha256(input) {
            const bytes = new TextEncoder().encode(input);
            const subtle = crypto.subtle;
            const buf = await subtle.digest("SHA-256", bytes);
            return Array.from(new Uint8Array(buf))
                .map(b => b.toString(16).padStart(2, "0"))
                .join("");
        };
    }
    const nodeCrypto = detectNodeCryptoFromGlobalThis();
    if (nodeCrypto !== null) {
        return async function nodeCryptoSha256(input) {
            const h = nodeCrypto.createHash("sha256");
            h.update(input);
            return h.digest("hex");
        };
    }
    return null;
}
function sha256HexSyncOrThrow(input) {
    const nodeCrypto = detectNodeCryptoFromGlobalThis();
    if (nodeCrypto === null) {
        throw new Error("computeEvidenceIdSync requires Node.js 'crypto' module (sha256) available via globalThis.require / globalThis.process. " +
            "WebCrypto is async-only in browser; use computeEvidenceId() async variant.");
    }
    const h = nodeCrypto.createHash("sha256");
    h.update(input);
    return h.digest("hex");
}
function canonicalEvidenceBundle(pkg) {
    if (pkg.schemaVersion !== types_1.EVIDENCE_SCHEMA_VERSION) {
        throw new TypeError(`EvidencePackage schemaVersion mismatch: expected ${types_1.EVIDENCE_SCHEMA_VERSION}, got ${pkg.schemaVersion}. ` +
            "Schema version is part of identity; bundles with berbeda schema TIDAK BOLEH saling menimpa.");
    }
    const envelope = {
        _schemaVersion: pkg.schemaVersion,
        _packageVersion: pkg.packageVersion,
        derivation: pkg.derivation,
        derivedFromEvidenceIds: pkg.derivedFromEvidenceIds ?? [],
        experimentId: pkg.experimentId,
        experimentProtocol: pkg.experimentProtocol,
        environmentConstraints: pkg.environmentConstraints ?? [],
        assertionIds: pkg.assertionIds ?? [],
        rawObservations: pkg.rawObservations,
        hashConsistency: pkg.hashConsistency ?? [],
        exitCode: pkg.exitCode ?? null,
        generatedBy: pkg.generatedBy,
        evidenceSources: pkg.evidenceSources,
        scriptFile: pkg.scriptFile ?? null,
        functionName: pkg.functionName ?? null,
        generatedAt: pkg.generatedAt,
        gitCommit: pkg.gitCommit ?? null,
        runner: pkg.runner
            ? {
                os: pkg.runner.os ?? null,
                arch: pkg.runner.arch ?? null,
                runtime: pkg.runner.runtime ?? null,
                runtimeVersion: pkg.runner.runtimeVersion ?? null,
            }
            : null,
        producerId: pkg.producerId ?? null,
        producerName: pkg.producerName ?? null,
        targetArtifactPath: pkg.targetArtifactPath ?? null,
        independentRun: pkg.independentRun ?? null,
    };
    return (0, serialize_1.canonicalSerialize)(envelope);
}
function computeEvidenceIdSync(pkg) {
    const bundle = canonicalEvidenceBundle(pkg);
    const sha = sha256HexSyncOrThrow(bundle);
    return {
        id: (0, types_1.EvidenceId)(sha),
        algorithm: "sha-256",
        schemaVersion: pkg.schemaVersion,
        canonicalBundleLength: bundle.length,
        pkg: Object.freeze({ ...pkg }),
    };
}
async function computeEvidenceId(pkg) {
    const bundle = canonicalEvidenceBundle(pkg);
    if (runtimeSha256 === null)
        runtimeSha256 = detectRuntimeSha256();
    let sha;
    if (runtimeSha256 !== null) {
        sha = await runtimeSha256(bundle);
    }
    else {
        sha = sha256HexSyncOrThrow(bundle);
    }
    return {
        id: (0, types_1.EvidenceId)(sha),
        algorithm: "sha-256",
        schemaVersion: pkg.schemaVersion,
        canonicalBundleLength: bundle.length,
        pkg: Object.freeze({ ...pkg }),
    };
}
function verifyEvidenceIdentity(identity) {
    const bundle = canonicalEvidenceBundle(identity.pkg);
    const sha = sha256HexSyncOrThrow(bundle);
    const recomputed = (0, types_1.EvidenceId)(sha);
    return {
        ok: recomputed === identity.id,
        recomputedId: recomputed,
        expected: identity.id,
    };
}
function canonicalTopology(claims, relations) {
    const claimIds = Object.keys(claims).sort();
    const claimsLevel = {};
    for (const id of claimIds)
        claimsLevel[id] = claims[id]?.evidenceLevel ?? "unknown";
    const sortedRelations = [...relations]
        .map(r => ({
        from: r.fromClaimId,
        kind: r.kind,
        to: r.toClaimId,
        rationale: r.rationale ?? "",
    }))
        .sort((a, b) => a.from === b.from
        ? a.kind === b.kind
            ? a.to.localeCompare(b.to)
            : a.kind.localeCompare(b.kind)
        : a.from.localeCompare(b.from));
    const topologyEnvelope = {
        _schemaVersion: "1.0",
        claimIds,
        claimsEvidenceLevel: claimsLevel,
        relations: sortedRelations,
    };
    return (0, serialize_1.canonicalSerialize)(topologyEnvelope);
}
function computeGraphTopologyIdSync(claims, relations) {
    const topo = canonicalTopology(claims, relations);
    const sha = sha256HexSyncOrThrow(topo);
    return {
        id: (0, types_1.GraphTopologyId)(sha),
        topologyLength: topo.length,
    };
}
async function computeGraphTopologyId(claims, relations) {
    const topo = canonicalTopology(claims, relations);
    if (runtimeSha256 === null)
        runtimeSha256 = detectRuntimeSha256();
    let sha;
    if (runtimeSha256 !== null)
        sha = await runtimeSha256(topo);
    else
        sha = sha256HexSyncOrThrow(topo);
    return {
        id: (0, types_1.GraphTopologyId)(sha),
        topologyLength: topo.length,
    };
}
function canonicalRelation(r) {
    const envelope = {
        _schemaVersion: "1.0",
        fromClaimId: r.fromClaimId,
        kind: r.kind,
        toClaimId: r.toClaimId,
        rationale: r.rationale ?? "",
    };
    return (0, serialize_1.canonicalSerialize)(envelope);
}
function computeRelationIdSync(r) {
    const s = canonicalRelation(r);
    const sha = sha256HexSyncOrThrow(s);
    return {
        id: (0, types_1.RelationId)(sha),
        canonicalLength: s.length,
    };
}
async function computeRelationId(r) {
    const s = canonicalRelation(r);
    if (runtimeSha256 === null)
        runtimeSha256 = detectRuntimeSha256();
    let sha;
    if (runtimeSha256 !== null)
        sha = await runtimeSha256(s);
    else
        sha = sha256HexSyncOrThrow(s);
    return {
        id: (0, types_1.RelationId)(sha),
        canonicalLength: s.length,
    };
}
function verifyRelationIdentity(r) {
    if (!r.id) {
        const recomputed = computeRelationIdSync(r);
        return { ok: false, recomputedId: recomputed.id, expected: null };
    }
    const recomputed = computeRelationIdSync(r);
    return {
        ok: recomputed.id === r.id,
        recomputedId: recomputed.id,
        expected: r.id,
    };
}
function sortedClaimRelations(rels) {
    return [...rels].sort((a, b) => {
        const ka = `${a.fromClaimId}|${a.kind}|${a.toClaimId}`;
        const kb = `${b.fromClaimId}|${b.kind}|${b.toClaimId}`;
        if (ka < kb)
            return -1;
        if (ka > kb)
            return 1;
        if (a.rationale !== undefined && b.rationale !== undefined) {
            return a.rationale.localeCompare(b.rationale);
        }
        return 0;
    });
}
function canonicalSnapshotBundle(envelope) {
    const hashable = Object.freeze({
        protocolVersion: envelope.protocolVersion,
        epistemicProtocolVersion: envelope.epistemicProtocolVersion,
        evidenceSchemaVersion: envelope.evidenceSchemaVersion,
        relationLayerRules: envelope.relationLayerRules,
        evidenceLayers: envelope.evidenceLayers,
        layerLifecycle: envelope.layerLifecycle,
        layerStatusSemantics: envelope.layerStatusSemantics,
        producedAt: envelope.producedAt,
        milestone: envelope.milestone,
        claims: envelope.claims,
        evidencePackages: envelope.evidencePackages,
        claimRelations: sortedClaimRelations(envelope.claimRelations),
        graphTopology: envelope.graphTopology,
        summary: envelope.summary,
        overall: envelope.overall,
    });
    return (0, serialize_1.canonicalSerialize)(hashable);
}
function computeSnapshotIdSync(envelope) {
    const hashable = {
        protocolVersion: envelope.protocolVersion,
        epistemicProtocolVersion: envelope.epistemicProtocolVersion,
        evidenceSchemaVersion: envelope.evidenceSchemaVersion,
        relationLayerRules: envelope.relationLayerRules,
        evidenceLayers: envelope.evidenceLayers,
        layerLifecycle: envelope.layerLifecycle,
        layerStatusSemantics: envelope.layerStatusSemantics,
        producedAt: envelope.producedAt,
        milestone: envelope.milestone,
        claims: envelope.claims,
        evidencePackages: envelope.evidencePackages,
        claimRelations: envelope.claimRelations,
        graphTopology: envelope.graphTopology,
        summary: envelope.summary,
        overall: envelope.overall,
    };
    const bundle = canonicalSnapshotBundle(hashable);
    const hex = sha256HexSyncOrThrow(bundle);
    return {
        id: (0, types_1.CertificationSnapshotId)(hex),
        canonicalBundleLength: bundle.length,
        canonicalBundle: bundle,
    };
}
async function computeSnapshotId(envelope) {
    const hashable = {
        protocolVersion: envelope.protocolVersion,
        epistemicProtocolVersion: envelope.epistemicProtocolVersion,
        evidenceSchemaVersion: envelope.evidenceSchemaVersion,
        relationLayerRules: envelope.relationLayerRules,
        evidenceLayers: envelope.evidenceLayers,
        layerLifecycle: envelope.layerLifecycle,
        layerStatusSemantics: envelope.layerStatusSemantics,
        producedAt: envelope.producedAt,
        milestone: envelope.milestone,
        claims: envelope.claims,
        evidencePackages: envelope.evidencePackages,
        claimRelations: envelope.claimRelations,
        graphTopology: envelope.graphTopology,
        summary: envelope.summary,
        overall: envelope.overall,
    };
    const bundle = canonicalSnapshotBundle(hashable);
    if (runtimeSha256 === null)
        runtimeSha256 = detectRuntimeSha256();
    const hex = runtimeSha256 !== null
        ? await runtimeSha256(bundle)
        : sha256HexSyncOrThrow(bundle);
    return {
        id: (0, types_1.CertificationSnapshotId)(hex),
        canonicalBundleLength: bundle.length,
        canonicalBundle: bundle,
    };
}
function verifySnapshotIdentity(envelope) {
    const recomputed = computeSnapshotIdSync(envelope);
    if (!envelope.snapshotId) {
        return { ok: false, recomputedId: recomputed.id, expected: null };
    }
    return {
        ok: recomputed.id === envelope.snapshotId,
        recomputedId: recomputed.id,
        expected: envelope.snapshotId,
    };
}
function computeSnapshotDelta(envelopeA, envelopeB) {
    const idA = computeSnapshotIdSync(envelopeA).id;
    const idB = computeSnapshotIdSync(envelopeB).id;
    const changed = [];
    const identic = idA === idB;
    if (!identic) {
        const aKeys = Object.keys(envelopeA.claims).sort();
        const bKeys = Object.keys(envelopeB.claims).sort();
        let claimsChanged = aKeys.length !== bKeys.length;
        if (!claimsChanged) {
            for (const k of aKeys) {
                const cA = envelopeA.claims[k];
                const cB = envelopeB.claims[k];
                if (!cA || !cB) {
                    claimsChanged = true;
                    break;
                }
                if (cA.status !== cB.status)
                    continue; // status change = statuses bucket, not claims
            }
        }
        const statusesChanged = (() => {
            const allKeys = Array.from(new Set([...aKeys, ...bKeys]));
            for (const k of allKeys) {
                const cA = envelopeA.claims[k];
                const cB = envelopeB.claims[k];
                if ((cA?.status ?? "∅") !== (cB?.status ?? "∅"))
                    return true;
            }
            return false;
        })();
        if (claimsChanged || !aKeys.every((k, i) => k === bKeys[i]))
            changed.push("claims");
        const evKeysA = Object.keys(envelopeA.evidencePackages).sort();
        const evKeysB = Object.keys(envelopeB.evidencePackages).sort();
        const evValuesEqual = evKeysA.length === evKeysB.length &&
            evKeysA.every((k, i) => k === evKeysB[i] && envelopeA.evidencePackages[k].id === envelopeB.evidencePackages[k].id);
        if (!evValuesEqual)
            changed.push("evidencePackages");
        const sortedRelsA = sortedClaimRelations(envelopeA.claimRelations);
        const sortedRelsB = sortedClaimRelations(envelopeB.claimRelations);
        const relsEqual = sortedRelsA.length === sortedRelsB.length &&
            sortedRelsA.every((ra, idx) => {
                const rb = sortedRelsB[idx];
                return ra.fromClaimId === rb.fromClaimId && ra.kind === rb.kind && ra.toClaimId === rb.toClaimId;
            });
        if (!relsEqual)
            changed.push("claimRelations");
        if (statusesChanged)
            changed.push("statuses");
        if (envelopeA.graphTopology.id !== envelopeB.graphTopology.id)
            changed.push("topology");
        if (envelopeA.milestone !== envelopeB.milestone ||
            envelopeA.producedAt !== envelopeB.producedAt ||
            envelopeA.evidenceSchemaVersion !== envelopeB.evidenceSchemaVersion ||
            envelopeA.epistemicProtocolVersion !== envelopeB.epistemicProtocolVersion) {
            changed.push("meta");
        }
    }
    return Object.freeze({ idA, idB, identical: identic, changed: Object.freeze(changed) });
}
// ──────────────────────────────────────────────────────────────────────
// SCIENTIFIC PROVENANCE GRAPH — Canonical Serialization + Identity
// Chain: ExperimentDefinition → ExperimentExecution → RawObservation
// Setiap node punya identity SHA-256 sendiri.
// ──────────────────────────────────────────────────────────────────────
function canonicalExperimentDefinition(def) {
    if (def.provenanceVersion !== types_1.PROVENANCE_PROTOCOL_VERSION) {
        throw new TypeError(`ExperimentDefinition provenanceVersion mismatch: expected ${types_1.PROVENANCE_PROTOCOL_VERSION}, got ${def.provenanceVersion}`);
    }
    const envelope = {
        _provenanceVersion: def.provenanceVersion,
        experimentKey: def.experimentKey,
        version: def.version,
        supersedes: (def.supersedes ?? []).map(String),
        title: def.title,
        objective: def.objective,
        protocolSteps: def.protocolSteps,
        assertions: def.assertions,
        expectedArtifact: def.expectedArtifact ?? null,
        ownerMilestone: def.ownerMilestone,
        definedAt: def.definedAt,
        definedBy: def.definedBy,
        changeNotes: def.changeNotes ?? [],
    };
    return (0, serialize_1.canonicalSerialize)(envelope);
}
function computeExperimentDefinitionIdSync(def) {
    const bundle = canonicalExperimentDefinition(def);
    const sha = sha256HexSyncOrThrow(bundle);
    return {
        id: (0, types_1.ExperimentDefinitionId)(sha),
        algorithm: "sha-256",
        provenanceVersion: def.provenanceVersion,
        canonicalBundleLength: bundle.length,
        def: Object.freeze({ ...def, id: (0, types_1.ExperimentDefinitionId)(sha) }),
    };
}
async function computeExperimentDefinitionId(def) {
    const bundle = canonicalExperimentDefinition(def);
    if (runtimeSha256 === null)
        runtimeSha256 = detectRuntimeSha256();
    const sha = runtimeSha256 !== null ? await runtimeSha256(bundle) : sha256HexSyncOrThrow(bundle);
    return {
        id: (0, types_1.ExperimentDefinitionId)(sha),
        algorithm: "sha-256",
        provenanceVersion: def.provenanceVersion,
        canonicalBundleLength: bundle.length,
        def: Object.freeze({ ...def, id: (0, types_1.ExperimentDefinitionId)(sha) }),
    };
}
function verifyExperimentDefinitionIdentity(identity) {
    const bundle = canonicalExperimentDefinition(identity.def);
    const sha = sha256HexSyncOrThrow(bundle);
    const recomputed = (0, types_1.ExperimentDefinitionId)(sha);
    return {
        ok: recomputed === identity.id,
        recomputedId: recomputed,
        expected: identity.id,
    };
}
function canonicalExperimentExecution(exe) {
    if (exe.provenanceVersion !== types_1.PROVENANCE_PROTOCOL_VERSION) {
        throw new TypeError(`ExperimentExecution provenanceVersion mismatch: expected ${types_1.PROVENANCE_PROTOCOL_VERSION}, got ${exe.provenanceVersion}`);
    }
    const envelope = {
        _provenanceVersion: exe.provenanceVersion,
        experimentDefinitionId: String(exe.experimentDefinitionId),
        executedAt: exe.executedAt,
        executorIdentity: exe.executorIdentity,
        gitCommit: exe.gitCommit,
        workingTreeDirtyCount: exe.workingTreeDirtyCount,
        runner: exe.runner
            ? {
                os: exe.runner.os,
                arch: exe.runner.arch,
                runtime: exe.runner.runtime,
                runtimeVersion: exe.runner.runtimeVersion,
                extra: exe.runner.extra ?? [],
            }
            : null,
        exitCode: exe.exitCode,
        rawObservationIds: exe.rawObservationIds.map(String),
    };
    return (0, serialize_1.canonicalSerialize)(envelope);
}
function computeExperimentExecutionIdSync(exe) {
    const bundle = canonicalExperimentExecution(exe);
    const sha = sha256HexSyncOrThrow(bundle);
    return {
        id: (0, types_1.ExperimentExecutionId)(sha),
        algorithm: "sha-256",
        provenanceVersion: exe.provenanceVersion,
        canonicalBundleLength: bundle.length,
        exe: Object.freeze({ ...exe, id: (0, types_1.ExperimentExecutionId)(sha) }),
    };
}
async function computeExperimentExecutionId(exe) {
    const bundle = canonicalExperimentExecution(exe);
    if (runtimeSha256 === null)
        runtimeSha256 = detectRuntimeSha256();
    const sha = runtimeSha256 !== null ? await runtimeSha256(bundle) : sha256HexSyncOrThrow(bundle);
    return {
        id: (0, types_1.ExperimentExecutionId)(sha),
        algorithm: "sha-256",
        provenanceVersion: exe.provenanceVersion,
        canonicalBundleLength: bundle.length,
        exe: Object.freeze({ ...exe, id: (0, types_1.ExperimentExecutionId)(sha) }),
    };
}
function verifyExperimentExecutionIdentity(identity) {
    const bundle = canonicalExperimentExecution(identity.exe);
    const sha = sha256HexSyncOrThrow(bundle);
    const recomputed = (0, types_1.ExperimentExecutionId)(sha);
    return {
        ok: recomputed === identity.id,
        recomputedId: recomputed,
        expected: identity.id,
    };
}
function canonicalRawObservation(obs) {
    if (obs.provenanceVersion !== types_1.PROVENANCE_PROTOCOL_VERSION) {
        throw new TypeError(`RawObservation provenanceVersion mismatch: expected ${types_1.PROVENANCE_PROTOCOL_VERSION}, got ${obs.provenanceVersion}`);
    }
    const envelope = {
        _provenanceVersion: obs.provenanceVersion,
        experimentExecutionId: String(obs.experimentExecutionId),
        index0: obs.index0,
        content: obs.content,
        observedAt: obs.observedAt,
        sourceChannel: obs.sourceChannel,
        semanticOutcome: obs.semanticOutcome,
        targetAssertionId: obs.targetAssertionId ?? null,
    };
    return (0, serialize_1.canonicalSerialize)(envelope);
}
function computeRawObservationIdSync(obs) {
    const bundle = canonicalRawObservation(obs);
    const sha = sha256HexSyncOrThrow(bundle);
    return {
        id: (0, types_1.RawObservationId)(sha),
        algorithm: "sha-256",
        provenanceVersion: obs.provenanceVersion,
        canonicalBundleLength: bundle.length,
        obs: Object.freeze({ ...obs, id: (0, types_1.RawObservationId)(sha) }),
    };
}
async function computeRawObservationId(obs) {
    const bundle = canonicalRawObservation(obs);
    if (runtimeSha256 === null)
        runtimeSha256 = detectRuntimeSha256();
    const sha = runtimeSha256 !== null ? await runtimeSha256(bundle) : sha256HexSyncOrThrow(bundle);
    return {
        id: (0, types_1.RawObservationId)(sha),
        algorithm: "sha-256",
        provenanceVersion: obs.provenanceVersion,
        canonicalBundleLength: bundle.length,
        obs: Object.freeze({ ...obs, id: (0, types_1.RawObservationId)(sha) }),
    };
}
function verifyRawObservationIdentity(identity) {
    const bundle = canonicalRawObservation(identity.obs);
    const sha = sha256HexSyncOrThrow(bundle);
    const recomputed = (0, types_1.RawObservationId)(sha);
    return {
        ok: recomputed === identity.id,
        recomputedId: recomputed,
        expected: identity.id,
    };
}
function defaultSemanticOutcomeResolver(obs, ctx) {
    const lower = obs.content.toLowerCase();
    if (lower.includes("fail") || lower.includes("violation") || lower.includes("refute") || lower.includes("tidak patuh")) {
        return "contradicts";
    }
    if (lower.includes("inconclusive") || lower.includes("no support") || lower.includes("tidak cukup") || lower.includes("not enough")) {
        return "inconclusive";
    }
    if (lower.includes("metadata") || lower.includes("pid:") || lower.includes("count=") || lower.includes("timestamp") || lower.startsWith("NOTE:")) {
        return "independent";
    }
    if (ctx.assertionCount > 0 && obs.index0 >= ctx.assertionCount && ctx.exitCode === 0) {
        return "independent";
    }
    if (ctx.exitCode !== 0 && obs.index0 < Math.max(1, ctx.assertionCount)) {
        return "contradicts";
    }
    return "supports";
}
function buildProvenanceChainSync(input) {
    const exitCode = input.executionMeta.exitCode ?? 0;
    const assertionCount = input.executionMeta.assertionCount ?? 0;
    const resolver = input.semanticResolver ?? defaultSemanticOutcomeResolver;
    const defRaw = Object.freeze({
        ...input.definition,
        provenanceVersion: types_1.PROVENANCE_PROTOCOL_VERSION,
        id: (0, types_1.ExperimentDefinitionId)("0".repeat(64)),
        version: input.definition.version ?? "1.0.0",
        supersedes: (input.definition.supersedes ?? Object.freeze([])),
        changeNotes: input.definition.changeNotes ?? Object.freeze([]),
    });
    const defIdent = computeExperimentDefinitionIdSync(defRaw);
    const def = Object.freeze({ ...defRaw, id: defIdent.id });
    const observationsUnsigned = input.observations.map((o, i) => {
        const outcome = o.semanticOutcome ?? resolver({ content: o.content, index0: i, sourceChannel: o.sourceChannel }, { exitCode, assertionCount });
        return Object.freeze({
            provenanceVersion: types_1.PROVENANCE_PROTOCOL_VERSION,
            id: (0, types_1.RawObservationId)("0".repeat(64)),
            experimentExecutionId: (0, types_1.ExperimentExecutionId)("0".repeat(64)),
            index0: i,
            content: o.content,
            observedAt: o.observedAt,
            sourceChannel: o.sourceChannel,
            semanticOutcome: outcome,
            targetAssertionId: o.targetAssertionId ?? undefined,
        });
    });
    const exeRaw = Object.freeze({
        provenanceVersion: types_1.PROVENANCE_PROTOCOL_VERSION,
        id: (0, types_1.ExperimentExecutionId)("0".repeat(64)),
        experimentDefinitionId: def.id,
        executedAt: input.executionMeta.executedAt,
        executorIdentity: input.executionMeta.executorIdentity,
        gitCommit: input.executionMeta.gitCommit,
        workingTreeDirtyCount: input.executionMeta.workingTreeDirtyCount ?? 0,
        runner: input.executionMeta.runner,
        exitCode: input.executionMeta.exitCode ?? 0,
        rawObservationIds: observationsUnsigned.map(o => o.id),
    });
    const obsIdentities = observationsUnsigned.map(o => {
        const rebased = Object.freeze({ ...o, experimentExecutionId: exeRaw.id });
        return computeRawObservationIdSync(rebased);
    });
    const exeRebased = Object.freeze({
        ...exeRaw,
        rawObservationIds: obsIdentities.map(i => i.id),
    });
    const exeIdent = computeExperimentExecutionIdSync(exeRebased);
    const exe = Object.freeze({ ...exeRebased, id: exeIdent.id });
    // NOTE: Second rebase intentionally preserved for BACKWARD-IDENTITY-STABILITY.
    // The 2nd rebase ensures observation.experimentExecutionId references the
    // REAL (non-placeholder) exe.id; observation identity is recomputed so that
    // verifyRawObservationIdentity() passes.
    const finalObs = obsIdentities.map(prevIdent => {
        const rebased = Object.freeze({
            ...prevIdent.obs,
            experimentExecutionId: exe.id,
        });
        return computeRawObservationIdSync(rebased);
    });
    const defFinal = defIdent.def.id === def.id ? defIdent : computeExperimentDefinitionIdSync(def);
    const chain = Object.freeze({
        definition: defFinal,
        execution: exeIdent.exe.id === exe.id ? exeIdent : computeExperimentExecutionIdSync(exe),
        observations: Object.freeze([...finalObs]),
    });
    const provenanceField = Object.freeze({
        experimentDefinitionId: chain.definition.id,
        experimentExecutionId: chain.execution.id,
        rawObservationIds: Object.freeze(chain.observations.map(o => o.id)),
    });
    return Object.freeze({ chain, provenanceField });
}
function buildEmptyProvenanceRegistry() {
    return Object.freeze({
        experimentDefinitions: Object.freeze({}),
        experimentExecutions: Object.freeze({}),
        rawObservations: Object.freeze({}),
    });
}
function mergeProvenanceChainIntoRegistry(registry, chain) {
    const defs = { ...registry.experimentDefinitions };
    const exes = { ...registry.experimentExecutions };
    const obs = { ...registry.rawObservations };
    const defKey = String(chain.definition.id);
    if (!defs[defKey]) {
        defs[defKey] = {
            id: chain.definition.id,
            algorithm: "sha-256",
            provenanceVersion: chain.definition.provenanceVersion,
            canonicalBundleLength: chain.definition.canonicalBundleLength,
            def: chain.definition.def,
        };
    }
    const exeKey = String(chain.execution.id);
    if (!exes[exeKey]) {
        exes[exeKey] = {
            id: chain.execution.id,
            algorithm: "sha-256",
            provenanceVersion: chain.execution.provenanceVersion,
            canonicalBundleLength: chain.execution.canonicalBundleLength,
            exe: chain.execution.exe,
        };
    }
    for (const oIdent of chain.observations) {
        const oKey = String(oIdent.id);
        if (!obs[oKey]) {
            obs[oKey] = {
                id: oIdent.id,
                algorithm: "sha-256",
                provenanceVersion: oIdent.provenanceVersion,
                canonicalBundleLength: oIdent.canonicalBundleLength,
                obs: oIdent.obs,
            };
        }
    }
    return Object.freeze({
        experimentDefinitions: Object.freeze(defs),
        experimentExecutions: Object.freeze(exes),
        rawObservations: Object.freeze(obs),
    });
}
function collectProvenanceRegistryFromEvidencePackages(evidencePackages, extendedPkgs = {}) {
    let registry = buildEmptyProvenanceRegistry();
    for (const [pkgKey, extPkg] of Object.entries(extendedPkgs)) {
        const chain = extPkg.__provenanceChain;
        if (chain)
            registry = mergeProvenanceChainIntoRegistry(registry, chain);
        void evidencePackages;
        void pkgKey;
    }
    return registry;
}
const types_2 = require("./types");
function buildEmptyProvenanceGraph() {
    return Object.freeze({
        modelVersion: types_2.PROVENANCE_GRAPH_MODEL_VERSION,
        builtAt: new Date().toISOString(),
        edgeCount: 0,
        evidenceObservationEdges: Object.freeze({}),
        definitionVersionLineageEdges: Object.freeze({}),
    });
}
function edgeSha(raw) {
    return (0, types_1.ProvenanceEdgeId)(sha256HexSyncOrThrow((0, serialize_1.canonicalSerialize)(raw)));
}
function defaultEvidenceObservationLinkKindFromSemanticOutcome(obsSemantic) {
    switch (obsSemantic) {
        case "supports":
            return "supports";
        case "contradicts":
            return "contradicts";
        case "inconclusive":
            return "inconclusive";
        case "independent":
        default:
            return "metadata";
    }
}
function buildEvidenceObservationEdgesForPackage(evidenceId, pkg, observations, assigner = (obs, ctx) => {
    // Alpha.9 GRAPH v2.0: Jika observation memiliki semanticOutcome EKSPLISIT
    // (dari builder provenance), prioritaskan mapping semanticOutcome → link kind.
    // Fallback ke heuristic exitCode + assertionIndex jika semanticOutcome tidak tersedia (baseline packages).
    if (obs.semanticOutcome) {
        return defaultEvidenceObservationLinkKindFromSemanticOutcome(obs.semanticOutcome);
    }
    if (ctx.assertionIndex >= 0 && ctx.evidencePkg.exitCode === 0)
        return "supports";
    if (ctx.assertionIndex >= 0 && (ctx.evidencePkg.exitCode ?? 0) !== 0)
        return "contradicts";
    return "metadata";
}) {
    const edges = [];
    for (let i = 0; i < observations.length; i++) {
        const rawObs = observations[i];
        // SELALU recompute identity observation untuk menghindari edge dengan id placeholder
        const ident = rawObs.id && /^obs:sha256:[a-f0-9]{64}$/.test(String(rawObs.id)) && !String(rawObs.id).endsWith("0".repeat(64))
            ? { id: rawObs.id }
            : computeRawObservationIdSync(rawObs);
        const obs = ident.id === rawObs.id ? rawObs : { ...rawObs, id: ident.id };
        const assertionIndex = (pkg.assertionIds ?? []).length > i ? i : -1;
        const kind = assigner(obs, { evidenceId, evidencePkg: pkg, assertionIndex });
        const raw = {
            _edgeKind: "EvidenceObservationSemanticEdge",
            fromEvidenceId: String(evidenceId),
            toRawObservationId: String(obs.id),
            kind,
            assertionIndex,
        };
        edges.push(Object.freeze({ id: edgeSha(raw), fromEvidenceId: evidenceId, toRawObservationId: obs.id, kind, assertionIndex }));
    }
    return edges;
}
function compareExperimentDefinitions(a, b) {
    const sameExperimentKey = a.experimentKey === b.experimentKey;
    const protocolAdded = a.protocolSteps.filter(s => !b.protocolSteps.includes(s)).length;
    const protocolRemoved = b.protocolSteps.filter(s => !a.protocolSteps.includes(s)).length;
    const assertionsAdded = a.assertions.filter(s => !b.assertions.includes(s)).length;
    const assertionsRemoved = b.assertions.filter(s => !a.assertions.includes(s)).length;
    const protocolChanged = a.protocolSteps.length !== b.protocolSteps.length || protocolAdded > 0 || protocolRemoved > 0;
    const assertionsChanged = a.assertions.length !== b.assertions.length || assertionsAdded > 0 || assertionsRemoved > 0;
    const objectiveChanged = a.objective !== b.objective;
    let compatibility = "identical-protocol";
    const rationales = [];
    if (protocolChanged)
        rationales.push(`protocol steps: +${protocolAdded}/-${protocolRemoved}`);
    if (assertionsChanged)
        rationales.push(`assertions: +${assertionsAdded}/-${assertionsRemoved}`);
    if (objectiveChanged)
        rationales.push("objective berbeda");
    if (!sameExperimentKey) {
        compatibility = "incomparable";
        rationales.unshift(`experimentKey berbeda a=${a.experimentKey} b=${b.experimentKey}`);
    }
    else if (!protocolChanged && !assertionsChanged && !objectiveChanged) {
        compatibility = "identical-protocol";
    }
    else if (!protocolChanged && assertionsChanged) {
        compatibility = "compatible-subset";
    }
    else if (protocolChanged && !assertionsChanged) {
        compatibility = "breaking-change";
    }
    else {
        compatibility = "breaking-change";
    }
    return {
        sameExperimentKey,
        versionA: a.version,
        versionB: b.version,
        protocolChanged,
        assertionsChanged,
        objectiveChanged,
        protocolAddedCount: protocolAdded,
        protocolRemovedCount: protocolRemoved,
        assertionsAddedCount: assertionsAdded,
        assertionsRemovedCount: assertionsRemoved,
        compatibility,
        rationale: rationales.length > 0 ? rationales.join("; ") : "identical definitions (protocol + assertions + objective cocok semua)",
    };
}
function buildVersionLineageEdge(newer, older) {
    const cmp = compareExperimentDefinitions(newer, older);
    const raw = {
        _edgeKind: "ExperimentDefinitionVersionLineageEdge",
        newDefinitionId: String(newer.id),
        supersedesDefinitionId: String(older.id),
        compatibility: cmp.compatibility,
        rationale: cmp.rationale,
    };
    return Object.freeze({
        id: edgeSha(raw),
        newDefinitionId: newer.id,
        supersedesDefinitionId: older.id,
        compatibility: cmp.compatibility,
        rationale: cmp.rationale,
    });
}
function buildProvenanceGraph(input) {
    const obsEdges = {};
    const verEdges = {};
    const obsRegistry = input.registry.rawObservations;
    for (const [pkgKey, ident] of Object.entries(input.evidencePackages)) {
        const ext = input.extendedPackages?.[pkgKey];
        const prov = ident.pkg.provenance;
        if (!prov)
            continue;
        const observationsForPkg = prov.rawObservationIds
            .map(id => obsRegistry[String(id)]?.obs)
            .filter((x) => !!x);
        // Fallback: only rely on __provenanceChain inside extended package IF it's 100% registry-unresolved (alpha6 baseline packages, pre-registry)
        if (ext?.__provenanceChain) {
            for (const oIdent of ext.__provenanceChain.observations) {
                if (!observationsForPkg.find(o => String(o.id) === String(oIdent.id)))
                    observationsForPkg.push(oIdent.obs);
            }
        }
        // Filter OUT observations with placeholder IDs (packages with provenance injected at correlate-time will have non-zero)
        const withoutPlaceholder = observationsForPkg.filter(o => !/^obs:sha256:0{64}$/.test(String(o.id)) && !obsRegistry["0".repeat(64)]);
        if (withoutPlaceholder.length === 0)
            continue;
        const edges = buildEvidenceObservationEdgesForPackage(ident.id, ident.pkg, Object.freeze(withoutPlaceholder), input.observationLinkAssigner);
        for (const e of edges)
            obsEdges[String(e.id)] = e;
        void pkgKey;
    }
    for (const [a, b] of input.definitionPairs ?? []) {
        const edge = buildVersionLineageEdge(a, b);
        verEdges[String(edge.id)] = edge;
    }
    return Object.freeze({
        modelVersion: types_2.PROVENANCE_GRAPH_MODEL_VERSION,
        builtAt: new Date().toISOString(),
        edgeCount: Object.keys(obsEdges).length + Object.keys(verEdges).length,
        evidenceObservationEdges: Object.freeze(obsEdges),
        definitionVersionLineageEdges: Object.freeze(verEdges),
    });
}
function computeObservationReuseIndex(graph) {
    const index = {};
    for (const e of Object.values(graph.evidenceObservationEdges)) {
        const key = String(e.toRawObservationId);
        if (!index[key])
            index[key] = [];
        if (!index[key].includes(e.fromEvidenceId))
            index[key].push(e.fromEvidenceId);
    }
    let reused = 0;
    let singleton = 0;
    let max = 0;
    for (const arr of Object.values(index)) {
        if (arr.length >= 2)
            reused++;
        else
            singleton++;
        if (arr.length > max)
            max = arr.length;
    }
    return Object.freeze({
        reuseIndex: Object.freeze(Object.fromEntries(Object.entries(index).map(([k, v]) => [k, Object.freeze(v)]))),
        reusedObservationCount: reused,
        singletonObservationCount: singleton,
        maxReusePerObservation: max,
    });
}
function countSemanticEvidenceEdges(graph) {
    let s = 0, c = 0, i = 0, m = 0;
    for (const e of Object.values(graph.evidenceObservationEdges)) {
        switch (e.kind) {
            case "supports":
                s++;
                break;
            case "contradicts":
                c++;
                break;
            case "inconclusive":
                i++;
                break;
            case "metadata":
            default:
                m++;
                break;
        }
    }
    return { supports: s, contradicts: c, inconclusive: i, metadata: m };
}
// ═══════════════════════════════════════════════════════════════════════════
// ALPHA.10 EPISTEMIC FRONTIERS — Minimal Runtime Scaffold Helpers
// ═══════════════════════════════════════════════════════════════════════════
// Semua function DI BAWAH INI adalah scaffold MINIMAL (bukan production
// reasoning engine). Tujuannya untuk memverifikasi BAHWA type contracts
// Alpha.10 (yang baru di-append di types.ts) BISA di-instantiate secara
// runtime dengan data actual registry Alpha.9, menghasilkan counts > 0,
// DAN TIDAK merusak backward compatibility (Alpha.9 graph consumers
// yang tidak membaca field tambahan opsional ini akan tetap aman).
//
// Design constraint APPEND-ONLY:
//   * SHA-256 identity untuk OBS/EXE/EXD/EVD TIDAK BERUBAH.
//   * Function helpers HANYA MENAMBAHKAN sidecar entries ke graph
//     (field opsional pada CertificationProvenanceGraph)
//   * Tidak ada rewrite / mutation terhadap object Alpha.9 existing
//     yang tersimpan di registry (read only usage).
// ───────────────────────────────────────────────────────────────────────────
// FRONTIER #1 — Semantic Equivalence Classifier (numeric-tolerance scaffold)
// ───────────────────────────────────────────────────────────────────────────
// Heuristic sederhana:
//   1. Coba parsing angka dari content RawObservation dengan regex yang
//      menangkap "key=value" atau "sebelum angka = X".
//   2. Dua observation dalam EXECUTION YANG SAMA (experimentExecutionId)
//      atau dalam equivalence pair (misal two consecutive runs) dicompare:
//      jika selisih numerik ≤ tolerance → buat edge "numeric-tolerance".
//
// Catatan: Ini adalah scaffold classifier. Production nanti butuh
// domain-specific classifier (temperature-domain, latency-domain, dll)
// yang masing-masing mempunyai tol tersendiri.
const _alpha10NumRe = /(-?\d+(?:\.\d+)?)/;
function computeNumericToleranceEquivalenceEdges(registry, definitions, opts = {}) {
    void definitions;
    const tol = opts.numericToleranceAbsolute ?? 1e-3;
    const maxPairs = opts.maxPairsPerKind ?? 2000;
    const classifier = opts.assertedByClassifierId ?? "alpha10-scaffold:numeric-tolerance-v1";
    const entries = Object.values(registry.rawObservations);
    const out = {};
    let made = 0;
    for (let i = 0; i < entries.length && made < maxPairs; i++) {
        const eA = entries[i];
        const mA = _alpha10NumRe.exec(eA.obs.content);
        if (!mA)
            continue;
        const a = Number(mA[1]);
        if (!Number.isFinite(a))
            continue;
        for (let j = i + 1; j < entries.length && made < maxPairs; j++) {
            const eB = entries[j];
            // scaffold: hanya pair dengan execution berbeda → menghindari pair
            // dalam execution yang sama (umumnya tidak ekuivalen secara scientifik)
            if (String(eA.obs.experimentExecutionId) === String(eB.obs.experimentExecutionId))
                continue;
            const mB = _alpha10NumRe.exec(eB.obs.content);
            if (!mB)
                continue;
            const b = Number(mB[1]);
            if (!Number.isFinite(b))
                continue;
            if (Math.abs(a - b) > tol)
                continue;
            const leftRaw = String(eA.id) + "|" + String(eB.id);
            const keyHex = sha256HexSyncOrThrow(leftRaw);
            const id = (0, types_1.ProvenanceEdgeId)(keyHex);
            if (out[String(id)])
                continue;
            out[String(id)] = Object.freeze({
                id,
                leftObservationId: eA.id,
                rightObservationId: eB.id,
                kind: "numeric-tolerance",
                toleranceNumericAbsolute: tol,
                rationale: `|numeric_a(${a}) - numeric_b(${b})| = ${Math.abs(a - b).toFixed(8)} ≤ tol=${tol}`,
                assertedBy: classifier,
                assertedAt: new Date().toISOString(),
            });
            made++;
        }
    }
    return Object.freeze(out);
}
// ───────────────────────────────────────────────────────────────────────────
// FRONTIER #2 — Weighted Evidence / Baseline Quality Classifier
// ───────────────────────────────────────────────────────────────────────────
// Heuristic scaffold baseline (bukan truth). Bobot 0..1 ditentukan dari:
//   * sourceChannelReliability: "fs.stat"=0.98, "ts.TypeChecker"=0.90,
//     "git.stdout"=0.85, "child_process.stdout"=0.70, default=0.50
//   * confidence: apakah content mengandung kata kepastian ("exists=true",
//     "pass", "exit=0")=0.95, jika ambigu=0.60, jika mengandung
//     "fail"/"violation"/"error"=0.90 (high confidence, outcome negatif tapi yakin)
//   * precision: scaffold = 0.75 (placeholder). Production: instrument precision.
//   * certainty: scaffold = 0.75
//   * sampleSize: scaffold = 1 (single probe). Production N dari batch.
//
// aggregateQualityScore01 canonical:
//   wConf=0.28, wPrec=0.17, wCert=0.17, wSize=0.08, wSrc=0.30
//   → weighted sum (clamp 0..1). Ini reproducible dari 5 input fields.
const _alpha10SrcRel = Object.freeze({
    "fs.stat": 0.98, "fs.readdir": 0.97, "fs.readFile": 0.96,
    "ts.TypeChecker": 0.90, "ts.AST.walk": 0.88, "ts.ModuleResolution": 0.87,
    "git.stdout": 0.85, "git.status.porcelain": 0.83, "git.rev-parse": 0.82,
    "child_process.stdout": 0.70, "child_process.stderr": 0.68,
    "node.process.env": 0.60, "runtime.console.log": 0.55,
});
const _alpha10QWeights = Object.freeze({
    conf: 0.28, prec: 0.17, cert: 0.17, size: 0.08, src: 0.30,
});
function _bucketQuality(q) {
    if (q >= 0.90)
        return "gold-standard";
    if (q >= 0.75)
        return "high";
    if (q >= 0.50)
        return "medium";
    if (q >= 0.25)
        return "low";
    return "critical-unknown";
}
function computeObservationQualityBaseline(registry, opts = {}) {
    const clsId = opts.classifierId ?? "alpha10-scaffold:quality-baseline-v1";
    const clsVer = opts.classifierVersion ?? "1.0.0-scaffold";
    const now = new Date().toISOString();
    const out = {};
    for (const entry of Object.values(registry.rawObservations)) {
        const content = entry.obs.content;
        const low = content.toLowerCase();
        let srcRel = _alpha10SrcRel[entry.obs.sourceChannel];
        if (srcRel === undefined)
            srcRel = 0.50;
        let confidence;
        if (/exists\s*=\s*true\b|exit\s*=\s*0\b|\bpass(ed)?\b|\bunanimous\b/i.test(low))
            confidence = 0.95;
        else if (/fail|violation|refute|contradict|exit\s*=\s*[1-9]\d*/i.test(low))
            confidence = 0.90;
        else if (/no support|insufficient|not enough|inconclusive|unknown/i.test(low))
            confidence = 0.55;
        else
            confidence = 0.70;
        const precision = 0.75;
        const certainty = 0.75;
        const sampleSize = opts.sampleSizeOverride ?? 1;
        const size01 = Math.min(1, sampleSize / 20);
        const agg = confidence * _alpha10QWeights.conf +
            precision * _alpha10QWeights.prec +
            certainty * _alpha10QWeights.cert +
            size01 * _alpha10QWeights.size +
            srcRel * _alpha10QWeights.src;
        const clamped = Math.max(0, Math.min(1, agg));
        out[String(entry.id)] = Object.freeze({
            observationId: entry.id,
            confidence, precision, certainty, sampleSize,
            sourceChannelReliability: srcRel,
            aggregateQualityScore01: Number(clamped.toFixed(4)),
            qualityBucket: _bucketQuality(clamped),
            qualityClassifierId: clsId,
            classifierVersion: clsVer,
            assertedAt: now,
        });
    }
    return Object.freeze(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Object.freeze(v)])));
}
// ───────────────────────────────────────────────────────────────────────────
// FRONTIER #3 — Observation Lifecycle Baseline Heuristic
// ───────────────────────────────────────────────────────────────────────────
// Transitions scaffold:
//   * Semua obs mulai "created" (saat exec probe tulis observation).
//   * Lalu "verified": identity recompute sama dengan registry entry.id.
//     (Scaffold: karena entries berasal dari registry, mereka auto-verified).
//   * Lalu "replicated": jika observation muncul di reuseIndex ≥2 Evidence
//     packages ATAU jika ada equivalence edge ≥2 independent EXEs menunjuk
//     observation yang sama / ekuivalen.
//
// Deprecated / superseded = tidak dibuat oleh scaffold (karena butuh
// alasan actual auditor / instrument error terdeteksi).
function computeObservationLifecycleBaseline(registry, reuseIdx, opts = {}) {
    const cls = opts.classifierId ?? "alpha10-scaffold:lifecycle-baseline-v1";
    const now = opts.nowIso ?? new Date().toISOString();
    const out = {};
    for (const entry of Object.values(registry.rawObservations)) {
        const obsId = entry.id;
        const reused = (reuseIdx.reuseIndex[String(obsId)]?.length ?? 0) >= 2;
        const transitions = [
            Object.freeze({
                fromState: "none", toState: "created",
                transitionedAt: entry.obs.observedAt,
                reason: `RawObservation produced by sourceChannel=${entry.obs.sourceChannel} exec=${String(entry.obs.experimentExecutionId).slice(0, 16)}…`,
                transitionedBy: "provenance-registry:insert",
            }),
            Object.freeze({
                fromState: "created", toState: "verified",
                transitionedAt: now,
                reason: `registry identity recompute verified: computeRawObservationIdSync(entry.obs) === entry.id (SHA-256 match)`,
                transitionedBy: cls,
            }),
        ];
        let state = "verified";
        if (reused) {
            state = "replicated";
            transitions.push(Object.freeze({
                fromState: "verified", toState: "replicated",
                transitionedAt: now,
                reason: `Observation referenced by EvidencePackages count=${reuseIdx.reuseIndex[String(obsId)].length} ≥ 2 (cross-package reuse = de-facto replicated)`,
                transitionedBy: `${cls}:cross-package-reuse≥2`,
            }));
        }
        out[String(obsId)] = Object.freeze({
            observationId: obsId,
            currentState: state,
            transitions: Object.freeze(transitions),
        });
    }
    return Object.freeze(out);
}
// ───────────────────────────────────────────────────────────────────────────
// FRONTIER #4 — Independent Replication Groups (Scaffold Synthetic Heuristic)
// ───────────────────────────────────────────────────────────────────────────
// Scaffold: untuk SINI, kita tidak menjalankan process N times (karena
// itu membutuhkan multi-run separate). Sebagai gantinya kita construct
// replication groups berdasarkan actual definitionIds yang SAMA punya
// ≥1 EXEs. Lalu kita beri status:
//   totalExecutions == 1 → "not-replicated" (jalannya 1x saja)
//   totalExecutions ≥2 → "replicated-weak" (asumsi scaffold: karena ini
//      single-process generate, convergence ratio tidak bisa ≥ 0.95 tanpa
//      actual run kedua → status weak jujur = replicated tapi tidak cukup
//      independent executor identity berbeda).
//
// Reproducibility note: Frontier #4 yang SESUNGGUHNYA membutuhkan
// eksekusi multi-process atau multi-host. Scaffold ini HANYA membuktikan
// type ReplicationGroup bisa diisi, BUKAN actual replication evidence.
function buildReplicationGroupsScaffold(registry, opts = {}) {
    const cls = opts.classifierId ?? "alpha10-scaffold:replication-group-v1";
    const now = new Date().toISOString();
    // Group EXE by experimentDefinitionId
    const groups = {};
    for (const exeEntry of Object.values(registry.experimentExecutions)) {
        const defId = String(exeEntry.exe.experimentDefinitionId);
        if (!groups[defId])
            groups[defId] = [];
        groups[defId].push(exeEntry);
    }
    const out = {};
    for (const [defId, exeEntries] of Object.entries(groups)) {
        const defEntry = registry.experimentDefinitions[defId];
        if (!defEntry)
            continue;
        const total = exeEntries.length;
        const succ = exeEntries.filter(e => e.exe.exitCode === 0).length;
        // distinct executor identity = field executorIdentity pada EXE
        const distinctExecutors = new Set(exeEntries.map(e => e.exe.executorIdentity ?? "unknown")).size;
        // convergence: scaffold = jujur = 0.50 jika single run, 0.80 jika ≥2 (estimate)
        // karena kita tidak punya actual cross-run obs equivalence di single-process.
        const convergence = total < 2 ? 0 : 0.80;
        let status = "not-replicated";
        if (total >= 2) {
            if (distinctExecutors < 2)
                status = "replicated-weak"; // single executor identity (belum benar-benar independent)
            else if (convergence >= 0.95 && succ === total)
                status = "replicated-strong";
            else if (convergence >= 0.50)
                status = "replicated-weak";
            else
                status = "replication-failed";
        }
        const stableGrpId = `repgrp:${defEntry.def.experimentKey}:v${defEntry.def.version}`;
        out[stableGrpId] = Object.freeze({
            groupId: stableGrpId,
            experimentDefinitionId: defEntry.id,
            experimentDefinitionVersion: defEntry.def.version,
            executionIds: Object.freeze(exeEntries.map(e => e.id)),
            distinctExecutorIdentities: distinctExecutors,
            successfulExecutionCount: succ,
            totalExecutionCount: total,
            observationConvergenceRatio01: Number(convergence.toFixed(4)),
            replicationStatus: status,
            reportSummary: total < 2
                ? `Single execution (total=${total}) → BUKAN replicated. Butuh ≥2 INDEPENDENT runs (different host/process) untuk replication evidence.`
                : `${total} EXEs, ${succ} success, distinctExecutors=${distinctExecutors}, convergence=${convergence.toFixed(4)} → status=${status}. Scaffold jujur: single-session.`,
            assembledAt: now,
        });
        void cls;
    }
    return Object.freeze(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Object.freeze(v)])));
}
function computeClaimConsensusBaseline(envelope, graph, qualityIndex, opts = {}) {
    const clsVer = opts.classifierVersion ?? "alpha10-scaffold:claim-consensus-v1";
    const minW = opts.minimumTotalWeight ?? 0.5;
    const now = new Date().toISOString();
    // Buat lookup edge by EvidenceId -> list of obs edges
    const byEid = {};
    void byEid;
    const edgesArr = Object.values(graph.evidenceObservationEdges);
    const edgeByEvidence = {};
    for (const e of edgesArr) {
        const key = String(e.fromEvidenceId);
        if (!edgeByEvidence[key])
            edgeByEvidence[key] = [];
        edgeByEvidence[key].push(e);
    }
    const out = {};
    for (const claim of Object.values(envelope.claims)) {
        const evidences = (claim.evidenceIds ?? []);
        let wSupp = 0, wCont = 0, wInc = 0;
        const contribs = new Map();
        let totalW = 0;
        for (const eidRaw of evidences) {
            const eid = String(eidRaw);
            const edges = edgeByEvidence[eid] ?? [];
            for (const edge of edges) {
                const obsIdStr = String(edge.toRawObservationId);
                const q = qualityIndex?.[obsIdStr]?.aggregateQualityScore01 ?? 0.5;
                switch (edge.kind) {
                    case "supports":
                        wSupp += q;
                        totalW += q;
                        break;
                    case "contradicts":
                        wCont += q;
                        totalW += q;
                        break;
                    case "inconclusive":
                        wInc += q;
                        totalW += q;
                        break;
                    case "metadata":
                    default:
                        totalW += q * 0.1;
                        break; // metadata lightly counted
                }
                if (edge.kind === "supports" || edge.kind === "contradicts") {
                    contribs.set(obsIdStr, (contribs.get(obsIdStr) ?? 0) + q);
                }
            }
        }
        const denom = Math.max(1e-9, totalW);
        const wSuppN = Math.min(1, wSupp / denom);
        const wContN = Math.min(1, wCont / denom);
        const wIncN = Math.min(1, wInc / denom);
        // top 3 contributors sort by weight desc
        const top = [...contribs.entries()]
            .sort((a, b) => (b[1] - a[1]))
            .slice(0, 3)
            .map(([obsIdStr]) => obsIdStr);
        // conflicting detection
        const conflictingIds = [];
        // if contradictory quality ≥ threshold (>= 1/4 dari total supporting quality)
        const conflictingQual = wCont >= 0.20 * Math.max(0.5, wSupp);
        if (conflictingQual) {
            for (const eidRaw of evidences) {
                const edges = edgeByEvidence[String(eidRaw)] ?? [];
                for (const e of edges)
                    if (e.kind === "contradicts")
                        conflictingIds.push(e.toRawObservationId);
            }
        }
        let strength;
        if (totalW < minW)
            strength = "inconclusive";
        else if (conflictingQual)
            strength = "conflicting";
        else if (wSuppN >= 0.67)
            strength = "strong";
        else if (wSuppN >= 0.50)
            strength = "moderate";
        else
            strength = "weak";
        const rationaleParts = [];
        rationaleParts.push(`claim=${claim.id} status=${claim.status} evidenceIds_count=${evidences.length}`);
        rationaleParts.push(`weighted_supports=${wSuppN.toFixed(3)} weighted_contradicts=${wContN.toFixed(3)} weighted_inconclusive=${wIncN.toFixed(3)} total_weight=${totalW.toFixed(3)}`);
        rationaleParts.push(`top_contributors_count=${top.length}`);
        if (conflictingQual)
            rationaleParts.push(`conflicting_detected=quality_contradicts>=0.20*supporting`);
        out[claim.id] = Object.freeze({
            claimId: claim.id,
            strength,
            weightedSupportsScore01: Number(wSuppN.toFixed(4)),
            weightedContradictsScore01: Number(wContN.toFixed(4)),
            weightedInconclusiveScore01: Number(wIncN.toFixed(4)),
            topContributorObservationIds: Object.freeze(top),
            conflictingObservationIds: conflictingIds.length > 0 ? Object.freeze(conflictingIds) : undefined,
            rationale: rationaleParts.join(" | "),
            classifierVersion: clsVer,
            computedAt: now,
        });
    }
    return Object.freeze(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Object.freeze(v)])));
}
// Convenience ALL-IN-ONE: populate graph dengan 5 frontier fields
// (semua opsional, backward compatible) dengan default scaffold classifiers.
// Hasilnya adalah graph baru (immutable new object — Alpha.9 graph original
// tidak disentuh).
function enrichGraphWithAlpha10FrontiersScaffold(input) {
    const { envelope, baseGraph } = input;
    const reuseIdx = computeObservationReuseIndex(baseGraph);
    const eqEdges = computeNumericToleranceEquivalenceEdges(envelope.provenanceRegistry, envelope.provenanceRegistry.experimentDefinitions);
    const quality = computeObservationQualityBaseline(envelope.provenanceRegistry);
    const lifecycle = computeObservationLifecycleBaseline(envelope.provenanceRegistry, { reuseIndex: reuseIdx.reuseIndex, });
    const repGrps = buildReplicationGroupsScaffold(envelope.provenanceRegistry);
    const consensus = computeClaimConsensusBaseline({ claims: envelope.claims, evidencePackages: envelope.evidencePackages, }, baseGraph, quality);
    return Object.freeze({
        modelVersion: baseGraph.modelVersion,
        builtAt: baseGraph.builtAt,
        edgeCount: baseGraph.edgeCount,
        evidenceObservationEdges: baseGraph.evidenceObservationEdges,
        definitionVersionLineageEdges: baseGraph.definitionVersionLineageEdges,
        observationSemanticEquivalenceEdges: eqEdges,
        observationLifecycleIndex: lifecycle,
        observationQualityIndex: quality,
        replicationGroupIndex: repGrps,
        claimConsensusIndex: consensus,
    });
}
// ══════════════════════════════════════════════════════════════════════════════
// ALPHA.11 — Independent Multi-Executor Reproduction (EMPIRICAL, bukan scaffold)
// ══════════════════════════════════════════════════════════════════════════════
//
// Prinsip utama:
//   ObservationContentFingerprint ≠ SHA-256(obs identity).
//   Identity hash mencakup experimentExecutionId + observedAt → BERBEDA setiap run.
//   Content fingerprint HANYA mencakup makna (content, index0, semanticOutcome,
//   sourceChannel) → SAMA jika observasi sebenarnya adalah "pengukuran yang sama".
//
// Dua pengukuran dari EXE berbeda (berbeda executor, berbeda host, berbeda waktu)
// dianggap REPRODUCIBLE secara empiris JIKA content fingerprint SAMA.
function canonicalObservationContentFingerprint(obs) {
    if (obs.provenanceVersion !== types_1.PROVENANCE_PROTOCOL_VERSION) {
        throw new TypeError(`RawObservation provenanceVersion mismatch: expected ${types_1.PROVENANCE_PROTOCOL_VERSION}, got ${obs.provenanceVersion}`);
    }
    const envelope = {
        _tag: "observation-content-fp:v1",
        _provenanceVersion: obs.provenanceVersion,
        index0: obs.index0,
        content: obs.content,
        sourceChannel: obs.sourceChannel,
        semanticOutcome: obs.semanticOutcome,
    };
    return (0, serialize_1.canonicalSerialize)(envelope);
}
function computeObservationContentFingerprintSync(obs) {
    return sha256HexSyncOrThrow(canonicalObservationContentFingerprint(obs));
}
async function computeObservationContentFingerprint(obs) {
    if (runtimeSha256 === null)
        runtimeSha256 = detectRuntimeSha256();
    const bundle = canonicalObservationContentFingerprint(obs);
    return runtimeSha256 !== null ? await runtimeSha256(bundle) : sha256HexSyncOrThrow(bundle);
}
function buildEmpiricalReplicationGroupsFromMultipleRegistries(registries, opts = {}) {
    const cls = opts.classifierId ?? "alpha11:empirical-multi-executor-replication-v1";
    void cls;
    const assembledAt = new Date().toISOString();
    // ── Step 1: Gabung seluruh EXE dari seluruh registry, keyed by definitionId.
    const exeByDef = {};
    const allRegistriesUnionDefs = {};
    for (const reg of registries) {
        for (const [k, v] of Object.entries(reg.experimentDefinitions))
            allRegistriesUnionDefs[k] = v;
        for (const exeEntry of Object.values(reg.experimentExecutions)) {
            const defId = String(exeEntry.exe.experimentDefinitionId);
            if (!exeByDef[defId])
                exeByDef[defId] = [];
            exeByDef[defId].push(exeEntry);
        }
    }
    // ── Step 2: Untuk tiap definition, kumpulkan per-EXE obs → content fingerprints.
    const allFpGlobal = {}; // fp → distinct executor identities that saw it
    const perDefEmp = {};
    const replGroups = {};
    for (const [defIdStr, exeEntries] of Object.entries(exeByDef)) {
        const defEntry = allRegistriesUnionDefs[defIdStr];
        if (!defEntry)
            continue;
        const def = defEntry.def;
        const exeIds = exeEntries.map(e => e.id);
        const executorIdentities = exeEntries.map(e => e.exe.executorIdentity);
        const distinctExecutors = new Set(executorIdentities.filter(Boolean)).size;
        const totalExes = exeEntries.length;
        const succExes = exeEntries.filter(e => e.exe.exitCode === 0).length;
        const perExeObsFps = {};
        const perExeObsCounts = {};
        const fpOccurrenceByExec = {}; // fp → set of executor identities containing it
        const allFpsThisDef = new Set();
        // Build lookup: exeId → observations from the registry, iterating rawObservations
        // directly (NOT through exe.rawObservationIds). Known circular-dependency issue
        // in buildProvenanceChainSync: EXE identity is computed over first-pass
        // rawObservationIds, then OBS are re-signed with final EXE.id → registry keys
        // differ from what exe.rawObservationIds stores. The rawObservations registry
        // always has the correct post-rebase obs entries with experimentExecutionId set
        // to the final EXE.id, so iteration here is authoritative.
        const obsByExe = {};
        for (const reg of registries) {
            for (const obsEntry of Object.values(reg.rawObservations)) {
                const exeIdStr = String(obsEntry.obs.experimentExecutionId);
                if (!obsByExe[exeIdStr])
                    obsByExe[exeIdStr] = [];
                obsByExe[exeIdStr].push(obsEntry);
            }
        }
        for (const exeEntry of exeEntries) {
            const exeIdStr = String(exeEntry.id);
            const exeExecIdentity = exeEntry.exe.executorIdentity ?? "unknown";
            const fps = [];
            const relevantObs = obsByExe[exeIdStr] ?? [];
            for (const obsEntry of relevantObs) {
                const fp = computeObservationContentFingerprintSync(obsEntry.obs);
                fps.push(fp);
                allFpsThisDef.add(fp);
                if (!fpOccurrenceByExec[fp])
                    fpOccurrenceByExec[fp] = new Set();
                fpOccurrenceByExec[fp].add(exeExecIdentity);
                if (!allFpGlobal[fp])
                    allFpGlobal[fp] = new Set();
                allFpGlobal[fp].add(exeExecIdentity);
            }
            perExeObsFps[exeIdStr] = Object.freeze(fps);
            perExeObsCounts[exeIdStr] = fps.length;
        }
        const totalUniqFp = allFpsThisDef.size;
        let replicatedFp = 0;
        let singletonFp = 0;
        for (const fp of allFpsThisDef) {
            const cnt = (fpOccurrenceByExec[fp]?.size) ?? 0;
            if (cnt >= 2)
                replicatedFp++;
            else
                singletonFp++;
        }
        const convergence = totalUniqFp === 0 ? 0 : replicatedFp / totalUniqFp;
        let status = "not-replicated";
        if (totalExes >= 2) {
            if (distinctExecutors >= 2 && convergence >= 0.95 && succExes === totalExes)
                status = "replicated-strong";
            else if (succExes >= 2 && convergence >= 0.50)
                status = "replicated-weak";
            else if (succExes >= 2)
                status = "replication-failed";
            else
                status = "replication-failed";
        }
        const stableGrpId = `repgrp:${def.experimentKey}:v${def.version}`;
        const fpOccurrenceByExecReadonly = {};
        for (const [fp, setVal] of Object.entries(fpOccurrenceByExec)) {
            fpOccurrenceByExecReadonly[fp] = Object.freeze([...setVal].sort());
        }
        perDefEmp[defIdStr] = Object.freeze({
            experimentDefinitionId: defEntry.id,
            experimentDefinitionVersion: def.version,
            experimentKey: def.experimentKey,
            totalExecutions: totalExes,
            successfulExecutions: succExes,
            distinctExecutorIdentities: distinctExecutors,
            totalUniqueContentFps: totalUniqFp,
            replicatedContentFpsCount: replicatedFp,
            singletonContentFpsCount: singletonFp,
            observationConvergenceRatio01: Number(convergence.toFixed(4)),
            replicationStatus: status,
            executionIds: Object.freeze([...exeIds]),
            executorIdentities: Object.freeze([...executorIdentities]),
            perExecutionObsCounts: Object.freeze({ ...perExeObsCounts }),
            fpOccurrenceCountsByExecutor: Object.freeze({ ...fpOccurrenceByExecReadonly }),
        });
        const reportSummary = totalExes < 2
            ? `Single runs total=${totalExes} for def=${def.experimentKey}; not replicated (need ≥2 independent runs).`
            : `${totalExes} EXEs succ=${succExes}/${totalExes} distinctExecutors=${distinctExecutors} convergence=${convergence.toFixed(4)} replicatedFps=${replicatedFp}/${totalUniqFp} → status=${status}.`;
        replGroups[stableGrpId] = Object.freeze({
            groupId: stableGrpId,
            experimentDefinitionId: defEntry.id,
            experimentDefinitionVersion: def.version,
            executionIds: Object.freeze([...exeIds]),
            distinctExecutorIdentities: distinctExecutors,
            successfulExecutionCount: succExes,
            totalExecutionCount: totalExes,
            observationConvergenceRatio01: Number(convergence.toFixed(4)),
            replicationStatus: status,
            reportSummary,
            assembledAt,
        });
    }
    // ── Step 3: Compute aggregate MultiExecutorEmpiricalMetrics.
    const registryCount = registries.length;
    const totalDefsWithEx = Object.keys(exeByDef).length;
    let defsMulti = 0, defsStrong = 0, defsWeak = 0, defsFail = 0, defsNone = 0;
    let totalUniqFpAll = 0, replicatedFpAll = 0;
    for (const emp of Object.values(perDefEmp)) {
        if (emp.distinctExecutorIdentities >= 2)
            defsMulti++;
        switch (emp.replicationStatus) {
            case "replicated-strong":
                defsStrong++;
                break;
            case "replicated-weak":
                defsWeak++;
                break;
            case "replication-failed":
                defsFail++;
                break;
            case "not-replicated":
            default:
                defsNone++;
                break;
        }
        totalUniqFpAll += emp.totalUniqueContentFps;
        replicatedFpAll += emp.replicatedContentFpsCount;
    }
    // Global reproducibility rate: gunakan allFpGlobal agar dedup fp lintas definitions
    const globalUniqFps = Object.keys(allFpGlobal).length;
    const globalRepFps = Object.values(allFpGlobal).filter(s => (s?.size ?? 0) >= 2).length;
    const reproducibilityRate01 = globalUniqFps === 0 ? 0 : Number((globalRepFps / globalUniqFps).toFixed(4));
    // Observation stability: rata-rata pairwise Jaccard sim antar DISTINCT executor identity
    // fingerprint set (aggregasi lintas definition).
    const byExecAll = {};
    for (const [fp, execSet] of Object.entries(allFpGlobal)) {
        for (const exec of execSet) {
            if (!byExecAll[exec])
                byExecAll[exec] = new Set();
            byExecAll[exec].add(fp);
        }
    }
    const distinctExecList = Object.keys(byExecAll);
    let pairSum = 0, pairCount = 0;
    for (let i = 0; i < distinctExecList.length; i++) {
        for (let j = i + 1; j < distinctExecList.length; j++) {
            const a = byExecAll[distinctExecList[i]];
            const b = byExecAll[distinctExecList[j]];
            let inter = 0;
            for (const fp of a)
                if (b.has(fp))
                    inter++;
            const union = a.size + b.size - inter;
            const jac = union === 0 ? 1 : inter / union;
            pairSum += jac;
            pairCount++;
        }
    }
    const observationStability01 = pairCount === 0 ? 0 : Number((pairSum / pairCount).toFixed(4));
    const crossExecutorPairCount = pairCount;
    // Disagreement rate: diantara fps yang muncul di ≥2 distinct executors,
    // fraksi yang TIDAK muncul di SEMUA distinct executors.
    let covered = 0, disagreed = 0;
    const totalExecutors = distinctExecList.length;
    for (const execSet of Object.values(allFpGlobal)) {
        const sz = execSet?.size ?? 0;
        if (sz < 2)
            continue;
        covered++;
        if (sz < totalExecutors)
            disagreed++;
    }
    const disagreementRate01 = covered === 0 ? 0 : Number((disagreed / covered).toFixed(4));
    // Execution variance: koefisien variasi observation count per execution.
    const counts = [];
    for (const emp of Object.values(perDefEmp)) {
        for (const c of Object.values(emp.perExecutionObsCounts))
            counts.push(c);
    }
    let cv = 0;
    if (counts.length >= 2) {
        const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
        if (mean > 0) {
            const variance = counts.reduce((a, b) => a + (b - mean) * (b - mean), 0) / counts.length;
            const sd = Math.sqrt(variance);
            cv = sd / mean;
        }
    }
    const executionVariance01 = Number((1 - 1 / (1 + cv)).toFixed(4));
    const metrics = Object.freeze({
        registryCount,
        totalDefinitionsWithExecutions: totalDefsWithEx,
        definitionsWithMultiExecutor: defsMulti,
        definitionsReplicatedStrong: defsStrong,
        definitionsReplicatedWeak: defsWeak,
        definitionsReplicationFailed: defsFail,
        definitionsNotReplicated: defsNone,
        totalUniqueObservationFps: globalUniqFps,
        replicatedObservationFps: globalRepFps,
        reproducibilityRate01,
        observationStability01,
        disagreementRate01,
        executionVariance01,
        crossExecutorPairCount,
        assembledAt,
    });
    void totalUniqFpAll;
    void replicatedFpAll;
    return Object.freeze({
        replicationGroups: Object.freeze(Object.fromEntries(Object.entries(replGroups).map(([k, v]) => [k, Object.freeze(v)]))),
        perDefinitionEmpirical: Object.freeze(Object.fromEntries(Object.entries(perDefEmp).map(([k, v]) => [k, Object.freeze(v)]))),
        metrics,
    });
}
function enrichGraphWithAlpha11EmpiricalReplication(baseGraph, multiRegistryResult) {
    return Object.freeze({
        modelVersion: baseGraph.modelVersion,
        builtAt: baseGraph.builtAt,
        edgeCount: baseGraph.edgeCount,
        evidenceObservationEdges: baseGraph.evidenceObservationEdges,
        definitionVersionLineageEdges: baseGraph.definitionVersionLineageEdges,
        observationSemanticEquivalenceEdges: baseGraph.observationSemanticEquivalenceEdges,
        observationLifecycleIndex: baseGraph.observationLifecycleIndex,
        observationQualityIndex: baseGraph.observationQualityIndex,
        replicationGroupIndex: multiRegistryResult.replicationGroups,
        claimConsensusIndex: baseGraph.claimConsensusIndex,
    });
}
