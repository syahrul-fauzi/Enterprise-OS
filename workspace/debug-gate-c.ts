import { join } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import from actual source
import { readYamlRecord, asArray, asMutableRecord, asString } from "./packages/tooling/eos-cli/src/yaml-utils.js";
import { buildAcceptanceAuditRuntimeDeps } from "./packages/tooling/eos-cli/src/gate/commands/gate-c.js";
import { buildAcceptanceAuditForExperimentRun } from "./packages/tooling/eos-cli/src/gate/evaluators/acceptance-audit.js";

const EOS_ROOT = join(__dirname, "..");
const GATE_C_DIR = join(EOS_ROOT, "enterprise", "science", "gate-c");
const RUNS_DIR = join(GATE_C_DIR, "execution", "runs");

function getRunSubjectId(runId: string): string | null {
  const manifestPath = join(RUNS_DIR, runId, "run-manifest.yaml");
  console.log("📋 Checking manifest path:", manifestPath);
  console.log("✅ existsSync?", existsSync(manifestPath));
  if (!existsSync(manifestPath)) {
    return null;
  }
  const manifest = readYamlRecord(manifestPath);
  const subjects = asArray(manifest.subjects, "run_manifest.subjects");
  if (subjects.length === 0) {
    return null;
  }
  const subjectRecord = asMutableRecord(subjects[0], "run_manifest.subjects[0]");
  return typeof subjectRecord.experiment_subject_id === "string"
    ? asString(subjectRecord.experiment_subject_id, "run_manifest.subjects[0].experiment_subject_id")
    : null;
}

// Test it!
const subjectId = getRunSubjectId("run-SAGE-CANVAS-001-NEG-003-v1");
console.log("\n🧪 Subject ID detected:", subjectId);
console.log("🔍 Ends with -N3?", subjectId?.endsWith("-N3"));

// Check if experiment file exists
if (subjectId) {
  const experimentPath = join(GATE_C_DIR, "specification", "experiments", "manufacturing", `${subjectId}.experiment.yaml`);
  console.log("\n🔬 Experiment path:", experimentPath);
  console.log("✅ exists?", existsSync(experimentPath));
}
