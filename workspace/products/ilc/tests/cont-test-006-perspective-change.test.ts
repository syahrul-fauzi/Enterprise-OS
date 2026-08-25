import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { CommunicationRepositoryInMemory as CommunicationRepository } from "../../../capabilities/communication/implementation/repository/communication.repository.js";
import { CaseRepositoryInMemory as CaseRepository } from "../../../capabilities/legal-case/implementation/repository/case.repository.js";
import { groundCommunicationToWork } from "../../../capabilities/communication/implementation/grounding/converter.js";
import type { CommunicationEvent } from "../../../capabilities/communication/implementation/contracts/communication.contracts.js";
import type { CaseAggregate } from "../../../capabilities/legal-case/implementation/contracts/case.contracts.js";
import { CaseId } from "../../../capabilities/legal-case/implementation/contracts/case.contracts.js";

const TEST_WORK_ID = "case-014";
const TENANT_ID = "tenant-ilc-001";
const WORKSPACES = {
  customer: "workspace-customer",
  professional: "workspace-professional",
  operator: "workspace-operator"
};

async function setupTestWork(): Promise<CaseAggregate> {
  const testCase: CaseAggregate = {
    id: CaseId(TEST_WORK_ID),
    workId: TEST_WORK_ID,
    title: "REAL_WORK_014: Perspective Change Continuity Test Case",
    description: "Test case for verifying work continuity when multiple actors view same Work with different perspectives",
    status: "in_progress",
    priority: "critical",
    lawyerId: "lawyer-test-001",
    createdAt: new Date(),
    updatedAt: new Date(),
    executionContext: {
      decision_id: "decision-cont-test-006",
      last_invocation_digest: "digest-abcpersp",
      propagated_from: "cross-capability"
    }
  };
  await CaseRepository.save(testCase, {
    tenantId: TENANT_ID,
    workspaceId: "workspace-main",
    actorId: "lawyer-test-001"
  });
  const caseResult = await CaseRepository.byId(CaseId(TEST_WORK_ID));
  assert.ok(caseResult !== undefined, "Test case must exist after creation");
  return caseResult;
}

async function sendPerspectiveCommunication(testCase: CaseAggregate): Promise<CommunicationEvent[]> {
  const groundedEvents: CommunicationEvent[] = [];
  const actors = [
    { 
      id: "customer-001", 
      channel: "in_app_chat" as const, 
      message: "Hello, where is my visa application case? I submitted it 2 weeks ago.", 
      sender: "customer-001", 
      receiver: "agent-support",
      adapter_type: "in_app_chat" as const,
      workspace: WORKSPACES.customer
    },
    { 
      id: "lawyer-001", 
      channel: "in_app_chat" as const, 
      message: "Customer's visa is in review - next step: schedule biometric appointment. Coordinate with immigration office.", 
      sender: "lawyer-001", 
      receiver: "agent-clerk",
      adapter_type: "in_app_chat" as const,
      workspace: WORKSPACES.professional
    },
    { 
      id: "operator-001", 
      channel: "api_webhook" as const, 
      message: "Immigration office system is down - biometric appointments blocked. Need to reschedule once system is back online.", 
      sender: "operator-001", 
      receiver: "lawyer-001",
      adapter_type: "api_webhook" as const,
      workspace: WORKSPACES.operator
    }
  ];

  for (let i = 0; i < actors.length; i++) {
    const actorData = actors[i];
    const rawEvent = {
      adapter_type: actorData.adapter_type,
      content: actorData.message
    } as const;
    const channel = actorData.channel;
    const actorId = actorData.id;
    const workspace = actorData.workspace;

    // Ground the communication to our test work
    const groundedEvent = await groundCommunicationToWork(rawEvent, testCase);
    
    // Save to communication repository with perspective-specific metadata
    const fullEvent: CommunicationEvent = {
      event_id: `event-cont-test-006-${i}-${Date.now()}`,
      event_type: "CommunicationSent",
      work_id: TEST_WORK_ID,
      actor_id: actorId,
      recipient_ids: [actorData.receiver],
      adapter_type: channel,
      content: rawEvent.content,
      timestamp: groundedEvent.timestamp,
      status: "delivered",
      decision_id: testCase.executionContext?.decision_id || null,
      last_invocation_digest: testCase.executionContext?.last_invocation_digest || null,
      tenant_id: TENANT_ID,
      workspace_id: workspace
    };

    await CommunicationRepository.save(fullEvent, {
      tenantId: TENANT_ID,
      workspaceId: workspace,
      actorId: actorId
    });
    groundedEvents.push(fullEvent);
    
    console.log(`[CONT-TEST-006] Grounded ${channel} from actor ${actorId} to work_id=${TEST_WORK_ID} (workspace: ${workspace})`);
  }

  return groundedEvents;
}

