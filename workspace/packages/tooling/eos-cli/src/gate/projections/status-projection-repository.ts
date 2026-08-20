import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import YAML from "yaml";

import { EOS_ROOT } from "../../state.js";
import { writeGateCStatusProjectionArtifacts } from "../evidence/status-evidence.js";
import {
  materializeAndPersistStatusProjection,
  regenerateStatusProjection,
} from "./status-projection-lifecycle.js";

export const GATE_C_STATUS_PROJECTION_PATH = resolve(
  EOS_ROOT,
  "enterprise/science/gate-c/execution/gate-c-status.yaml",
);

export const GATE_C_STATUS_PROJECTION_REF =
  "enterprise/science/gate-c/execution/gate-c-status.yaml";

export function persistGateCStatusProjectionRecord(
  projection: Record<string, unknown>,
): Record<string, unknown> {
  return writeGateCStatusProjectionArtifacts({
    payload: projection,
    statusYamlPath: GATE_C_STATUS_PROJECTION_PATH,
    statusYamlRef: GATE_C_STATUS_PROJECTION_REF,
  });
}

export function materializeAndPersistGateCStatusProjection(input: {
  readonly buildProjection: () => Record<string, unknown>;
}): Record<string, unknown> {
  return materializeAndPersistStatusProjection({
    buildProjection: input.buildProjection,
    persistProjection: persistGateCStatusProjectionRecord,
  });
}

export function regenerateGateCStatusProjection(input: {
  readonly statusProjectionPath: string;
  readonly buildProjection: () => Record<string, unknown>;
  readonly hashProjection: (projection: Record<string, unknown>) => string;
}): {
  readonly exitCode: number;
  readonly output: string;
  readonly projection: Record<string, unknown>;
} {
  return regenerateStatusProjection({
    statusProjectionPath: input.statusProjectionPath,
    buildProjection: input.buildProjection,
    persistProjection: persistGateCStatusProjectionRecord,
    readPreviousProjection: readGateCStatusProjectionRecordIfExists,
    hashProjection: input.hashProjection,
  });
}

export function hasGateCStatusProjectionRecord(): boolean {
  return existsSync(GATE_C_STATUS_PROJECTION_PATH);
}

export function readGateCStatusProjectionRecordIfExists():
  | Record<string, unknown>
  | null {
  return hasGateCStatusProjectionRecord()
    ? readGateCStatusProjectionRecord()
    : null;
}

export function readGateCStatusProjectionRecord(): Record<string, unknown> {
  const parsed = YAML.parse(readFileSync(GATE_C_STATUS_PROJECTION_PATH, "utf8"));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      `Expected object at ${GATE_C_STATUS_PROJECTION_REF}`,
    );
  }
  return parsed as Record<string, unknown>;
}

// Gate F: Production Readiness Gates
export const GATE_F_STATUS_PROJECTION_PATH = resolve(
  EOS_ROOT,
  "build/evidence/production-readiness/gate-f-status.yaml",
);

export const GATE_F_STATUS_PROJECTION_REF =
  "build/evidence/production-readiness/gate-f-status.yaml";

export function persistGateFStatusProjectionRecord(
  projection: Record<string, unknown>,
): Record<string, unknown> {
  return writeGateCStatusProjectionArtifacts({
    payload: projection,
    statusYamlPath: GATE_F_STATUS_PROJECTION_PATH,
    statusYamlRef: GATE_F_STATUS_PROJECTION_REF,
  });
}

export function materializeAndPersistGateFStatusProjection(input: {
  readonly buildProjection: () => Record<string, unknown>;
}): Record<string, unknown> {
  return materializeAndPersistStatusProjection({
    buildProjection: input.buildProjection,
    persistProjection: persistGateFStatusProjectionRecord,
  });
}

export function hasGateFStatusProjectionRecord(): boolean {
  return existsSync(GATE_F_STATUS_PROJECTION_PATH);
}

export function readGateFStatusProjectionRecord(): Record<string, unknown> {
  const parsed = YAML.parse(readFileSync(GATE_F_STATUS_PROJECTION_PATH, "utf8"));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      `Expected object at ${GATE_F_STATUS_PROJECTION_REF}`,
    );
  }
  return parsed as Record<string, unknown>;
}