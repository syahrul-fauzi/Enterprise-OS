import { getNow } from "@repo/core-kernel/time/time.provider.js";
export interface SessionIsolationSession {
  sessionSessionId: string;
  sessionDefinitionId: string;
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

export class SessionIsolationContinuityService {
  private sessions: Map<string, SessionIsolationSession> = new Map();

  createSessionIsolationSession(sessionDefinitionId: string, actor: string): SessionIsolationSession {
    const sessionSessionId = `sess-sess-${getNow().getTime()}-${Math.random().toString(36).substring(2, 10)}`;
    const session: SessionIsolationSession = {
      sessionSessionId,
      sessionDefinitionId,
      status: 'active',
      isolationHash: `sess-hash-${sessionDefinitionId}-${getNow().getTime()}`,
      createdAt: getNow().toISOString(),
      evidence: [
        {
          operation: 'createSessionIsolationSession',
          timestamp: getNow().toISOString(),
          actor
        }
      ]
    };
    this.sessions.set(sessionSessionId, session);
    return session;
  }

  suspendSessionIsolationSession(sessionSessionId: string, actor: string): SessionIsolationSession | undefined {
    const session = this.sessions.get(sessionSessionId);
    if (session) {
      session.status = 'suspended';
      session.evidence.push({
        operation: 'suspendSessionIsolationSession',
        timestamp: getNow().toISOString(),
        actor
      });
      this.sessions.set(sessionSessionId, session);
    }
    return session;
  }

  resumeSessionIsolationSession(sessionSessionId: string, actor: string): SessionIsolationSession | undefined {
    const session = this.sessions.get(sessionSessionId);
    if (session) {
      session.status = 'resumed';
      session.lastResumedAt = getNow().toISOString();
      session.evidence.push({
        operation: 'resumeSessionIsolationSession',
        timestamp: getNow().toISOString(),
        actor
      });
      this.sessions.set(sessionSessionId, session);
    }
    return session;
  }

  verifySessionIsolationContinuity(sessionSessionId: string): { valid: boolean; session?: SessionIsolationSession } {
    const session = this.sessions.get(sessionSessionId);
    if (session) {
      return { valid: true, session };
    }
    return { valid: false };
  }
}