#!/usr/bin/env node
/**
 * CREATE 3 TEST LEGAL CASES to validate specialization pattern detection
 * BETTER-EOS-GOLDEN-PATH-001 CRITERION 9: Specialization pattern terdeteksi setelah 3+ legal case dengan pola yang sama
 * 
 * Creates 3 identical legal cases (pendirian PT) to trigger KnowledgeGraph.findPattern()
 * to detect the repeated pattern as specialization
 */

// TypeScript ESM imports untuk mengikuti codebase convention (.js extension required)
import { compositionService } from '../../../capabilities/atomic-composition/implementation/services/composition.service.js';
import { knowledgeGraphService } from '../../../capabilities/knowledge-graph/implementation/services/knowledge-graph.service.js';

// Constants sesuai konteks LawyersHub Jakarta
const TENANT_ID = "tenant-lawyershub-001";
const WORKSPACE_ID = "workspace-lawyershub-jakarta-001";
const SESSION_ID = "lh-better-eos-test-" + Date.now();

// Standard pattern untuk kasus pendirian PT (akan diulang 3x)
const STANDARD_CASE_PATTERN = {
  title: "Mendirikan PT",
  requirements: [
    { requirementId: "req-legal-review", capabilityId: "legal-corporate-law", minimumTrust: "verified", authority: "execute", resolved: false, quantity: 1 },
    { requirementId: "req-notary-services", capabilityId: "notary-documentation", minimumTrust: "verified", authority: "execute", resolved: false, quantity: 1 },
    { requirementId: "req-government-filing", capabilityId: "kemenkumham-submission", minimumTrust: "verified", authority: "execute", resolved: false, quantity: 1 }
  ],
  availableActors: [
    { actorId: "actor-client-001", id: "actor-client-001", role: "Pengusaha", authority: "owner", type: "human", capabilities: [], availability: true, displayName: "Andi Prasetyo" },
    { actorId: "actor-lawyer-001", id: "actor-lawyer-001", role: "Advokat", authority: "execute", type: "human", capabilities: ["legal-corporate-law"], availability: true, displayName: "Budi Susanto" },
    { actorId: "actor-notary-001", id: "actor-notary-001", role: "Notaris", authority: "execute", type: "human", capabilities: ["notary-documentation"], availability: true, displayName: "Citra Wijaya" }
  ],
  availableCapabilities: [
    { id: "legal-corporate-law", role: "Legal Counsel", authority: "execute" },
    { id: "notary-documentation", role: "Notary Services", authority: "execute" },
    { id: "kemenkumham-submission", role: "Government Filing", authority: "execute" }
  ]
};

async function createSingleCase(caseNumber: number) {
  console.log(`\n📝 Creating test case #${caseNumber}: ${STANDARD_CASE_PATTERN.title} XYZ Indonesia`);
  
  const workId = `work-pt-case-${String(caseNumber).padStart(3, '0')}-${Date.now()}`;
  const work = {
    workId,
    title: `${STANDARD_CASE_PATTERN.title} XYZ Indonesia (Test Case #${caseNumber})`,
    type: "legal-case-corporate",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    workspaceId: WORKSPACE_ID,
    tenantId: TENANT_ID
  };

  // Create hyper-relationship (WorkBindings with single compositionId)
  const compositionResult = await compositionService.composeTeamFromRequirements({
    workId,
    work,
    requirements: STANDARD_CASE_PATTERN.requirements,
    availableActors: STANDARD_CASE_PATTERN.availableActors,
    availableCapabilities: STANDARD_CASE_PATTERN.availableCapabilities,
    workspaceId: WORKSPACE_ID
  });

  console.log(`✅ Hyper-relationship created for case #${caseNumber}: compositionId=${compositionResult.compositionId}`);
  console.log(`   Total WorkBindings: ${compositionResult.team.totalBindings}`);
  
  return { workId, compositionId: compositionResult.compositionId, caseNumber };
}

async function main() {
  console.log("\n========================================");
  console.log("LAWYERSHUB: CREATE 3 TEST LEGAL CASES");
  console.log("BETTER-EOS-GOLDEN-PATH-001 - CRITERION 9");
  console.log("========================================\n");

  const createdCases = [];
  
  // Create 3 identical test cases to trigger pattern detection
  for (let i = 1; i <= 3; i++) {
    const caseResult = await createSingleCase(i);
    createdCases.push(caseResult);
  }

  console.log("\n✅ All 3 test cases created! Now running pattern detection...");
  
  // Use KnowledgeGraph.findPattern() to detect the repeated legal case pattern
  const patternResult = knowledgeGraphService.findPattern([
    { nodeType: "work", attributes: { type: "legal-case-corporate" } },
    { nodeType: "capability", attributes: { id: "legal-corporate-law" } },
    { nodeType: "capability", attributes: { id: "notary-documentation" } },
    { nodeType: "actor", attributes: { role: "Pengusaha" } },
    { nodeType: "actor", attributes: { role: "Advokat" } },
    { nodeType: "actor", attributes: { role: "Notaris" } }
  ]);

  console.log("\n📊 KNOWLEDGE GRAPH PATTERN DETECTION RESULTS:");
  console.log(`   Pattern ID: ${patternResult.patternId}`);
  console.log(`   Matches found: ${patternResult.matches}`);
  
  if (patternResult.matches >= 3) {
    console.log("\n🎉 SPECIALIZATION PATTERN DETECTED! BETTER-EOS-GOLDEN-PATH-001 CRITERION 9 SATISFIED");
    console.log(`   Found ${patternResult.matches} repeated cases of the same corporate legal case pattern`);
    console.log("   Domain specialization emerges naturally from reality - no first-class node required");
  } else {
    console.log(`\n⚠️ Only ${patternResult.matches} matches found. Need at least 3 to trigger specialization detection.`);
  }

  console.log("\n========================================");
  console.log("TEST CASES CREATED AND PATTERN CHECKED");
  console.log("========================================");
  console.log("\nCreated cases:");
  createdCases.forEach(c => console.log(`   - Case #${c.caseNumber}: workId=${c.workId}, compositionId=${c.compositionId}`));
}

main().catch(err => {
  console.error("❌ Error creating test cases:", err);
  process.exit(1);
});