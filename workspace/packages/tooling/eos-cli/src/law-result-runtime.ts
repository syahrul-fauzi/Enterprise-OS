// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine.js";
import type {
  ConstitutionExecutedLaw,
  ConstitutionFingerprint,
} from "./certificate-runtime.js";

export type ConstitutionLawResult = {
  readonly result_id: string;
  readonly result_digest: string;
  readonly law: {
    readonly law_id: string;
    readonly description: string;
  };
  readonly predicate: {
    readonly predicate_id: string;
    readonly description: string;
    readonly blocking: boolean;
  };
  readonly inputs: {
    readonly constitution_version: string;
    readonly constitutional_digest: string;
    readonly proof_digest: string;
    readonly constitutional_fingerprint: ConstitutionFingerprint;
  };
  readonly evaluation: {
    readonly status: string;
    readonly blocking_status: string;
    readonly proof_id: string;
    readonly proof_digest: string;
    readonly artifact_key: string;
    readonly deterministic: boolean | null;
    readonly replayable: boolean | null;
    readonly duration_ms: null;
    readonly observations: {
      readonly artifact_kind: "record" | "collection";
      readonly check_count: number;
      readonly violation_count: number;
    };
    readonly reason: string;
  };
  readonly evidence: {
    readonly artifact: Record<string, unknown> | readonly Record<string, unknown>[];
  };
  readonly result_boundary: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function countArtifactChecks(
  artifact: Record<string, unknown> | readonly Record<string, unknown>[],
): number {
  if (Array.isArray(artifact)) {
    return artifact.reduce((total, entry) => {
      const checks = Array.isArray(entry.checks) ? entry.checks.length : 0;
      return total + checks;
    }, 0);
  }

  const recordArtifact = artifact as Record<string, unknown>;
  return Array.isArray(recordArtifact.checks) ? recordArtifact.checks.length : 0;
}

function countArtifactViolations(
  artifact: Record<string, unknown> | readonly Record<string, unknown>[],
): number {
  if (Array.isArray(artifact)) {
    return artifact.reduce((total, entry) => {
      const violations = Array.isArray(entry.violations) ? entry.violations.length : 0;
      return total + violations;
    }, 0);
  }

  const recordArtifact = artifact as Record<string, unknown>;
  return Array.isArray(recordArtifact.violations) ? recordArtifact.violations.length : 0;
}

export function materializeConstitutionLawResults(input: {
  readonly constitutionReport: Record<string, unknown>;
  readonly executedLaws: readonly ConstitutionExecutedLaw[];
  readonly constitutionalFingerprint: ConstitutionFingerprint;
}): readonly ConstitutionLawResult[] {
  return input.executedLaws.map((entry) => {
    const artifactValue = input.constitutionReport[entry.proof.report_key];
    const artifact =
      Array.isArray(artifactValue)
        ? (artifactValue as readonly Record<string, unknown>[])
        : asRecord(artifactValue) ?? {};
    const resultPayload = {
      law: {
        law_id: entry.law_id,
        description: entry.description,
      },
      predicate: entry.predicate,
      inputs: {
        constitution_version: String(input.constitutionReport.constitution_version ?? "UNVERIFIED"),
        constitutional_digest: String(
          input.constitutionReport.constitutional_digest ?? "UNVERIFIED",
        ),
        proof_digest: String(input.constitutionReport.proof_digest ?? "UNVERIFIED"),
        constitutional_fingerprint: input.constitutionalFingerprint,
      },
      evaluation: {
        status: entry.proof.status,
        blocking_status: entry.blocking_status,
        proof_id: entry.proof.proof_id,
        proof_digest: entry.proof.report_digest,
        artifact_key: entry.proof.report_key,
        deterministic: entry.law_id === "DeterminismLaw" ? entry.proof.status === "PASS" : null,
        replayable: entry.law_id === "ReplayLaw" ? entry.proof.status === "PASS" : null,
        duration_ms: null,
        observations: {
          artifact_kind: (Array.isArray(artifact) ? "collection" : "record") as
            | "record"
            | "collection",
          check_count: countArtifactChecks(artifact),
          violation_count: countArtifactViolations(artifact),
        },
        reason:
          entry.proof.status === "PASS"
            ? `${entry.law_id} satisfied its predicate for the evaluated evidence set.`
            : `${entry.law_id} reported a failing predicate for the evaluated evidence set.`,
      },
      evidence: {
        artifact,
      },
    };
    const resultDigest = DigestEngine.digest(resultPayload);

    return {
      result_id: `law-result:${entry.law_id}:${resultDigest.slice(0, 16)}`,
      result_digest: resultDigest,
      ...resultPayload,
      result_boundary:
        "Law result is the domain evaluation artifact for a single constitutional law. It captures inputs, evidence, observations, and evaluation outcome without making certificate or trust assertions.",
    } satisfies ConstitutionLawResult;
  });
}
