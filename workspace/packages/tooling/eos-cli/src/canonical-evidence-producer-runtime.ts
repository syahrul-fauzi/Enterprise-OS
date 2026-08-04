import type {
  CanonicalEvidenceArtifact,
} from "./evidence-artifact-runtime.js";
import {
  materializeCanonicalEvidenceArtifact,
  writeCanonicalEvidenceArtifact,
} from "./evidence-artifact-runtime.js";
import type { Projection } from "./projection-domain.js";

export type CanonicalEvidenceProducerDefinition = Readonly<{
  producer_id: string;
  artifact_type: string;
  subject_type: string;
  schema_version: "1.0.0";
  description: string;
  default_projection_ref: string | null;
  claim_boundary: string;
}>;

export type CanonicalEvidenceProducerTarget = Readonly<{
  producer_id: string;
  producer_class:
    | "foundation"
    | "gate"
    | "specification"
    | "decision"
    | "runtime"
    | "doctor"
    | "policy"
    | "build";
  description: string;
}>;

export type CanonicalEvidenceProducerReport = Readonly<{
  report_version: "1.0.0";
  status: "PASS" | "WARN";
  summary: {
    readonly producer_count: number;
    readonly canonical_schema_versions: readonly string[];
    readonly artifact_type_count: number;
    readonly subject_type_count: number;
    readonly producers_with_default_projection_ref: number;
    readonly target_producer_count: number;
    readonly registered_target_producer_count: number;
    readonly target_coverage_ratio: number;
  };
  producers: readonly {
    readonly producer_id: string;
    readonly artifact_type: string;
    readonly subject_type: string;
    readonly schema_version: "1.0.0";
    readonly default_projection_ref: string | null;
    readonly canonical_envelope: {
      readonly subject: true;
      readonly projection: true;
      readonly digest: true;
      readonly signature: true;
      readonly generated_at_utc: true;
      readonly summary: true;
      readonly findings: true;
      readonly evidence: true;
      readonly claim_boundary: true;
    };
  }[];
  missing_target_producers: readonly CanonicalEvidenceProducerTarget[];
  claim_boundary: string;
}>;

export const DEFAULT_CANONICAL_EVIDENCE_PRODUCER_TARGETS = [
  {
    producer_id: "foundation-report-producer",
    producer_class: "foundation",
    description: "Repository-level foundation verification evidence.",
  },
  {
    producer_id: "gate-c-status-producer",
    producer_class: "gate",
    description: "Gate C operational status evidence.",
  },
  {
    producer_id: "specification-conformance-producer",
    producer_class: "specification",
    description: "Specification conformance evidence.",
  },
  {
    producer_id: "decision-outcome-producer",
    producer_class: "decision",
    description: "Decision outcome evidence.",
  },
  {
    producer_id: "decision-impact-producer",
    producer_class: "decision",
    description: "Decision impact evidence.",
  },
  {
    producer_id: "product-runtime-producer",
    producer_class: "runtime",
    description: "Runtime verification evidence for verified products.",
  },
  {
    producer_id: "doctor-producer",
    producer_class: "doctor",
    description: "Doctor diagnostics evidence.",
  },
  {
    producer_id: "policy-producer",
    producer_class: "policy",
    description: "Policy evaluation evidence.",
  },
  {
    producer_id: "build-producer",
    producer_class: "build",
    description: "Build verification evidence.",
  },
] as const satisfies readonly CanonicalEvidenceProducerTarget[];

export function defineCanonicalEvidenceProducer(
  input: CanonicalEvidenceProducerDefinition,
): CanonicalEvidenceProducerDefinition {
  return Object.freeze({ ...input });
}

export function produceCanonicalEvidenceFromProducer<
  TProjectionPayload extends Record<string, unknown>,
  TSummary extends Record<string, unknown>,
  TEvidence extends Record<string, unknown>,
