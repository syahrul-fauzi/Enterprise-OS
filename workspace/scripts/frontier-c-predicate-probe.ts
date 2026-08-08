// Frontier C Recon: Probe actual predicate values for named release IDs.
// Goal: Falsify or confirm: do 12.3-happy / 12.3-blocked / 12.3-ambiguous produce 3 distinct branches?

import { requirementService } from "/root/Enterprise-OS/workspace/capabilities/requirement-management/implementation/services";
import { requirementsTraceabilityMatrixService } from "/root/Enterprise-OS/workspace/capabilities/requirements-traceability-matrix/implementation/services";
import { evidenceRegistryService } from "/root/Enterprise-OS/workspace/capabilities/evidence-registry/implementation/services";
import { evaluatePrepareReleaseConditions } from "/root/Enterprise-OS/workspace/procedures/prepare-release/contracts";

const RELEASE_IDS = ["12.3-happy", "12.3-blocked", "12.3-ambiguous"] as const;

console.log("============ FRONTIER C: PREDICATE PROBE (CANONICAL EVALUATOR) =============\n");
console.log("evaluatePrepareReleaseConditions = Single Semantic Authority for all surfaces\n");

for (const rid of RELEASE_IDS) {
  const v = requirementService.assessVerification({ releaseId: rid });
  const t = requirementsTraceabilityMatrixService.assess({ releaseId: rid });
  const e = evidenceRegistryService.assessEvidence({ releaseId: rid });
  const branch = evaluatePrepareReleaseConditions({
    verification: v,
    traceability: t,
    evidence: e,
  });
  const [outcome, reason] = branch;

  console.log(`\nreleaseId = ${rid}`);
  console.log(`  verification`);
  console.log(`    isVerified          = ${v.isVerified}  (total=${v.totalRequirements}, verified=${v.verifiedRequirements}, blocked=${v.blockedRequirements}, unknown=${v.unknownRequirements})`);
  console.log(`    hasUnknown          = ${v.hasUnknown}`);
  console.log(`    unknownRequirementIds = [${v.unknownRequirementIds.join(", ")}]`);
  console.log(`  traceability`);
  console.log(`    complete            = ${t.complete}  (gaps=${t.gapCount}, requirements=${t.requirementCount}, artifacts=${t.artifactCount})`);
  console.log(`  evidence`);
  console.log(`    complete            = ${e.complete}  (total=${e.totalEvidence})`);
  console.log(`\n  → CANONICAL OUTCOME = ${outcome}  (reason=${reason})`);
  if (outcome === "intelligence_required") {
    const [, , meta] = branch;
    console.log(`  → AI plan = ${meta.aiPlanId}, ambiguous = [${meta.ambiguousRequirementIds.join(", ")}]`);
  }
}

console.log("\n============ END PREDICATE PROBE =============\n");
