import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import YAML from "yaml";
import {
  ElsDocumentSchema,
  EirRecordSchema,
  type ElsDocument,
  type EirRecord,
  type EirInstruction,
  type EirCapabilityRef,
  type EirDeterminismContext,
} from "@repo/core-eir";

export const sha256hex = (input: string | Uint8Array): string => {
  const hash = createHash("sha256");
  if (typeof input === "string") hash.update(input, "utf8");
  else hash.update(input);
  return hash.digest("hex");
};

export const sha256 = (input: string | Uint8Array): string =>
  `sha256:${sha256hex(input)}`;

export const canonicalJson = <T>(value: T): string =>
  JSON.stringify(value, (_key, val) =>
    Array.isArray(val)
      ? val
      : val !== null && typeof val === "object"
        ? Object.fromEntries(
            Object.entries(val as Record<string, unknown>).sort(([a], [b]) =>
              a < b ? -1 : a > b ? 1 : 0,
            ),
          )
        : val,
  );

export const deterministicTimestamp = (elsCreated: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(elsCreated)) {
    return `${elsCreated}T00:00:00.000Z`;
  }
  const iso = new Date(elsCreated).toISOString();
  return iso.replace(/\.\d{3}Z$/, ".000Z");
};

export interface T001Input {
  elsYamlPath: string;
  goldenReferenceDir: string;
}

export interface T001Output {
  eir: EirRecord;
  outputPath: string;
  outputJson: string;
  inputHash: string;
  outputHash: string;
  determinismContext: EirDeterminismContext;
}

export const readElsDocument = (path: string): ElsDocument => {
  const raw = readFileSync(path, "utf8");
  const parsed = YAML.parse(raw);
  const result = ElsDocumentSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `PRED-T001-INPUT-SCHEMA FAIL: ${JSON.stringify(result.error.errors, null, 2)}`,
    );
  }
  return result.data;
};

const buildInstructions = (els: ElsDocument): readonly EirInstruction[] => {
  const base: EirInstruction[] = [];
  base.push({
    instruction_id: `INSTR-${sha256hex(
      `${els.requirement_identity.stable_external_id}:DECLARE_REQUIREMENT_IDENTITY`,
    ).slice(0, 16)}`,
    op: "DECLARE_REQUIREMENT_IDENTITY",
    payload: {
      requirement_id: els.requirement_identity.requirement_id,
      stable_external_id: els.requirement_identity.stable_external_id,
      id_policy: els.requirement_identity.id_policy,
    },
    order: 0,
  });
  base.push({
    instruction_id: `INSTR-${sha256hex(
      `${els.requirement_identity.stable_external_id}:DECLARE_BUSINESS_STATEMENT`,
    ).slice(0, 16)}`,
    op: "DECLARE_BUSINESS_STATEMENT",
    payload: {
      title: els.business_statement.title,
      description: els.business_statement.description,
      origin: els.business_statement.origin,
    },
    order: 1,
  });
  base.push({
    instruction_id: `INSTR-${sha256hex(
      `${els.requirement_identity.stable_external_id}:DECLARE_COMPLIANCE_RULES`,
    ).slice(0, 16)}`,
    op: "DECLARE_COMPLIANCE_RULES",
    payload: {
      rules: els.compliance_rules.map((r) => ({
        rule: r.rule,
        severity: r.severity,
        enforcement: r.enforcement,
      })),
    },
    order: 2,
  });
  base.push({
    instruction_id: `INSTR-${sha256hex(
      `${els.requirement_identity.stable_external_id}:DECLARE_CAPABILITY_DEPS`,
    ).slice(0, 16)}`,
    op: "DECLARE_CAPABILITY_DEPS",
    payload: {
      capability_refs: els.capability_refs.map((c) => ({
        capability_id: c.capability_id,
        capability_name: c.capability_name,
        purpose: c.purpose,
      })),
    },
    order: 3,
  });
  base.push({
    instruction_id: `INSTR-${sha256hex(
      `${els.requirement_identity.stable_external_id}:DECLARE_TRACEABILITY_ANCHORS`,
    ).slice(0, 16)}`,
    op: "DECLARE_TRACEABILITY_ANCHORS",
    payload: {
      anchors: els.traceability.anchors.map((a) => ({
        anchor: a.anchor,
        propagates_to: a.propagates_to,
      })),
    },
    order: 4,
  });
  return base;
};

