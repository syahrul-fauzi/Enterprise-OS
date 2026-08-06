import { mkdtempSync, realpathSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ATTRIBUTION_V1,
  appendAttributionRecord,
  computeInputDigest,
  computeResultDigest,
  encodeFilesystemSafe,
  encodeProcedureFilesystemSafe,
  getLatestAttributionRecord,
  listAttributionRecords,
  getAttributionBaseDir,
} from "../../attribution/implementation";
import {
  buildExecutionIdentityV1,
  toCanonicalSubjectKey,
} from "../../contracts";
import type { PrepareReleaseOutput } from "../contracts";

function makeTempDir(): string {
  return realpathSync(mkdtempSync(join(tmpdir(), "eos-audit-")));
}

function makeMockOutput(overrides: Partial<PrepareReleaseOutput> = {}): PrepareReleaseOutput {
  const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-001");
  return {
    executionId: identity.executionId,
    procedure: "prepare_release",
    procedureId: "prepare_release",
    canonicalSubject: identity.canonicalSubject,
    releaseId: "EOS-001",
    execution: { status: "passed", reason: "blockers_found" },
    readiness: { status: "blocked" },
    requirements: { total: 10, verified: 7, blocked: 2, unknown: 1 },
    traceability: { complete: false, gaps: 2, gapRequirementIds: ["REQ-003", "REQ-007"] },
    evidence: { complete: true, total: 25, paths: ["/ev/a", "/ev/b", "/ev/c"] },
    ai: { invoked: false, planId: null, ambiguousRequirements: [], invocationStatus: null },
    blockers: ["blocker x", "blocker y"],
    steps: [],
    generatedAt: "2026-08-06T10:00:00.000Z",
    ...overrides,
  };
}

const results: Array<{ point: string; status: "PASS" | "FAIL" | "WARN"; evidence: string; note?: string }> = [];
const auditTempDir = makeTempDir();
const original = process.env.EOS_ATTRIBUTION_BASE_DIR;

function audit(point: string, checkFn: () => { ok: boolean; evidence: string; note?: string }) {
  process.env.EOS_ATTRIBUTION_BASE_DIR = makeTempDir();
  try {
    const { ok, evidence, note } = checkFn();
    results.push({ point, status: ok ? "PASS" : "FAIL", evidence, note });
  } finally {
    try { rmSync(process.env.EOS_ATTRIBUTION_BASE_DIR!, { recursive: true, force: true }); } catch {}
  }
}

// ============================================================
// AUDIT #1 — 7-field serialized record
// ============================================================
audit("AUDIT #1: 7 canonical fields on serialized record", () => {
  const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-AUDIT01");
  const input = { releaseId: "EOS-AUDIT01" };
  const output = makeMockOutput({ releaseId: "EOS-AUDIT01" });
  const written = appendAttributionRecord({
    executionId: identity.executionId,
    procedure: "prepare_release",
    canonicalSubject: identity.canonicalSubject,
    input,
    output,
    evaluatedAt: "2026-01-01T00:00:00.000Z",
  });

  const procDir = encodeProcedureFilesystemSafe("prepare_release");
  const subjEncoded = encodeFilesystemSafe(identity.canonicalSubject);
  const onDiskPath = join(process.env.EOS_ATTRIBUTION_BASE_DIR!, procDir, `${subjEncoded}.jsonl`);
  const raw = readFileSync(onDiskPath, "utf8").trim();
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const keys = Object.keys(parsed).sort();

  const actual = ["canonicalSubject", "evaluatedAt", "executionId", "inputDigest", "procedure", "resultDigest", "version"];
  const ok = keys.length === 7 && JSON.stringify(keys) === JSON.stringify(actual);

  return {
    ok,
    evidence: `On-disk keys=${JSON.stringify(keys)}; version=${parsed.version}; executionId=${parsed.executionId}; serialized record length=${raw.length} chars`,
    note: !ok ? `Expected exactly [${actual.join(",")}]` : undefined,
  };
});

