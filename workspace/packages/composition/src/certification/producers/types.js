"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.produceEvidencePackageEnvelope = produceEvidencePackageEnvelope;
exports.produceEvidencePackageEnvelopeWithProvenance = produceEvidencePackageEnvelopeWithProvenance;
const types_1 = require("../types");
const evidence_1 = require("../evidence");
function produceEvidencePackageEnvelope(producer, body, ctx) {
    return Object.freeze({
        packageVersion: "2.0",
        schemaVersion: types_1.EVIDENCE_SCHEMA_VERSION,
        derivation: producer.derivation,
        derivedFromEvidenceIds: Object.freeze([]),
        experimentId: body.experimentId ?? producer.experimentId,
        experimentProtocol: Object.freeze([...body.experimentProtocol]),
        rawObservations: Object.freeze([...body.rawObservations]),
        exitCode: body.exitCode ?? 0,
        assertionIds: body.assertionIds ? Object.freeze([...body.assertionIds]) : Object.freeze([]),
        environmentConstraints: body.environmentConstraints ? Object.freeze([...body.environmentConstraints]) : Object.freeze([]),
        hashConsistency: body.hashConsistency ? Object.freeze([...body.hashConsistency]) : Object.freeze([]),
        generatedBy: Object.freeze([
            `independent-evidence-producer:${producer.producerId} (${producer.producerName})`,
        ]),
        evidenceSources: Object.freeze([...body.evidenceSources, ...ctx.commonSources]),
        scriptFile: body.scriptFile,
        functionName: body.functionName,
        generatedAt: ctx.generatedAt,
        gitCommit: body.gitCommit,
        runner: ctx.runner,
        producerId: producer.producerId,
        producerName: producer.producerName,
        targetArtifactPath: producer.targetArtifactPath,
        independentRun: true,
    });
}
function produceEvidencePackageEnvelopeWithProvenance(producer, body, ctx) {
    const defFromProducer = body.experimentDefinition ?? producer.experimentDefinition;
    let provenanceField;
    let chainResult;
    if (defFromProducer) {
        const exitCode = body.exitCode ?? 0;
        const srcChannels = body.observationSourceChannels?.length === body.rawObservations.length
            ? body.observationSourceChannels
            : body.rawObservations.map(() => producer.producerId);
        const obsTimestamps = body.observationTimestamps?.length === body.rawObservations.length
            ? body.observationTimestamps
            : body.rawObservations.map(() => ctx.generatedAt);
        const provenanceInput = {
            definition: defFromProducer,
            executionMeta: {
                executedAt: ctx.generatedAt,
                executorIdentity: ctx.executorIdentity ?? `pid=${typeof process !== "undefined" ? process.pid ?? 0 : 0}:${producer.producerId}`,
                gitCommit: body.gitCommit ?? ctx.gitCommit ?? "0000000000000000000000000000000000000000",
                workingTreeDirtyCount: ctx.workingTreeDirtyCount ?? 0,
                runner: {
                    os: ctx.runner.os ?? "unknown",
                    arch: ctx.runner.arch ?? "unknown",
                    runtime: ctx.runner.runtime ?? "unknown",
                    runtimeVersion: ctx.runner.runtimeVersion ?? "unknown",
                },
                exitCode,
            },
            observations: body.rawObservations.map((content, i) => ({
                content,
                observedAt: obsTimestamps[i],
                sourceChannel: srcChannels[i],
            })),
        };
        chainResult = (0, evidence_1.buildProvenanceChainSync)(provenanceInput);
        provenanceField = chainResult.provenanceField;
    }
    const base = produceEvidencePackageEnvelope(producer, body, ctx);
    const pkg = provenanceField
        ? Object.freeze({ ...base, provenance: provenanceField })
        : base;
    if (chainResult) {
        return Object.freeze({ ...pkg, __provenanceChain: chainResult });
    }
    return pkg;
}