export const runT001 = (input: T001Input): T001Output => {
  const elsPath = resolve(input.elsYamlPath);
  const elsRaw = readFileSync(elsPath, "utf8");
  const els = readElsDocument(elsPath);

  const inputHash = sha256(elsRaw);
  const deterministicNonce = sha256hex(inputHash).slice(0, 16);
  const determinismContext: EirDeterminismContext = {
    input_hash: inputHash,
    deterministic_nonce: deterministicNonce,
  };

  const instructionSet = buildInstructions(els);
  const capabilityRefs: readonly EirCapabilityRef[] = els.capability_refs.map(
    (c) => ({
      capability_id: c.capability_id,
      capability_name: c.capability_name,
      purpose: c.purpose,
    }),
  );

  const emittedAt = deterministicTimestamp(els.specification_metadata.created);
  const eirIdSeed = `${els.specification.id}:${els.specification.version}:${sha256hex(inputHash).slice(0, 32)}`;
  const eirId = `eir-${sha256hex(eirIdSeed).slice(0, 32)}`;

  const eir: EirRecord = {
    eir_id: eirId,
    transformation_id: "T001",
    source_els_id: els.specification.id,
    source_els_version: els.specification.version,
    source_els_hash: inputHash,
    instruction_set: instructionSet,
    capability_refs: capabilityRefs,
    emitted_at: emittedAt,
    determinism_context: determinismContext,
    status: "DRAFT",
    spec_kind: "EIR_INSTRUCTION_RECORD",
  };

  const parsed = EirRecordSchema.safeParse(eir);
  if (!parsed.success) {
    throw new Error(
      `PRED-T001-CONFORM-EIR FAIL (pre-write): ${JSON.stringify(parsed.error.errors, null, 2)}`,
    );
  }

  const outputJson = canonicalJson(parsed.data);
  const outputHash = sha256(outputJson);

  const outputDir = join(input.goldenReferenceDir, "eir-output");
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, `${els.specification.id}.eir.json`);
  writeFileSync(outputPath, outputJson, "utf8");

  return {
    eir: parsed.data,
    outputPath,
    outputJson,
    inputHash,
    outputHash,
    determinismContext,
  };
};

const PACKAGE_SRC_DIR = dirname(decodeURIComponent(import.meta.url.replace(/^file:\/\//, "")));
const WORKSPACE_ROOT = resolve(join(PACKAGE_SRC_DIR, "..", "..", "..", ".."));

const DEFAULT_ELS_PATH = join(
  WORKSPACE_ROOT,
  "examples",
  "vertical-slice",
  "REQ-0001",
  "req-0001.els.yaml",
);
const DEFAULT_GOLDEN_DIR = join(
  WORKSPACE_ROOT,
  "examples",
  "vertical-slice",
  "REQ-0001",
);

if (
  process.argv[1] &&
  (process.argv[1].endsWith("t001.ts") ||
    process.argv[1].includes("t001-standalone"))
) {
  const elsArg = process.argv[2] ?? DEFAULT_ELS_PATH;
  const goldenArg = process.argv[3] ?? DEFAULT_GOLDEN_DIR;
  const result = runT001({ elsYamlPath: elsArg, goldenReferenceDir: goldenArg });
  process.stdout.write(
    `T001 OK\n input_hash=${result.inputHash}\n output_hash=${result.outputHash}\n output=${result.outputPath}\n instruction_count=${result.eir.instruction_set.length}\n`,
  );
  void dirname;
}
