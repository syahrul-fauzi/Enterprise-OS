import { governanceEvidenceService } from "./governance-evidence.service";

async function main() {
  console.log("=== B7.17 PRE-CAMPAIGN: TESTING DECISION INTELLIGENCE ENGINE ===\n");
  
  // 1. Test loading all capability metadata
  console.log("1. Loading all capability metadata...");
  const capabilities = governanceEvidenceService.loadAllCapabilityMetadata();
  console.log(`✅ Successfully loaded metadata for ${capabilities.length} capabilities\n`);
  
  // 2. Display capability details
  console.log("2. Capability metadata summary:");
  capabilities.forEach(cap => {
    console.log(`   - ${cap.capability_id.padEnd(30)} | ${cap.owner.padEnd(20)} | Evidence Required: [${cap.evidence_required.join(', ')}]`);
  });
  console.log();
  
  // 3. Test aggregated runtime evidence (from B7.15)
  console.log("3. Loading aggregated runtime evidence...");
  const evidence = governanceEvidenceService.getAggregatedRuntimeEvidence();
  console.log(`✅ Total runtime invocations: ${evidence.total_invocations}`);
  console.log(`✅ Success rate: ${(evidence.success_rate * 100).toFixed(2)}%`);
  console.log(`✅ Capabilities with invocations: ${Object.keys(evidence.by_capability).length}\n`);
  
  // 4. Test governance decisions
  console.log("4. Generating governance confidence verdicts...");
  const decisions = governanceEvidenceService.getGovernanceDecisions();
  console.log(`✅ Generated ${decisions.length} decisions\n`);
  
  // 5. Display decisions
  console.log("5. Governance Confidence Verdict Summary:");
  console.log("   ┌────────────────────────────┬──────────────────────────┬──────────┬────────────┐");
  console.log("   │ Capability                 │ Owner                    │ Score    │ Decision   │");
  console.log("   ├────────────────────────────┼──────────────────────────┼──────────┼────────────┤");
  decisions.forEach(d => {
    console.log(`   │ ${d.capability_id.padEnd(28)} │ ${d.owner.padEnd(24)} │ ${(d.confidence_score * 100).toFixed(1).padStart(5)}% │ ${d.decision.padEnd(10)} │`);
  });
  console.log("   └────────────────────────────┴──────────────────────────┴──────────┴────────────┘\n");
  
  // 6. Detailed rationale for each decision
  console.log("6. Detailed decision rationale:");
  decisions.filter(d => d.evidence_missing.length > 0).forEach(d => {
    console.log(`   ${d.capability_id} (${d.decision}): ${d.rationale}`);
    if (d.evidence_missing.length > 0) {
      console.log(`   → Missing evidence: ${d.evidence_missing.join(', ')}\n`);
    }
  });
  
  console.log("=== B7.17 PRE-CAMPAIGN: DECISION INTELLIGENCE ENGINE TEST COMPLETE ===");
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});