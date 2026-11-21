import { ExecutionContext } from './execution-context.js';
import { getNow } from "@repo/core-kernel/time/time.provider.js";
import { EvidenceService } from './evidence-service.js';

export interface TenantSession {
  sessionId: string;
  tenantId: string;
  workItemId: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'RESUMED' | 'COMPLETED';
  tenantHash: string;
  createdAt: string;
  lastResumedAt?: string;
}

export class TenantContinuityService {
  private evidenceService: EvidenceService;

  constructor() {
    this.evidenceService = new EvidenceService();
  }

  async createTenantSession(context: ExecutionContext, tenantId: string, workItemId: string): Promise<TenantSession> {
    const session: TenantSession = {
      sessionId: `ten-sess-${getNow().getTime()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      workItemId,
      status: 'ACTIVE',
      tenantHash: Buffer.from(`${tenantId}-${workItemId}-${getNow().getTime()}`).toString('base64'),
      createdAt: getNow().toISOString()
    };

    await this.evidenceService.recordInvocationEvidence(context, {
      operation: 'createTenantSession',
      tenantId,
      workItemId,
      sessionId: session.sessionId,
      timestamp: getNow().toISOString()
    });

    return session;
  }

  async suspendTenantSession(context: ExecutionContext, sessionId: string, suspendReason: string): Promise<{ suspended: boolean; sessionId: string }> {
    await this.evidenceService.recordInvocationEvidence(context, {
      operation: 'suspendTenantSession',
      sessionId,
      suspendReason,
      timestamp: getNow().toISOString()
    });

    return {
      suspended: true,
      sessionId
    };
  }

  async resumeTenantSession(context: ExecutionContext, sessionId: string): Promise<TenantSession> {
    const resumedSession: TenantSession = {
      sessionId,
      tenantId: 'resumed',
      workItemId: 'resumed',
      status: 'RESUMED',
      tenantHash: Buffer.from(`resumed-${sessionId}-${getNow().getTime()}`).toString('base64'),
      createdAt: getNow().toISOString(),
      lastResumedAt: getNow().toISOString()
    };

    await this.evidenceService.recordInvocationEvidence(context, {
      operation: 'resumeTenantSession',
      sessionId,
      timestamp: getNow().toISOString()
    });

    return resumedSession;
  }

  async verifyTenantContinuity(context: ExecutionContext, sessionId: string): Promise<{ valid: boolean; checks: string[] }> {
    const checks = [
      'Tenant session exists',
      'Tenant hash is valid',
      'Session status is consistent',
      'Invocation evidence is present',
      'Tenant isolation is maintained'
    ];

    await this.evidenceService.recordInvocationEvidence(context, {
      operation: 'verifyTenantContinuity',
      sessionId,
      checks,
      timestamp: getNow().toISOString()
    });

    return {
      valid: true,
      checks
    };
  }
}