// ============================================================
// AUDIT #2 — executionId invariant
// ============================================================
audit("AUDIT #2: executionId invariant across 4 reruns", () => {
  const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-AUDIT02");
  const input = { releaseId: "EOS-AUDIT02" };

  const ids: string[] = [];
  for (let i = 0; i < 4; i++) {
    const output = makeMockOutput({
      releaseId: "EOS-AUDIT02",
      generatedAt: `2026-08-06T10:0${i}:00.000Z`,
    });
    const rec = appendAttributionRecord({
      executionId: identity.executionId,
      procedure: "prepare_release",
      canonicalSubject: identity.canonicalSubject,
      input,
      output,
      evaluatedAt: output.generatedAt,
    });
    ids.push(rec.executionId);
  }
  const all = listAttributionRecords({
    procedure: "prepare_release",
    canonicalSubject: identity.canonicalSubject,
  });
  const allSame = ids.every((id) => id === identity.executionId) &&
    all.every((r) => r.executionId === identity.executionId);
  return {
    ok: allSame && all.length === 4,
    evidence: `Records count=${all.length}; All executionId match: ${allSame}; identity.executionId=${identity.executionId}`,
  };
});

// ============================================================
// AUDIT #3 — evaluatedAt = generatedAt completion
// ============================================================
audit("AUDIT #3: evaluatedAt berasal dari generatedAt (passed into call)", () => {
  const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-AUDIT03");
  const input = { releaseId: "EOS-AUDIT03" };
  const completionTs = "2026-07-04T12:34:56.789Z";
  const output = makeMockOutput({
    releaseId: "EOS-AUDIT03",
    generatedAt: completionTs,
  });
  const rec = appendAttributionRecord({
    executionId: identity.executionId,
    procedure: "prepare_release",
    canonicalSubject: identity.canonicalSubject,
    input,
    output,
    evaluatedAt: output.generatedAt,
  });
  return {
    ok: rec.evaluatedAt === completionTs,
    evidence: `evaluatedAt=${rec.evaluatedAt}, expected generatedAt=${completionTs}, match=${rec.evaluatedAt === completionTs}`,
  };
});

// ============================================================
// AUDIT #4 — input projection exact (Step 2 FINAL LOCK)
// ============================================================
audit("AUDIT #4: input projection exact (Step 2 FINAL LOCK: procedure+subject+releaseId+limit)", () => {
  const identityA = buildExecutionIdentityV1("prepare_release", "release/EOS-AUDIT04");
  const identityOther = buildExecutionIdentityV1("prepare_release", "release/EOS-OTHER");
  const ctxA = { procedure: "prepare_release", canonicalSubject: identityA.canonicalSubject };
  const ctxOther = { procedure: "prepare_release", canonicalSubject: identityOther.canonicalSubject };

  const d1 = computeInputDigest({ releaseId: "EOS-AUDIT04" }, ctxA);
  const d2 = computeInputDigest({ releaseId: "EOS-AUDIT04", limit: 10 }, ctxA);
  const d3 = computeInputDigest({ releaseId: "EOS-AUDIT04", limit: 999 }, ctxA);
  const d4 = computeInputDigest({ releaseId: "EOS-AUDIT04", limit: 20 }, ctxA);
  const dSameLimit = computeInputDigest({ releaseId: "EOS-AUDIT04", limit: 10 }, ctxA);

  const differentPerLimit = d1 !== d2 && d2 !== d3 && d3 !== d4;
  const sameLimitSame = d2 === dSameLimit;
  const dOther = computeInputDigest({ releaseId: "EOS-OTHER" }, ctxOther);
  const differentSubject = d1 !== dOther;

  // Step 2 FINAL LOCK: procedure + canonicalSubject + releaseId + limit = ALL canonical.
  // Different values on ANY of those 4 fields → digest MUST differ.
  const ok = differentPerLimit && sameLimitSame && differentSubject;

  let note: string | undefined;
  if (!differentPerLimit) note = "🔴 LIMIT NOT AFFECTING digest (Step 2 lock violated)";
  if (!sameLimitSame) note = (note ? note + "; " : "") + "🔴 inputDigest not deterministic for identical inputs";
  if (!differentSubject) note = (note ? note + "; " : "") + "🔴 Different releaseId+subject did not change digest";

  return {
    ok,
    evidence:
      `limit=(null) digest=${d1.slice(0,16)}...; ` +
      `limit=10 digest=${d2.slice(0,16)}...; ` +
      `limit=20 digest=${d4.slice(0,16)}...; ` +
      `limit=999 digest=${d3.slice(0,16)}...; ` +
      `different-subject releaseId=EOS-OTHER digest=${dOther.slice(0,16)}...; ` +
      `4 unique limit values = 4 unique digests: ${differentPerLimit}; ` +
      `identical limits = identical digest: ${sameLimitSame}; ` +
      `different subject changes digest: ${differentSubject}`,
    note,
  };
});

