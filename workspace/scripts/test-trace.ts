import { traceExecutionByDecision } from '../packages/core/runtime/src/invocation-evidence';

// Set env var untuk akses file evidence
process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH = "/tmp/eos-runtime-invocations.ndjson";

// Ganti dengan decision_id dari run terakhir
const TEST_DECISION_ID = "dec-58143bb4";

console.log(`🔍 Melakukan trace untuk decision: ${TEST_DECISION_ID}`);
const traceResult = traceExecutionByDecision(TEST_DECISION_ID);

console.log("\n📊 Hasil traceExecutionByDecision:");
console.log(JSON.stringify(traceResult, null, 2));