import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const runtimeDistPath = resolve(
  __dirname,
  "..",
  "packages",
  "core",
  "runtime",
  "dist",
  "index.js"
);

const { traceExecutionByDecision } = await import(runtimeDistPath);

const DECISION_ID = "dec-f18f99cd-0dff-4f11-8632-76e01b9d0864";

const LAWYERSHUB_EVIDENCE_PATH =
  "/root/Enterprise-OS/workspace/products/lawyershub/evidence/verification/runtime-invocations.jsonl";
const SERVICES_ID_EVIDENCE_PATH =
  "/root/Enterprise-OS/workspace/products/services-id/evidence/verification/runtime-invocations.jsonl";

console.log("=".repeat(80));
console.log("B7.10 STEP 3 — AKTUAL traceExecutionByDecision() PRIMITIVE — LAWYERSHUB ISOLATION");
console.log(`Decision ID (D) : ${DECISION_ID}`);
console.log(`Primitive       : @repo/core-runtime → traceExecutionByDecision()`);
console.log("=".repeat(80));

function runTraceForPath(name, evidencePath, expectToFind, traceFn) {
  process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH = evidencePath;

  const result = traceFn(DECISION_ID);

  console.log(`\n── [${name}] ──────────────────────────────────────────────────────────────────`);
  console.log(`Evidence path : ${evidencePath}`);
  console.log(`Total matches : ${result.totalMatches}`);
  console.log(`Expectation   : ${expectToFind ? "SHOULD FIND ≥ 2 matches (LawyersHub seam)" : "SHOULD FIND 0 (strict product isolation)"}`);

  result.matchingExecutions.forEach((exec, i) => {
    console.log(`  Match #${i + 1}: ${exec.capability_id}.${exec.operation_id} | ${exec.timestamp_utc} | success=${exec.success}${exec.runId ? ` | runId=${exec.runId}` : ""}`);
  });

  return result;
}

const lhResult = runTraceForPath("LAWYERSHUB LOG", LAWYERSHUB_EVIDENCE_PATH, true, traceExecutionByDecision);
const sidResult = runTraceForPath("SERVICES-ID LOG", SERVICES_ID_EVIDENCE_PATH, false, traceExecutionByDecision);

console.log("\n" + "=".repeat(80));
console.log("EVIDENCE ASSESSMENT");
console.log("=".repeat(80));

const ops = lhResult.matchingExecutions.map((e) => e.operation_id);
const caps = lhResult.matchingExecutions.map((e) => e.capability_id);
const hasWorkflowEngine = caps.includes("workflow-engine");
const hasApiPlatform = caps.includes("api-platform");
const lhCountOK = lhResult.totalMatches >= 2;
const lhAllSuccess = lhResult.matchingExecutions.every((e) => e.success);
const lhNoEmpties = lhResult.matchingExecutions.every(
  (e) => e.timestamp_utc && e.capability_id && e.operation_id
);

const sidZero = sidResult.totalMatches === 0;

const lhOK = hasWorkflowEngine && hasApiPlatform && lhCountOK && lhAllSuccess && lhNoEmpties;
const isolationOK = sidZero;
const allOK = lhOK && isolationOK;

console.log(`\n── LawyersHub Log Checks ───────────────────────────────────────────────`);
console.log(`  ${hasWorkflowEngine ? "✅" : "❌"}  workflow-engine capability present`);
console.log(`  ${hasApiPlatform  ? "✅" : "❌"}  api-platform capability present (operations: ${ops.join(", ")})`);
console.log(`  ${lhCountOK       ? "✅" : "❌"}  totalMatches = ${lhResult.totalMatches}  (expected ≥ 2)`);
console.log(`  ${lhAllSuccess    ? "✅" : "❌"}  all records have success=true`);
console.log(`  ${lhNoEmpties     ? "✅" : "❌"}  schema fields (timestamp/cap/operation) non-empty`);

console.log(`\n── Strict Product Isolation Checks ─────────────────────────────────────`);
console.log(`  ${sidZero ? "✅" : "❌"}  services-id invocation log has ${sidResult.totalMatches} matches for LawyersHub decision_id`);
if (!sidZero) {
  console.log(`     ⚠️  INFRINGEMENT — decision_id appears in WRONG product log (isolation broken)`);
  console.log(`     Details: ${JSON.stringify(sidResult.matchingExecutions, null, 6).split("\n").map(l => "              "+l).join("\n")}`);
}

console.log(`\n── VERDICT ─────────────────────────────────────────────────────────────`);
if (allOK) {
  console.log(`✅✅✅  B7.10 STEP 3 — RUNTIME TRACE PROVEN — LAWYERSHUB (consumer #2) ISOLATED  ✅✅✅\n`);
  console.log(`   Primitive   : @repo/core-runtime/dist/index → traceExecutionByDecision("${DECISION_ID}")`);
  console.log(`   Target Log  : products/lawyershub/evidence/verification/runtime-invocations.jsonl (BUKAN services-id)`);
  console.log(`   Result      : LawyersHub totalMatches=${lhResult.totalMatches}, services-id totalMatches=0`);
  console.log(`   Operations  : ${ops.join(", ")}`);
  console.log(`   Capabilities: ${Array.from(new Set(caps)).join(", ")}`);
  console.log(`\n   Invoke B7.8 (services-id) vs B7.10 (lawyershub) = SAMA PERSIS format, struktur, capability, primitive.`);
  process.exit(0);
} else {
  console.log(`❌  B7.10 STEP 3 FAILED — salah satu check gagal.`);
  console.log(`   LawyersHub OK = ${lhOK} | Isolation OK = ${isolationOK}`);
  process.exit(1);
}
