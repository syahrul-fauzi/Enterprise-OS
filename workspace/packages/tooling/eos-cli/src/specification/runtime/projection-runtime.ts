// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  SpecificationArtifactGraph,
  SpecificationConformanceReport,
} from "./conformance-runtime.js";
import {
  SPECIFICATION_ARTIFACT_GRAPH_PATH,
  SPECIFICATION_CONFORMANCE_REPORT_PATH,
  materializeSpecificationArtifactGraph,
  materializeSpecificationConformanceReport,
} from "./conformance-runtime.js";
import type { SpecificationVocabularyAuditReport } from "./vocabulary-runtime.js";
import {
  SPECIFICATION_VOCABULARY_AUDIT_PATH,
  materializeSpecificationVocabularyAuditReport,
} from "./vocabulary-runtime.js";
import type { Projection } from "../../projection/models/domain.js";
import { materializeProjection, persistProjectionArtifact } from "../../projection/runtime/index.js";
import {
  type CanonicalEvidenceArtifact,
} from "../../evidence-artifact-runtime.js";
import {
  defineCanonicalEvidenceProducer,
  persistCanonicalEvidenceFromProducer,
  produceCanonicalEvidenceFromProducer,
} from "../../canonical-evidence-producer-runtime.js";
import { captureExecutionTimestampUtc } from "../../governance-runtime.js";
import { EOS_ROOT } from "../../state.js";

export const SPECIFICATION_CONFORMANCE_EVIDENCE_PATH = resolve(
  EOS_ROOT,
  "workspace/foundation/evidence/verification/specification-conformance-evidence.json",
);
export const SPECIFICATION_CONFORMANCE_PROJECTION_PATH = resolve(
  EOS_ROOT,
  "workspace/foundation/evidence/verification/specification-conformance-projection.json",
);
export const SPECIFICATION_CONFORMANCE_EVIDENCE_PRODUCER =
  defineCanonicalEvidenceProducer({
    producer_id: "specification-conformance-producer",
    artifact_type: "specification-conformance-evidence",
    subject_type: "specification-registry",
    schema_version: "1.0.0",
    description:
      "Materializes specification conformance results into canonical evidence.",
    default_projection_ref:
      "workspace/foundation/evidence/verification/specification-conformance-projection.json",
    claim_boundary:
      "Projection presents evaluable conformance results. Evidence freezes the projection as an auditable canonical artifact.",
  });

type SpecificationConformanceEvidenceSummary = {
  readonly status: "PASS" | "WARN" | "FAIL";
  readonly rfc_count: number;
  readonly conf_count: number;
  readonly clause_count: number;
  readonly clause_pass_count: number;
  readonly clause_warn_count: number;
  readonly clause_fail_count: number;
  readonly pass_count: number;
  readonly warn_count: number;
  readonly fail_count: number;
  readonly average_coverage_percent: number;
};

type SpecificationConformanceEvidenceBody = {
  readonly coverage: {
    readonly rfc: {
      readonly total: number;
      readonly passing: number;
    };
    readonly conf: {
      readonly total: number;
      readonly passing: number;
    };
    readonly clause: {
      readonly total: number;
      readonly passing: number;
      readonly warning: number;
      readonly failing: number;
    };
  };
  readonly projection_payload_ref: string;
  readonly report_ref: string;
};

export function materializeSpecificationConformanceProjection(
  report: SpecificationConformanceReport = materializeSpecificationConformanceReport(),
): Projection<SpecificationConformanceReport> {
  return materializeProjection({
    projectionType: "SpecificationConformanceProjection",
    generatedFrom: [
      {
        source_type: "specification_registry",
        source_ref: "enterprise/specifications/specification-registry.yaml",
        source_digest: computeRepositoryArtifactDigest(
          "enterprise/specifications/specification-registry.yaml",
        ),
      },
    ],
    payload: report,
    generatedAtUtc: report.generated_at,
  });
}

export function persistSpecificationConformanceProjection(input: {
  readonly path?: string;
  readonly report?: SpecificationConformanceReport;
}) {
  const report = input.report ?? materializeSpecificationConformanceReport();
  const projection = materializeSpecificationConformanceProjection(report);
  return persistProjectionArtifact({
    path: input.path ?? SPECIFICATION_CONFORMANCE_PROJECTION_PATH,
    scope: "foundation_verification",
    projection,
    expectedProjectionType: "SpecificationConformanceProjection",
  });
}

export function materializeSpecificationConformanceEvidence(input: {
  readonly report?: SpecificationConformanceReport;
  readonly projection?: Projection<SpecificationConformanceReport>;
  readonly projectionRef?: string;
} = {}): CanonicalEvidenceArtifact<
  SpecificationConformanceEvidenceSummary,
  SpecificationConformanceEvidenceBody
