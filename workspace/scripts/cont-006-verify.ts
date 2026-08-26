/**
 * CONT-006 Verification Script - Final Orphan Scanner Validation
 * 
 * Executes:
 * 1. 1000 ID generation test - all IDs must match orphan scanner regex
 * 2. E2E communication replay - create work → send communication → scan for orphans
 * 3. Zero orphan guarantee - verify all events are properly grounded
 * 
 * This completes CONT-006 per Commander's battle order:
 * "generated IDs → scanner → communication events → replay"
 */

import { OrphanCommunicationScanner } from "../capabilities/communication/implementation/observability/orphan.scanner.ts";
import { CommunicationRepositoryInMemory } from "../capabilities/communication/implementation/repository/communication.repository.ts";
import { CaseRepositoryInMemory } from "../capabilities/legal-case/implementation/repository/case.repository.ts";
import { ServiceRequestRepositoryInMemory } from "../capabilities/service-directory/implementation/repository/service.repository.ts";
import { CommunityDiscussionRepositoryInMemory as DiscussionRepositoryInMemory, ContentArticleRepositoryInMemory, newDiscussionId, newContentId } from "../capabilities/legal-community/implementation/repository/index.ts";
import { newCaseId } from "../capabilities/legal-case/implementation/repository/case.repository.ts";
import { newServiceRequestId } from "../capabilities/service-directory/implementation/repository/service.repository.ts";
import { newRequirementId } from "../capabilities/requirement-management/implementation/repository/requirement.repository.ts";
import { newDocumentId } from "../capabilities/legal-document/implementation/repository/document.repository.ts";

// Reuse the EXACT regex from orphan scanner to validate IDs - imported directly from the source
import { validWorkIdPattern as VALID_WORK_ID_PATTERN } from "../capabilities/communication/implementation/observability/orphan.scanner.ts";

interface IdGenerationResult {
  id: string;
  generator: string;
  valid: boolean;
  matchesPattern: boolean;
}

interface Cont006VerificationReport {
  verification_timestamp: string;
  id_generation_test: {
    total_tests: number;
    passed: number;
    failed: number;
    failures: IdGenerationResult[];
    compliance_rate: number;
  };
  e2e_replay_test: {
    total_events: number;
    orphan_events: number;
    orphan_details: any[];
    replay_passed: boolean;
  };
  final_verdict: "PASS" | "FAIL";
  notes: string[];
}

async function runIdGenerationTests(): Promise<Cont006VerificationReport["id_generation_test"]> {
  console.log("\n=== [CONT-006] Step 1: 1000-ID Randomized Validation ===");
  
  const generators = [
    { name: "newCaseId", fn: newCaseId },
    { name: "newServiceRequestId", fn: newServiceRequestId },
    { name: "newDiscussionId", fn: newDiscussionId },
    { name: "newContentId", fn: newContentId },
    { name: "newRequirementId", fn: newRequirementId },
    { name: "newDocumentId", fn: newDocumentId },
  ];
  
  const results: IdGenerationResult[] = [];
  const failures: IdGenerationResult[] = [];
  const totalTests = 1000;
  const testsPerGenerator = Math.floor(totalTests / generators.length);
  
  for (const generator of generators) {
    console.log(`  Testing ${generator.name} × ${testsPerGenerator}...`);
    for (let i = 0; i < testsPerGenerator; i++) {
      const id = generator.fn();
      const idStr = id as string;
      const matchesPattern = VALID_WORK_ID_PATTERN.test(idStr);
      const valid = matchesPattern;
      
      const result: IdGenerationResult = {
        id: idStr,
        generator: generator.name,
        valid,
        matchesPattern
      };
      
      results.push(result);
      if (!valid) {
        failures.push(result);
        console.error(`    ❌ Invalid ID: ${idStr} from ${generator.name}`);
      }
    }
  }
  
  // Add remaining tests to reach exactly 1000
  const remaining = totalTests - results.length;
  if (remaining > 0) {
    for (let i = 0; i < remaining; i++) {
      const id = newCaseId();
      const idStr = id as string;
      const matchesPattern = VALID_WORK_ID_PATTERN.test(idStr);
      results.push({
        id: idStr,
        generator: "newCaseId",
        valid: matchesPattern,
        matchesPattern
      });
    }
  }
  
  const passed = results.filter(r => r.valid).length;
  const failed = failures.length;
  const complianceRate = (passed / results.length) * 100;
  
  console.log(`  ✅ ID Generation Complete: ${passed}/${results.length} valid`);
  console.log(`  📊 Compliance rate: ${complianceRate.toFixed(2)}%`);
  
  return {
    total_tests: results.length,
    passed,
    failed,
    failures,
    compliance_rate: parseFloat(complianceRate.toFixed(2))
  };
}

