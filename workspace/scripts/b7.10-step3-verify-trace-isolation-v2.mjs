import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DECISION_ID = "dec-f18f99cd-0dff-4f11-8632-76e01b9d0864";

const LAWYERSHUB_EVIDENCE_PATH =
  "/root/Enterprise-OS/workspace/products/lawyershub/evidence/verification/runtime-invocations.jsonl";
const SERVICES_ID_EVIDENCE_PATH =
  "/root/Enterprise-OS/workspace/products/services-id/evidence/verification/runtime-invocations.jsonl";

console.log("=".repeat(80));
console.log("B7.10 STEP 3 — traceExecutionByDecision PRIMITIVE + DIRECT LEDGER PARSE");
console.log(`Decision ID (D) : ${DECISION_ID}`);
console.log("=".repeat(80));

// ──────────────────────────────────────────────────────────────────────────────
// A. DIRECT LEDGER PARSE (independent cross-check, non-primitive)
// ──────────────────────────────────────────────────────────────────────────────
function directParseMatches(evidencePath) {
  try {
    const content = readFileSync(evidencePath, "utf8");
    const newlineEntries = content
      .split(/\r?\n/g)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    const allEntries = [];
    newlineEntries.forEach((entry) => {
      const subEntries = entry.split(/}{(?="timestamp_utc":)/g);
      subEntries.forEach((sub, idx) => {
        if (subEntries.length === 1) {
          allEntries.push(sub);
          return;
        }
        if (idx === 0) allEntries.push(sub.endsWith("}") ? sub : sub + "}");
        else allEntries.push("{" + sub);
      });
    });
    const matches = allEntries
      .map((e) => { try { return JSON.parse(e); } catch { return null; } })
      .filter((ev) => ev && ev.decision_id === DECISION_ID);
    return matches;
  } catch {
    return [];
  }
}

const lhDirect = directParseMatches(LAWYERSHUB_EVIDENCE_PATH);
const sidDirect = directParseMatches(SERVICES_ID_EVIDENCE_PATH);

console.log(`\n── [A] DIRECT LEDGER PARSE (independence cross-check) ──────────────────`);
console.log(`  LawyersHub log matches : ${lhDirect.length}`);
lhDirect.forEach((e, i) => console.log(`    #${i + 1}: ${e.product_id} | ${e.capability_id}.${e.operation_id} | ${e.timestamp_utc} | decision_id=${e.decision_id}`));
console.log(`  Services-ID log matches: ${sidDirect.length}`);
sidDirect.forEach((e, i) => console.log(`    #${i + 1}: ${e.product_id} | ${e.capability_id}.${e.operation_id} | ${e.timestamp_utc} | decision_id=${e.decision_id}`));

// ──────────────────────────────────────────────────────────────────────────────
// B. ACTUAL @repo/core-runtime primitive, invoked via ISOLATED subprocess
//    (env var set BEFORE module import — guarantees fresh closure capture)
// ──────────────────────────────────────────────────────────────────────────────
const workerScript = resolve(__dirname, "_b7.10_trace_worker_subprocess.mjs");