// ============================================================
// AUDIT #5 — result projection exact
// ============================================================
audit("AUDIT #5: result projection shape (check ai fields, blockerDigests, pathCount, gapCount semantics)", () => {
  const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-AUDIT05");
  const input = { releaseId: "EOS-AUDIT05" };

  // planId null vs present
  const base = {
    execution: { status: "passed" as const, reason: "blockers_found" },
    readiness: { status: "blocked" as const },
    requirements: { total: 10, verified: 7, blocked: 2, unknown: 1 },
    traceability: { complete: false, gaps: 2, gapRequirementIds: ["REQ-003", "REQ-007"] },
    evidence: { complete: true, total: 25, paths: ["/p1"] as readonly string[] },
    blockers: ["a", "b"],
  };
  const aiBase = { invoked: true, ambiguousRequirements: ["REQ-042"] as readonly string[], invocationStatus: "triggered_pending_result" as string | null };
  const outNoPlan = makeMockOutput({
    ...base,
    ai: { ...aiBase, planId: null },
    generatedAt: "2026-08-06T10:00:00.000Z",
  });
  const outWithPlan = makeMockOutput({
    ...base,
    ai: { ...aiBase, planId: "SESSION-UUID-ABCDEF" },
    generatedAt: "2026-08-06T10:00:00.000Z",
  });
  const digestNoPlan = computeResultDigest(outNoPlan);
  const digestWithPlan = computeResultDigest(outWithPlan);

  // reason contractual
  const outInvalidInput = makeMockOutput({
    ...base,
    execution: { status: "failed" as const, reason: "invalid_input" },
    generatedAt: "2026-08-06T10:00:00.000Z",
  });
  const digestReasonInvalid = computeResultDigest(outInvalidInput);

  const differentReason = digestNoPlan !== digestReasonInvalid;
  const planIdExcluded = digestNoPlan === digestWithPlan;
  const status = differentReason && planIdExcluded;

  return {
    ok: status,
    evidence:
      `planId=null digest=${digestNoPlan.slice(0,12)}...; ` +
      `planId=UUID digest=${digestWithPlan.slice(0,12)}...; ` +
      `planId excluded from projection: ${planIdExcluded ? "YES (correct per Gate 2 no-invocation-id rule)" : "NO"}; ` +
      `reason=blockers_found vs invalid_input change digest: ${differentReason ? "YES (reason treated as contractual)" : "NO"};`,
    note: !planIdExcluded
      ? "🟡 GOVERNANCE NOTE: Step 2 candidate projection sempat memuat planId sebagai candidate INCLUDE — belum final lock. Implementation memilih exclude. Arsitektural konsisten Gate 2 (no invocation identity). Perlu final decision di Step 2 lock."
      : undefined,
  };
});

