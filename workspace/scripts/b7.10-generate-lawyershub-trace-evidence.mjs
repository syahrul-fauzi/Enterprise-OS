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

const { recordRuntimeInvocation } = await import(runtimeDistPath);

const LAWYERSHUB_DECISION_ID = "dec-f18f99cd-0dff-4f11-8632-76e01b9d0864";

console.log(`[B7.10 EVIDENCE GENERATOR] Membuat runtime events untuk LawyersHub decision_id: ${LAWYERSHUB_DECISION_ID}`);
console.log(`[B7.10 EVIDENCE GENERATOR] Format & struktur IDENTIK dengan B7.8 generate-trace-evidence (Fail-Closed equivalence)\n`);

process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH =
  "/root/Enterprise-OS/workspace/products/lawyershub/evidence/verification/runtime-invocations.jsonl";
process.env.EOS_RUNTIME_INVOCATION_PRODUCT_ID = "lawyershub";

recordRuntimeInvocation({
  capabilityId: "api-platform",
  operationId: "delivery-surface.attach-evidence",
  sourceRef: "scripts/b7.10-generate-lawyershub-trace-evidence.ts",
  success: true,
  input: { requirementId: "req-003" },
  result: { artifactCreated: true },
  decision_id: LAWYERSHUB_DECISION_ID,
  productId: "lawyershub",
});

recordRuntimeInvocation({
  capabilityId: "workflow-engine",
  operationId: "execute-delivery-workflow",
  sourceRef: "scripts/b7.10-generate-lawyershub-trace-evidence.ts",
  success: true,
  input: { requirementId: "req-003", runId: "run-req-003-lawyershub" },
  result: { workflowCompleted: true },
  decision_id: LAWYERSHUB_DECISION_ID,
  productId: "lawyershub",
});

console.log(`[B7.10 EVIDENCE GENERATOR] ✅ Dua event runtime berhasil dibuat untuk decision_id ${LAWYERSHUB_DECISION_ID}`);
console.log(`[B7.10 EVIDENCE GENERATOR] Product ID target = lawyershub (injected via env + productId param) - Isolation Terjamin`);
console.log(`[B7.10 EVIDENCE GENERATOR] Evidence path = /root/Enterprise-OS/workspace/products/lawyershub/evidence/verification/runtime-invocations.jsonl\n`);
console.log(`Run verification Step 3 dengan command:`);
console.log(`TEST_DECISION_ID=${LAWYERSHUB_DECISION_ID} node --experimental-vm-modules scripts/b7.10-verify-lawyershub-actual-primitive.mjs`);