>(input: {
  readonly producer: CanonicalEvidenceProducerDefinition;
  readonly generated_at_utc: string;
  readonly subject: {
    readonly subject_ref: string;
  };
  readonly projection: Projection<TProjectionPayload>;
  readonly projection_ref?: string;
  readonly summary: TSummary;
  readonly findings: readonly string[];
  readonly evidence: TEvidence;
  readonly claim_boundary?: string;
}): CanonicalEvidenceArtifact<TSummary, TEvidence> {
  return materializeCanonicalEvidenceArtifact({
    artifactType: input.producer.artifact_type,
    generatedAtUtc: input.generated_at_utc,
    subject: {
      subjectRef: input.subject.subject_ref,
      subjectType: input.producer.subject_type,
    },
    projection: input.projection,
    projectionRef: input.projection_ref ?? input.producer.default_projection_ref ?? undefined,
    summary: input.summary,
    findings: input.findings,
    evidence: input.evidence,
    claimBoundary: input.claim_boundary ?? input.producer.claim_boundary,
  });
}

export function persistCanonicalEvidenceFromProducer<
  TProjectionPayload extends Record<string, unknown>,
  TSummary extends Record<string, unknown>,
  TEvidence extends Record<string, unknown>,
>(input: {
  readonly path: string;
  readonly producer: CanonicalEvidenceProducerDefinition;
  readonly generated_at_utc: string;
  readonly subject: {
    readonly subject_ref: string;
  };
  readonly projection: Projection<TProjectionPayload>;
  readonly projection_ref?: string;
  readonly summary: TSummary;
  readonly findings: readonly string[];
  readonly evidence: TEvidence;
  readonly claim_boundary?: string;
}): CanonicalEvidenceArtifact<TSummary, TEvidence> {
  const artifact = produceCanonicalEvidenceFromProducer(input);
  writeCanonicalEvidenceArtifact(input.path, artifact);
  return artifact;
}

export function materializeCanonicalEvidenceProducerReport(
  producers: readonly CanonicalEvidenceProducerDefinition[],
  targets: readonly CanonicalEvidenceProducerTarget[] = [],
): CanonicalEvidenceProducerReport {
  const schemaVersions = uniqueStrings(
    producers.map((producer) => producer.schema_version),
  );
  const registeredProducerIds = new Set(
    producers.map((producer) => producer.producer_id),
  );
  const missingTargetProducers = targets.filter(
    (target) => !registeredProducerIds.has(target.producer_id),
  );
  const registeredTargetProducerCount = targets.length - missingTargetProducers.length;
  const targetCoverageRatio =
    targets.length === 0
      ? 1
      : Number((registeredTargetProducerCount / targets.length).toFixed(4));

  return {
    report_version: "1.0.0",
    status:
      schemaVersions.length === 1 && missingTargetProducers.length === 0
        ? "PASS"
        : "WARN",
    summary: {
      producer_count: producers.length,
      canonical_schema_versions: schemaVersions,
      artifact_type_count: new Set(
        producers.map((producer) => producer.artifact_type),
      ).size,
      subject_type_count: new Set(
        producers.map((producer) => producer.subject_type),
      ).size,
      producers_with_default_projection_ref: producers.filter(
        (producer) => producer.default_projection_ref !== null,
      ).length,
      target_producer_count: targets.length,
      registered_target_producer_count: registeredTargetProducerCount,
      target_coverage_ratio: targetCoverageRatio,
    },
    producers: producers.map((producer) => ({
      producer_id: producer.producer_id,
      artifact_type: producer.artifact_type,
      subject_type: producer.subject_type,
      schema_version: producer.schema_version,
      default_projection_ref: producer.default_projection_ref,
      canonical_envelope: {
        subject: true,
        projection: true,
        digest: true,
        signature: true,
        generated_at_utc: true,
        summary: true,
        findings: true,
        evidence: true,
        claim_boundary: true,
      },
    })),
    missing_target_producers: missingTargetProducers,
    claim_boundary:
      "Producer report verifies convergence only for registered canonical evidence producers materialized through the shared producer runtime. It does not certify unregistered legacy evidence surfaces.",
  };
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
