import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type {
  Projection,
  ProjectionGeneratedFrom,
  ProjectionType,
} from "../models/domain.js";
import {
  materializeProjection,
  type ProjectionMaterializationInput,
} from "../materializers/index.js";
import {
  deserializeProjectionFromJson,
  recomputeProjectionDigest,
  serializeProjectionToJson,
} from "../serialization/index.js";
export { materializeProjection } from "../materializers/index.js";

export type ProjectionRuntimeInput<T extends Record<string, unknown>> =
  ProjectionMaterializationInput<T>;

export type ProjectionVerificationCheck = {
  readonly rule_id: string;
  readonly status: "PASS" | "FAIL";
  readonly detail: string;
};

export type ProjectionVerificationResult<T extends Record<string, unknown>> = {
  readonly projection: Projection<T>;
  readonly checks: readonly ProjectionVerificationCheck[];
  readonly violations: readonly {
    readonly rule_id: string;
    readonly detail: string;
  }[];
  readonly status: "PASS" | "FAIL";
};

export type ProjectionComparisonResult = {
  readonly same_projection_type: boolean;
  readonly same_projection_id: boolean;
  readonly same_projection_digest: boolean;
  readonly same_generated_from: boolean;
  readonly same_payload: boolean;
  readonly same_domain_identity: boolean;
  readonly differences: readonly string[];
};

export type ProjectionCertificate = {
  readonly scope: string;
  readonly status: "PASS" | "FAIL";
  readonly storage_locator: string;
  readonly replica_storage_locator: string | null;
  readonly projection_type: ProjectionType;
  readonly projection_id: string;
  readonly projection_digest: string;
  readonly generated_from: readonly ProjectionGeneratedFrom[];
  readonly violations: readonly {
    readonly rule_id: string;
    readonly detail: string;
  }[];
  readonly checks: readonly ProjectionVerificationCheck[];
  readonly expected_projection_type: ProjectionType | null;
};

export type PersistedProjectionArtifact<T extends Record<string, unknown>> = {
  readonly projection: Projection<T>;
  readonly storage_locator: string;
  readonly certificate: ProjectionCertificate;
};