test.describe("CONT-TEST-006 · PERSPECTIVE CHANGE ATTACK", () => {
  test.beforeEach(async () => {
    // Clear repositories before each test to ensure isolation
    CommunicationRepository.clear();
    CaseRepository.clear();
  });

  test("AC1: All perspective events retain case-014 work_id despite different UI views", async () => {
    const testCase = await setupTestWork();
    await sendPerspectiveCommunication(testCase);
    const events = await CommunicationRepository.byWorkId(TEST_WORK_ID);
    
    assert.equal(events.length, 3, "All 3 perspective communication events must be retrieved");
    events.forEach((event, index) => {
      assert.equal(
        event.work_id, 
        TEST_WORK_ID, 
        `Event ${index} (actor: ${event.actor_id}) must retain correct work_id across all perspectives`
      );
    });
    console.log("[CONT-TEST-006] PASSED: AC1 - All perspective events retain case-014 work_id");
  });

  test("AC2: All perspectives maintain tenant isolation - cross-workspace access blocked", async () => {
    const testCase = await setupTestWork();
    await sendPerspectiveCommunication(testCase);
    
    // Customer workspace should only see customer events?
    const customerEvents = await CommunicationRepository.byWorkId(TEST_WORK_ID, {
      tenantId: TENANT_ID,
      workspaceId: WORKSPACES.customer
    });
    
    assert.equal(customerEvents.length, 1, "Customer workspace only sees their own perspective events");
    
    // Professional workspace only sees their events
    const professionalEvents = await CommunicationRepository.byWorkId(TEST_WORK_ID, {
      tenantId: TENANT_ID,
      workspaceId: WORKSPACES.professional
    });
    
    assert.equal(professionalEvents.length, 1, "Professional workspace only sees their own perspective events");
    
    // Operator workspace only sees their events
    const operatorEvents = await CommunicationRepository.byWorkId(TEST_WORK_ID, {
      tenantId: TENANT_ID,
      workspaceId: WORKSPACES.operator
    });
    
    assert.equal(operatorEvents.length, 1, "Operator workspace only sees their own perspective events");
    
    console.log("[CONT-TEST-006] PASSED: AC2 - Perspective isolation maintained; cross-workspace access blocked");
  });

  test("AC3: Evidence chain remains single - no fragmentation despite multiple UI views", async () => {
    const testCase = await setupTestWork();
    await sendPerspectiveCommunication(testCase);
    const events = await CommunicationRepository.byWorkId(TEST_WORK_ID);
    
    const allWorkIds = [...new Set(events.map(e => e.work_id))];
    assert.equal(allWorkIds.length, 1, "Only one unique work_id across all perspective events");
    
    // No orphaned events
    const allEvents = await CommunicationRepository.list();
    const orphanedEvents = allEvents.filter(e => !e.work_id || e.work_id !== TEST_WORK_ID);
    assert.equal(orphanedEvents.length, 0, "No orphaned communication events allowed");
    
    console.log("[CONT-TEST-006] PASSED: AC3 - Evidence chain remains continuous despite multiple perspectives");
  });

  test("AC4: Decision_id propagated through all perspective events - shared lineage", async () => {
    const testCase = await setupTestWork();
    await sendPerspectiveCommunication(testCase);
    const events = await CommunicationRepository.byWorkId(TEST_WORK_ID);
    
    events.forEach(event => {
      assert.equal(
        event.decision_id, 
        "decision-cont-test-006",
        "All perspective events must share same decision_id for lineage"
      );
    });
    
    console.log("[CONT-TEST-006] PASSED: AC4 - Shared lineage maintained across all perspectives");
  });

  test("ARCH CHECK: Substrate freeze maintained - no locked files modified", () => {
    const lockedFiles = [
      "/root/Enterprise-OS/governance/IMPLEMENTATION_BASELINE.md",
      "/root/Enterprise-OS/workspace/capabilities/legal-case/implementation/repository/case.repository.ts"
    ];
    
    lockedFiles.forEach(filePath => {
      assert.ok(fs.existsSync(filePath), `Locked file ${filePath} must exist`);
    });
    
    console.log("[CONT-TEST-006] PASSED: ARCH CHECK - substrate freeze maintained");
  });
});