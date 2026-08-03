import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { hostname } from "node:os";
import {
  runT001,
  sha256,
  canonicalJson,
  readElsDocument,
} from "./t001.js";
import {
  EirRecordSchema,
  type EirRecord,
} from "@repo/core-eir";
import {
  T001_PREDICATES,
  PREDICATE_REGISTRY_ID,
} from "@repo/core-predicate-registry";
import {
  TRANSFORMATION_T001,
  TRANSFORMATION_REGISTRY_ID,
} from "@repo/core-transformation-registry";
import {
  TransformationProofEntrySchema,
  PROOF_LEDGER_GENESIS_HASH,
  PROOF_LEDGER_ID,
  PROOF_LEDGER_VERSION,
  type TransformationProofEntry,
  type PredicateResultSummary,
  type ProofLedgerDocument,
  PROOF_LEVEL_ORDER,
} from "@repo/core-proof-ledger";

const PACKAGE_SRC_DIR = dirname(decodeURIComponent(import.meta.url.replace(/^file:\/\//, "")));
const WORKSPACE_ROOT = resolve(join(PACKAGE_SRC_DIR, "..", "..", "..", ".."));
const REPO_ROOT = resolve(join(WORKSPACE_ROOT, ".."));
const BUILD_EVIDENCE = join(REPO_ROOT, "build", "evidence");
const TRANSFORMATION_PROOFS_DIR = join(BUILD_EVIDENCE, "transformation-proofs");
const PROOF_LEDGER_DIR = join(BUILD_EVIDENCE, "proof-ledger");

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
const LEDGER_STATE_PATH = join(PROOF_LEDGER_DIR, "proof-ledger-state.json");

const ensureDir = (p: string): void => {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
};

interface RunRecord {
  readonly inputHash: string;
  readonly outputHash: string;
  readonly outputJson: string;
  readonly eir: EirRecord;
}

const runOnce = (runLabel: string): RunRecord => {
  process.stdout.write(`[T001 ${runLabel}] starting...\n`);
  const result = runT001({
    elsYamlPath: DEFAULT_ELS_PATH,
    goldenReferenceDir: DEFAULT_GOLDEN_DIR,
  });
  process.stdout.write(
    `[T001 ${runLabel}] input_hash=${result.inputHash} output_hash=${result.outputHash}\n`,
  );
  return {
    inputHash: result.inputHash,
    outputHash: result.outputHash,
    outputJson: result.outputJson,
    eir: result.eir,
  };
};

const evalPredicates = (
  r1: RunRecord,
  r2: RunRecord,
): readonly PredicateResultSummary[] => {
  const results: PredicateResultSummary[] = [];

  const rawInput = readFileSync(DEFAULT_ELS_PATH, "utf8");
  const inputSchema = readElsDocument(DEFAULT_ELS_PATH);
  const pred1Status: PredicateResultSummary["status"] =
    inputSchema && rawInput.length > 0 ? "PASS" : "FAIL";
  results.push({
    predicate_id: "PRED-T001-INPUT-SCHEMA",
    phase: "PRE_EXECUTION",
    status: pred1Status,
  });

  const deterministicEqual =
    r1.inputHash === r2.inputHash && r1.outputHash === r2.outputHash;
  results.push({
    predicate_id: "PRED-T001-OUTPUT-DETERMINISTIC",
    phase: "POST_EXECUTION_VERIFICATION",
    status: deterministicEqual ? "PASS" : "FAIL",
  });

  const conformR1 = EirRecordSchema.safeParse(r1.eir).success;
  const conformR2 = EirRecordSchema.safeParse(r2.eir).success;
  results.push({
    predicate_id: "PRED-T001-CONFORM-EIR",
    phase: "POST_EXECUTION",
    status: conformR1 && conformR2 ? "PASS" : "FAIL",
  });

  return results;
};

const determineVerdict = (
  preds: readonly PredicateResultSummary[],
  deterministicVerifiedEqual: boolean,
): TransformationProofEntry["verdict"] => {
  const allPass = preds.every((p) => p.status === "PASS");
  if (!deterministicVerifiedEqual) return "FAIL";
  if (allPass) return "PASS";
  const anyFail = preds.some((p) => p.status === "FAIL");
  if (anyFail) return "FAIL";
  return "INCONCLUSIVE";
};

const loadLedgerOrNew = (): ProofLedgerDocument => {
  if (existsSync(LEDGER_STATE_PATH)) {
    const raw = readFileSync(LEDGER_STATE_PATH, "utf8");
    return JSON.parse(raw) as ProofLedgerDocument;
  }
  return {
    ledger_id: PROOF_LEDGER_ID,
    version: PROOF_LEDGER_VERSION,
    status: "ACTIVE",
    append_only_enforced: true,
    entries: [],
    count: 0,
    last_entry_hash: PROOF_LEDGER_GENESIS_HASH,
    genesis_hash: PROOF_LEDGER_GENESIS_HASH,
  };
};

const appendProofToLedger = (
  ledger: ProofLedgerDocument,
  proof: TransformationProofEntry,
  proofJson: string,
): ProofLedgerDocument => {
  if (ledger.entries.some((entry) => entry.proof_id === proof.proof_id)) {
    return ledger;
  }
  const entryHash = sha256(proofJson);
  const updatedProof: TransformationProofEntry = {
    ...proof,
    hash_chain: {
      previous_entry_hash: ledger.last_entry_hash,
      entry_hash: entryHash,
      hash_algorithm: "sha256",
    },
  };
  const updatedProofJson = canonicalJson(updatedProof);
  const finalEntryHash = sha256(updatedProofJson);
  const finalProof: TransformationProofEntry = {
    ...updatedProof,
    hash_chain: { ...updatedProof.hash_chain, entry_hash: finalEntryHash },
  };
  const newEntries = [...ledger.entries, finalProof];
  return {
    ...ledger,
    entries: newEntries,
    count: newEntries.length,
    last_entry_hash: finalEntryHash,
  };
};

const main = (): number => {
  ensureDir(TRANSFORMATION_PROOFS_DIR);
  ensureDir(PROOF_LEDGER_DIR);
  void PROOF_LEVEL_ORDER;
  void PREDICATE_REGISTRY_ID;
  void TRANSFORMATION_REGISTRY_ID;
  void PROOF_LEDGER_VERSION;

  for (const pred of T001_PREDICATES) {
    process.stdout.write(
      `[registry] predicate ${pred.predicate_id} (${pred.phase}) loaded from ${predicateLocation(pred.predicate_id)}\n`,
    );
  }
  process.stdout.write(
    `[registry] T001 contract_ref=${TRANSFORMATION_T001.contract_ref}\n`,
  );

  const r1 = runOnce("RUN-1");
  const r2 = runOnce("RUN-2");

  const deterministicEqual = r1.outputHash === r2.outputHash;
  const inputDeterministic = r1.inputHash === r2.inputHash;
  process.stdout.write(
    `[determinism] input_hashes_equal=${inputDeterministic} output_hashes_equal=${deterministicEqual}\n`,
  );

  const predicates = evalPredicates(r1, r2);
  const verdict = determineVerdict(predicates, deterministicEqual);
  process.stdout.write(
    `[predicates] ${predicates
      .map((p) => `${p.predicate_id}=${p.status}`)
      .join(" ")}\n[T001] verdict=${verdict}\n`,
  );

  const proofId = "TRF-PROOF-T001";
  const devHost = hostname() || "dev-localhost";
  const now = deterministicTimestamp();

  const placeholdersForChain: TransformationProofEntry = {
    proof_id: proofId,
    proof_level: "TRANSFORMATION_PROOF",
    transformation_id: "T001",
    contract_ref: TRANSFORMATION_T001.contract_ref,
    verdict,
    predicate_results: predicates,
    input_hash: r1.inputHash,
    output_hash: r1.outputHash,
    determinism_run_1_hash: r1.outputHash,
    determinism_run_2_hash: r2.outputHash,
    determinism_verified_equal: deterministicEqual,
    emitted_at: now,
    authority_signature: { kind: "UNSIGNED", developer_hostname: devHost },
    hash_chain: {
      previous_entry_hash: PROOF_LEDGER_GENESIS_HASH,
      entry_hash: "sha256:PENDING",
      hash_algorithm: "sha256",
    },
    spec_kind: "TRANSFORMATION_PROOF_ENTRY",
  };

  const tempJson = canonicalJson(placeholdersForChain);
  void tempJson;

  const ledger = loadLedgerOrNew();
  const firstPassJson = canonicalJson(placeholdersForChain);
  const newLedger = appendProofToLedger(
    ledger,
    placeholdersForChain,
    firstPassJson,
  );
  const appended = newLedger.entries[newLedger.entries.length - 1];
  const appendedValid = TransformationProofEntrySchema.safeParse(appended);
  if (!appendedValid.success) {
    process.stderr.write(
      `[proof-parse FAIL] ${JSON.stringify(appendedValid.error.errors, null, 2)}\n`,
    );
    return 2;
  }

  const finalProofJson = canonicalJson(appended);
  writeFileSync(
    join(TRANSFORMATION_PROOFS_DIR, `${proofId}.json`),
    finalProofJson,
    "utf8",
  );
  writeFileSync(LEDGER_STATE_PATH, canonicalJson(newLedger), "utf8");
  writeFileSync(
    join(PROOF_LEDGER_DIR, `${proofId}.ledger-append.json`),
    finalProofJson,
    "utf8",
  );

  process.stdout.write(
    `[proof emitted] ${join(TRANSFORMATION_PROOFS_DIR, proofId)}.json\n` +
      `[ledger appended] count=${newLedger.count} last_hash=${newLedger.last_entry_hash.slice(0, 24)}...\n` +
      `[Gate C status] ${verdict === "PASS" && deterministicEqual ? "VERIFIED READY" : "FAIL — see predicates"}\n`,
  );

  return verdict === "PASS" && deterministicEqual ? 0 : 1;
};

const predicateLocation = (id: string): string =>
  `/workspace/packages/core/predicate-registry/src/index.ts (T001_PREDICATES[${
    T001_PREDICATES.findIndex((p) => p.predicate_id === id)
  }])`;

const deterministicTimestamp = (): string => {
  const today = new Date();
  const iso = today.toISOString().split("T")[0];
  return `${iso}T00:00:00.000Z`;
};
void createHash;

const exitCode = main();
process.exit(exitCode);
