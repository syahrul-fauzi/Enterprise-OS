import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import {
  ATTRIBUTION_V1,
  type EvaluationAttributionRecordV1,
  type AttributionVersion,
  type ProcedureName,
  toProcedureName,
} from "./contracts.js";
import type {
  ExecutionId,
  CanonicalSubjectKey,
} from "../contracts.js";
import type {
  PrepareReleaseInput,
  PrepareReleaseOutput,
} from "../prepare-release/contracts.js";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };

function canonicalize(value: unknown): JsonValue {
  if (value === undefined) {
    return null;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    const items = value.map((entry) => canonicalize(entry));
    items.sort((a, b) => {
      const aStr = JSON.stringify(a);
      const bStr = JSON.stringify(b);
      return aStr.localeCompare(bStr);
    });
    return items;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)] as const);
    const result: { [key: string]: JsonValue } = {};
    for (const [key, val] of entries) {
      result[key] = val;
    }
    return result;
  }
  return String(value);
}

function digestCanonical(value: unknown): string {
  const canonical = canonicalize(value);
  return createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");
}

interface PrepareReleaseCanonicalInputProjection {
  readonly procedure: "prepare_release";
  readonly canonicalSubject: string;
  readonly releaseId: string;
  readonly limit: number | null;
}

function projectCanonicalInput(
  input: PrepareReleaseInput,
  ctx: {
    readonly procedure: string;
    readonly canonicalSubject: CanonicalSubjectKey;
  },
): PrepareReleaseCanonicalInputProjection {
  return {
    procedure: ctx.procedure as "prepare_release",
    canonicalSubject: String(ctx.canonicalSubject),
    releaseId: input.releaseId,
    limit: input.limit === undefined ? null : input.limit,
  };
}

interface PrepareReleaseCanonicalResultProjectionV1 {
  readonly execution: {
    readonly status: "passed" | "failed";
    readonly reason: string;
  };
  readonly readiness: {
    readonly status: "ready" | "blocked" | "pending_ai_investigation";
  };
  readonly requirements: {
    readonly total: number;
    readonly verified: number;
    readonly blocked: number;
    readonly unknown: number;
  };
  readonly traceability: {
    readonly complete: boolean;
    readonly gapCount: number;
    readonly gapRequirementIds: readonly string[];
  };
  readonly evidence: {
    readonly complete: boolean;
    readonly total: number;
    readonly pathCount: number;
  };
  readonly ai: {
    readonly invoked: boolean;
    readonly ambiguousRequirementCount: number;
    readonly invocationStatus: string | null;
  };
  readonly blockerCount: number;
  readonly blockerDigests: readonly string[];
}

function projectCanonicalResult(
  output: PrepareReleaseOutput,
): PrepareReleaseCanonicalResultProjectionV1 {
  const blockerDigests = output.blockers
    .map((blocker) => digestCanonical(blocker))
    .sort((a, b) => a.localeCompare(b));

  const gapRequirementIds = [...output.traceability.gapRequirementIds].sort((a, b) =>
    a.localeCompare(b),
  );

  return {
    execution: {
      status: output.execution.status,
      reason: output.execution.reason,
    },
    readiness: {
      status: output.readiness.status,
    },
    requirements: {
      total: output.requirements.total,
      verified: output.requirements.verified,
      blocked: output.requirements.blocked,
      unknown: output.requirements.unknown,
    },
    traceability: {
      complete: output.traceability.complete,
      gapCount: output.traceability.gaps,
      gapRequirementIds,
    },
    evidence: {
      complete: output.evidence.complete,
      total: output.evidence.total,
      pathCount: output.evidence.paths.length,
    },
    ai: {
      invoked: output.ai.invoked,
      ambiguousRequirementCount: output.ai.ambiguousRequirements.length,
      invocationStatus: output.ai.invocationStatus,
    },
    blockerCount: output.blockers.length,
    blockerDigests,
  };
}

export function computeInputDigest(
  input: PrepareReleaseInput,
  ctx: {
    readonly procedure: string;
    readonly canonicalSubject: CanonicalSubjectKey;
  },
): string {
  const projection = projectCanonicalInput(input, ctx);
  return digestCanonical(projection);
}

export function computeResultDigest(output: PrepareReleaseOutput): string {
  const projection = projectCanonicalResult(output);
  return digestCanonical(projection);
}

