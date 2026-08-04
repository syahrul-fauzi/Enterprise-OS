import {
  buildProjectionDigest,
  type Projection,
  type ProjectionGeneratedFrom,
  type ProjectionType,
} from "../models/domain.js";

export type JsonProjectionRecord<T extends Record<string, unknown>> = Omit<Projection<T>, "payload"> & T;

const PROJECTION_JSON_METADATA_KEYS = [
  "projection_id",
  "projection_type",
  "schema_version",
  "projection_digest",
  "generated_from",
  "generated_at_utc",
] as const;
const PROJECTION_JSON_METADATA_KEY_SET = new Set<string>(PROJECTION_JSON_METADATA_KEYS);

export function serializeProjectionToJson<T extends Record<string, unknown>>(
  projection: Projection<T>,
): JsonProjectionRecord<T> {
  return {
    projection_id: projection.projection_id,
    projection_type: projection.projection_type,
    schema_version: projection.schema_version,
    projection_digest: projection.projection_digest,
    generated_from: projection.generated_from,
    generated_at_utc: projection.generated_at_utc,
    ...projection.payload,
  };
}

export function deserializeProjectionFromJson<T extends Record<string, unknown>>(
  value: Record<string, unknown>,
): Projection<T> {
  const payload = Object.fromEntries(
    Object.entries(value).filter(([key]) => !PROJECTION_JSON_METADATA_KEY_SET.has(key)),
  ) as T;

  return {
    projection_id: String(value.projection_id ?? "UNVERIFIED"),
    projection_type: String(value.projection_type ?? "UNVERIFIED") as ProjectionType,
    schema_version: String(value.schema_version ?? "UNVERIFIED"),
    projection_digest: String(value.projection_digest ?? "UNVERIFIED"),
    generated_from: Array.isArray(value.generated_from)
      ? (value.generated_from as readonly ProjectionGeneratedFrom[])
      : [],
    generated_at_utc: String(value.generated_at_utc ?? "UNVERIFIED"),
    payload,
  };
}

export function recomputeProjectionDigest<T extends Record<string, unknown>>(
  projection: Projection<T>,
): string {
  return buildProjectionDigest({
    projectionType: projection.projection_type,
    schemaVersion: projection.schema_version,
    generatedFrom: projection.generated_from,
    payload: projection.payload,
  });
}
