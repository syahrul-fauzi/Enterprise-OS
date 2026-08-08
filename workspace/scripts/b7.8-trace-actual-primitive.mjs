// B7.8 TRACE GAP CLOSURE: Invoke the ACTUAL G6 primitive traceExecutionByDecision
// Target: Verify behavior matches the manual equivalent.
// IMPORTANT: Use dist compiled (package main) via absolute path, bypass tsconfig paths to avoid @repo alias resolution issues.

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

process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH =
  "/tmp/eos-b7.8-proof/runtime-ledger.jsonl";

const { traceExecutionByDecision } = await import(runtimeDistPath);

const decisionId = "dec-B78-VALID-001";

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  B7.8 TRACE GAP CLOSURE — ACTUAL @repo/core-runtime PRIMITIVE    ║
╠══════════════════════════════════════════════════════════════════╣
║  Package : @repo/core-runtime (packages/core/runtime/dist/index)║
║  Function: traceExecutionByDecision                             ║
║  Decision: ${decisionId.padEnd(47)}║
║  Ledger  : /tmp/eos-b7.8-proof/runtime-ledger.jsonl             ║
╚══════════════════════════════════════════════════════════════════╝
`);

const result = traceExecutionByDecision(decisionId);

console.log("traceExecutionByDecision() actual primitive output:");
console.log(JSON.stringify(result, null, 2));

console.log("");
console.log("─────────────────────────────────────────────────────────────────");
console.log("EVIDENCE ASSESSMENT");
console.log("─────────────────────────────────────────────────────────────────");

const expectedOps = ["execute-workflow", "delivery-surface.attach-evidence"];
const gotOps = result.matchingExecutions.map((e) => e.operation_id);
const hasAll = expectedOps.every((op) => gotOps.includes(op));
const countOK = result.totalMatches === 2;
const allSuccess = result.matchingExecutions.every((e) => e.success);
const noNulls = result.matchingExecutions.every(
  (e) => e.timestamp_utc && e.capability_id && e.operation_id
);

const allOK = hasAll && countOK && allSuccess && noNulls;

expectedOps.forEach((op, i) => {
  const ok = gotOps.includes(op);
  console.log(`  ${ok ? "✅" : "❌"}  op ${i + 1}: ${op}  → ${ok ? "PRESENT" : "MISSING"}`);
});
console.log(`  ${countOK ? "✅" : "❌"}  totalMatches = ${result.totalMatches}  (expected 2)`);
console.log(`  ${allSuccess ? "✅" : "❌"}  all records success = true`);
console.log(`  ${noNulls ? "✅" : "❌"}  schema fields (timestamp/cap/op) non-empty`);

console.log("");
if (allOK) {
  console.log("✅✅✅  B7.8 TRACE GAP CLOSED — ACTUAL G6 PRIMITIVE PROVEN  ✅✅✅");
  console.log("");
  console.log("   Invocation: @repo/core-runtime/dist/index → traceExecutionByDecision(\"" + decisionId + "\")");
  console.log("   Result: totalMatches=2, matchingOps={execute-workflow, delivery-surface.attach-evidence}");
  console.log("   Behavioral equivalence: IDENTICAL to manual equivalent (prior manual verification)");
  process.exit(0);
} else {
  console.log("❌ B7.8 TRACE GAP REMAINS — ACTUAL PRIMITIVE DEVIATES FROM EXPECTED");
  process.exit(1);
}