function runPrimitiveViaWorker(name, evidencePath) {
  console.log(`\n── [B] ACTUAL PRIMITIVE traceExecutionByDecision via subprocess [${name}] ──`);
  console.log(`   Evidence path: ${evidencePath}`);
  const result = spawnSync(process.execPath, [workerScript, DECISION_ID], {
    env: {
      ...process.env,
      EOS_RUNTIME_INVOCATION_EVIDENCE_PATH: evidencePath,
    },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    console.log(`   ❌  Worker exited ${result.status}`);
    if (result.stderr) console.log(`      STDERR: ${result.stderr.split("\n").slice(0, 10).join("\n      ")}`);
    return { totalMatches: -1, matchingExecutions: [] };
  }
  let parsed;
  try {
    parsed = JSON.parse(result.stdout.trim().split("\n").slice(-1)[0]);
  } catch (e) {
    console.log(`   ❌  Failed parse JSON from worker stdout. Last line: ${result.stdout.trim().split("\n").slice(-1)[0]}`);
    return { totalMatches: -1, matchingExecutions: [] };
  }
  console.log(`   totalMatches   : ${parsed.totalMatches}`);
  parsed.matchingExecutions.forEach((exec, i) => {
    console.log(`     #${i + 1}: ${exec.capability_id}.${exec.operation_id} | ${exec.timestamp_utc} | success=${exec.success}${exec.runId ? ` | runId=${exec.runId}` : ""}`);
  });
  return parsed;
}

const lhPrimitive = runPrimitiveViaWorker("LAWYERSHUB", LAWYERSHUB_EVIDENCE_PATH);
const sidPrimitive = runPrimitiveViaWorker("SERVICES-ID", SERVICES_ID_EVIDENCE_PATH);

// ──────────────────────────────────────────────────────────────────────────────
// C. AGGREGATE ASSESSMENT
// ──────────────────────────────────────────────────────────────────────────────
console.log("\n" + "=".repeat(80));
console.log("EVIDENCE ASSESSMENT (DIRECT PARSE ⊗ PRIMITIVE)");
console.log("=".repeat(80));

const lhOps = lhDirect.map((e) => `${e.capability_id}.${e.operation_id}`);
const lhCaps = lhDirect.map((e) => e.capability_id);
const lhHasWorkflow = lhCaps.includes("workflow-engine");
const lhHasApiPlatform = lhCaps.includes("api-platform");
const lhCountOK = lhDirect.length >= 2;
const lhAllInLawyersHub = lhDirect.every((e) => e.product_id === "lawyershub");
const lhAllSuccess = lhDirect.every((e) => e.success === true);
const lhTimestampsSane = lhDirect.every((e) => typeof e.timestamp_utc === "string" && e.timestamp_utc.length > 0);

const sidZero = sidDirect.length === 0;
const primitiveMatchesDirect =
  lhPrimitive.totalMatches === lhDirect.length &&
  sidPrimitive.totalMatches === sidDirect.length;

const lhOK = lhHasWorkflow && lhHasApiPlatform && lhCountOK && lhAllInLawyersHub && lhAllSuccess && lhTimestampsSane;
const isolationOK = sidZero;
const crossMethodOK = primitiveMatchesDirect;
const allOK = lhOK && isolationOK && crossMethodOK;

console.log(`\n── (R3) Artifact Isolation Checks ──────────────────────────────────────────`);
console.log(`  ${sidZero ? "✅" : "❌"}  services-id log: 0 match untuk LawyersHub decision_id (sidZero=${sidDirect.length})`);
console.log(`  ${lhAllInLawyersHub ? "✅" : "❌"}  LawyersHub log: semua event product_id === "lawyershub" (cross-contamination=${lhDirect.filter(e => e.product_id !== "lawyershub").length})`);

console.log(`\n── (R2) Governance Seam Capability Checks ──────────────────────────────────`);
console.log(`  ${lhHasWorkflow   ? "✅" : "❌"}  seam[workflow-engine] = present (operations: ${lhOps.filter(o=>o.startsWith("workflow-engine.")).join(", ") || "(none)"})`);
console.log(`  ${lhHasApiPlatform? "✅" : "❌"}  seam[api-platform]    = present (operations: ${lhOps.filter(o=>o.startsWith("api-platform.")).join(", ") || "(none)"})`);
console.log(`  ${lhAllSuccess    ? "✅" : "❌"}  semua LawyersHub events success=true`);
console.log(`  ${lhTimestampsSane? "✅" : "❌"}  semua LawyersHub events punya timestamp_utc lengkap`);
console.log(`  ${lhCountOK       ? "✅" : "❌"}  total matches LawyersHub log = ${lhDirect.length} (≥2: ${lhCountOK})`);

console.log(`\n── (Cross-Method) Direct Parse ↔ Primitive Equivalence ────────────────────`);
console.log(`  ${crossMethodOK ? "✅" : "❌"}  direct parse count (LH=${lhDirect.length}, SID=${sidDirect.length}) === primitive output (LH=${lhPrimitive.totalMatches}, SID=${sidPrimitive.totalMatches})`);

console.log(`\n══════════════════════════════════════════════════════════════════════════════`);
if (allOK) {
  console.log(`✅✅✅  B7.10 STEP 3 — RUNTIME DELIVERY PROVEN FOR LAWYERSHUB (CONSUMER #2)  ✅✅✅\n`);
  console.log(`   Decision         : D = ${DECISION_ID}`);
  console.log(`   Ledger location  : products/lawyershub/evidence/verification/runtime-invocations.jsonl`);
  console.log(`   Stray in SID?    : NO (${sidDirect.length} matches — strict isolation terjaga)`);
  console.log(`   Seam operations  : ${lhOps.join(" + ")}`);
  console.log(`   ↳ SAMA PERSIS struktur dengan B7.8 services-id (workflow-engine + api-platform)`);
  console.log(`   Verification ×2  : direct ledger parse ↔ @repo/core-runtime primitive IDENTIK`);
  process.exit(0);
} else {
  console.log(`❌  B7.10 STEP 3 GAGAL.  lhOK=${lhOK} isolationOK=${isolationOK} crossMethodOK=${crossMethodOK}`);
  process.exit(1);
}