async function runE2EReplayTest(): Promise<Cont006VerificationReport["e2e_replay_test"]> {
  console.log("\n=== [CONT-006] Step 2: E2E Communication Replay Test ===");
  
  // Clear repositories for fresh test
  await (CaseRepositoryInMemory as any).clear?.();
  await (ServiceRequestRepositoryInMemory as any).clear?.();
  await (import("../capabilities/requirement-management/implementation/repository/requirement.repository.ts").then(m => m.RequirementRepositoryInMemory) as any).clear?.();
  await (import("../capabilities/legal-document/implementation/repository/document.repository.ts").then(m => m.DocumentRepositoryInMemory) as any).clear?.();
  // Community repositories don't have async clear methods - reset sync stores
  if ((DiscussionRepositoryInMemory as any).list) {
    const discussions = await DiscussionRepositoryInMemory.list();
    discussions.forEach((d: any) => (DiscussionRepositoryInMemory as any).remove?.(d.id));
  }
  if ((ContentArticleRepositoryInMemory as any).list) {
    const contents = await ContentArticleRepositoryInMemory.list();
    contents.forEach((c: any) => (ContentArticleRepositoryInMemory as any).remove?.(c.id));
  }
  CommunicationRepositoryInMemory.clear();
  
  // Step 1: Create various work items
  console.log("  Creating test work items across domains...");
  const caseId = newCaseId();
  const requestId = newServiceRequestId();
  const discussionId = newDiscussionId();
  const contentId = newContentId();
  const requirementId = newRequirementId();
  const documentId = newDocumentId();
  
  // Save to repositories
  await CaseRepositoryInMemory.save({
    id: caseId,
    title: "Test Case for Orphan Scanner",
    description: "E2E test case",
    status: "draft",
    priority: "medium",
    workspaceId: "test-workspace",
    tenantId: "test-tenant",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any);
  
  await ServiceRequestRepositoryInMemory.save({
    id: requestId,
    title: "Test Service Request",
    description: "E2E test request",
    status: "draft",
    workspaceId: "test-workspace",
    tenantId: "test-tenant",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any);
  
  await DiscussionRepositoryInMemory.save({
    id: discussionId,
    title: "Test Discussion",
    content: "E2E test discussion",
    status: "published",
    workspaceId: "test-workspace",
    tenantId: "test-tenant",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any);
  
  const { RequirementRepositoryInMemory } = await import("../capabilities/requirement-management/implementation/repository/requirement.repository.ts");
  await RequirementRepositoryInMemory.save({
    id: requirementId,
    title: "Test Requirement",
    description: "E2E test requirement",
    status: "draft",
    priority: "medium",
    workspaceId: "test-workspace",
    tenantId: "test-tenant",
    linkedCapabilityIds: [],
    acceptanceCriteria: [],
    dependsOn: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any);
  
  const { DocumentRepositoryInMemory } = await import("../capabilities/legal-document/implementation/repository/document.repository.ts");
  await DocumentRepositoryInMemory.save({
    id: documentId,
    title: "Test Legal Document",
    description: "E2E test document",
    status: "draft",
    matterId: caseId as string,
    workspaceId: "test-workspace",
    tenantId: "test-tenant",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any);
  
  // Step 2: Create communication events grounded to these works
  console.log("  Creating communication events grounded to works...");
  const testEvents = [
    {
      event_id: "comm-test-001",
      event_type: "CommunicationSent",
      work_id: caseId as string,
      actor_id: "user-123",
      recipient_ids: ["user-456"],
      adapter_type: "in_app_chat",
      content: "First test message on case",
      timestamp: new Date().toISOString(),
      status: "delivered"
    },
    {
      event_id: "comm-test-002",
      event_type: "CommunicationSent",
      work_id: requestId as string,
      actor_id: "user-789",
      recipient_ids: ["user-123"],
      adapter_type: "email",
      content: "Test message on service request",
      timestamp: new Date().toISOString(),
      status: "delivered"
    },
    {
      event_id: "comm-test-003",
      event_type: "CommunicationSent",
      work_id: discussionId as string,
      actor_id: "user-456",
      recipient_ids: ["user-789"],
      adapter_type: "in_app_chat",
      content: "Test message on discussion",
      timestamp: new Date().toISOString(),
      status: "delivered"
    },
    {
      event_id: "comm-test-004",
      event_type: "CommunicationSent",
      work_id: requirementId as string,
      actor_id: "user-123",
      recipient_ids: ["user-456"],
      adapter_type: "in_app_chat",
      content: "Test message on requirement",
      timestamp: new Date().toISOString(),
      status: "delivered"
    },
    {
      event_id: "comm-test-005",
      event_type: "CommunicationSent",
      work_id: documentId as string,
      actor_id: "user-456",
      recipient_ids: ["user-789"],
      adapter_type: "email",
      content: "Test message on legal document",
      timestamp: new Date().toISOString(),
      status: "delivered"
    }
  ];
  
  for (const event of testEvents) {
    await CommunicationRepositoryInMemory.save(event as any, {
      tenantId: "test-tenant",
      workspaceId: "test-workspace",
      actorId: event.actor_id
    });
  }
  
  // Step 3: Run orphan scanner
  console.log("  Running OrphanCommunicationScanner...");
  const scanReport = await OrphanCommunicationScanner.scan();
  
  console.log(`  📊 Scan results: ${scanReport.total_events} total events, ${scanReport.orphan_events} orphans`);
  if (scanReport.orphan_events > 0) {
    console.error("  ❌ Found orphan events:", scanReport.orphan_details);
  } else {
    console.log("  ✅ All events properly grounded - zero orphans!");
  }
  
  return {
    total_events: scanReport.total_events,
    orphan_events: scanReport.orphan_events,
    orphan_details: scanReport.orphan_details,
    replay_passed: scanReport.orphan_events === 0
  };
}

async function main(): Promise<Cont006VerificationReport> {
  console.log("🚀 Starting CONT-006 Final Verification");
  console.log("=");
  
  const idTestResults = await runIdGenerationTests();
  const e2eResults = await runE2EReplayTest();
  
  const allPassed = idTestResults.failed === 0 && e2eResults.replay_passed;
  const notes: string[] = [];
  
  if (allPassed) {
    notes.push("✅ ALL CONT-006 acceptance criteria met");
    notes.push("✅ ID generators comply with orphan scanner regex pattern");
    notes.push("✅ E2E communication replay completed with zero orphans");
    notes.push("✅ All communication events properly grounded to existing work");
    notes.push("✅ CONT-006 is ready for FINAL VERDICT: PASS");
  } else {
    notes.push("❌ CONT-006 has failures that need remediation");
    if (idTestResults.failed > 0) notes.push(`❌ ID generation failures: ${idTestResults.failed}`);
    if (!e2eResults.replay_passed) notes.push(`❌ Orphan events found: ${e2eResults.orphan_events}`);
  }
  
  const report: Cont006VerificationReport = {
    verification_timestamp: new Date().toISOString(),
    id_generation_test: idTestResults,
    e2e_replay_test: e2eResults,
    final_verdict: allPassed ? "PASS" : "FAIL",
    notes
  };
  
  console.log("\n" + "=".repeat(60));
  console.log("📋 CONT-006 FINAL VERIFICATION REPORT");
  console.log("=".repeat(60));
  console.log(`Verification Timestamp: ${report.verification_timestamp}`);
  console.log(`\nID Generation: ${report.id_generation_test.passed}/${report.id_generation_test.total_tests} (${report.id_generation_test.compliance_rate}% compliance)`);
  console.log(`E2E Replay: ${report.e2e_replay_test.total_events} events, ${report.e2e_replay_test.orphan_events} orphans`);
  console.log(`\nFINAL VERDICT: ${report.final_verdict}`);
  console.log("\nNotes:");
  report.notes.forEach(note => console.log(`  ${note}`));
  
  // Save report to verification directory
  const fs = await import('node:fs');
  const path = await import('node:path');
  const reportDir = path.join(process.cwd(), '.eos-state', 'verification');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  const reportPath = path.join(reportDir, 'CONT-006_verification.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved to: ${reportPath}`);
  
  return report;
}

main().then(report => {
  if (report.final_verdict === "FAIL") {
    process.exit(1);
  }
  process.exit(0);
}).catch(err => {
  console.error("💥 Verification script failed:", err);
  process.exit(1);
});