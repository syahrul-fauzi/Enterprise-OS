import { prepareReleaseProcedure } from "../procedures/prepare-release/index.ts";

const releaseId = process.argv[2] ?? "EOS-003";
const limit = process.argv[3] ? parseInt(process.argv[3], 10) : 100;

console.log("\n============================================================");
console.log("EOS Vertical Slice V1 — Governed Release Readiness");
console.log("Direct procedure execution — no Workspace, no Chat");
console.log("============================================================");
console.log(`\nInput: releaseId="${releaseId}" limit=${limit}\n`);

const result = prepareReleaseProcedure({ releaseId, limit });

console.log("🔑 Execution Identity (Canonical Work Identity):");
console.log(`   executionId      : ${result.executionId}`);
console.log(`   procedure        : ${result.procedure}`);
console.log(`   canonicalSubject : ${result.canonicalSubject}`);
console.log(`   ⚠️  Same releaseId = same executionId across Workspace/Chat/CLI\n`);

const summary = {
  executionId: result.executionId,
  procedure: result.procedure,
  canonicalSubject: result.canonicalSubject,
  procedureId: result.procedureId,
  releaseId: result.releaseId,
  executionStatus: result.execution.status,
  executionReason: result.execution.reason,
  readinessStatus: result.readiness.status,
  requirements: result.requirements,
  traceability: result.traceability,
  evidence: result.evidence,
  ai: result.ai,
  blockers: result.blockers,
  steps_count: result.steps.length,
  generatedAt: result.generatedAt,
};
console.log("📋 Procedure Summary:");
console.log(JSON.stringify(summary, null, 2));

console.log("\n📚 Step-by-step SOP execution (Dynamic SOP):");
for (const step of result.steps) {
  const icon =
    step.status === "completed" ? "✅"
      : step.status === "requires_human" ? "⏸"
      : step.status === "skipped" ? "⏭"
      : "❌";
  const badge = step.kind.padEnd(28, " ");
  console.log(`${icon} [${badge}] ${step.summary}`);
}

if (result.ai.invoked) {
  console.log("\n🤖 AI-on-demand ACTIVATED (Dynamic SOP branch):");
  console.log(`     Plan ID      : ${result.ai.planId}`);
  console.log(`     Status       : ${result.ai.invocationStatus}`);
  console.log(`     Ambiguous REQ: ${result.ai.ambiguousRequirements.join(", ") || "—"}`);
  console.log(`     ⚡ Happy path did NOT need LLM — AI only triggered because verification state = UNKNOWN`);
  console.log(`     ⚡ If no unknown states existed, AI would NOT be invoked at all`);
} else {
  console.log("\n💡 AI NOT required — deterministic path completed fully without LLM.");
}

const release = result.releaseId;
const workspaceLink = `/readiness?surface=workspace&releaseId=${encodeURIComponent(release)}`;
const chatLink = `/readiness?surface=chat&releaseId=${encodeURIComponent(release)}`;
const splitLink = `/readiness?surface=split&releaseId=${encodeURIComponent(release)}`;
console.log("\n🌐 Experience Surfaces (same procedure execution path):");
console.log(`   Workspace  → ${workspaceLink}`);
console.log(`   Chat       → ${chatLink}`);
console.log(`   Split View → ${splitLink}`);

const procedureState =
  result.execution.status === "passed" && result.readiness.status === "ready"
    ? "✅ READY"
    : result.readiness.status === "pending_ai_investigation"
      ? "⏸ PENDING_AI_INVESTIGATION"
      : "🚫 BLOCKED";
console.log(`\nFINAL POSTURE: ${procedureState} — release ${releaseId}\n`);
