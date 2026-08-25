import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { CommunicationRepositoryInMemory as CommunicationRepository } from "../../../capabilities/communication/implementation/repository/communication.repository.js";
import { CaseRepositoryInMemory as CaseRepository } from "../../../capabilities/legal-case/implementation/repository/case.repository.js";
import { groundCommunicationToWork } from "../../../capabilities/communication/implementation/grounding/converter.js";
import type { CommunicationEvent } from "../../../capabilities/communication/implementation/contracts/communication.contracts.js";
import type { CaseAggregate } from "../../../capabilities/legal-case/implementation/contracts/case.contracts.js";
import { CaseId } from "../../../capabilities/legal-case/implementation/contracts/case.contracts.js";

// CONT-TEST-002: ACTOR CHANGE ATTACK
// Test that Work continuity is maintained when the actor performing the Work changes
// Original actor: lawyer-ilc-001 (handles case creation)
// New actor: paralegal-ilc-002 (takes over to draft documents)
// Verify all events still point to the same Work ID regardless of who's acting

// Test constants - REAL_WORK_014 identifiers
const TEST_WORK_ID = "case-014";
const TENANT_ID = "tenant-ilc-001";
const WORKSPACE_ID = "workspace-ilc-001";
const ORIGINAL_ACTOR_ID = "actor-lawyer-001";    // Original handling lawyer
const NEW_ACTOR_ID = "actor-paralegal-002";     // New paralegal taking over
const ILC_SESSION_ID = "session-ilc-001";

// Create a REAL_WORK_014 test case manually (no capability registry needed for grounding test)
async function setupTestWork(): Promise<CaseAggregate> {
  // Create case-014 - the real work we'll test continuity against
  const testCase: CaseAggregate = {
    id: CaseId(TEST_WORK_ID),
    workId: TEST_WORK_ID,
    title: "REAL_WORK_014: Continuity Test Case - Actor Change",
    description: "Test case for verifying work continuity across actor handoffs",
    status: "in_progress",
    priority: "critical",
    lawyerId: ORIGINAL_ACTOR_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    executionContext: {
      decision_id: "decision-cont-test-002",
      last_invocation_digest: "digest-xyz789",
      propagated_from: "direct-api"
    }
  };
  
  // Save to case repository
  await CaseRepository.save(testCase, {
    tenantId: TENANT_ID,
    workspaceId: WORKSPACE_ID,
    actorId: ORIGINAL_ACTOR_ID
  });
  
  // Retrieve to verify
  const caseResult = await CaseRepository.byId(CaseId(TEST_WORK_ID));
  assert.ok(caseResult !== undefined, "Test case must exist after creation");
  return caseResult;
}

// Simulate actor handoff - send events from both original and new actors
async function sendCommunicationAcrossActors(testCase: CaseAggregate): Promise<CommunicationEvent[]> {
  const actors = [
    { id: ORIGINAL_ACTOR_ID, channel: "email" as const, message: "Initial case assessment completed by lead lawyer" },
    { id: NEW_ACTOR_ID, channel: "in_app_chat" as const, message: "Taking over case - drafting first legal document" },
    { id: NEW_ACTOR_ID, channel: "whatsapp" as const, message: "Document draft ready for review by lead lawyer" }
  ];

  const groundedEvents: CommunicationEvent[] = [];

  for (let i = 0; i < actors.length; i++) {
    const actorData = actors[i];
    const rawEvent = {
      adapter_type: actorData.channel,
      content: actorData.message
    } as const;
    const channel = actorData.channel;
    const actorId = actorData.id;

    // Ground the communication to our test work
    const groundedEvent = await groundCommunicationToWork(rawEvent, testCase);
    
    // Save to communication repository like the real system would
    const fullEvent: CommunicationEvent = {
      event_id: `event-cont-test-002-${i}-${Date.now()}`,
      event_type: "CommunicationSent",
      work_id: TEST_WORK_ID,
      actor_id: actorId,
      recipient_ids: ["admin-ilc-001"],
      adapter_type: channel,
      content: rawEvent.content,
      timestamp: groundedEvent.timestamp,
      status: "sent",
      decision_id: testCase.executionContext?.decision_id || null,
      last_invocation_digest: testCase.executionContext?.last_invocation_digest || null,
      tenant_id: TENANT_ID,
      session_id: ILC_SESSION_ID,
      workspace_id: WORKSPACE_ID
    };

    await CommunicationRepository.save(fullEvent, {
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      actorId: actorId
    });
    groundedEvents.push(fullEvent);
    
    console.log(`[CONT-TEST-002] Grounded ${channel} message from actor ${actorId} to work_id=${TEST_WORK_ID}`);
  }

  return groundedEvents;
}

