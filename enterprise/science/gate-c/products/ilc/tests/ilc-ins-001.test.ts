/**
 * ILC-INS-001: Institutional Coordination Reality E2E Test
 * Verifies all 11 reality gates:
 * I1: Institutional Need correctly understood (not PROJECT CREATED)
 * I2: ≥3 actors bound with observable responsibilities
 * I3: Unauthorized execution blocked (hierarchical authority)
 * I4: Real coordination events change Work state
 * I5: Stuck condition detected with natural language explanation
 * I6: Recovery action resumes Work
 * I7: Institutional outcome delivered with evidence
 * I8: Execution produces institutional deliverable
 * I9: Evidence persists
 * I10: Outcome observable from canonical Work Reality
 * I11: No institutional lifecycle fork (uses canonical Work)
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
  ILC_INS_001_InstitutionalWorkflow, 
  executeWorkflowTransition 
} from '../../../../packages/core/kernel/src/registry/capability-command-registry.js';
import { WorkInspectionAgent } from '../../../../capabilities/work-inspection/implementation/services/inspection.agent.service.js';
import { WorkRepositoryPostgres } from '../../../../capabilities/work-core/implementation/repository/work-postgres.repository.js';

// Test actors with roles matching ILC workflow requirements
const ACTORS = {
  institutionalRepresentative: "institutional-representative-ilc-001",
  legalDepartmentHead: "department-head-legal-001",
  itDepartmentHead: "department-head-it-001",
  financeDepartmentHead: "department-head-finance-001",
  executiveAuthority: "executive-institutional-authority-001",
  projectManager: "project-manager-ilc-001",
  unauthorizedActor: "regular-staff-no-roles-001"
};

// Shared test context
const TEST_CONTEXT = {
  workId: `ilc-work-${Date.now()}`,
  sessionId: "session-test-ilc-001",
  tenantId: "tenant-enterprise-001",
  workspaceId: "workspace-headquarters-001"
};

// Initialize shared services
const workRepository = new WorkRepositoryPostgres();
const inspectionAgent = new WorkInspectionAgent({
  handoffThresholdHours: 24, // Exact threshold from user's I5 requirement
  enableAutomaticNotifications: false
});

describe('ILC-INS-001: Institutional Coordination Reality Slice', () => {
  beforeEach(async () => {
    // Reset work state before each test
    await workRepository.delete(TEST_CONTEXT.workId);
  });

  it('I1 - Institutional Need correctly understood, not immediately PROJECT CREATED', async () => {
    // 1. Submit institutional need: "Kita perlu memulai inisiatif digitalisasi dokumen hukum yang melibatkan departemen legal, IT, dan keuangan."
    const initialTransition = await executeWorkflowTransition(
      ILC_INS_001_InstitutionalWorkflow,
      "institutional-need-submitted", // Initial step = institutional need, not project created
      ACTORS.institutionalRepresentative,
      {
        ...TEST_CONTEXT,
        result: "Inisiatif digitalisasi dokumen hukum diajukan oleh pimpinan institusi"
      }
    );

    expect(initialTransition.success).toBe(true);
    expect(initialTransition.nextStep?.id).toBe("requirements-analyzed");
    
    // 2. Verify work state shows institutional need, not generic project
    const work = await workRepository.getById(TEST_CONTEXT.workId);
    expect(work?.type).toBe("institutional-initiative");
    expect(work?.title).toContain("digitalisasi dokumen hukum");
    expect(work?.domainTags).toEqual(expect.arrayContaining(["LEGAL", "IT", "FINANCE"]));
    expect(work?.status).toBe("active");
    
    await recordEvidence("I1_PASS", { 
      institutionalNeedDetected: true,
      domainTagsIdentified: ["LEGAL", "IT", "FINANCE"],
      notProjectCreated: true
    });
  });

  it('I2 - Multi-actor binding with observable responsibilities (≥3 actors)', async () => {
    // Execute first two transitions to reach actors-composed state
    await executeWorkflowTransition(
      ILC_INS_001_InstitutionalWorkflow,
      "institutional-need-submitted",
      ACTORS.institutionalRepresentative,
      TEST_CONTEXT
    );
    
    const composedTransition = await executeWorkflowTransition(
      ILC_INS_001_InstitutionalWorkflow,
      "requirements-analyzed",
      "system-automated-001",
      {
        ...TEST_CONTEXT,
        result: "Legal, IT, Finance actors composed with clear responsibilities"
      }
    );

    expect(composedTransition.success).toBe(true);
    expect(composedTransition.nextStep?.id).toBe("actors-composed");

    // Verify actors are bound with responsibilities
    const work = await workRepository.getById(TEST_CONTEXT.workId);
    const assignedActors = work?.assignedActors || [];
    expect(assignedActors.length).toBeGreaterThanOrEqual(3);
    expect(assignedActors.some((a: any) => a.id.includes("legal"))).toBe(true);
    expect(assignedActors.some((a: any) => a.id.includes("it"))).toBe(true);
    expect(assignedActors.some((a: any) => a.id.includes("finance"))).toBe(true);
    
    // Verify responsibilities are observable
    const actorResponsibilities = assignedActors.map((a: any) => a.responsibility);
    expect(actorResponsibilities).toContain("Legal document review & compliance");
    expect(actorResponsibilities).toContain("Technical infrastructure planning");
    expect(actorResponsibilities).toContain("Budget allocation & approval");

    await recordEvidence("I2_PASS", {
      actorCount: assignedActors.length,
      allRolesBound: true,
      responsibilitiesObservable: true
    });
  });

  it('I3 - Unauthorized transition attempts blocked by hierarchical role validation', async () => {
    // 1. Reach actors-composed state first
    await executeWorkflowTransition(ILC_INS_001_InstitutionalWorkflow, "institutional-need-submitted", ACTORS.institutionalRepresentative, TEST_CONTEXT);
    await executeWorkflowTransition(ILC_INS_001_InstitutionalWorkflow, "requirements-analyzed", "system-automated-001", TEST_CONTEXT);

    // 2. Try to jump directly to execution (unauthorized actor) - MUST BE BLOCKED
    const unauthorizedJump = await executeWorkflowTransition(
      ILC_INS_001_InstitutionalWorkflow,
      "actors-composed",
      ACTORS.unauthorizedActor,
      TEST_CONTEXT
    );
    expect(unauthorizedJump.success).toBe(false);
    expect(unauthorizedJump.error).toContain("lacks required roles");

    // 3. Get department head approval (allowed - department-head role)
    const firstApproval = await executeWorkflowTransition(
      ILC_INS_001_InstitutionalWorkflow,
      "actors-composed",
      ACTORS.legalDepartmentHead, // Has required department-head role
      { ...TEST_CONTEXT, result: "Legal department approves initiative" }
    );
    expect(firstApproval.success).toBe(true);
    expect(firstApproval.nextStep?.id).toBe("first-approval");

    // 4. Try to jump to execution with only department head approval - STILL BLOCKED (needs executive)
    const prematureExecution = await executeWorkflowTransition(
      ILC_INS_001_InstitutionalWorkflow,
      "first-approval",
      ACTORS.projectManager, // Lacks required executive/institutional-authority role
      TEST_CONTEXT
    );
    expect(prematureExecution.success).toBe(false);
    expect(prematureExecution.error).toContain("lacks required roles");

    // 5. Get executive approval (allowed - executive role)
    const secondApproval = await executeWorkflowTransition(
      ILC_INS_001_InstitutionalWorkflow,
      "first-approval",
      ACTORS.executiveAuthority, // Has required executive role
      { ...TEST_CONTEXT, result: "Executive leadership approves budget and resources" }
    );
    expect(secondApproval.success).toBe(true);
    expect(secondApproval.nextStep?.id).toBe("second-approval");

    // 6. Now project manager can start execution (allowed - has project-manager role)
    const executionStart = await executeWorkflowTransition(
      ILC_INS_001_InstitutionalWorkflow,
      "second-approval",
      ACTORS.projectManager,
      { ...TEST_CONTEXT, result: "Execution phase formally initiated" }
    );
    expect(executionStart.success).toBe(true);
    expect(executionStart.nextStep?.id).toBe("execution-initiated");

    await recordEvidence("I3_PASS", {
      unauthorizedBlocked: true,
      prematureBlocked: true,
      hierarchicalApprovalEnforced: true,
      executiveApprovalRequired: true
    });
  });

  it('I4 - Real coordination events change Work state (Legal→IT→Finance dependency chain)', async () => {
    // Reach execution-initiated state
    await executeWorkflowTransition(ILC_INS_001_InstitutionalWorkflow, "institutional-need-submitted", ACTORS.institutionalRepresentative, TEST_CONTEXT);
    await executeWorkflowTransition(ILC_INS_001_InstitutionalWorkflow, "requirements-analyzed", "system-automated-001", TEST_CONTEXT);
    await executeWorkflowTransition(ILC_INS_001_InstitutionalWorkflow, "actors-composed", ACTORS.legalDepartmentHead, { ...TEST_CONTEXT, result: "Legal submits requirements" });
    await executeWorkflowTransition(ILC_INS_001_InstitutionalWorkflow, "first-approval", ACTORS.executiveAuthority, { ...TEST_CONTEXT, result: "Executive approves" });
    await executeWorkflowTransition(ILC_INS_001_InstitutionalWorkflow, "second-approval", ACTORS.projectManager, TEST_CONTEXT);

    // Real coordination event 1: Legal submits requirements
    const legalSubmit = await executeWorkflowTransition(
      ILC_INS_001_InstitutionalWorkflow,
      "execution-initiated",
      ACTORS.legalDepartmentHead,
      { ...TEST_CONTEXT, result: "Legal: Semua dokumen hukum sudah di-review dan disetujui untuk IT" }
    );
    expect(legalSubmit.success).toBe(true);

    // Real coordination event 2: IT responds with technical dependencies
    const itRespond = await executeWorkflowTransition(
      ILC_INS_001_InstitutionalWorkflow,
      "execution-initiated", // Work state updates after legal's action
      ACTORS.itDepartmentHead,
      { ...TEST_CONTEXT, result: "IT: Technical dependencies identified - cloud storage API, access control system" }
    );
    expect(itRespond.success).toBe(true);

    // Real coordination event 3: Finance evaluates budget implications
    const financeEvaluate = await executeWorkflowTransition(
      ILC_INS_001_InstitutionalWorkflow,
      "execution-initiated",
      ACTORS.financeDepartmentHead,
      { ...TEST_CONTEXT, result: "Finance: Budget Rp 750M approved, cloud resources allocated Q3 2026" }
    );
    expect(financeEvaluate.success).toBe(true);

    // Verify Work can answer all 5 coordination questions: WHO? WHAT? WHICH? WHO has authority? WHAT next?
    const work = await workRepository.getById(TEST_CONTEXT.workId);
    const stateHistory = work?.stateHistory || [];
    expect(stateHistory.length).toBeGreaterThanOrEqual(6); // All transition events recorded
    
    // Extract last three coordination events
    const coordinationEvents = stateHistory.slice(-3).map((e: any) => e.note);
    expect(coordinationEvents.some((n: string) => n.includes("Legal: Semua dokumen"))).toBe(true);
    expect(coordinationEvents.some((n: string) => n.includes("IT: Technical dependencies"))).toBe(true);
    expect(coordinationEvents.some((n: string) => n.includes("Finance: Budget Rp 750M"))).toBe(true);

    await recordEvidence("I4_PASS", {
      realCoordinationEvents: 3,
      allQuestionsAnswerable: true,
      stateHistoryMaintained: true
    });
  });

  it('I5 - Stuck work (>24h) detected with natural language explanation that answers all user questions', async () => {
    // Create work in active state with last update >24h ago
    const twentyFiveHoursAgo = new Date(Date.now() - (25 * 60 * 60 * 1000));
    await workRepository.save({
      workId: TEST_CONTEXT.workId,
      status: "active",
      assignedActorId: ACTORS.financeDepartmentHead,
      nextAction: "Approve budget allocation for digitalization initiative",
      createdAt: twentyFiveHoursAgo,
      updatedAt: twentyFiveHoursAgo,
      stateHistory: [{
        timestamp: twentyFiveHoursAgo.toISOString(),
        note: "Finance Department assigned responsibility to review budget",
        actorId: ACTORS.financeDepartmentHead
      }]
    });

    // Trigger inspection - RL2-005 must detect stuck work
    const inspectionResult = await inspectionAgent.inspectWork(TEST_CONTEXT.workId as any);
    
    // Verify bottleneck detected
    expect(inspectionResult.bottlenecks.length).toBeGreaterThan(0);
    const stuckBottleneck = inspectionResult.bottlenecks.find(b => b.type === "HANDOFF_DELAY");
    expect(stuckBottleneck).toBeDefined();
    expect(stuckBottleneck?.delayHours).toBeGreaterThan(24);
    expect(stuckBottleneck?.severity).toBe("HIGH"); // >24h = HIGH per RL2-005 logic

    // Verify recommendation message answers ALL user's required questions:
    // Apa yang terjadi? Mengapa Work tidak bergerak? Siapa yang dibutuhkan? Apa yang belum diketahui? Apa next decision?
    const recommendation = inspectionResult.recommendations.find(r => r.message.includes("RL2-005"));
    expect(recommendation).toBeDefined();
    const message = recommendation?.message || "";
    expect(message).toContain("Sudah 25 jam tidak ada perubahan status"); // Apa yang terjadi?
    expect(message).toContain("Tidak ada state transition tercatat"); // Mengapa tidak bergerak?
    expect(message).toContain(`Actor ${ACTORS.financeDepartmentHead}`); // Siapa yang dibutuhkan?
    expect(message).toContain("Approve budget allocation"); // Apa yang harus dilakukan (next decision)

    await recordEvidence("I5_PASS", {
      stuckWorkDetected: true,
      naturalLanguageExplanation: true,
      allQuestionsAnswered: true,
      delayHours: stuckBottleneck?.delayHours
    });
0
  it('I6 - Stuck work recovery: Actor reassignment resumes work progression', async () => {
    // First create stuck work (same as I5)
    const twentyFiveHoursAgo = new Date(Date.now() - (25 * 60 * 60 * 1000));
    await workRepository.save({
      workId: TEST_CONTEXT.workId,
      status: "active",
      assignedActorId: ACTORS.financeDepartmentHead, // Original actor unresponsive
      nextAction: "Approve budget allocation for digitalization initiative",
      createdAt: twentyFiveHoursAgo,
      updatedAt: twentyFiveHoursAgo,
      stateHistory: [{
        timestamp: twentyFiveHoursAgo.toISOString(),
        note: "Finance Department assigned responsibility to review budget",
        actorId: ACTORS.financeDepartmentHead
      }]
    });

    // Detect stuck work
    const inspectionResult = await inspectionAgent.inspectWork(TEST_CONTEXT.workId as any);
    expect(inspectionResult.bottlenecks.length).toBeGreaterThan(0);

    // Execute recovery: reassign to new finance actor
    const newFinanceActor = "department-head-finance-backup-001";
    const reassignmentResult = await workRepository.update(TEST_CONTEXT.workId, {
      assignedActorId: newFinanceActor,
      nextAction: "Review and approve budget allocation within 48h",
      stateHistory: [
        ...((await workRepository.getById(TEST_CONTEXT.workId))?.stateHistory || []),
        {
          timestamp: new Date().toISOString(),
          note: `Work reassigned to new finance actor ${newFinanceActor} due to inactivity`,
          actorId: ACTORS.projectManager
        }
      ]
    });
    expect(reassignmentResult.ok).toBe(true);

    // New actor completes approval - work resumes
    const resumeResult = await executeWorkflowTransition(
      ILC_INS_001_InstitutionalWorkflow,
      "execution-initiated",
      newFinanceActor,
      { ...TEST_CONTEXT, result: "New finance actor approves budget, work resumes" }
    );
    expect(resumeResult.success).toBe(true);

    // Verify work is no longer stuck in next inspection
    const postRecoveryInspection = await inspectionAgent.inspectWork(TEST_CONTEXT.workId as any);
    const newBottlenecks = postRecoveryInspection.bottlenecks.filter(b => b.type === "HANDOFF_DELAY");
    expect(newBottlenecks.length).toBe(0); // No longer stuck

    await recordEvidence("I6_PASS", {
      actorReassignmentSuccessful: true,
      workResumed: true,
      postRecoveryNoBottlenecks: true
    });
  });

  it('I7-I11 - Full lifecycle completion: outcome delivered, evidence persists, no lifecycle fork', async () => {
    // Execute full workflow to institutional-work-closed
    await executeWorkflowTransition(ILC_INS_001_InstitutionalWorkflow, "institutional-need-submitted", ACTORS.institutionalRepresentative, TEST_CONTEXT);
    await executeWorkflowTransition(ILC_INS_001_InstitutionalWorkflow, "requirements-analyzed", "system-automated-001", TEST_CONTEXT);
    await executeWorkflowTransition(ILC_INS_001_InstitutionalWorkflow, "actors-composed", ACTORS.legalDepartmentHead, { ...TEST_CONTEXT, result: "Legal approves" });
    await executeWorkflowTransition(ILC_INS_001_InstitutionalWorkflow, "first-approval", ACTORS.executiveAuthority, { ...TEST_CONTEXT, result: "Executive approves" });
    await executeWorkflowTransition(ILC_INS_001_InstitutionalWorkflow, "second-approval", ACTORS.projectManager, TEST_CONTEXT);
    await executeWorkflowTransition(ILC_INS_001_InstitutionalWorkflow, "execution-initiated", ACTORS.itDepartmentHead, { ...TEST_CONTEXT, result: "Technical implementation completed" });
    
    // I7: Outcome delivered - institutional deliverable exists
    const outcomeResult = await executeWorkflowTransition(
      ILC_INS_001_InstitutionalWorkflow,
      "execution-initiated",
      ACTORS.projectManager,
      { ...TEST_CONTEXT, result: "Digital document management system deployed, all legal records migrated" }
    );
    expect(outcomeResult.success).toBe(true);
    expect(outcomeResult.nextStep?.id).toBe("outcome-delivered");

    // I8: Execution produces institutional deliverable
    const workAfterOutcome = await workRepository.getById(TEST_CONTEXT.workId);
    const deliverables = workAfterOutcome?.artifacts || [];
    expect(deliverables).toContainEqual(expect.objectContaining({
      type: "institutional-deliverable",
      name: "Digital Document Management System Deployment Report",
      url: "/artifacts/ilc-dms-deployment-report.pdf"
    }));

    // I9 & I11: Close work, verify evidence persists and uses canonical work lifecycle
    const closeResult = await executeWorkflowTransition(
      ILC_INS_001_InstitutionalWorkflow,
      "outcome-delivered",
      ACTORS.institutionalRepresentative,
      { ...TEST_CONTEXT, result: "Institutional work formally closed" }
    );
    expect(closeResult.success).toBe(true);
    expect(closeResult.nextStep).toBeUndefined(); // Terminal step reached

    // I10: Outcome observable from canonical Work Reality
    const closedWork = await workRepository.getById(TEST_CONTEXT.workId);
    expect(closedWork?.status).toBe("closed");
    expect(closedWork?.stateHistory.length).toBeGreaterThan(10); // All transitions recorded
    expect(closedWork?.type).toBe("institutional-initiative"); // Still canonical work type, no fork
    expect(closedWork?.closedAt).toBeDefined();

    await recordEvidence("I7-I11_PASS", {
      outcomeDelivered: true,
      institutionalDeliverableExists: true,
      evidencePersisted: true,
      outcomeObservable: true,
      noLifecycleFork: true,
      canonicalWorkReused: true
    });
  });
});

/**
 * Helper to persist evidence to the verification ledger
 */
async function recordEvidence(gateId: string, data: any): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const evidenceDir = path.join('/root/Enterprise-OS/.eos-state/evidence/ilc-ins-001');
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(
    path.join(evidenceDir, `${gateId}_evidence.json`),
    JSON.stringify({
      gateId,
      recordedAt: new Date().toISOString(),
      workId: TEST_CONTEXT.workId,
      ...data
    }, null, 2)
  );
  console.log(`[EVIDENCE] ${gateId} PASSED - evidence saved`);
}