> {
  const report = input.report ?? materializeSpecificationConformanceReport();
  const projection =
    input.projection ?? materializeSpecificationConformanceProjection(report);
  const summaryStatus =
    report.summary.fail_count > 0
      ? "FAIL"
      : report.summary.warn_count > 0
        ? "WARN"
        : "PASS";

  return produceCanonicalEvidenceFromProducer({
    producer: SPECIFICATION_CONFORMANCE_EVIDENCE_PRODUCER,
    generated_at_utc: captureExecutionTimestampUtc(),
    subject: {
      subject_ref: "enterprise/specifications/specification-registry.yaml",
    },
    projection,
    projection_ref: input.projectionRef,
    summary: {
      status: summaryStatus,
      rfc_count: report.summary.rfc_count,
      conf_count: report.summary.conf_count,
      clause_count: report.summary.clause_count,
      clause_pass_count: report.summary.clause_pass_count,
      clause_warn_count: report.summary.clause_warn_count,
      clause_fail_count: report.summary.clause_fail_count,
      pass_count: report.summary.pass_count,
      warn_count: report.summary.warn_count,
      fail_count: report.summary.fail_count,
      average_coverage_percent: report.summary.average_coverage_percent,
    },
    findings: [
      ...report.rfc_entries.flatMap((entry) => entry.findings),
      ...report.conf_entries.flatMap((entry) => entry.findings),
    ],
    evidence: {
      coverage: {
        rfc: {
          total: report.summary.rfc_count,
          passing: report.rfc_entries.filter(
            (entry) => entry.conformance_status === "PASS",
          ).length,
        },
        conf: {
          total: report.summary.conf_count,
          passing: report.conf_entries.filter(
            (entry) => entry.conformance_status === "PASS",
          ).length,
        },
        clause: {
          total: report.summary.clause_count,
          passing: report.summary.clause_pass_count,
          warning: report.summary.clause_warn_count,
          failing: report.summary.clause_fail_count,
        },
      },
      projection_payload_ref:
        input.projectionRef ??
        "workspace/foundation/evidence/verification/specification-conformance-projection.json",
      report_ref:
        "workspace/foundation/evidence/verification/specification-conformance-report.json",
    },
  });
}

export function persistSpecificationConformanceEvidence(input: {
  readonly path?: string;
  readonly report?: SpecificationConformanceReport;
  readonly projection?: Projection<SpecificationConformanceReport>;
  readonly projectionRef?: string;
}) {
  const report = input.report ?? materializeSpecificationConformanceReport();
  const projection =
    input.projection ?? materializeSpecificationConformanceProjection(report);
  return persistCanonicalEvidenceFromProducer({
    path: input.path ?? SPECIFICATION_CONFORMANCE_EVIDENCE_PATH,
    producer: SPECIFICATION_CONFORMANCE_EVIDENCE_PRODUCER,
    generated_at_utc: captureExecutionTimestampUtc(),
    subject: {
      subject_ref: "enterprise/specifications/specification-registry.yaml",
    },
    projection,
    projection_ref: input.projectionRef,
    summary: {
      status:
        report.summary.fail_count > 0
          ? "FAIL"
          : report.summary.warn_count > 0
            ? "WARN"
            : "PASS",
      rfc_count: report.summary.rfc_count,
      conf_count: report.summary.conf_count,
      clause_count: report.summary.clause_count,
      clause_pass_count: report.summary.clause_pass_count,
      clause_warn_count: report.summary.clause_warn_count,
      clause_fail_count: report.summary.clause_fail_count,
      pass_count: report.summary.pass_count,
      warn_count: report.summary.warn_count,
      fail_count: report.summary.fail_count,
      average_coverage_percent: report.summary.average_coverage_percent,
    },
    findings: [
      ...report.rfc_entries.flatMap((entry) => entry.findings),
      ...report.conf_entries.flatMap((entry) => entry.findings),
    ],
    evidence: {
      coverage: {
        rfc: {
          total: report.summary.rfc_count,
          passing: report.rfc_entries.filter(
            (entry) => entry.conformance_status === "PASS",
          ).length,
        },
        conf: {
          total: report.summary.conf_count,
          passing: report.conf_entries.filter(
            (entry) => entry.conformance_status === "PASS",
          ).length,
        },
        clause: {
          total: report.summary.clause_count,
          passing: report.summary.clause_pass_count,
          warning: report.summary.clause_warn_count,
          failing: report.summary.clause_fail_count,
        },
      },
      projection_payload_ref:
        input.projectionRef ??
        "workspace/foundation/evidence/verification/specification-conformance-projection.json",
      report_ref:
        "workspace/foundation/evidence/verification/specification-conformance-report.json",
    },
  });
}

export function materializeSpecificationArtifactGraphProjection(
  graph: SpecificationArtifactGraph = materializeSpecificationArtifactGraph(),
): Projection<SpecificationArtifactGraph> {
  return materializeProjection({
    projectionType: "SpecificationArtifactGraphProjection",
    generatedFrom: [
      {
        source_type: "specification_registry",
        source_ref: "enterprise/specifications/specification-registry.yaml",
        source_digest: computeRepositoryArtifactDigest(
          "enterprise/specifications/specification-registry.yaml",
        ),
      },
    ],
    payload: graph,
    generatedAtUtc: graph.generated_at,
  });
}

export function materializeSpecificationVocabularyAuditProjection(
  report: SpecificationVocabularyAuditReport = materializeSpecificationVocabularyAuditReport(),
): Projection<SpecificationVocabularyAuditReport> {
  return materializeProjection({
    projectionType: "SpecificationVocabularyAuditProjection",
    generatedFrom: [
      {
        source_type: "specification_registry",
        source_ref: "enterprise/specifications/specification-registry.yaml",
        source_digest: computeRepositoryArtifactDigest(
          "enterprise/specifications/specification-registry.yaml",
        ),
      },
    ],
    payload: report,
    generatedAtUtc: report.generated_at,
  });
}

export const LEGACY_SPECIFICATION_REPORT_REFS = {
  conformance: SPECIFICATION_CONFORMANCE_REPORT_PATH,
  artifactGraph: SPECIFICATION_ARTIFACT_GRAPH_PATH,
  vocabularyAudit: SPECIFICATION_VOCABULARY_AUDIT_PATH,
} as const;

function computeRepositoryArtifactDigest(sourceRef: string): string {
  const sourcePath = resolve(EOS_ROOT, sourceRef);
  if (!existsSync(sourcePath)) {
    return "UNVERIFIED";
  }
  return DigestEngine.digest(readFileSync(sourcePath, "utf8"));
}
