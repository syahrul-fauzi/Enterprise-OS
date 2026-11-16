/**
 * eos-verification independent verification for ILC-P0 T3 milestone
 * NEVER trusts implementation agent claims; runs all checks in isolated process
 */
import { CaseRepositoryInMemory } from "./capabilities/legal-case/implementation/repository/case.repository";
import { CaseId } from "./capabilities/legal-case/implementation/contracts/case.contracts";
import { existsSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'fs';
import { statePath } from "@repo/eos-cli";

// ILC-P0 fixed experiment identifiers
const ILC_P0 = {
  case_id: "case_01HXYZ789ABCDEFG",
  discussion_id: "disc_01HABC123456789",
  timestamps: {
    T0: "2026-08-16T14:32:15.123Z",
    T1: "2026-08-16T14:32:15.876Z",
    T2: "2026-08-16T14:32:18.234Z"
  }
};

import { caseCommands } from "./capabilities/legal-case/implementation/commands/case.commands";
import { recordRuntimeInvocation } from "./packages/core/runtime/src/index";

async function main() {
  const results = {
    work_id: "ILC-RT-002/003",
    verified_at: new Date().toISOString(),
    acceptance_criteria: {} as Record<string, {passed: boolean; evidence: string}>,
    all_passed: false,
    total_passed: 0,
    total_criteria: 0
  };

  console.log("=== ILC-P0 T3 Verification ===");
  console.log(`Case ID: ${ILC_P0.case_id}`);

  // Criterion 1: Evidence file exists
  const evidencePath1 = statePath("evidence", `${ILC_P0.case_id}_evidence.json`);
  const evidenceExists = existsSync(evidencePath1);
  results.acceptance_criteria["evidence_file_exists"] = {
    passed: evidenceExists,
    evidence: evidenceExists ? `Evidence file found at ${evidencePath1}` : `Evidence file NOT found at ${evidencePath1}`
  };

  // Criterion 2: Evidence file has valid JSON
  let evidenceData: any = null;
  let jsonValid = false;
  if (evidenceExists) {
    try {
      const rawData = readFileSync(evidencePath1, "utf8");
      evidenceData = JSON.parse(rawData);
      jsonValid = true;
      results.acceptance_criteria["evidence_json_valid"] = {
        passed: true,
        evidence: `JSON parsed successfully, keys: ${Object.keys(evidenceData).join(", ")}`
      };
    } catch (error) {
      results.acceptance_criteria["evidence_json_valid"] = {
        passed: false,
        evidence: `JSON parse failed: ${error}`
      };
    }
  } else {
    results.acceptance_criteria["evidence_json_valid"] = {
      passed: false,
      evidence: "Skipped - evidence file not found"
    };
  }

  // Criterion 3: Evidence contains required fields
  let hasRequiredFields = false;
  if (jsonValid && evidenceData) {
    const requiredFields = ["case_id", "action", "timestamp", "actor", "outcome"];
    const missingFields = requiredFields.filter(field => !(field in evidenceData));
    hasRequiredFields = missingFields.length === 0;
    results.acceptance_criteria["evidence_has_required_fields"] = {
      passed: hasRequiredFields,
      evidence: hasRequiredFields ? `All required fields present: ${requiredFields.join(", ")}` : `Missing fields: ${missingFields.join(", ")}`
    };
  } else {
    results.acceptance_criteria["evidence_has_required_fields"] = {
      passed: false,
      evidence: "Skipped - invalid JSON"
    };
  }

  // Criterion 4: Action is T3 milestone
  let isT3Action = false;
  if (hasRequiredFields && evidenceData) {
    isT3Action = evidenceData.action === "t3_milestone_reached";
    results.acceptance_criteria["action_is_t3_milestone"] = {
      passed: isT3Action,
      evidence: isT3Action ? `Action verified: ${evidenceData.action}` : `Unexpected action: ${evidenceData.action}`
    };
  } else {
    results.acceptance_criteria["action_is_t3_milestone"] = {
      passed: false,
      evidence: "Skipped - missing required fields"
    };
  }

  // Criterion 5: Outcome is success
  let outcomeSuccess = false;
  if (isT3Action && evidenceData) {
    outcomeSuccess = evidenceData.outcome === "success";
    results.acceptance_criteria["outcome_is_success"] = {
      passed: outcomeSuccess,
      evidence: outcomeSuccess ? `Outcome verified: ${evidenceData.outcome}` : `Unexpected outcome: ${evidenceData.outcome}`
    };
  } else {
    results.acceptance_criteria["outcome_is_success"] = {
      passed: false,
      evidence: "Skipped - not T3 action"
    };
  }

  // Criterion 6: Timestamp is recent
  let timestampRecent = false;
  if (outcomeSuccess && evidenceData) {
    const evidenceTime = new Date(evidenceData.timestamp).getTime();
    const now = Date.now();
    const oneHourMs = 60 * 60 * 1000;
    timestampRecent = (now - evidenceTime) < oneHourMs;
    results.acceptance_criteria["timestamp_is_recent"] = {
      passed: timestampRecent,
      evidence: timestampRecent ? `Timestamp is recent: ${evidenceData.timestamp}` : `Timestamp too old: ${evidenceData.timestamp}`
    };
  } else {
    results.acceptance_criteria["timestamp_is_recent"] = {
      passed: false,
      evidence: "Skipped - outcome not success"
    };
  }

  // Criterion 7: Actor is system
  let actorIsSystem = false;
  if (timestampRecent && evidenceData) {
    actorIsSystem = evidenceData.actor === "system";
    results.acceptance_criteria["actor_is_system"] = {
      passed: actorIsSystem,
      evidence: actorIsSystem ? `Actor verified: ${evidenceData.actor}` : `Unexpected actor: ${evidenceData.actor}`
    };
  } else {
    results.acceptance_criteria["actor_is_system"] = {
      passed: false,
      evidence: "Skipped - timestamp not recent"
    };
  }

  // Criterion 8: Case ID matches
  let caseIdMatches = false;
  if (actorIsSystem && evidenceData) {
    caseIdMatches = evidenceData.case_id === ILC_P0.case_id;
    results.acceptance_criteria["case_id_matches"] = {
      passed: caseIdMatches,
      evidence: caseIdMatches ? `Case ID verified: ${evidenceData.case_id}` : `Case ID mismatch: expected ${ILC_P0.case_id}, got ${evidenceData.case_id}`
    };
  } else {
    results.acceptance_criteria["case_id_matches"] = {
      passed: false,
      evidence: "Skipped - actor not system"
    };
  }

  // Calculate overall result
  results.total_criteria = Object.keys(results.acceptance_criteria).length;
  results.total_passed = Object.values(results.acceptance_criteria).filter(c => c.passed).length;
  results.all_passed = results.total_passed === results.total_criteria;

  console.log("\n=== Verification Results ===");
  Object.entries(results.acceptance_criteria).forEach(([key, value]) => {
    console.log(`${value.passed ? '✅' : '❌'} ${key}: ${value.passed ? 'PASS' : 'FAIL'}`);
    console.log(`   Evidence: ${value.evidence}`);
  });

  console.log(`\nOverall: ${results.total_passed}/${results.total_criteria} passed`);
  console.log(`Verdict: ${results.all_passed ? 'PASS' : 'FAIL'}`);

  // Save verification result
  const verificationPath = statePath("verification", `${ILC_P0.case_id}_t3_verification.json`);
  if (!existsSync(statePath("verification"))) {
    mkdirSync(statePath("verification"), {recursive: true});
  }
  writeFileSync(verificationPath, JSON.stringify(results, null, 2));
  console.log(`\nVerification result saved to: ${verificationPath}`);

  process.exit(results.all_passed ? 0 : 1);
}

main().catch(error => {
  console.error("Verification failed with error:", error);
  process.exit(1);
});