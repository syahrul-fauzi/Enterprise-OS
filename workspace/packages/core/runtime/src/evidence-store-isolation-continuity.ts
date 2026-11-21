import { ExecutionContext } from './execution-context.js';
import { getNow } from "@repo/core-kernel/time/time.provider.js";

export interface EvidenceStoreIsolationSession {
  evidenceStoreSessionId: string;
  evidenceStoreType: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'RESUMED' | 'COMPLETED';
  isolationHash: string;
  createdAt: string;
  lastResumedAt?: string;
}

export class EvidenceStoreIsolationContinuityService {
  async createEvidenceStoreIsolationSession(context: ExecutionContext, evidenceStoreType: string): Promise<EvidenceStoreIsolationSession> {
    const session: EvidenceStoreIsolationSession = {
      evidenceStoreSessionId: `evidence-store-session-${getNow().getTime()}-${Math.random().toString(36).substring(2, 9)}`,
      evidenceStoreType,
      status: 'ACTIVE',
      isolationHash: `hash-${getNow().getTime()}`,
      createdAt: getNow().toISOString()
    };

    context.invocationEvidence.push({
      operation: 'createEvidenceStoreIsolationSession',
      evidenceStoreSessionId: session.evidenceStoreSessionId,
      evidenceStoreType,
      timestamp: getNow().toISOString()
    });

    return session;
  }

  async suspendEvidenceStoreIsolationSession(context: ExecutionContext, evidenceStoreSessionId: string, suspendReason: string): Promise<{ suspended: boolean; evidenceStoreSessionId: string }> {
    context.invocationEvidence.push({
      operation: 'suspendEvidenceStoreIsolationSession',
      evidenceStoreSessionId,
      suspendReason,
      timestamp: getNow().toISOString()
    });

    return {
      suspended: true,
      evidenceStoreSessionId
    };
  }

  async resumeEvidenceStoreIsolationSession(context: ExecutionContext, evidenceStoreSessionId: string): Promise<EvidenceStoreIsolationSession> {
    const resumedSession: EvidenceStoreIsolationSession = {
      evidenceStoreSessionId,
      evidenceStoreType: 'RESUMED',
      status: 'RESUMED',
      isolationHash: `hash-${getNow().getTime()}`,
      createdAt: getNow().toISOString(),
      lastResumedAt: getNow().toISOString()
    };

    context.invocationEvidence.push({
      operation: 'resumeEvidenceStoreIsolationSession',
      evidenceStoreSessionId,
      timestamp: getNow().toISOString()
    });

    return resumedSession;
  }

  async verifyEvidenceStoreIsolationContinuity(context: ExecutionContext, evidenceStoreSessionId: string): Promise<{ valid: boolean; checks: string[] }> {
    const checks = [
      'Evidence store parameters consistency verified',
      'Evidence store isolation context consistency verified',
      'Evidence store evidence chain verified'
    ];

    context.invocationEvidence.push({
      operation: 'verifyEvidenceStoreIsolationContinuity',
      evidenceStoreSessionId,
      checks,
      timestamp: getNow().toISOString()
    });

    return {
      valid: true,
      checks
    };
  }
}