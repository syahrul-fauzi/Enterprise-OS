import type { EvidenceProducer } from "../../evidence-producer-spi.js";
import {
  loadSpecificationRegistry,
  materializeSpecificationArtifactGraph,
  materializeSpecificationConformanceReport,
  type SpecificationArtifactGraph,
  type SpecificationConformanceReport,
} from "../runtime/conformance-runtime.js";
import {
  materializeSpecificationConformanceProjection,
} from "../runtime/projection-runtime.js";
import {
  materializeSpecificationVocabularyAuditReport,
  type SpecificationVocabularyAuditReport,
} from "../runtime/vocabulary-runtime.js";
import type { Projection } from "../../projection/models/domain.js";

export type SpecificationFoundationProducerContext = Readonly<{
  reportRef?: string | null;
  projectionRef?: string | null;
}>;

export type SpecificationFoundationProducerProjection = Readonly<{
  overall_status: string;
  registry_artifacts: number;
  registry_edges: number;
  rfc_count: number;
  conf_count: number;
  spec_count: number;
  conformance_status: string;
  vocabulary_status: string;
  conformance_failures: number;
  conformance_warnings: number;
  vocabulary_terms: number;
  vocabulary_duplicates: number;
  report_ref: string | null;
  projection_ref: string | null;
}>;

export const SPECIFICATION_FOUNDATION_PRODUCER: EvidenceProducer<
  SpecificationFoundationProducerContext,
  {
    readonly conformanceReport: SpecificationConformanceReport;
    readonly conformanceProjection: Projection<SpecificationConformanceReport>;
    readonly artifactGraph: SpecificationArtifactGraph;
    readonly vocabularyAudit: SpecificationVocabularyAuditReport;
    readonly specCount: number;
  },
  {
    readonly overall_status: string;
    readonly conformance_status: string;
    readonly vocabulary_status: string;
    readonly conformance_failures: number;
    readonly conformance_warnings: number;
    readonly registry_artifacts: number;
    readonly registry_edges: number;
    readonly rfc_count: number;
    readonly conf_count: number;
    readonly spec_count: number;
    readonly vocabulary_terms: number;
    readonly vocabulary_duplicates: number;
  },
  SpecificationFoundationProducerProjection,
  {
    readonly conformanceReport: SpecificationConformanceReport;
    readonly conformanceProjection: Projection<SpecificationConformanceReport>;
    readonly artifactGraph: SpecificationArtifactGraph;
    readonly vocabularyAudit: SpecificationVocabularyAuditReport;
  }
> = {
  id() {
    return "specification-producer";
  },
  subject() {
    return {
      subject_ref: "enterprise/specifications/specification-registry.yaml",
      subject_type: "specification-registry",
    };
  },
  collect() {
    const conformanceReport = materializeSpecificationConformanceReport();
    return {
      conformanceReport,
      conformanceProjection:
        materializeSpecificationConformanceProjection(conformanceReport),
      artifactGraph: materializeSpecificationArtifactGraph(),
      vocabularyAudit: materializeSpecificationVocabularyAuditReport(),
      specCount: loadSpecificationRegistry().spec_entries.length,
    };
  },
  evaluate({ collected }) {
    const conformanceStatus =
      collected.conformanceReport.summary.fail_count > 0
        ? "FAIL"
        : collected.conformanceReport.summary.warn_count > 0
          ? "WARN"
          : "PASS";
    const vocabularyStatus = collected.vocabularyAudit.summary.drift_status;

    return {
      overall_status:
        conformanceStatus === "FAIL" || vocabularyStatus === "FAIL"
          ? "FAIL"
          : conformanceStatus === "WARN" || vocabularyStatus === "WARN"
            ? "WARN"
            : "PASS",
      conformance_status: conformanceStatus,
      vocabulary_status: vocabularyStatus,
      conformance_failures: collected.conformanceReport.summary.fail_count,
      conformance_warnings: collected.conformanceReport.summary.warn_count,
      registry_artifacts: collected.artifactGraph.summary.artifact_count,
      registry_edges: collected.artifactGraph.summary.edge_count,
      rfc_count: collected.conformanceReport.summary.rfc_count,
      conf_count: collected.conformanceReport.summary.conf_count,
      spec_count: collected.specCount,
      vocabulary_terms: collected.vocabularyAudit.summary.term_count,
      vocabulary_duplicates:
        collected.vocabularyAudit.summary.duplicated_definition_count,
    };
  },
  project({ context, evaluation }) {
    return {
      ...evaluation,
      report_ref:
        context.reportRef ??
        "workspace/foundation/evidence/verification/specification-conformance-report.json",
      projection_ref:
        context.projectionRef ??
        "workspace/foundation/evidence/verification/specification-conformance-projection.json",
    };
  },
  materialize({ collected }) {
    return {
      conformanceReport: collected.conformanceReport,
      conformanceProjection: collected.conformanceProjection,
      artifactGraph: collected.artifactGraph,
      vocabularyAudit: collected.vocabularyAudit,
    };
  },
};
