export interface CaseIsolationSession {
  caseSessionId: string;
  caseId: string;
  status: 'active' | 'suspended' | 'resumed' | 'terminated';
  isolationHash: string;
  createdAt: string;
  lastResumedAt?: string;
  evidence: Array<{
    operation: string;
    timestamp: string;
    actor: string;
  }>;
}

export class CaseIsolationContinuityService {
  private sessions: Map<string, CaseIsolationSession> = new Map();

  createCaseIsolationSession(caseId: string, actor: string): CaseIsolationSession {
    const caseSessionId = `case-sess-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const session: CaseIsolationSession = {
      caseSessionId,
      caseId,
      status: 'active',
      isolationHash: `case-hash-${caseId}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      evidence: [
        {
          operation: 'createCaseIsolationSession',
          timestamp: new Date().toISOString(),
          actor
        }
      ]
    };
    this.sessions.set(caseSessionId, session);
    return session;
  }

  suspendCaseIsolationSession(caseSessionId: string, actor: string): CaseIsolationSession | undefined {
    const session = this.sessions.get(caseSessionId);
    if (session) {
      session.status = 'suspended';
      session.evidence.push({
        operation: 'suspendCaseIsolationSession',
        timestamp: new Date().toISOString(),
        actor
      });
      this.sessions.set(caseSessionId, session);
    }
    return session;
  }

  resumeCaseIsolationSession(caseSessionId: string, actor: string): CaseIsolationSession | undefined {
    const session = this.sessions.get(caseSessionId);
    if (session) {
      session.status = 'resumed';
      session.lastResumedAt = new Date().toISOString();
      session.evidence.push({
        operation: 'resumeCaseIsolationSession',
        timestamp: new Date().toISOString(),
        actor
      });
      this.sessions.set(caseSessionId, session);
    }
    return session;
  }

  verifyCaseIsolationContinuity(caseSessionId: string): { valid: boolean; session?: CaseIsolationSession } {
    const session = this.sessions.get(caseSessionId);
    if (session) {
      return { valid: true, session };
    }
    return { valid: false };
  }
}