const FS_SAFE_ENCODE_CHARS: Readonly<Record<string, string>> = {
  "/": "__s__",
  "\\": "__b__",
  ":": "__c__",
  "*": "__a__",
  "?": "__q__",
  '"': "__q2__",
  "<": "__l__",
  ">": "__g__",
  "|": "__p__",
  " ": "__sp__",
};

export function encodeFilesystemSafe(subject: CanonicalSubjectKey): string {
  const raw = String(subject);
  let result = "";
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    result += FS_SAFE_ENCODE_CHARS[char] ?? char;
  }
  return result;
}

export function encodeProcedureFilesystemSafe(procedure: string): string {
  return encodeFilesystemSafe(procedure as CanonicalSubjectKey);
}

function resolveAttributionBaseDir(): string {
  const explicit = process.env.EOS_ATTRIBUTION_BASE_DIR?.trim();
  if (explicit) {
    return explicit;
  }
  return join(process.cwd(), ".eos", "attribution");
}

function resolveProcedureDir(
  baseDir: string,
  procedure: string,
): string {
  const procedureDir = encodeProcedureFilesystemSafe(procedure);
  return join(baseDir, procedureDir);
}

function resolveRecordsFile(
  baseDir: string,
  procedure: string,
  canonicalSubject: CanonicalSubjectKey,
): string {
  const procedureDir = resolveProcedureDir(baseDir, procedure);
  const subjectFilename = `${encodeFilesystemSafe(canonicalSubject)}.jsonl`;
  return join(procedureDir, subjectFilename);
}

export function appendAttributionRecord(
  params: {
    readonly executionId: ExecutionId;
    readonly procedure: string;
    readonly canonicalSubject: CanonicalSubjectKey;
    readonly input: PrepareReleaseInput;
    readonly output: PrepareReleaseOutput;
    readonly evaluatedAt?: string;
  },
): EvaluationAttributionRecordV1 {
  const baseDir = resolveAttributionBaseDir();
  const procedureDir = resolveProcedureDir(baseDir, params.procedure);
  mkdirSync(procedureDir, { recursive: true });

  const recordsFile = resolveRecordsFile(baseDir, params.procedure, params.canonicalSubject);

  const record: EvaluationAttributionRecordV1 = {
    version: ATTRIBUTION_V1,
    executionId: params.executionId,
    procedure: toProcedureName(params.procedure),
    canonicalSubject: params.canonicalSubject,
    evaluatedAt: params.evaluatedAt ?? new Date().toISOString(),
    inputDigest: computeInputDigest(params.input, {
      procedure: params.procedure,
      canonicalSubject: params.canonicalSubject,
    }),
    resultDigest: computeResultDigest(params.output),
  };

  appendFileSync(recordsFile, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

export function listAttributionRecords(
  params: {
    readonly procedure: string;
    readonly canonicalSubject: CanonicalSubjectKey;
  },
): readonly EvaluationAttributionRecordV1[] {
  const baseDir = resolveAttributionBaseDir();
  const recordsFile = resolveRecordsFile(baseDir, params.procedure, params.canonicalSubject);

  if (!existsSync(recordsFile)) {
    return [];
  }

  const raw = readFileSync(recordsFile, "utf8");
  const lines = raw.split("\n").filter((line) => line.trim().length > 0);

  const records: EvaluationAttributionRecordV1[] = [];
  for (const line of lines) {
    try {
      records.push(JSON.parse(line) as EvaluationAttributionRecordV1);
    } catch {
      continue;
    }
  }

  return records;
}

export function getLatestAttributionRecord(
  params: {
    readonly procedure: string;
    readonly canonicalSubject: CanonicalSubjectKey;
  },
): EvaluationAttributionRecordV1 | null {
  const records = listAttributionRecords(params);
  if (records.length === 0) {
    return null;
  }
  return records[records.length - 1];
}

export function getAttributionBaseDir(): string {
  return resolveAttributionBaseDir();
}

export function hasAttributionRecords(
  params: {
    readonly procedure: string;
    readonly canonicalSubject: CanonicalSubjectKey;
  },
): boolean {
  return listAttributionRecords(params).length > 0;
}

export { ATTRIBUTION_V1 };

export type {
  EvaluationAttributionRecordV1,
  AttributionVersion,
  ProcedureName,
  PrepareReleaseCanonicalInputProjection,
  PrepareReleaseCanonicalResultProjectionV1,
};
