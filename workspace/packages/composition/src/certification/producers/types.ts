import type {
  EvidencePackage,
  EvidenceDerivationKind,
  ExperimentDefinition,
} from "../types";
import { EVIDENCE_SCHEMA_VERSION, PROVENANCE_PROTOCOL_VERSION } from "../types";
import {
  buildProvenanceChainSync,
  type ProvenanceChainResult,
  type BuildProvenanceChainInput,
  type FullProvenanceChain,
} from "../evidence";

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

export interface ProduceEnvelopeWithProvenanceBody
  extends Partial<EvidencePackage> {
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

export function produceEvidencePackageEnvelope(
  producer: IndependentEvidenceProducer,
  body: Partial<EvidencePackage> & {
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
  },
  ctx: ProducerContext,
): EvidencePackage {
  return Object.freeze({
    packageVersion: "2.0",
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
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
  } satisfies EvidencePackage);
}

export function produceEvidencePackageEnvelopeWithProvenance(
  producer: IndependentEvidenceProducer,
  body: ProduceEnvelopeWithProvenanceBody,
  ctx: ProducerContext,
): EvidencePackage & { readonly __provenanceChain?: ProvenanceChainResult } {
  const defFromProducer = body.experimentDefinition ?? producer.experimentDefinition;
  let provenanceField: EvidencePackage["provenance"];
  let chainResult: ProvenanceChainResult | undefined;

  if (defFromProducer) {
    const exitCode = body.exitCode ?? 0;
    const srcChannels = body.observationSourceChannels?.length === body.rawObservations.length
      ? body.observationSourceChannels
      : body.rawObservations.map(() => producer.producerId);
    const obsTimestamps = body.observationTimestamps?.length === body.rawObservations.length
      ? body.observationTimestamps
      : body.rawObservations.map(() => ctx.generatedAt);

    const provenanceInput: BuildProvenanceChainInput = {
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
        observedAt: obsTimestamps[i]!,
        sourceChannel: srcChannels[i]!,
      })),
    };
    chainResult = buildProvenanceChainSync(provenanceInput);
    provenanceField = chainResult.provenanceField;
  }

  const base = produceEvidencePackageEnvelope(producer, body, ctx);
  const pkg = provenanceField
    ? Object.freeze({ ...base, provenance: provenanceField } satisfies EvidencePackage)
    : base;

  if (chainResult) {
    return Object.freeze({ ...pkg, __provenanceChain: chainResult });
  }
  return pkg as EvidencePackage & { readonly __provenanceChain?: ProvenanceChainResult };
}
