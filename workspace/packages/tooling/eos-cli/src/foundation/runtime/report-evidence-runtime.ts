// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  defineCanonicalEvidenceProducer,
  persistCanonicalEvidenceFromProducer,
} from "../../canonical-evidence-producer-runtime.js";
import { captureExecutionTimestampUtc } from "../../governance-runtime.js";
import {
  materializeProjection,
  writeProjectionArtifact,
} from "../../projection/runtime/index.js";
import type { Projection } from "../../projection/models/domain.js";
import { EOS_ROOT } from "../../state.js";
import { writeJsonArtifact } from "../../governance-runtime.js";

export const FOUNDATION_REPORT_PROJECTION_PATH = resolve(
  EOS_ROOT,
  "workspace/foundation/evidence/verification/foundation-report-projection.json",
);
export const FOUNDATION_REPORT_EVIDENCE_PATH = resolve(
  EOS_ROOT,
  "workspace/foundation/evidence/verification/foundation-report-evidence.json",
);

export const FOUNDATION_REPORT_EVIDENCE_PRODUCER =
  defineCanonicalEvidenceProducer({
    producer_id: "foundation-report-producer",
    artifact_type: "foundation-report-evidence",
    subject_type: "foundation-verification",
    schema_version: "1.0.0",
    description:
      "Materializes foundation verification report into canonical evidence through the shared producer runtime.",
    default_projection_ref:
      "workspace/foundation/evidence/verification/foundation-report-projection.json",
    claim_boundary:
      "Foundation report evidence claims only the materialized repository-level foundation verification status, capability execution summary, decision quality readout, and evidence convergence snapshot captured at generation time.",
  });

export function materializeFoundationReportProjection(
  payload: Record<string, unknown>,
  generatedAtUtc = captureExecutionTimestampUtc(),
): Projection<Record<string, unknown>> {
  return materializeProjection({
    projectionType: "FoundationReportProjection",
    generatedAtUtc,
    generatedFrom: [
      createGeneratedFrom(
        "product_portfolio",
        "enterprise/specifications/PRODUCT-PORTFOLIO.yaml",
      ),
      createGeneratedFrom(
        "governance_portfolio",
        "enterprise/specifications/GOVERNANCE-PORTFOLIO.yaml",
      ),
      createGeneratedFrom("quality_gates", "enterprise/execution/QUALITY-GATES.yaml"),
    ],
    payload,
  });
}

export function persistFoundationReportArtifacts(input: {
  readonly payload: Record<string, unknown>;
  readonly reportPath?: string;
  readonly projectionJsonPath?: string;
  readonly evidencePath?: string;
  readonly subjectRef?: string;
  readonly generatedAtUtc?: string;
}) {
  writeJsonArtifact(
    input.reportPath ??
      "workspace/foundation/evidence/verification/foundation-report.json",
    input.payload,
  );

  const projection = materializeFoundationReportProjection(
    input.payload,
    input.generatedAtUtc,
  );
  writeProjectionArtifact(
    input.projectionJsonPath ?? FOUNDATION_REPORT_PROJECTION_PATH,
    projection,
  );

  const verificationResult = isRecord(input.payload.verification_result)
    ? input.payload.verification_result
    : {};
  const foundationMetrics = isRecord(input.payload.foundation_metrics)
    ? input.payload.foundation_metrics
    : {};
  const executionEvidenceSummary = isRecord(input.payload.execution_evidence_summary)
    ? input.payload.execution_evidence_summary
    : {};
  const decisionQuality = isRecord(input.payload.decision_quality)
    ? input.payload.decision_quality
    : {};
  const learningIntelligence = isRecord(input.payload.learning_intelligence)
    ? input.payload.learning_intelligence
    : {};
  const closedLoopHypothesis = isRecord(input.payload.closed_loop_hypothesis)
    ? input.payload.closed_loop_hypothesis
    : {};
  const evidenceConvergence = isRecord(input.payload.evidence_convergence)
    ? input.payload.evidence_convergence
    : {};

  return persistCanonicalEvidenceFromProducer({
    path: input.evidencePath ?? FOUNDATION_REPORT_EVIDENCE_PATH,
    producer: FOUNDATION_REPORT_EVIDENCE_PRODUCER,
    generated_at_utc: projection.generated_at_utc,
    subject: {
      subject_ref:
        input.subjectRef ??
        "workspace/foundation/evidence/verification/foundation-report.json",
    },
    projection,
    projection_ref:
      "workspace/foundation/evidence/verification/foundation-report-projection.json",
    summary: {
      foundation_status:
        readString(verificationResult, "foundation_status") ?? "UNVERIFIED_BASELINE",
      health_status: readString(verificationResult, "health_status") ?? "BLOCKED",
      verified_products: readNumber(foundationMetrics, "verified_products") ?? 0,
      observed_capabilities:
        readNumber(executionEvidenceSummary, "observed_capabilities") ?? 0,
      decision_quality_status:
        readString(decisionQuality, "status") ?? "UNVERIFIED",
      learning_intelligence_status:
        readString(learningIntelligence, "status") ?? "UNVERIFIED",
      closed_loop_hypothesis_status:
        readString(closedLoopHypothesis, "status") ?? "UNVERIFIED",
      evidence_convergence_status:
        readString(evidenceConvergence, "status") ?? "UNVERIFIED",
    },
    findings: buildFoundationFindings({
      verificationResult,
      decisionQuality,
      learningIntelligence,
      closedLoopHypothesis,
      evidenceConvergence,
    }),
    evidence: {
      verification_result: verificationResult,
      foundation_metrics: foundationMetrics,
      execution_evidence_summary: executionEvidenceSummary,
      decision_quality: decisionQuality,
      learning_intelligence: learningIntelligence,
      closed_loop_hypothesis: closedLoopHypothesis,
      evidence_convergence: evidenceConvergence,
      projection_payload_ref:
        "workspace/foundation/evidence/verification/foundation-report-projection.json",
    },
  });
}

