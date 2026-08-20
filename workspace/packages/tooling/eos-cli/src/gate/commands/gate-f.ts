import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import YAML from "yaml";
// Gate F artifacts are now imported from gate-f-evidence.ts - removed duplicate imports from acceptance-report.js
import {
  GATE_F_STATUS_PROJECTION_PATH,
  materializeAndPersistGateFStatusProjection,
  hasGateFStatusProjectionRecord,
  readGateFStatusProjectionRecord,
} from "../projections/status-projection-repository.js";
import {
  persistGateFStatusArtifacts,
  buildGateFAcceptanceReportDocument,
  materializeGateFStatusOutput,
  writeGateFAcceptanceReport,
  executeFullGateFValidation,
} from "../evidence/gate-f-evidence.js";
import { EOS_ROOT } from "../../state.js";
import type { 
  ProductionReadinessCriteria,
  GateFValidationResults 
} from "../models/production-readiness.js";

// Gate F: Production Readiness Validation
// Implements all 7 core production readiness domains from production-readiness-criteria.yaml

const GATE_F_DIR = resolve(EOS_ROOT, "build/evidence/production-readiness");
const RUNS_DIR = resolve(GATE_F_DIR, "runs");

export async function executeGateFValidation() {
  console.log("=== Gate F: Production Readiness Validation ===");
  
  // Ensure output directories exist
  if (!existsSync(GATE_F_DIR)) mkdirSync(GATE_F_DIR, { recursive: true });
  if (!existsSync(RUNS_DIR)) mkdirSync(RUNS_DIR, { recursive: true });

  // Load production readiness criteria
  const criteriaPath = resolve(EOS_ROOT, "governance/production-readiness-criteria.yaml");
  const criteria: ProductionReadinessCriteria = YAML.parse(readFileSync(criteriaPath, "utf8"));
  
  console.log(`Loaded criteria v${criteria.version} for ${criteria.gate_id}: ${criteria.name}`);

  // Generate run ID for this validation
  const runId = `run-${Date.now()}`;
  const runDir = join(RUNS_DIR, runId);
  mkdirSync(runDir, { recursive: true });

  // Execute full automated validation (enforces 100% test pass rate requirement)
  console.log(`Executing automated production readiness validation...`);
  const validationResults = await executeFullGateFValidation(runId);

  // Display validation summary
  console.log(`\n=== Gate F Validation Complete ===`);
  console.log(`Total checks passed: ${validationResults.totalPassed}`);
  console.log(`Total checks failed: ${validationResults.totalFailed}`);
  console.log(`Total blockers: ${validationResults.totalBlockers}`);
  console.log(`Overall status: ${validationResults.overallStatus}`);

  // Write results to run directory
  writeFileSync(join(runDir, "validation-results.json"), JSON.stringify(validationResults, null, 2));

  // Persist artifacts with evidence engine integration
  persistGateFStatusArtifacts({
    payload: { validation_results: validationResults },
    generatedAtUtc: validationResults.executedAt,
  });

  // Materialize status projection if it doesn't exist
  if (!hasGateFStatusProjectionRecord()) {
    await materializeAndPersistGateFStatusProjection({
      buildProjection: () => validationResults as unknown as Record<string, unknown>,
    });
  }

  // Generate acceptance report
  const report = buildGateFAcceptanceReportDocument(validationResults);
  await writeGateFAcceptanceReport(runDir, report);

  // Render status output for console
  materializeGateFStatusOutput(validationResults);

  // Exit with error if blockers exist (blocks CI/CD)
  if (validationResults.totalBlockers > 0) {
    console.error("\n❌ Gate F FAILED: Blocking production promotion. Fix all blockers before re-trying.");
    process.exit(1);
  } else if (validationResults.totalFailed > 0) {
    console.warn("\n⚠️ Gate F passed with warnings: Some non-blocking checks failed. Review before production promotion.");
    process.exit(0);
  } else {
    console.log("\n✅ Gate F PASSED: All production readiness criteria met. Ready for production promotion!");
    process.exit(0);
  }
}

// Export CLI command handlers
export async function runGateFRunCommand(): Promise<number> {
  try {
    await executeGateFValidation();
    return 0;
  } catch (err) {
    console.error("Fatal error in Gate F validation:", err);
    return 1;
  }
}

export async function runGateFStatusCommand(): Promise<number> {
  // Check if status projection exists
  if (!hasGateFStatusProjectionRecord()) {
    process.stderr.write(
      `Missing Gate F status projection. Run: pnpm eos gate-f run\n`
    );
    return 1;
  }

  // Read and display latest status
  const projection = readGateFStatusProjectionRecord();
  process.stdout.write(materializeGateFStatusOutput(projection));
  return 0;
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  executeGateFValidation().catch(err => {
    console.error("Fatal error in Gate F validation:", err);
    process.exit(1);
  });
}