// ============================================================
// AUDIT #6 — Filesystem encoding reversibility (partial)
// ============================================================
audit("AUDIT #6: Filesystem encoding collision-free (per-char injective)", () => {
  const samples = [
    "release/EOS-003",
    "release/v1.0:beta/with space",
    "release/a/b/c/d:e/f g",
    "release/<bad>?chars*yes|no\"",
  ];
  const encoded = samples.map((s) => encodeFilesystemSafe(s as ReturnType<typeof toCanonicalSubjectKey>));
  const uniqueSet = new Set(encoded);
  const injective = uniqueSet.size === encoded.length;

  // No illegal chars
  const allLegal = encoded.every((e) => !/[\/\\:*?"<>| ]/.test(e));

  return {
    ok: injective && allLegal,
    evidence: `Samples=${samples.length}; Unique encodings=${uniqueSet.size}; All legal chars=${allLegal}; Legal injections=${injective}; Encoded values: ${JSON.stringify(encoded)}`,
  };
});

// ============================================================
// AUDIT #7 — Path topology (DISCREPANCY)
// ============================================================
audit("AUDIT #7: Path topology matches Step 2 FINAL LOCK (<procedure>/<encode(subject)>.jsonl)", () => {
  const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-AUDIT07");
  const input = { releaseId: "EOS-AUDIT07" };
  const output = makeMockOutput({ releaseId: "EOS-AUDIT07" });
  appendAttributionRecord({
    executionId: identity.executionId,
    procedure: "prepare_release",
    canonicalSubject: identity.canonicalSubject,
    input,
    output,
    evaluatedAt: "2026-01-01T00:00:00.000Z",
  });

  const base = process.env.EOS_ATTRIBUTION_BASE_DIR!;
  const procDir = encodeProcedureFilesystemSafe("prepare_release");
  const subjEncoded = encodeFilesystemSafe(identity.canonicalSubject);

  const step2LockedFile = join(base, procDir, `${subjEncoded}.jsonl`);
  const oldWrongFolder = join(base, procDir, subjEncoded);
  const oldWrongFile = join(oldWrongFolder, "attribution.ndjson");

  const lockedFileExists = require("fs").existsSync(step2LockedFile);
  const oldFolderExists = require("fs").existsSync(oldWrongFolder);
  const oldFileExists = require("fs").existsSync(oldWrongFile);

  // Directory tree observation
  const walk = (p: string, depth = 0): string => {
    const fs = require("fs");
    if (!fs.existsSync(p)) return "";
    const stat = fs.statSync(p);
    const pad = " ".repeat(depth * 2);
    let out = `${pad}${require("path").basename(p)}${stat.isDirectory() ? "/" : ""}\n`;
    if (stat.isDirectory()) {
      for (const child of fs.readdirSync(p).sort()) {
        out += walk(join(p, child), depth + 1);
      }
    }
    return out;
  };
  const tree = walk(base);

  const ok = lockedFileExists && !oldFolderExists && !oldFileExists;
  let note: string | undefined;
  if (!lockedFileExists) note = "🔴 <encode(subject)>.jsonl TIDAK ADA";
  if (oldFolderExists) note = (note ? note + "; " : "") + "🔴 Folder ekstra <encode(subject)/> masih ada (should be removed)";
  if (oldFileExists) note = (note ? note + "; " : "") + "🔴 attribution.ndjs (old wrong filename) masih ada";

  return {
    ok,
    evidence:
      `Step 2 LOCKED path:    ${step2LockedFile.replace(base, "<BASE>")} (exists=${lockedFileExists})\n` +
      `Old wrong folder path: ${oldWrongFolder.replace(base, "<BASE>")} (exists=${oldFolderExists})\n` +
      `Old wrong file path:   ${oldWrongFile.replace(base, "<BASE>")} (exists=${oldFileExists})\n` +
      `Directory tree dump:\n${tree}`,
    note,
  };
});

// ============================================================
// AUDIT #8 — Append-only (no overwrite/delete)
// ============================================================
audit("AUDIT #8: Append-only semantics (5 appends, records preserved)", () => {
  const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-AUDIT08");
  const input = { releaseId: "EOS-AUDIT08" };
  for (let i = 0; i < 5; i++) {
    const out = makeMockOutput({
      releaseId: "EOS-AUDIT08",
      blockers: [`BLOCKER-${i}`],
      generatedAt: `2026-01-01T00:00:0${i}.000Z`,
    });
    appendAttributionRecord({
      executionId: identity.executionId,
      procedure: "prepare_release",
      canonicalSubject: identity.canonicalSubject,
      input,
      output: out,
      evaluatedAt: out.generatedAt,
    });
  }
  const all = listAttributionRecords({
    procedure: "prepare_release",
    canonicalSubject: identity.canonicalSubject,
  });
  return {
    ok: all.length === 5,
    evidence: `Appends=5; Recovered records=${all.length}; eval timestamps=${all.map((r) => r.evaluatedAt).join(" | ")}; record digests all unique=${new Set(all.map((r) => r.resultDigest)).size === all.length}`,
  };
});

// ============================================================
// AUDIT #9 — Timestamp collision
// ============================================================
audit("AUDIT #9: Timestamp collision accepted (no overwrite, no tie-breaker)", () => {
  const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-AUDIT09");
  const input = { releaseId: "EOS-AUDIT09" };
  const sameTs = "2026-01-01T00:00:00.000Z";
  const outA = makeMockOutput({ releaseId: "EOS-AUDIT09", blockers: ["DIFFERENT-A"], generatedAt: sameTs });
  const outB = makeMockOutput({ releaseId: "EOS-AUDIT09", blockers: ["DIFFERENT-B"], generatedAt: sameTs });
  appendAttributionRecord({
    executionId: identity.executionId, procedure: "prepare_release", canonicalSubject: identity.canonicalSubject,
    input, output: outA, evaluatedAt: sameTs,
  });
  appendAttributionRecord({
    executionId: identity.executionId, procedure: "prepare_release", canonicalSubject: identity.canonicalSubject,
    input, output: outB, evaluatedAt: sameTs,
  });
  const all = listAttributionRecords({ procedure: "prepare_release", canonicalSubject: identity.canonicalSubject });
  const ok = all.length === 2 && all[0].evaluatedAt === all[1].evaluatedAt && all[0].resultDigest !== all[1].resultDigest;
  return {
    ok,
    evidence: `Records=${all.length}; sameTs=${all[0]?.evaluatedAt === all[1]?.evaluatedAt}; differentDigest=${all[0]?.resultDigest !== all[1]?.resultDigest}; No sequence/uuid tie-breaker found on any record = ${!Object.keys(all[0] ?? {}).some(k => /sequence|uuid|attempt|tie/i.test(k))}`,
  };
});

// ============================================================
// AUDIT #10 — Forbidden fields
// ============================================================
audit("AUDIT #10: No forbidden fields on serialized record", () => {
  const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-AUDIT10");
  const input = { releaseId: "EOS-AUDIT10" };
  const output = makeMockOutput({ releaseId: "EOS-AUDIT10" });
  appendAttributionRecord({
    executionId: identity.executionId, procedure: "prepare_release", canonicalSubject: identity.canonicalSubject,
    input, output, evaluatedAt: output.generatedAt,
  });
  const procDir = encodeProcedureFilesystemSafe("prepare_release");
  const subjEncoded = encodeFilesystemSafe(identity.canonicalSubject);
  const onDiskPath = join(process.env.EOS_ATTRIBUTION_BASE_DIR!, procDir, `${subjEncoded}.jsonl`);
  const raw = readFileSync(onDiskPath, "utf8").trim();
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const keys = Object.keys(parsed);
  const forbidden = [
    "invocationId", "attemptId", "sequence", "counter", "uuid", "runId",
    "correlationId", "traceId", "resumeToken", "continuationId", "steps",
    "paths", "generatedAt", "releaseId", "blockers", "blockerDigests",
    "procedureId",
  ];
  const found: string[] = [];
  for (const f of forbidden) {
    for (const k of keys) {
      if (k.toLowerCase() === f.toLowerCase()) found.push(k);
    }
  }
  const ok = found.length === 0;
  return {
    ok,
    evidence: `Serialized keys: ${JSON.stringify(keys)}; Forbidden detected: ${found.length === 0 ? "NONE" : found.join(",")}`,
  };
});

// ============================================================
// AUDIT #11 — Restart durability
// ============================================================
audit("AUDIT #11: Restart durability (simulated separate processes share dir)", () => {
  const shared = makeTempDir();
  const identity = buildExecutionIdentityV1("prepare_release", "release/EOS-AUDIT11");
  const input = { releaseId: "EOS-AUDIT11" };
  const expectedTs = "2026-08-06T12:00:00.000Z";

  let writeRec: unknown = null;
  let readRec: unknown = null;

  try {
    {
      process.env.EOS_ATTRIBUTION_BASE_DIR = shared;
      const output = makeMockOutput({ releaseId: "EOS-AUDIT11", generatedAt: expectedTs });
      writeRec = appendAttributionRecord({
        executionId: identity.executionId, procedure: "prepare_release", canonicalSubject: identity.canonicalSubject,
        input, output, evaluatedAt: expectedTs,
      });
    }

    {
      // Simulated "process 2" — same base dir
      process.env.EOS_ATTRIBUTION_BASE_DIR = shared;
      readRec = getLatestAttributionRecord({ procedure: "prepare_release", canonicalSubject: identity.canonicalSubject });
    }
  } finally {
    try { rmSync(shared, { recursive: true, force: true }); } catch {}
  }

  const ok = readRec !== null &&
    (readRec as { evaluatedAt: string }).evaluatedAt === expectedTs &&
    (readRec as { executionId: string }).executionId === identity.executionId;

  return {
    ok,
    evidence: `Write-record evaluatedAt=${(writeRec as { evaluatedAt?: string })?.evaluatedAt}; Read-record latest=${readRec ? JSON.stringify({ ...(readRec as object), resultDigest: (readRec as {resultDigest?:string}).resultDigest?.slice(0,16) + "..." }) : "NULL"}; shared-dir survives process-boundary simulation=${ok}`,
  };
});

// ============================================================
// AUDIT #12 — No RuntimeInvocationEvent modification
// ============================================================
audit("AUDIT #12: No modification to RuntimeInvocationEvent contract", () => {
  const fs = require("fs");
  const runtimeContent = fs.readFileSync(
    "/root/Enterprise-OS/workspace/packages/core/runtime/src/invocation-evidence.ts",
    "utf8",
  );
  const attrImpl = fs.readFileSync(
    "/root/Enterprise-OS/workspace/procedures/attribution/implementation.ts",
    "utf8",
  );
  const attrContracts = fs.readFileSync(
    "/root/Enterprise-OS/workspace/procedures/attribution/contracts.ts",
    "utf8",
  );

  const runtimeStillHasRuntimeEvent = /export type RuntimeInvocationEvent/.test(runtimeContent);
  const runtimeStillHasRecordFn = /export function recordRuntimeInvocation\(input: \{/.test(runtimeContent);
  const attrDoesNotImportRuntime = !/recordRuntimeInvocation|RuntimeInvocationEvent/.test(attrImpl + "\n" + attrContracts);

  const ok = runtimeStillHasRuntimeEvent && runtimeStillHasRecordFn && attrDoesNotImportRuntime;

  return {
    ok,
    evidence:
      `RuntimeInvocationEvent type still exported from runtime: ${runtimeStillHasRuntimeEvent}\n` +
      `recordRuntimeInvocation function signature intact: ${runtimeStillHasRecordFn}\n` +
      `attribution module does NOT import/export/mutate RuntimeInvocationEvent: ${attrDoesNotImportRuntime}`,
  };
});

// ============================================================
// REPORT
// ============================================================
console.log("\n============================================================");
console.log("IMPLEMENTATION CONFORMANCE AUDIT — GATE 3 STEP 3");
console.log(`  (Frozen: no code changes; empirical audit against actual disk artifacts)`);
console.log(`  Base dir (clean per test): ${process.env.EOS_ATTRIBUTION_BASE_DIR ?? "(set above)"}`);
console.log("============================================================\n");

for (const r of results) {
  const mark = r.status === "PASS" ? "✅ PASS" : r.status === "WARN" ? "🟡 WARN" : "🔴 FAIL";
  console.log(`${mark}  ${r.point}`);
  console.log(`   Evidence: ${r.evidence.replace(/\n/g, "\n             ")}`);
  if (r.note) console.log(`   NOTE: ${r.note}`);
  console.log("");
}

const passed = results.filter((r) => r.status === "PASS").length;
const failed = results.filter((r) => r.status === "FAIL").length;
const warn = results.filter((r) => r.status === "WARN").length;

console.log("============================================================");
console.log(`SUMMARY: ${passed} PASS / ${warn} WARN / ${failed} FAIL`);
console.log("============================================================");
console.log("");

if (failed > 0) {
  const discrep = results.filter((r) => r.note && r.note.startsWith("🔴 DISCREPANCY"));
  if (discrep.length > 0) {
    console.log("DEFINITIVE DISCREPANCIES (require Step 2 lock resolution before Step 3 PASS):");
    for (const d of discrep) {
      console.log(`  - ${d.point}`);
      console.log(`    ${d.note}`);
    }
  }
  console.log("");
}

const gov = results.find((r) => r.point.includes("result projection shape"));
if (gov?.note?.includes("🟡 GOVERNANCE")) {
  console.log("GOVERNANCE PENDING ITEMS (Step 2 final lock):");
  console.log(`  - ${gov.point}`);
  console.log(`    ${gov.note}`);
}
console.log("");

try { rmSync(auditTempDir, { recursive: true, force: true }); } catch {}
if (original === undefined) delete process.env.EOS_ATTRIBUTION_BASE_DIR;
else process.env.EOS_ATTRIBUTION_BASE_DIR = original;
