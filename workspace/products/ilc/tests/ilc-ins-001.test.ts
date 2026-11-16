// @ts-nocheck
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { executeWorkflowTransition } from '@repo/core-kernel';
import { ILC_WORKFLOW } from '../runtime/workflow-definition.js';
import { WorkInspectionAgent } from '@capabilities/work-inspection';
import { getWorkRepositoryPostgres, type WorkRepositoryPostgres } from '@capabilities/work-core/implementation/repository/work-postgres.repository';
import type { BaseWorkAggregateSchema, WorkId, ActorId } from '@capabilities/work-core/contracts/work.contracts';
import { InspectionRecommendation } from '@capabilities/work-inspection';
import { checkAutonomyBoundary } from '@capabilities/work-core/implementation/utils/boundary-checks.utils.js';
import type { AutonomyBoundaryCheck } from '@capabilities/work-core/implementation/utils/boundary-checks.types.js';
import { statePath } from '@repo/eos-cli';

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
const workRepository: WorkRepositoryPostgres = getWorkRepositoryPostgres();
const inspectionAgent = new WorkInspectionAgent({
  handoffThresholdHours: 24, // Exact threshold from user's I5 requirement
  enableAutomaticNotifications: false
});

describe('ILC-INS-001: Institutional Coordination Reality Slice', () => {
  beforeEach(async () => {
    // Reset work state before each test
    await workRepository.delete(WorkId(TEST_CONTEXT.workId));
  });

  it('I1 - Institutional Need correctly understood, not immediately PROJECT CREATED', async () => {
    const result = await executeWorkflowTransition(
      ILC_WORKFLOW,
      'institutional-need-submitted',
      ACTORS.institutionalRepresentative,
      TEST_CONTEXT
    );
    
    assert.ok(result.success, "Transition should succeed");
    assert.equal(result.nextState, 'institutional-need-submitted', "Should remain in institutional-need-submitted state");
    assert.equal(result.isTerminal, false, "Should not be terminal state");
    
    const boundaryCheck = checkAutonomyBoundary(result.workAggregate);
    assert.equal(boundaryCheck.isWithinBoundary, true, "Should be within autonomy boundary");
    
    await recordEvidence('I1', { result, boundaryCheck });
  });

  it('I2 - Legal Review required before project approval', async () => {
    // First transition to institutional-need-submitted
    await executeWorkflowTransition(
      ILC_WORKFLOW,
      'institutional-need-submitted',
      ACTORS.institutionalRepresentative,
      TEST_CONTEXT
    );
    
    // Try to transition directly to project-approved - should fail
    const result = await executeWorkflowTransition(
      ILC_WORKFLOW,
      'project-approved',
      ACTORS.executiveAuthority,
      TEST_CONTEXT
    );
    
    assert.equal(result.success, false, "Should fail without legal review");
    assert.ok(result.errors?.some((e: string) => e.includes('legal review')), "Should mention legal review requirement");
    
    await recordEvidence('I2', { result });
  });

  it('I3 - IT Review required before project approval', async () => {
    // First transition through required steps
    await executeWorkflowTransition(
      ILC_WORKFLOW,
      'institutional-need-submitted',
      ACTORS.institutionalRepresentative,
      TEST_CONTEXT
    );
    
    await executeWorkflowTransition(
      ILC_WORKFLOW,
      'legal-review-completed',
      ACTORS.legalDepartmentHead,
      TEST_CONTEXT
    );
    
    // Try to transition directly to project-approved without IT review
    const result = await executeWorkflowTransition(
      ILC_WORKFLOW,
      'project-approved',
      ACTORS.executiveAuthority,
      TEST_CONTEXT
    );
    
    assert.equal(result.success, false, "Should fail without IT review");
    assert.ok(result.errors?.some((e: string) => e.includes('IT review')), "Should mention IT review requirement");
    
    await recordEvidence('I3', { result });
  });

  it('I4 - Finance Review required before project approval', async () => {
    // First transition through required steps
    await executeWorkflowTransition(
      ILC_WORKFLOW,
      'institutional-need-submitted',
      ACTORS.institutionalRepresentative,
      TEST_CONTEXT
    );
    
    await executeWorkflowTransition(
      ILC_WORKFLOW,
      'legal-review-completed',
      ACTORS.legalDepartmentHead,
      TEST_CONTEXT
    );
    
    await executeWorkflowTransition(
      ILC_WORKFLOW,
      'it-review-completed',
      ACTORS.itDepartmentHead,
      TEST_CONTEXT
    );
    
    // Try to transition directly to project-approved without finance review
    const result = await executeWorkflowTransition(
      ILC_WORKFLOW,
      'project-approved',
      ACTORS.executiveAuthority,
      TEST_CONTEXT
    );
    
    assert.equal(result.success, false, "Should fail without finance review");
    assert.ok(result.errors?.some((e: string) => e.includes('finance review')), "Should mention finance review requirement");
    
    await recordEvidence('I4', { result });
  });

  it('I5 - All reviews completed allows project approval with 24h handoff threshold', async () => {
    // Transition through all required steps
    await executeWorkflowTransition(
      ILC_WORKFLOW,
      'institutional-need-submitted',
      ACTORS.institutionalRepresentative,
      TEST_CONTEXT
    );
    
    await executeWorkflowTransition(
      ILC_WORKFLOW,
      'legal-review-completed',
      ACTORS.legalDepartmentHead,
      TEST_CONTEXT
    );
    
    await executeWorkflowTransition(
      ILC_WORKFLOW,
      'it-review-completed',
      ACTORS.itDepartmentHead,
      TEST_CONTEXT
    );
    
    await executeWorkflowTransition(
      ILC_WORKFLOW,
      'finance-review-completed',
      ACTORS.financeDepartmentHead,
      TEST_CONTEXT
    );
    
    // Now project approval should succeed
    const result = await executeWorkflowTransition(
      ILC_WORKFLOW,
      'project-approved',
      ACTORS.executiveAuthority,
      TEST_CONTEXT
    );
    
    assert.ok(result.success, "Project approval should succeed with all reviews completed");
    assert.equal(result.nextState, 'project-approved', "Should transition to project-approved state");
    
    // Check handoff threshold
    const recommendation = inspectionAgent.evaluateHandoff(result.workAggregate);
    assert.equal(recommendation.thresholdHours, 24, "Handoff threshold should be 24 hours");
    
    await recordEvidence('I5', { result, recommendation });
  });

  it('I6 - Unauthorized actor cannot perform transitions', async () => {
    const result = await executeWorkflowTransition(
      ILC_WORKFLOW,
      'institutional-need-submitted',
      ACTORS.unauthorizedActor,
      TEST_CONTEXT
    );
    
    assert.equal(result.success, false, "Unauthorized actor should not be able to transition");
    assert.ok(result.errors?.some((e: string) => e.includes('unauthorized')), "Should mention unauthorized access");
    
    await recordEvidence('I6', { result });
  });
});

/**
 * Helper to persist evidence to the verification ledger
 */
async function recordEvidence(gateId: string, data: any): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const evidenceDir = statePath('evidence', 'ilc-ins-001');
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