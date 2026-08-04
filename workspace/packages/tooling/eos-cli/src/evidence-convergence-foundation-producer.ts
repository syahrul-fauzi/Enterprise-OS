import type { EvidenceProducer } from "./evidence-producer-spi.js";
import {
  materializeCanonicalEvidenceProducerReport,
  type CanonicalEvidenceProducerDefinition,
  type CanonicalEvidenceProducerReport,
  type CanonicalEvidenceProducerTarget,
} from "./canonical-evidence-producer-runtime.js";
import {
  listCanonicalEvidenceProducerTargets,
  listRegisteredCanonicalEvidenceProducers,
} from "./canonical-evidence-producer-registry.js";

export type EvidenceConvergenceFoundationProducerContext = Readonly<{
  reportRef?: string | null;
}>;

export type EvidenceConvergenceFoundationProducerProjection = Readonly<{
  status: string;
  producer_count: number;
  canonical_schema_versions: readonly string[];
  artifact_type_count: number;
  subject_type_count: number;
  target_producer_count: number;
  registered_target_producer_count: number;
  target_coverage_ratio: number;
  report_ref: string | null;
}>;

export const EVIDENCE_CONVERGENCE_FOUNDATION_PRODUCER: EvidenceProducer<
  EvidenceConvergenceFoundationProducerContext,
  {
    readonly producers: readonly CanonicalEvidenceProducerDefinition[];
    readonly targets: readonly CanonicalEvidenceProducerTarget[];
  },
  CanonicalEvidenceProducerReport,
  EvidenceConvergenceFoundationProducerProjection,
  {
    readonly report: CanonicalEvidenceProducerReport;
  }
> = {
  id() {
    return "evidence-convergence-producer";
  },
  subject(context) {
    return {
      subject_ref:
        context.reportRef ??
        "workspace/foundation/evidence/verification/evidence-producer-convergence-report.json",
      subject_type: "canonical-evidence-producer-registry",
    };
  },
  collect() {
    return {
      producers: listRegisteredCanonicalEvidenceProducers(),
      targets: listCanonicalEvidenceProducerTargets(),
    };
  },
  evaluate({ collected }) {
    return materializeCanonicalEvidenceProducerReport(
      collected.producers,
      collected.targets,
    );
  },
  project({ context, evaluation }) {
    return {
      status: evaluation.status,
      producer_count: evaluation.summary.producer_count,
      canonical_schema_versions: evaluation.summary.canonical_schema_versions,
      artifact_type_count: evaluation.summary.artifact_type_count,
      subject_type_count: evaluation.summary.subject_type_count,
      target_producer_count: evaluation.summary.target_producer_count,
      registered_target_producer_count:
        evaluation.summary.registered_target_producer_count,
      target_coverage_ratio: evaluation.summary.target_coverage_ratio,
      report_ref:
        context.reportRef ??
        "workspace/foundation/evidence/verification/evidence-producer-convergence-report.json",
    };
  },
  materialize({ evaluation }) {
    return {
      report: evaluation,
    };
  },
};
