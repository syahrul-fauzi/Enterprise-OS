/**
 * Independent Verification Agent: Verify ILC-P0 professional first action execution
 * Adheres to eos-verification specifications: never trusts implementation claims, independently validates all criteria
 */
import { CaseRepositoryInMemory } from "./capabilities/legal-case/implementation/repository/case.repository";
import { CaseId } from "./capabilities/legal-case/implementation/contracts/case.contracts";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { stat } from 'fs/promises';
import { statePath } from "@repo/eos-cli";

const ILC_CASE_ID = "case_01HXYZ789ABCDEFG";
const EVIDENCE_PATH = statePath("evidence", `${ILC_CASE_ID}_evidence.json`);

interface VerificationResult {
  criterion: string;
  passed: boolean;
  evidence: string;
}

async function main() {
  console.log("=== ILC-P0 Professional First Action Verification ===");
  console.log(`Case ID: ${ILC_CASE_ID}`);
  console.log(`Evidence Path: ${EVIDENCE_PATH}`);

  const results: VerificationResult[] = [];

  // Criterion 1: Evidence artifact exists in canonical state
  const evidenceExists = existsSync(EVIDENCE_PATH);
  results.push({
    criterion: "Evidence artifact exists in canonical state",
    passed: evidenceExists,
    evidence: evidenceExists ? `File found at ${EVIDENCE_PATH}` : `File not found at ${EVIDENCE_PATH}`
  });

  // Criterion 2: Evidence artifact has valid JSON structure
  let evidenceData: any = null;
  let jsonValid = false;
  if (evidenceExists) {
    try {
      const rawData = readFileSync(EVIDENCE_PATH, "utf8");
      evidenceData = JSON.parse(rawData);
      jsonValid = true;
      results.push({
        criterion: "Evidence artifact has valid JSON structure",
        passed: true,
        evidence: `JSON parsed successfully, keys: ${Object.keys(evidenceData).join(", ")}`
      });
    } catch (error) {
      results.push({
        criterion: "Evidence artifact has valid JSON structure",
        passed: false,
        evidence: `JSON parse failed: ${error}`
      });
    }
  } else {
    results.push({
      criterion: "Evidence artifact has valid JSON structure",
      passed: false,
      evidence: "Skipped - evidence file not found"
    });
  }

  // Criterion 3: Evidence contains required fields
  let hasRequiredFields = false;
  if (jsonValid && evidenceData) {
    const requiredFields = ["case_id", "action", "timestamp", "actor", "outcome"];
    const missingFields = requiredFields.filter(field => !(field in evidenceData));
    hasRequiredFields = missingFields.length === 0;
    results.push({
      criterion: "Evidence contains required fields",
      passed: hasRequiredFields,
      evidence: hasRequiredFields ? `All required fields present: ${requiredFields.join(", ")}` : `Missing fields: ${missingFields.join(", ")}`
    });
  } else {
    results.push({
      criterion: "Evidence contains required fields",
      passed: false,
      evidence: "Skipped - invalid JSON"
    });
  }

  // Criterion 4: Action is professional first action
  let isProfessionalAction = false;
  if (hasRequiredFields && evidenceData) {
    isProfessionalAction = evidenceData.action === "professional_first_action";
    results.push({
      criterion: "Action is professional first action",
      passed: isProfessionalAction,
      evidence: isProfessionalAction ? `Action verified: ${evidenceData.action}` : `Unexpected action: ${evidenceData.action}`
    });
  } else {
    results.push({
      criterion: "Action is professional first action",
      passed: false,
      evidence: "Skipped - missing required fields"
    });
  }

  // Criterion 5: Outcome is success
  let outcomeSuccess = false;
  if (isProfessionalAction && evidenceData) {
    outcomeSuccess = evidenceData.outcome === "success";
    results.push({
      criterion: "Outcome is success",
      passed: outcomeSuccess,
      evidence: outcomeSuccess ? `Outcome verified: ${evidenceData.outcome}` : `Unexpected outcome: ${evidenceData.outcome}`
    });
  } else {
    results.push({
      criterion: "Outcome is success",
      passed: false,
      evidence: "Skipped - not professional action"
    });
  }

  // Criterion 6: Timestamp is recent (within last hour)
  let timestampRecent = false;
  if (outcomeSuccess && evidenceData) {
    const evidenceTime = new Date(evidenceData.timestamp).getTime();
    const now = Date.now();
    const oneHourMs = 60 * 60 * 1000;
    timestampRecent = (now - evidenceTime) < oneHourMs;
    results.push({
      criterion: "Timestamp is recent (within last hour)",
      passed: timestampRecent,
      evidence: timestampRecent ? `Timestamp is recent: ${evidenceData.timestamp}` : `Timestamp too old: ${evidenceData.timestamp}`
    });
  } else {
    results.push({
      criterion: "Timestamp is recent (within last hour)",
      passed: false,
      evidence: "Skipped - outcome not success"
    });
  }

  // Criterion 7: Actor is professional
  let actorIsProfessional = false;
  if (timestampRecent && evidenceData) {
    actorIsProfessional = evidenceData.actor === "professional";
    results.push({
      criterion: "Actor is professional",
      passed: actorIsProfessional,
      evidence: actorIsProfessional ? `Actor verified: ${evidenceData.actor}` : `Unexpected actor: ${evidenceData.actor}`
    });
  } else {
    results.push({
      criterion: "Actor is professional",
      passed: false,
      evidence: "Skipped - timestamp not recent"
    });
  }

  // Criterion 8: Case ID matches
  let caseIdMatches = false;
  if (actorIsProfessional && evidenceData) {
    caseIdMatches = evidenceData.case_id === ILC_CASE_ID;
    results.push({
      criterion: "Case ID matches",
      passed: caseIdMatches,
      evidence: caseIdMatches ? `Case ID verified: ${evidenceData.case_id}` : `Case ID mismatch: expected ${ILC_CASE_ID}, got ${evidenceData.case_id}`
    });
  } else {
    results.push({
      criterion: "Case ID matches",
      passed: false,
      evidence: "Skipped - actor not professional"
    });
  }

  // Calculate overall result
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const overallPassed = passedCount === totalCount;

  console.log("\n=== Verification Results ===");
  results.forEach((r, idx) => {
    console.log(`${r.passed ? '✅' : '❌'} [${idx + 1}] ${r.criterion}: ${r.passed ? 'PASS' : 'FAIL'}`);
    console.log(`   Evidence: ${r.evidence}`);
  });

  console.log(`\nOverall: ${passedCount}/${totalCount} passed`);
  console.log(`Verdict: ${overallPassed ? 'PASS' : 'FAIL'}`);

  // Save verification result
  const verificationPath = statePath("verification", `${ILC_CASE_ID}_verification.json`);
  mkdirSync(statePath("verification"), { recursive: true });
  const verificationResult = {
    case_id: ILC_CASE_ID,
    verified_at: new Date().toISOString(),
    overall_passed: overallPassed,
    passed_count: passedCount,
    total_count: totalCount,
    criteria: results
  };
  writeFileSync(verificationPath, JSON.stringify(verificationResult, null, 2));
  console.log(`\nVerification result saved to: ${verificationPath}`);

  process.exit(overallPassed ? 0 : 1);
}

main().catch(error => {
  console.error("Verification failed with error:", error);
  process.exit(1);
});