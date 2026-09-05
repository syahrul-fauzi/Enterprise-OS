// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  defineCanonicalEvidenceProducer,
  persistCanonicalEvidenceFromProducer,
} from "./canonical-evidence-producer-runtime.js";
import { captureExecutionTimestampUtc } from "./governance-runtime.js";
import { materializeProjection, writeProjectionArtifact } from "./projection-runtime.js";
import type { Projection } from "./projection-domain.js";
import { EOS_ROOT } from "./state.js";

export const PRODUCT_RUNTIME_EVIDENCE_PRODUCER =
  defineCanonicalEvidenceProducer({
    producer_id: "product-runtime-producer",
    artifact_type: "product-runtime-verification-evidence",
    subject_type: "product",
    schema_version: "1.0.0",
    description:
      "Materializes verified product runtime evidence into canonical evidence through the shared producer runtime.",
    default_projection_ref: null,
    claim_boundary:
      "Product runtime verification evidence claims only the observed functional test result, runtime invocation summary, execution chain summary, and execution timeline summary captured for one product verification run.",
  });

export function materializeProductVerificationProjection(input: {
  readonly productId: string;
  readonly appManifestRef: string;
  readonly testReport: Record<string, unknown>;
  readonly runtimeInvocationReport: Record<string, unknown>;
  readonly executionChainReport: Projection<Record<string, unknown>>;
  readonly executionTimelineReport: Projection<Record<string, unknown>>;
  readonly generatedAtUtc?: string;
}): Projection<Record<string, unknown>> {
  return materializeProjection({
    projectionType: "ProductVerificationProjection",
    generatedAtUtc: input.generatedAtUtc ?? captureExecutionTimestampUtc(),
    generatedFrom: [
      createGeneratedFrom("product_manifest", input.appManifestRef),
      createGeneratedFrom(
        "functional_test_report",
        `workspace/products/${input.productId}/evidence/verification/functional-test-report.json`,
      ),
      createGeneratedFrom(
        "runtime_invocation_report",
        `workspace/products/${input.productId}/evidence/verification/runtime-invocation-report.json`,
      ),
      {
        source_type: "execution_chain_projection",
        source_ref: `workspace/products/${input.productId}/evidence/verification/execution-chain.json`,
        source_digest: input.executionChainReport.projection_digest,
      },
      {
        source_type: "execution_timeline_projection",
        source_ref: `workspace/products/${input.productId}/evidence/verification/execution-timeline.json`,
        source_digest: input.executionTimelineReport.projection_digest,
      },
    ],
    payload: {
      product_id: input.productId,
      test_summary: isRecord(input.testReport.summary) ? input.testReport.summary : {},
      runtime_invocation_summary: isRecord(input.runtimeInvocationReport.summary)
        ? input.runtimeInvocationReport.summary
        : {},
      execution_chain_summary: isRecord(input.executionChainReport.payload.summary)
        ? input.executionChainReport.payload.summary
        : {},
      execution_timeline_summary: isRecord(input.executionTimelineReport.payload.summary)
        ? input.executionTimelineReport.payload.summary
        : {},
    },
  });
}

export function persistProductRuntimeVerificationArtifacts(input: {
  readonly productId: string;
  readonly appManifestRef: string;
  readonly subjectRef?: string;
  readonly projectionPath: string;
  readonly evidencePath: string;
  readonly testReport: Record<string, unknown>;
  readonly runtimeInvocationReport: Record<string, unknown>;
  readonly executionChainReport: Projection<Record<string, unknown>>;
  readonly executionTimelineReport: Projection<Record<string, unknown>>;
  readonly generatedAtUtc?: string;
}) {
  const projection = materializeProductVerificationProjection(input);
  writeProjectionArtifact(input.projectionPath, projection);

  const testSummary = isRecord(input.testReport.summary) ? input.testReport.summary : {};
  const runtimeSummary = isRecord(input.runtimeInvocationReport.summary)
    ? input.runtimeInvocationReport.summary
    : {};
  const chainSummary = isRecord(input.executionChainReport.payload.summary)
    ? input.executionChainReport.payload.summary
    : {};
  const timelineSummary = isRecord(input.executionTimelineReport.payload.summary)
    ? input.executionTimelineReport.payload.summary
    : {};

  return persistCanonicalEvidenceFromProducer({
    path: input.evidencePath,
    producer: PRODUCT_RUNTIME_EVIDENCE_PRODUCER,
    generated_at_utc: projection.generated_at_utc,
    subject: {
      subject_ref: input.subjectRef ?? input.appManifestRef,
    },
    projection,
    projection_ref: toRepoRelative(input.projectionPath),
    summary: {
      product_id: input.productId,
      functional_test_status: readString(input.testReport, "status") ?? "UNVERIFIED",
      observed_capabilities: readNumber(runtimeSummary, "observed_capabilities") ?? 0,
      verified_capabilities: readNumber(runtimeSummary, "verified_capabilities") ?? 0,
      reproducible_capabilities:
        readNumber(runtimeSummary, "reproducible_capabilities") ?? 0,
      total_runtime_invocations: readNumber(runtimeSummary, "total_invocations") ?? 0,
      reproducible_chains: readNumber(chainSummary, "reproducible_chains") ?? 0,
      total_timeline_events: readNumber(timelineSummary, "total_events") ?? 0,
    },
    findings: buildProductRuntimeFindings({
      testReport: input.testReport,
      runtimeSummary,
      chainSummary,
    }),
    evidence: {
      test_report_ref: `workspace/products/${input.productId}/evidence/verification/functional-test-report.json`,
      runtime_invocation_report_ref:
        `workspace/products/${input.productId}/evidence/verification/runtime-invocation-report.json`,
      execution_chain_projection_ref:
        `workspace/products/${input.productId}/evidence/verification/execution-chain.json`,
      execution_timeline_projection_ref:
        `workspace/products/${input.productId}/evidence/verification/execution-timeline.json`,
      test_summary: testSummary,
      runtime_invocation_summary: runtimeSummary,
      execution_chain_summary: chainSummary,
      execution_timeline_summary: timelineSummary,
    },
  });
}

function buildProductRuntimeFindings(input: {
  readonly testReport: Record<string, unknown>;
  readonly runtimeSummary: Record<string, unknown>;
  readonly chainSummary: Record<string, unknown>;
}): readonly string[] {
  const findings: string[] = [];
  const testStatus = readString(input.testReport, "status");
  if (testStatus !== null && testStatus !== "PASS") {
    findings.push(`Functional test status is ${testStatus}.`);
  }
  const observedCapabilities = readNumber(
    input.runtimeSummary,
    "observed_capabilities",
  );
  if (observedCapabilities !== null && observedCapabilities === 0) {
    findings.push("No observed capabilities were materialized.");
  }
  const reproducibleChains = readNumber(
    input.chainSummary,
    "reproducible_chains",
  );
  if (reproducibleChains !== null && reproducibleChains === 0) {
    findings.push("No reproducible execution chains were observed.");
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

function toRepoRelative(path: string): string {
  return path.replace(`${EOS_ROOT}/`, "");
}