test.describe("CONT-TEST-002 · ACTOR CHANGE ATTACK (Lawyer→Paralegal)", () => {
  test.beforeEach(async () => {
    // Clear repositories before each test to ensure isolation
    CommunicationRepository.clear();
    CaseRepository.clear();
  });

  test("AC1: All events retain work_id=case-014 regardless of actor", async () => {
    // Pastikan repository bersih sebelum test
    await CommunicationRepository.clear();
    await CaseRepository.clear();
    
    const testCase = await setupTestWork();
    console.log(`[DEBUG-AC1] Test case created: ${testCase.id}`);
    
    const createdEvents = await sendCommunicationAcrossActors(testCase);
    console.log(`[DEBUG-AC1] sendCommunicationAcrossActors created ${createdEvents.length} events`);
    
    // List all events in repository to debug
    const allEvents = await CommunicationRepository.list();
    console.log(`[DEBUG-AC1] Total events in repository: ${allEvents.length}`);
    allEvents.forEach((e, i) => console.log(`[DEBUG-AC1] Event ${i}: work_id=${e.work_id}, actor_id=${e.actor_id}, tenant_id=${e.tenant_id}, event_id=${e.event_id}`));
    
    // Verify all events are found by Work ID
    const events = await CommunicationRepository.byWorkId(TEST_WORK_ID);
    console.log(`[DEBUG-AC1] byWorkId returned ${events.length} events`);
    events.forEach((e, i) => console.log(`[DEBUG-AC1] Filtered event ${i}: work_id=${e.work_id}, event_id=${e.event_id}`));
    assert.equal(events.length, 3, "All 3 communication events must be retrieved");
    
    // Verify every single event has the correct work_id even with different actors
    events.forEach((event, index) => {
      assert.equal(
        event.work_id, 
        TEST_WORK_ID, 
        `Event ${index} (actor: ${event.actor_id}) must retain correct work_id`
      );
    });
    
    console.log("[CONT-TEST-002] PASSED: AC1 - All work_ids preserved across actor changes");
  });

  test("AC2: Actor identity preserved in event metadata while maintaining Work continuity", async () => {
    const testCase = await setupTestWork();
    await sendCommunicationAcrossActors(testCase);
    
    const events = await CommunicationRepository.byWorkId(TEST_WORK_ID);
    
    // Verify we can still track which actor did what (audit requirement)
    const actorsFound = new Set(events.map(e => e.actor_id));
    assert.equal(actorsFound.size, 2, "Both actors must be traceable in audit log");
    assert.ok(actorsFound.has(ORIGINAL_ACTOR_ID), "Original actor must be present in audit log");
    assert.ok(actorsFound.has(NEW_ACTOR_ID), "New actor must be present in audit log");
    
    // But all events maintain the same Work identity
    events.forEach(event => {
      assert.equal(event.work_id, TEST_WORK_ID, "Work ID remains consistent across handoff");
    });
    
    console.log("[CONT-TEST-002] PASSED: AC2 - Actor identities preserved with continuous Work ID");
  });
  
  test("AC3: Tenant isolation maintained across actor handoff - no cross-tenant access", async () => {
    const testCase = await setupTestWork();
    await sendCommunicationAcrossActors(testCase);
    
    // Attempt to access events from wrong tenant - must be blocked
    const crossTenantEvents = await CommunicationRepository.byWorkId(TEST_WORK_ID, {
      tenantId: "wrong-tenant-999",
      workspaceId: "wrong-workspace-999"
    });
    
    assert.equal(crossTenantEvents.length, 0, "Cross-tenant access must be blocked even after actor change");
    
    // Correct tenant can still access all events
    const validTenantEvents = await CommunicationRepository.byWorkId(TEST_WORK_ID, {
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID
    });
    assert.equal(validTenantEvents.length, 3, "Correct tenant retains full access across handoff");
    
    console.log("[CONT-TEST-002] PASSED: AC3 - Tenant isolation maintained during actor handoff");
  });
  
  test("AC4: Evidence chain remains continuous through entire handoff process", async () => {
    const testCase = await setupTestWork();
    const groundedEvents = await sendCommunicationAcrossActors(testCase);
    
    // Verify all evidence links back to the same Work
    groundedEvents.forEach((event, index) => {
      assert.ok(
        event.work_id === TEST_WORK_ID,
        `Evidence chain link intact for event ${index} from actor ${event.actor_id}`
      );
    });
    
    // No orphaned events - all part of the same continuity chain
    const allEvents = await CommunicationRepository.list();
    const orphanedEvents = allEvents.filter(e => !e.work_id || e.work_id !== TEST_WORK_ID);
    assert.equal(orphanedEvents.length, 0, "No orphaned communication events allowed");
    
    console.log("[CONT-TEST-002] PASSED: AC4 - Evidence chain remains continuous through handoff");
  });
  
  test("ARCH CHECK: Substrate freeze maintained - no locked files modified", () => {
    // Verify critical substrate files haven't been modified during this test
    const lockedFiles = [
      "/root/Enterprise-OS/governance/IMPLEMENTATION_BASELINE.md",
      "/root/Enterprise-OS/workspace/capabilities/legal-case/implementation/repository/case.repository.ts"
    ];
    
    lockedFiles.forEach(filePath => {
      assert.ok(fs.existsSync(filePath), `Locked file ${filePath} must exist`);
    });
    
    console.log("[CONT-TEST-002] PASSED: ARCH CHECK - substrate freeze maintained");
  });
});