function buildFoundationFindings(input: {
  readonly verificationResult: Record<string, unknown>;
  readonly decisionQuality: Record<string, unknown>;
  readonly learningIntelligence: Record<string, unknown>;
  readonly closedLoopHypothesis: Record<string, unknown>;
  readonly evidenceConvergence: Record<string, unknown>;
}): readonly string[] {
  const findings: string[] = [];
  const foundationStatus = readString(input.verificationResult, "foundation_status");
  if (
    foundationStatus !== null &&
    foundationStatus !== "HEALTHY_BASELINE"
  ) {
    findings.push(`Foundation status is ${foundationStatus}.`);
  }
  const decisionQualityStatus = readString(input.decisionQuality, "status");
  if (
    decisionQualityStatus !== null &&
    decisionQualityStatus !== "HEALTHY"
  ) {
    findings.push(`Decision quality status is ${decisionQualityStatus}.`);
  }
  const learningIntelligenceStatus = readString(
    input.learningIntelligence,
    "status",
  );
  if (
    learningIntelligenceStatus !== null &&
    learningIntelligenceStatus !== "HEALTHY"
  ) {
    findings.push(`Learning intelligence status is ${learningIntelligenceStatus}.`);
  }
  const closedLoopHypothesisStatus = readString(
    input.closedLoopHypothesis,
    "status",
  );
  if (
    closedLoopHypothesisStatus !== null &&
    closedLoopHypothesisStatus !== "PASS"
  ) {
    findings.push(
      `Closed-loop hypothesis status is ${closedLoopHypothesisStatus}.`,
    );
  }
  const evidenceConvergenceStatus = readString(
    input.evidenceConvergence,
    "status",
  );
  if (
    evidenceConvergenceStatus !== null &&
    evidenceConvergenceStatus !== "PASS"
  ) {
    findings.push(`Evidence convergence status is ${evidenceConvergenceStatus}.`);
  }
  return findings;
}

function createGeneratedFrom(sourceType: string, sourceRef: string) {
  return {
    source_type: sourceType,
    source_ref: sourceRef,
    source_digest: computeRepositoryArtifactDigest(sourceRef),
  };
}

function computeRepositoryArtifactDigest(sourceRef: string): string {
  const sourcePath = resolve(EOS_ROOT, sourceRef);
  if (!existsSync(sourcePath)) {
    return "UNVERIFIED";
  }
  return DigestEngine.digest(readFileSync(sourcePath, "utf8"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" ? value : null;
}
