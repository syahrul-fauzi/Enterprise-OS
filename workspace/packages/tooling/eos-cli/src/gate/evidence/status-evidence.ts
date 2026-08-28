// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
import YAML from "yaml";

export const GATE_C_STATUS_PROJECTION_JSON_PATH = resolve(
  EOS_ROOT,
  "workspace/foundation/evidence/verification/gate-c-status-projection.json",
);
export const GATE_C_STATUS_EVIDENCE_PATH = resolve(
  EOS_ROOT,
  "workspace/foundation/evidence/verification/gate-c-status-evidence.json",
);

export const GATE_C_STATUS_EVIDENCE_PRODUCER =
  defineCanonicalEvidenceProducer({
    producer_id: "gate-c-status-producer",
    artifact_type: "gate-c-status-evidence",
    subject_type: "gate-c-status",
    schema_version: "1.0.0",
    description:
      "Materializes Gate C operational status into canonical evidence through the shared producer runtime.",
    default_projection_ref:
      "workspace/foundation/evidence/verification/gate-c-status-projection.json",
    claim_boundary:
      "Gate C status evidence claims only the materialized operational status, verification coverage, and governance readout captured by the Gate C status projection at generation time.",
  });

export function materializeGateCStatusProjection(
  payload: Record<string, unknown>,
  generatedAtUtc = captureExecutionTimestampUtc(),
): Projection<Record<string, unknown>> {
  return materializeProjection({
    projectionType: "GateCStatusProjection",
    generatedAtUtc,
    generatedFrom: [
      createGeneratedFrom(
        "gate_c_coverage_matrix",
        "enterprise/science/gate-c/execution/coverage-matrix.yaml",
      ),
      createGeneratedFrom(
        "gate_c_acceptance_contract",
        "enterprise/science/gate-c/execution/acceptance-contract.yaml",
      ),
      createGeneratedFrom(
        "gate_c_proof_ledger",
        "enterprise/science/gate-c/execution/proof-ledger.yaml",
      ),
      createGeneratedFrom(
        "gate_c_acceptance_decisions",
        "enterprise/science/gate-c/execution/acceptance-decisions.yaml",
      ),
    ],
    payload,
  });
}

export function persistGateCStatusArtifacts(input: {
  readonly payload: Record<string, unknown>;
  readonly projectionJsonPath?: string;
  readonly evidencePath?: string;
  readonly statusYamlRef?: string;
  readonly generatedAtUtc?: string;
}) {
  const projection = materializeGateCStatusProjection(
    input.payload,
    input.generatedAtUtc,
  );
  const projectionPath = input.projectionJsonPath ?? GATE_C_STATUS_PROJECTION_JSON_PATH;
  writeProjectionArtifact(projectionPath, projection);

  const overall = isRecord(input.payload.overall) ? input.payload.overall : {};
  const governancePlatform = isRecord(input.payload.governance_platform)
    ? input.payload.governance_platform
    : {};
  const coverage = isRecord(input.payload.coverage) ? input.payload.coverage : {};
  const acceptanceAuthority = isRecord(input.payload.acceptance_authority)
    ? input.payload.acceptance_authority
    : {};

  return persistCanonicalEvidenceFromProducer({
    path: input.evidencePath ?? GATE_C_STATUS_EVIDENCE_PATH,
    producer: GATE_C_STATUS_EVIDENCE_PRODUCER,
    generated_at_utc: projection.generated_at_utc,
    subject: {
      subject_ref:
        input.statusYamlRef ??
        "enterprise/science/gate-c/execution/gate-c-status.yaml",
    },
    projection,
    projection_ref:
      "workspace/foundation/evidence/verification/gate-c-status-projection.json",
    summary: {
      gate_c1_status: readString(overall, "gate_c1_status") ?? "UNVERIFIED",
      specification_system_status:
        readString(overall, "specification_system_status") ?? "UNVERIFIED",
      decision_quality_status:
        readString(overall, "decision_quality_status") ?? "UNVERIFIED",
      learning_intelligence_status:
        readString(overall, "learning_intelligence_status") ?? "UNVERIFIED",
      truth_table_row_completion_percent:
        readNumber(coverage, "truth_table_row_completion_percent") ?? 0,
      operational_completion_percent:
        readNumber(coverage, "operational_completion_percent") ?? 0,
    },
    findings: buildGateCFindings({
      overall,
      governancePlatform,
    }),
    evidence: {
      overall,
      governance_platform: governancePlatform,
      coverage,
      acceptance_authority: acceptanceAuthority,
      projection_payload_ref:
        "workspace/foundation/evidence/verification/gate-c-status-projection.json",
    },
  });
}

export function writeGateCStatusProjectionArtifacts(input: {
  readonly payload: Record<string, unknown>;
  readonly statusYamlPath: string;
  readonly projectionJsonPath?: string;
  readonly evidencePath?: string;
  readonly statusYamlRef?: string;
  readonly generatedAtUtc?: string;
}): Record<string, unknown> {
  const yaml = YAML.stringify(input.payload, {
    indent: 2,
    lineWidth: 0,
  });
  writeFileSync(
    input.statusYamlPath,
    yaml.endsWith("\n") ? yaml : `${yaml}\n`,
    "utf8",
  );
  persistGateCStatusArtifacts({
    payload: input.payload,
    projectionJsonPath: input.projectionJsonPath,
    evidencePath: input.evidencePath,
    statusYamlRef: input.statusYamlRef,
    generatedAtUtc: input.generatedAtUtc,
  });
  return input.payload;
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

function buildGateCFindings(input: {
  readonly overall: Record<string, unknown>;
  readonly governancePlatform: Record<string, unknown>;
}): readonly string[] {
  const findings: string[] = [];
  const gateCStatus = readString(input.overall, "gate_c1_status");
  if (gateCStatus !== null && gateCStatus !== "RATIFIABLE") {
    findings.push(`Gate C status is ${gateCStatus}.`);
  }
  const decisionQualityStatus = readString(
    input.overall,
    "decision_quality_status",
  );
  if (
    decisionQualityStatus !== null &&
    decisionQualityStatus !== "HEALTHY" &&
    decisionQualityStatus !== "PASS"
  ) {
    findings.push(`Decision quality status is ${decisionQualityStatus}.`);
  }
  const learningIntelligenceStatus = readString(
    input.overall,
    "learning_intelligence_status",
  );
  if (
    learningIntelligenceStatus !== null &&
    learningIntelligenceStatus !== "HEALTHY" &&
    learningIntelligenceStatus !== "PASS"
  ) {
    findings.push(
      `Learning intelligence status is ${learningIntelligenceStatus}.`,
    );
  }
  const evidenceHealth = readString(
    input.overall,
    "capability_graph_evidence_health_status",
  );
  if (evidenceHealth !== null && evidenceHealth !== "HEALTHY") {
    findings.push(`Capability evidence health status is ${evidenceHealth}.`);
  }
  const specificationStatus = readString(
    input.overall,
    "specification_system_status",
  );
  if (specificationStatus !== null && specificationStatus !== "PASS") {
    findings.push(`Specification system status is ${specificationStatus}.`);
  }
  return findings;
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