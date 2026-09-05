// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Projection } from "./projection-domain.js";
import { EOS_ROOT } from "./state.js";

export type CanonicalEvidenceSignature = {
  readonly status: "UNSIGNED";
  readonly key_id: null;
  readonly value: null;
  readonly reason: string;
};

export type CanonicalEvidenceSubject = {
  readonly subject_ref: string;
  readonly subject_type: string;
  readonly subject_digest: string | null;
};

export type CanonicalEvidenceProjectionLink = {
  readonly projection_ref: string | null;
  readonly projection_id: string;
  readonly projection_type: string;
  readonly projection_digest: string;
};

export type CanonicalEvidenceArtifact<
  TSummary extends Record<string, unknown>,
  TEvidence extends Record<string, unknown>,
> = {
  readonly artifact_id: string;
  readonly artifact_type: string;
  readonly schema_version: "1.0.0";
  readonly generated_at_utc: string;
  readonly subject: CanonicalEvidenceSubject;
  readonly projection: CanonicalEvidenceProjectionLink;
  readonly summary: TSummary;
  readonly findings: readonly string[];
  readonly evidence: TEvidence;
  readonly digest: string;
  readonly signature: CanonicalEvidenceSignature;
  readonly claim_boundary: string;
};

export function materializeCanonicalEvidenceArtifact<
  TProjectionPayload extends Record<string, unknown>,
  TSummary extends Record<string, unknown>,
  TEvidence extends Record<string, unknown>,
>(input: {
  readonly artifactType: string;
  readonly generatedAtUtc: string;
  readonly subject: {
    readonly subjectRef: string;
    readonly subjectType: string;
  };
  readonly projection: Projection<TProjectionPayload>;
  readonly projectionRef?: string;
  readonly summary: TSummary;
  readonly findings: readonly string[];
  readonly evidence: TEvidence;
  readonly claimBoundary: string;
}): CanonicalEvidenceArtifact<TSummary, TEvidence> {
  const subject: CanonicalEvidenceSubject = {
    subject_ref: input.subject.subjectRef,
    subject_type: input.subject.subjectType,
    subject_digest: computeFileDigest(input.subject.subjectRef),
  };
  const projection: CanonicalEvidenceProjectionLink = {
    projection_ref: input.projectionRef ?? null,
    projection_id: input.projection.projection_id,
    projection_type: input.projection.projection_type,
    projection_digest: input.projection.projection_digest,
  };
  const digest = DigestEngine.digest({
    artifact_type: input.artifactType,
    schema_version: "1.0.0",
    generated_at_utc: input.generatedAtUtc,
    subject,
    projection,
    summary: input.summary,
    findings: input.findings,
    evidence: input.evidence,
    claim_boundary: input.claimBoundary,
  });

  return {
    artifact_id: `${input.artifactType}:${digest.slice(0, 16)}`,
    artifact_type: input.artifactType,
    schema_version: "1.0.0",
    generated_at_utc: input.generatedAtUtc,
    subject,
    projection,
    summary: input.summary,
    findings: input.findings,
    evidence: input.evidence,
    digest,
    signature: {
      status: "UNSIGNED",
      key_id: null,
      value: null,
      reason:
        "Cryptographic signing is not materialized yet. Canonical digest is the active integrity anchor.",
    },
    claim_boundary: input.claimBoundary,
  };
}

export function writeCanonicalEvidenceArtifact(
  path: string,
  artifact: CanonicalEvidenceArtifact<Record<string, unknown>, Record<string, unknown>>,
): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
}

function computeFileDigest(subjectRef: string): string | null {
  const subjectPath = resolve(EOS_ROOT, subjectRef);
  if (!existsSync(subjectPath)) {
    return null;
  }
  return DigestEngine.digest(readFileSync(subjectPath, "utf8"));
}