export function writeProjectionArtifact<T extends Record<string, unknown>>(
  path: string,
  projection: Projection<T>,
): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(serializeProjectionArtifact(projection), null, 2)}\n`, "utf8");
}

export function serializeProjectionArtifact<T extends Record<string, unknown>>(
  projection: Projection<T>,
): Record<string, unknown> {
  return serializeProjectionToJson(projection);
}

export function deserializeProjectionArtifact<T extends Record<string, unknown>>(
  value: Record<string, unknown>,
): Projection<T> {
  return deserializeProjectionFromJson<T>(value);
}

export function readProjectionArtifact<T extends Record<string, unknown>>(
  path: string,
): Projection<T> {
  return deserializeProjectionArtifact<T>(
    JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>,
  );
}

export function recomputeProjectionArtifactDigest<T extends Record<string, unknown>>(
  projection: Projection<T>,
): string {
  return recomputeProjectionDigest(projection);
}

export function compareProjectionArtifacts<T extends Record<string, unknown>>(
  left: Projection<T>,
  right: Projection<T>,
): ProjectionComparisonResult {
  const differences: string[] = [];
  const sameProjectionType = left.projection_type === right.projection_type;
  const sameProjectionId = left.projection_id === right.projection_id;
  const sameProjectionDigest = left.projection_digest === right.projection_digest;
  const sameGeneratedFrom =
    JSON.stringify(left.generated_from) === JSON.stringify(right.generated_from);
  const samePayload = JSON.stringify(left.payload) === JSON.stringify(right.payload);
  const sameDomainIdentity =
    sameProjectionType &&
    sameProjectionId &&
    sameProjectionDigest &&
    sameGeneratedFrom &&
    samePayload;

  if (!sameProjectionType) {
    differences.push("projection_type");
  }
  if (!sameProjectionId) {
    differences.push("projection_id");
  }
  if (!sameProjectionDigest) {
    differences.push("projection_digest");
  }
  if (!sameGeneratedFrom) {
    differences.push("generated_from");
  }
  if (!samePayload) {
    differences.push("payload");
  }

  return {
    same_projection_type: sameProjectionType,
    same_projection_id: sameProjectionId,
    same_projection_digest: sameProjectionDigest,
    same_generated_from: sameGeneratedFrom,
    same_payload: samePayload,
    same_domain_identity: sameDomainIdentity,
    differences,
  };
}

function diffValues(left: unknown, right: unknown, path: string, differences: string[]): void {
  const leftIsArray = Array.isArray(left);
  const rightIsArray = Array.isArray(right);
  if (leftIsArray || rightIsArray) {
    if (!leftIsArray || !rightIsArray || JSON.stringify(left) !== JSON.stringify(right)) {
      differences.push(path);
    }
    return;
  }

  const leftIsObject = left !== null && typeof left === "object";
  const rightIsObject = right !== null && typeof right === "object";
  if (leftIsObject || rightIsObject) {
    if (!leftIsObject || !rightIsObject) {
      differences.push(path);
      return;
    }

    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const keys = Array.from(
      new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)]),
    ).sort((a, b) => a.localeCompare(b));
    for (const key of keys) {
      diffValues(
        leftRecord[key],
        rightRecord[key],
        path.length > 0 ? `${path}.${key}` : key,
        differences,
      );
    }
    return;
  }

  if (left !== right) {
    differences.push(path);
  }
}

export function diffProjectionArtifacts<T extends Record<string, unknown>>(
  left: Projection<T>,
  right: Projection<T>,
): readonly string[] {
  const differences: string[] = [];
  diffValues(serializeProjectionArtifact(left), serializeProjectionArtifact(right), "", differences);
  return differences.filter((entry) => entry.length > 0);
}

export function verifyProjectionArtifact<T extends Record<string, unknown>>(input: {
  readonly projection: Projection<T>;
  readonly replicaProjection?: Projection<T>;
  readonly expectedProjectionType?: ProjectionType;
}): ProjectionVerificationResult<T> {
  const roundTripProjection = deserializeProjectionArtifact<T>(
    serializeProjectionArtifact(input.projection),
  );
  const recomputedDigest = recomputeProjectionArtifactDigest(input.projection);
  const checks: ProjectionVerificationCheck[] = [
    {
      rule_id: "projection.type_matches_expected",
      status:
        input.expectedProjectionType === undefined ||
        input.projection.projection_type === input.expectedProjectionType
          ? "PASS"
          : "FAIL",
      detail:
        input.expectedProjectionType === undefined ||
        input.projection.projection_type === input.expectedProjectionType
          ? "Projection type matches the runtime contract."
          : `Expected ${input.expectedProjectionType}, received ${input.projection.projection_type}.`,
    },
    {
      rule_id: "projection.digest_matches_content",
      status: input.projection.projection_digest === recomputedDigest ? "PASS" : "FAIL",
      detail:
        input.projection.projection_digest === recomputedDigest
          ? "Projection digest matches canonical content digest."
          : "Projection digest does not match canonical content digest.",
    },
    {
      rule_id: "projection.serializer_roundtrip.digest_preserved",
      status:
        input.projection.projection_digest === roundTripProjection.projection_digest ? "PASS" : "FAIL",
      detail:
        input.projection.projection_digest === roundTripProjection.projection_digest
          ? "Serializer round-trip preserves projection digest."
          : "Serializer round-trip changes projection digest.",
    },
    {
      rule_id: "projection.serializer_roundtrip.identity_preserved",
      status: compareProjectionArtifacts(input.projection, roundTripProjection).same_domain_identity
        ? "PASS"
        : "FAIL",
      detail: compareProjectionArtifacts(input.projection, roundTripProjection).same_domain_identity
        ? "Serializer round-trip preserves projection domain identity."
        : "Serializer round-trip mutates projection domain identity.",
    },
  ];

  if (input.replicaProjection) {
    checks.push({
      rule_id: "projection.storage_path_independent",
      status: compareProjectionArtifacts(input.projection, input.replicaProjection).same_domain_identity
        ? "PASS"
        : "FAIL",
      detail: compareProjectionArtifacts(input.projection, input.replicaProjection).same_domain_identity
        ? "Projection identity is unchanged across storage locations."
        : "Projection identity changes across storage locations.",
    });
  }

  const violations = checks
    .filter((check) => check.status === "FAIL")
    .map((check) => ({ rule_id: check.rule_id, detail: check.detail }));

  return {
    projection: input.projection,
    checks,
    violations,
    status: violations.length === 0 ? "PASS" : "FAIL",
  };
}

export function buildProjectionCertificate<T extends Record<string, unknown>>(input: {
  readonly scope: string;
  readonly storageLocator: string;
  readonly projection: Projection<T>;
  readonly replicaStorageLocator?: string;
  readonly replicaProjection?: Projection<T>;
  readonly expectedProjectionType?: ProjectionType;
}): ProjectionCertificate {
  const verification = verifyProjectionArtifact({
    projection: input.projection,
    replicaProjection: input.replicaProjection,
    expectedProjectionType: input.expectedProjectionType,
  });

  return {
    scope: input.scope,
    status: verification.status,
    storage_locator: input.storageLocator,
    replica_storage_locator: input.replicaStorageLocator ?? null,
    projection_type: input.projection.projection_type,
    projection_id: input.projection.projection_id,
    projection_digest: input.projection.projection_digest,
    generated_from: input.projection.generated_from,
    violations: verification.violations,
    checks: verification.checks,
    expected_projection_type: input.expectedProjectionType ?? null,
  };
}

export function persistProjectionArtifact<T extends Record<string, unknown>>(input: {
  readonly path: string;
  readonly scope: string;
  readonly projection: Projection<T>;
  readonly expectedProjectionType?: ProjectionType;
  readonly replicaProjection?: Projection<T>;
  readonly replicaStorageLocator?: string;
  readonly storageLocator?: string;
}): PersistedProjectionArtifact<T> {
  writeProjectionArtifact(input.path, input.projection);
  const storageLocator =
    input.storageLocator ??
    `projection://${input.scope}/${input.projection.projection_type}/${input.projection.projection_id}`;

  return {
    projection: input.projection,
    storage_locator: storageLocator,
    certificate: buildProjectionCertificate({
      scope: input.scope,
      storageLocator,
      projection: input.projection,
      replicaProjection: input.replicaProjection,
      replicaStorageLocator: input.replicaStorageLocator,
      expectedProjectionType: input.expectedProjectionType,
    }),
  };
}

export function materializeExecutionPlanProjection(input: {
  readonly executionPlan: {
    readonly generated_from: readonly ProjectionGeneratedFrom[];
    readonly plan_canonical_json_digest: string;
    readonly generated_at_utc: string;
  } & Record<string, unknown>;
  readonly planInstance: Record<string, unknown>;
}): Projection<Record<string, unknown>> {
  return materializeProjection({
    projectionType: "ExecutionPlanProjection",
    generatedFrom: input.executionPlan.generated_from,
    projectionDigest: input.executionPlan.plan_canonical_json_digest,
    generatedAtUtc: input.executionPlan.generated_at_utc,
    payload: {
      ...input.executionPlan,
      plan_instance: input.planInstance,
    },
  });
}
