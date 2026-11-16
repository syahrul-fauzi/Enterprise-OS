// @ts-nocheck
import { describe, it, beforeEach, expect } from 'vitest';
import assert from 'node:assert';
import { ACA_WORKFLOW } from '../runtime/workflow-definition.js';
import { WorkInspectionAgent, InspectionRecommendation } from '@capabilities/work-inspection';
import { getWorkRepositoryPostgres, type WorkRepositoryPostgres } from '@capabilities/work-core/implementation/repository/work-postgres.repository';
import type { WorkAggregate } from '@capabilities/work-core/contracts/work.contracts';
import { createWorkId, createTenantId, createWorkspaceId, createSessionId, createActorId, SessionId } from '@capabilities/work-core/contracts/work.contracts';
import { statePath } from '@repo/eos-cli';

// Server-only function - import dynamically inside tests to avoid client bundle issues
let executeWorkflowTransition: typeof import('../../../packages/core/kernel/src/registry/capability-command-registry.js').executeWorkflowTransition;

// Test actors with roles matching ACA workflow requirements (Academic Certification)
// Actor IDs follow executeWorkflowTransition role validation rule: actorId must contain role or end with role-001
const ACTORS = {
  academicAuthor: createActorId("academic-author-001"), // role "academic-author" matches step requirements
  journalReviewer: createActorId("journal-reviewer-001"), // role "journal-reviewer"
  certificationBody: createActorId("certification-body-001"), // role "certification-body"
  authorizedUser: createActorId("authorized-user-001"), // role "authorized-user"
  unauthorizedActor: createActorId("regular-staff-no-roles-001")
};

// Shared test context - use factory functions for all branded types (compliance with @repo/contracts-core)
const TEST_CONTEXT = {
  workId: createWorkId(`aca-work-${Date.now()}`),
  sessionId: createSessionId("session-test-aca-001"),
  tenantId: createTenantId("tenant-enterprise-001"),
  workspaceId: createWorkspaceId("workspace-academic-001")
};

// Initialize shared services
const workRepository: WorkRepositoryPostgres = getWorkRepositoryPostgres();
const inspectionAgent = new WorkInspectionAgent({
  handoffThresholdHours: 24, // Exact threshold from user's requirement
  enableAutomaticNotifications: false
});

describe('ACA-001: Academic Certification Reality Slice', () => {
  beforeEach(async () => {
    // Reset work state before each test
    await workRepository.delete(TEST_CONTEXT.workId);
    // Dynamically import server-only function to avoid bundle issues
    if (!executeWorkflowTransition) {
      const module = await import('../../../packages/core/kernel/src/registry/capability-command-registry.js');
      executeWorkflowTransition = module.executeWorkflowTransition;
    }
  });

  it('A1 - Paper Submission correctly understood, not immediately APPROVED', async () => {
    const result = await executeWorkflowTransition(
      ACA_WORKFLOW,
      'paper-submitted',
      ACTORS.academicAuthor,
      TEST_CONTEXT
    );
    
    expect(result.success).toBe(true);
    expect(result.nextState).toBe('paper-submitted');
    expect(result.isTerminal).toBe(false);
    
    await recordEvidence('A1', { result });
  });

  it('A2 - Journal Review required before certification', async () => {
    await executeWorkflowTransition(
      ACA_WORKFLOW,
      'paper-submitted',
      ACTORS.academicAuthor,
      TEST_CONTEXT
    );
    
    const result = await executeWorkflowTransition(
      ACA_WORKFLOW,
      'certification-approved',
      ACTORS.certificationBody,
      TEST_CONTEXT
    );
    
    expect(result.success).toBe(false);
    expect(result.errors?.some((e: string) => e.includes('journal review'))).toBe(true);
    
    await recordEvidence('A2', { result });
  });

  it('A3 - Certification Body approval required after review', async () => {
    await executeWorkflowTransition(
      ACA_WORKFLOW,
      'paper-submitted',
      ACTORS.academicAuthor,
      TEST_CONTEXT
    );
    
    await executeWorkflowTransition(
      ACA_WORKFLOW,
      'review-completed',
      ACTORS.journalReviewer,
      TEST_CONTEXT
    );
    
    const result = await executeWorkflowTransition(
      ACA_WORKFLOW,
      'certification-approved',
      ACTORS.certificationBody,
      TEST_CONTEXT
    );
    
    expect(result.success).toBe(true);
    expect(result.nextState).toBe('certification-approved');
    
    await recordEvidence('A3', { result });
  });

  it('A4 - Unauthorized actor cannot submit paper', async () => {
    const result = await executeWorkflowTransition(
      ACA_WORKFLOW,
      'paper-submitted',
      ACTORS.unauthorizedActor,
      TEST_CONTEXT
    );
    
    expect(result.success).toBe(false);
    expect(result.errors?.some((e: string) => e.includes('unauthorized'))).toBe(true);
    
    await recordEvidence('A4', { result });
  });
});

/**
 * Helper to persist evidence to the verification ledger
 */
async function recordEvidence(gateId: string, data: any): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const evidenceDir = statePath('evidence', 'aca-001');
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